import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { verifySupabaseToken, isSupabaseConfigured } from '@/lib/supabase-admin'
import { saveImageBufferToStorage, attachPathFragment } from '@/lib/image-storage'
import { SupabaseDB } from '@/lib/supabase-db'
import { PHOTOBOOK_MAX_FILE_SIZE_BYTES, PHOTOBOOK_MAX_FILE_SIZE_MB, PHOTOBOOK_MAX_PHOTOS, type PhotoAnalysis, type PhotoEra } from '@/types/photobook'

// Initialize AI client (conditionally to avoid build errors)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

const hasOpenAI = !!process.env.OPENAI_API_KEY

const ANALYSIS_PROMPT = `Analyze this photo in detail. Respond ONLY with a JSON object (without Markdown formatting) with the following structure:

{
  "estimatedEra": "1900-1920" | "1920-1940" | "1940-1960" | "1960-1980" | "1980-2000" | "2000-2010" | "2010-2020" | "2020-present" | "unknown",
  "estimatedYear": <number or null>,
  "eraConfidence": <number between 0 and 1>,
  "eraReasoning": "<reasoning for the time period estimate based on clothing, technology, image quality, etc.>",
  "description": "<brief description of the image content>",
  "subjects": ["<person/object 1>", "<person/object 2>"],
  "peopleCount": <number of people>,
  "hasText": <true/false>,
  "detectedText": "<detected text or null>",
  "colorPalette": ["<color1>", "<color2>", "<color3>"],
  "isBlackAndWhite": <true/false>,
  "isSepia": <true/false>,
  "photoQuality": "low" | "medium" | "high",
  "categories": ["<category1>", "<category2>"],
  "mood": "<mood>",
  "setting": "<environment/location>",
  "visualFeatures": ["<feature1>", "<feature2>", "<feature3>"]
}

Important notes for age estimation:
- Pay attention to clothing styles, hairstyles, vehicles, architecture
- Note image quality and photo technology (black and white, sepia, grain)
- Consider technical devices, furniture, and decor
- If the image is obviously a smartphone photo, it's likely after 2010
- Digital cameras became popular from around 2000
- Polaroid photos were especially popular in the 70s-90s`

// Detect errors that mean the AI provider is unavailable (quota exhausted,
// rate limited, or upstream outage) rather than a problem with the photo itself.
function isAiServiceError(error: unknown): boolean {
  const e = error as { status?: number; code?: string } | undefined
  if (!e) return false
  if (e.code === 'insufficient_quota' || e.code === 'rate_limit_exceeded') return true
  if (typeof e.status === 'number' && (e.status === 429 || e.status >= 500)) return true
  return false
}

// Fix 2: Concurrency utility — runs tasks in parallel with a max limit
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onProgress?: (completed: number, total: number) => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0
  let completed = 0

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++
      results[index] = await tasks[index]()
      completed++
      onProgress?.(completed, tasks.length)
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

// Analyze with OpenAI GPT-4o using base64
async function analyzeWithOpenAI(base64Image: string, mimeType: string): Promise<PhotoAnalysis> {
  if (!openai) {
    throw new Error('OpenAI not configured')
  }
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT
          }
        ]
      }
    ],
    max_tokens: 1500
  })

  const content = response.choices[0]?.message?.content || '{}'
  return parseAnalysisResponse(content)
}

// Parse and validate the AI response
function parseAnalysisResponse(content: string): PhotoAnalysis {
  // Clean up possible markdown formatting
  let cleanedContent = content.trim()
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.slice(7)
  }
  if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.slice(3)
  }
  if (cleanedContent.endsWith('```')) {
    cleanedContent = cleanedContent.slice(0, -3)
  }
  cleanedContent = cleanedContent.trim()

  const analysis = JSON.parse(cleanedContent) as PhotoAnalysis

  // Validate and set defaults
  return {
    estimatedEra: validateEra(analysis.estimatedEra),
    estimatedYear: analysis.estimatedYear || undefined,
    eraConfidence: Math.min(1, Math.max(0, analysis.eraConfidence || 0.5)),
    eraReasoning: analysis.eraReasoning || 'No reasoning available',
    description: analysis.description || 'No description available',
    subjects: Array.isArray(analysis.subjects) ? analysis.subjects : [],
    peopleCount: analysis.peopleCount || 0,
    hasText: !!analysis.hasText,
    detectedText: analysis.detectedText || undefined,
    colorPalette: Array.isArray(analysis.colorPalette) ? analysis.colorPalette.slice(0, 5) : [],
    isBlackAndWhite: !!analysis.isBlackAndWhite,
    isSepia: !!analysis.isSepia,
    photoQuality: validateQuality(analysis.photoQuality),
    categories: Array.isArray(analysis.categories) ? analysis.categories : [],
    mood: analysis.mood || 'neutral',
    setting: analysis.setting || 'unknown',
    visualFeatures: Array.isArray(analysis.visualFeatures) ? analysis.visualFeatures : []
  }
}

function validateEra(era: string): PhotoEra {
  const validEras: PhotoEra[] = [
    '1900-1920', '1920-1940', '1940-1960', '1960-1980',
    '1980-2000', '2000-2010', '2010-2020', '2020-present', 'unknown'
  ]
  return validEras.includes(era as PhotoEra) ? (era as PhotoEra) : 'unknown'
}

function validateQuality(quality: string): 'low' | 'medium' | 'high' {
  if (quality === 'low' || quality === 'medium' || quality === 'high') {
    return quality
  }
  return 'medium'
}

// Main analysis function
async function analyzePhoto(
  base64Image: string,
  mimeType: string
): Promise<{ analysis: PhotoAnalysis; usedModel: string }> {
  if (!hasOpenAI) {
    throw new Error('No AI provider configured. Please set OPENAI_API_KEY.')
  }

  console.error('📸 Analyzing photo with GPT-4o...')
  const analysis = await analyzeWithOpenAI(base64Image, mimeType)
  return { analysis, usedModel: 'gpt-4o' }
}

// Fix 4: Generate embedding vector for a description using text-embedding-3-small
async function generateEmbedding(description: string): Promise<number[] | undefined> {
  if (!openai || !hasOpenAI) return undefined
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: description,
    })
    return response.data[0]?.embedding
  } catch (error) {
    console.warn('⚠️ Failed to generate embedding:', error)
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get form data with multiple files
    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Limit: max 10 photos per request
    if (files.length > PHOTOBOOK_MAX_PHOTOS) {
      return NextResponse.json({ error: `Too many files. Maximum ${PHOTOBOOK_MAX_PHOTOS} photos allowed.` }, { status: 400 })
    }

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({
          error: `File "${file.name}" is not an image`
        }, { status: 400 })
      }
      if (file.size > PHOTOBOOK_MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({
          error: `File "${file.name}" is too large (max ${PHOTOBOOK_MAX_FILE_SIZE_MB} MB)`
        }, { status: 400 })
      }
    }

    let totalOpenAICalls = 0

    // Fix 2: Prepare parallel tasks with concurrency limit of 5
    const tasks = files.map((file) => async () => {
      try {
        // Get file buffer and convert to base64
        const arrayBuffer = await file.arrayBuffer()
        const base64Image = Buffer.from(arrayBuffer).toString('base64')

        // FIRST: Analyze the photo (doesn't require storage)
        const { analysis, usedModel } = await analyzePhoto(base64Image, file.type)

        totalOpenAICalls++

        // Fix 4: Generate embedding vector for similarity sort
        const embeddingVector = await generateEmbedding(analysis.description)
        if (embeddingVector) {
          analysis.embeddingVector = embeddingVector
          console.error(`✅ Embedding generated for "${file.name}" (${embeddingVector.length} dims)`)
        }

        // THEN: Try to save to Supabase Storage (only if configured)
        let imageUrl = ''
        let storagePath = ''

        if (isSupabaseConfigured) {
          try {
            const storedImage = await saveImageBufferToStorage(arrayBuffer, {
              userId: user.userId,
              filename: file.name,
              contentType: file.type,
              directory: 'photobook'
            })
            imageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)
            storagePath = storedImage.path
            console.error('✅ Image saved to Supabase Storage:', storagePath)
          } catch (storageError) {
            console.warn('⚠️ Could not save to Supabase, using base64 fallback:', storageError)
            imageUrl = `data:${file.type};base64,${base64Image}`
          }
        } else {
          console.error('ℹ️ Supabase not configured, using base64 data URL')
          imageUrl = `data:${file.type};base64,${base64Image}`
        }

        const photoId = crypto.randomUUID()
        const uploadedAt = new Date().toISOString()

        // Save to media library if Supabase is configured
        let mediaLibraryId: string | undefined
        if (isSupabaseConfigured) {
          try {
            const mediaItem = await SupabaseDB.createMediaLibraryItem({
              user_id: user.userId!,
              original_filename: file.name,
              url: imageUrl,
              storage_path: storagePath || undefined,
              storage_type: storagePath ? 'supabase' : 'base64',
              file_size: file.size,
              mime_type: file.type,
              analysis: analysis,
              analysis_status: 'completed',
              analyzed_with: usedModel
            })
            mediaLibraryId = mediaItem.id
            console.error('✅ Photo saved to media library:', mediaLibraryId)
          } catch (mediaError) {
            console.warn('⚠️ Could not save to media library:', mediaError)
          }
        }

        return {
          id: photoId,
          mediaLibraryId,
          originalFilename: file.name,
          url: imageUrl,
          path: storagePath || undefined,
          uploadedAt,
          analysis,
          analysisStatus: 'completed' as const,
          analyzedWith: usedModel,
          storageType: storagePath ? 'supabase' : 'base64'
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        return {
          id: crypto.randomUUID(),
          originalFilename: file.name,
          url: '',
          uploadedAt: new Date().toISOString(),
          analysisStatus: 'failed' as const,
          analysisError: error instanceof Error ? error.message : 'Unknown error',
          aiServiceError: isAiServiceError(error)
        }
      }
    })

    // Fix 2: Run with max 5 concurrent tasks
    console.error(`📸 Analyzing ${files.length} photos with concurrency limit of 5...`)
    const results = await runWithConcurrency(tasks, 5, (done, total) => {
      console.error(`📸 Progress: ${done}/${total} photos analyzed`)
    })

    const successful = results.filter(r => r.analysisStatus === 'completed').length

    return NextResponse.json({
      success: true,
      photos: results,
      totalProcessed: results.length,
      successful,
      failed: results.filter(r => r.analysisStatus === 'failed').length,
      // True when nothing succeeded and at least one failure was an AI
      // provider outage/quota issue — lets the UI show a friendly message.
      aiServiceUnavailable: successful === 0 &&
        results.some(r => (r as { aiServiceError?: boolean }).aiServiceError === true),
      aiUsage: {
        openai: totalOpenAICalls,
        primaryModel: 'gpt-4o'
      },
      storageAvailable: isSupabaseConfigured
    })

  } catch (error) {
    console.error('Error in photobook analyze:', error)
    return NextResponse.json({
      error: 'Failed to process photos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
