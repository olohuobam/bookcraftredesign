import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { sortPhotos, createPagesFromPhotos } from '@/lib/photobook-sorter'
import { transformAndSavePhoto } from '@/lib/photobook-transform'
import { notifyBookReady } from '@/lib/notifications'
import { checkIsPro } from '@/lib/subscription-utils'
import { PHOTOBOOK_MAX_PHOTOS, type PhotobookPhoto, type PhotobookConfig, type PhotobookPage } from '@/types/photobook'

export const runtime = 'nodejs'
export const maxDuration = 300

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// SSE helper
function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// Fix 3: Generate AI captions for all photos in a single batch call
async function generateAICaptions(
  photos: PhotobookPhoto[],
  config: PhotobookConfig
): Promise<string[]> {
  if (!openai) return photos.map(() => '')

  const photoContexts = photos.map((photo, i) => {
    const analysis = photo.analysis
    const desc = analysis?.description || photo.originalFilename
    const mood = analysis?.mood || ''
    const setting = analysis?.setting || ''
    return `Photo ${i + 1}: ${desc}${mood ? `, mood: ${mood}` : ''}${setting ? `, setting: ${setting}` : ''}`
  })

  const prompt = `You are writing warm, personal captions for a photobook titled "${config.title}"${config.description ? ` (${config.description})` : ''}.

For each photo description below, write a single heartfelt caption — max 20 words, personal and evocative, NOT a technical description.

${photoContexts.join('\n')}

Respond ONLY with a JSON array of strings, one caption per photo, in the same order:
["caption for photo 1", "caption for photo 2", ...]`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.8,
  })

  const content = response.choices[0]?.message?.content || '[]'
  let cleaned = content.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  let captions: string[]
  try {
    const parsed = JSON.parse(cleaned) as string[]
    captions = Array.isArray(parsed) ? parsed : photos.map(photo => photo.analysis?.description || photo.originalFilename || '')
  } catch {
    console.warn('⚠️ Failed to parse AI captions JSON, using fallback descriptions')
    captions = photos.map(photo => photo.analysis?.description || photo.originalFilename || '')
  }
  return captions
}

/**
 * POST /api/photobook/create-stream
 * Fix 1: SSE streaming endpoint for photobook creation
 * Sends progress events: { progress, status, currentPhoto, totalPhotos }
 * Final event: { done: true, bookId }
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
      }

      try {
        // Auth
        const authorization = request.headers.get('authorization')
        const token = authorization?.replace('Bearer ', '')
        if (!token) {
          send({ error: 'No token provided' })
          controller.close()
          return
        }

        const user = await verifySupabaseToken(token)
        if (!user || !user.userId) {
          send({ error: 'Invalid token' })
          controller.close()
          return
        }

        // Free users may own one photobook at a time; further photobooks
        // require Pro. Deleting the existing one frees the slot again.
        const isPro = await checkIsPro(user.userId)
        if (!isPro) {
          const existingPhotobooks = await SupabaseDB.countUserPhotobooks(user.userId)
          if (existingPhotobooks >= 1) {
            send({ error: 'Pro subscription required', upgradeRequired: true })
            controller.close()
            return
          }
        }

        const body = await request.json()
        const { config, photos } = body as {
          config: PhotobookConfig
          photos: PhotobookPhoto[]
        }

        if (!config || !photos || photos.length === 0) {
          send({ error: 'Config and photos are required' })
          controller.close()
          return
        }

        if (photos.length > PHOTOBOOK_MAX_PHOTOS) {
          send({ error: `Too many photos. Maximum ${PHOTOBOOK_MAX_PHOTOS} photos allowed per photobook.` })
          controller.close()
          return
        }

        const totalPhotos = photos.length
        send({ progress: 5, status: 'Sorting photos...', currentPhoto: 0, totalPhotos })

        // Rehydrate authoritative URL and full analysis (incl. embeddingVector)
        // from the media library. The client deliberately omits these heavy
        // fields to stay under the serverless request-body limit (HTTP 413).
        const mediaIds = Array.from(
          new Set(
            photos
              .map((p) => p.mediaLibraryId || p.id)
              .filter((id): id is string => Boolean(id))
          )
        )

        if (mediaIds.length > 0) {
          try {
            const mediaItems = await SupabaseDB.getMediaLibraryItems(mediaIds)
            // Only trust items owned by the authenticated user — never let a
            // client hydrate from another user's media library.
            const byId = new Map(
              mediaItems
                .filter((item) => item.user_id === user.userId)
                .map((item) => [item.id, item])
            )

            let hydrated = 0
            for (const photo of photos) {
              const key = photo.mediaLibraryId || photo.id
              const item = byId.get(key)
              if (!item) continue
              hydrated++
              if (!photo.url && item.url) photo.url = item.url
              // item.analysis is the authoritative analyzed result (incl.
              // embeddingVector); manual user edits live in separate
              // top-level fields (manualYear/manualDescription/...).
              if (item.analysis) photo.analysis = item.analysis
            }

            // Similarity sort needs embeddingVectors from the media library.
            // If nothing could be hydrated, the ordering silently degrades —
            // surface a non-fatal warning rather than returning a
            // successful-looking book with worse results.
            if (config.sortBy === 'similarity' && hydrated < photos.length) {
              send({
                warning: `Could not load analysis for ${photos.length - hydrated} of ${photos.length} photos — similarity ordering may be approximate.`,
              })
            }
          } catch (hydrateError) {
            console.error('[photobook/create-stream] media hydration failed:', hydrateError)
            if (config.sortBy === 'similarity') {
              send({
                warning: 'Could not load photo analysis — similarity ordering may be approximate.',
              })
            }
          }
        }

        // Sort photos
        const sortedPhotos = sortPhotos(photos, config.sortBy)

        // Style Transformation
        const shouldTransform =
          config.transformEnabled === true &&
          config.transformStyle != null &&
          config.transformStyle !== 'original' &&
          openai != null

        let finalPhotos = sortedPhotos

        if (shouldTransform && openai) {
          const style = config.transformStyle!
          console.error(`🎨 Applying style transformation "${style}" to ${sortedPhotos.length} photos...`)

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const allowedHost = supabaseUrl
            ? (() => { try { return new URL(supabaseUrl).hostname } catch { return '' } })()
            : ''

          const invalidUrls = sortedPhotos.filter((photo) => {
            if (!photo.url) return true
            if (photo.url.startsWith('data:')) return false
            try {
              const parsed = new URL(photo.url)
              return parsed.protocol !== 'https:' || parsed.hostname !== allowedHost
            } catch {
              return true
            }
          })

          if (invalidUrls.length > 0) {
            send({ error: `${invalidUrls.length} photo(s) have invalid URLs` })
            controller.close()
            return
          }

          const transformedUrls: string[] = []
          for (let i = 0; i < sortedPhotos.length; i++) {
            const photo = sortedPhotos[i]
            const progress = Math.round(10 + ((i / sortedPhotos.length) * 60))
            send({
              progress,
              status: `Transforming photo ${i + 1} of ${sortedPhotos.length}...`,
              currentPhoto: i + 1,
              totalPhotos,
            })

            try {
              const url = await transformAndSavePhoto({
                openai,
                photoUrl: photo.url,
                photoId: photo.id,
                style,
                userId: user.userId,
              })
              transformedUrls.push(url)
            } catch (err) {
              console.error(`❌ Transform failed for photo ${i + 1}:`, err)
              transformedUrls.push(photo.url) // fallback to original
            }
          }

          finalPhotos = sortedPhotos.map((photo, idx) => ({
            ...photo,
            url: transformedUrls[idx],
          }))

          console.error(`✅ Style transformation complete for ${finalPhotos.length} photos`)
        } else {
          send({ progress: 70, status: 'Preparing layout...', currentPhoto: 0, totalPhotos })
        }

        // Fix 3: Generate AI captions if requested
        let aiCaptions: string[] = []
        if (config.includeAnalysisText && openai) {
          send({ progress: 72, status: 'Writing captions...', currentPhoto: 0, totalPhotos })
          try {
            aiCaptions = await generateAICaptions(finalPhotos, config)
            console.error(`✅ Generated ${aiCaptions.length} AI captions`)
          } catch (err) {
            console.warn('⚠️ Caption generation failed, using descriptions:', err)
            aiCaptions = finalPhotos.map(p => p.analysis?.description || '')
          }
        }

        send({ progress: 82, status: 'Building pages...', currentPhoto: 0, totalPhotos })

        // Create pages
        const pageStructure = createPagesFromPhotos(finalPhotos, config.photosPerPage)

        // Convert to PhotobookPages with AI captions (Fix 3)
        const pages: PhotobookPage[] = pageStructure.map((page) => {
          const positions = getPositionsForLayout(config.photosPerPage)
          return {
            pageNumber: page.pageNumber,
            photos: page.photos.map((photo, photoIdx) => {
              // Find global index in finalPhotos for AI caption lookup
              const globalIdx = finalPhotos.findIndex(p => p.id === photo.id)
              const aiCaption = aiCaptions[globalIdx] || undefined
              return {
                photo,
                position: positions[photoIdx] || 'full',
                // Fix 3: Use AI caption if available, else fallback chain
                caption: config.includeAnalysisText
                  ? (aiCaption || photo.analysis?.description || photo.caption)
                  : photo.caption
              }
            })
          }
        })

        send({ progress: 90, status: 'Saving your book...', currentPhoto: 0, totalPhotos })

        // Build chapters_json
        const chaptersJson = {
          isPhotobook: true,
          photobookConfig: config,
          sortedBy: config.sortBy,
          transformStyle: shouldTransform ? config.transformStyle : 'original',
          totalPhotos: photos.length,
          totalPages: pages.length,
          pages: pages.map(page => ({
            id: crypto.randomUUID(),
            pageNumber: page.pageNumber,
            layout: getLayoutName(config.photosPerPage),
            photos: page.photos.map(p => ({
              id: p.photo.id,
              url: p.photo.url,
              position: p.position,
              caption: p.caption,
              analysis: p.photo.analysis
            }))
          })),
          photoAnalysis: finalPhotos.map(p => ({
            id: p.id,
            analysis: p.analysis
          }))
        }

        const imageUrls = finalPhotos.map(p => p.url)

        // Create book in database
        const book = await SupabaseDB.createBook({
          title: config.title,
          genre: 'Photo Album',
          book_type: 'picture',
          book_subtype: 'photobook',
          user_id: user.userId!,
          description: config.description || `Photo book with ${photos.length} images`,
          content: '',
          chapters: pages.length,
          style: config.theme,
          target_audience: 'All',
          chapters_json: chaptersJson,
          images: imageUrls,
          status: 'completed'
        })

        // In-app + push notification
        notifyBookReady(user.userId!, config.title || 'Dein Fotobuch', book.id!).catch((err) => {
          console.error('[photobook/create-stream] notifyBookReady failed:', err)
        })

        send({ progress: 100, status: 'Done!', currentPhoto: totalPhotos, totalPhotos, done: true, bookId: book.id })
        controller.close()

      } catch (error) {
        console.error('Error in photobook create-stream:', error)
        const msg = error instanceof Error ? error.message : 'Unknown error'
        controller.enqueue(encoder.encode(sseEvent({ error: `Failed to create photobook: ${msg}` })))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function getPositionsForLayout(photosPerPage: number): Array<'full' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right'> {
  switch (photosPerPage) {
    case 1: return ['full']
    case 2: return ['left', 'right']
    case 4: return ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    case 6: return ['top-left', 'top-right', 'left', 'right', 'bottom-left', 'bottom-right']
    default: return ['full']
  }
}

function getLayoutName(photosPerPage: number): string {
  switch (photosPerPage) {
    case 1: return 'full-image'
    case 2: return 'two-horizontal'
    case 4: return 'four-grid'
    case 6: return 'six-grid'
    default: return 'full-image'
  }
}
