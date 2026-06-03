import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'

// Named constants for validation
const MIN_CHAPTER_LENGTH = 10
const MAX_CHAPTER_LENGTH = 50000
const MAX_THEMES = 3
const MIN_TITLE_LENGTH = 1
const MAX_TITLE_LENGTH = 200

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
}

interface ImprovePromptRequest {
  field: string
  value: string
  context?: Record<string, any> // Flexibler Kontext für alle Felder
}

/**
 * POST /api/ai/improve-prompt
 * Improves user input fields using OpenAI to make them more professional and effective
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)

    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body: ImprovePromptRequest = await request.json()
    const { field, value, context } = body

    if (!field || !value) {
      return NextResponse.json({
        error: 'Missing required fields: field and value'
      }, { status: 400 })
    }

    // Validate field-specific constraints
    if (field === 'title' && (value.length < MIN_TITLE_LENGTH || value.length > MAX_TITLE_LENGTH)) {
      return NextResponse.json({
        error: `Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`
      }, { status: 400 })
    }

    if (field === 'chapterContent' && value.length < MIN_CHAPTER_LENGTH) {
      return NextResponse.json({
        error: `Chapter content must be at least ${MIN_CHAPTER_LENGTH} characters`
      }, { status: 400 })
    }

    // Validate theme count if themes are in context
    if (context?.themes && Array.isArray(context.themes) && context.themes.length > MAX_THEMES) {
      return NextResponse.json({
        error: `Maximum ${MAX_THEMES} themes allowed`
      }, { status: 400 })
    }

    // Helper function to build context string from all available fields
    const buildContextString = (): string => {
      if (!context || Object.keys(context).length === 0) return ''

      let contextStr = '\n\n📋 Context from other fields:\n'
      const fieldLabels: Record<string, string> = {
        title: 'Title',
        genre: 'Genre',
        targetAudience: 'Target Audience',
        description: 'Description',
        mainCharacters: 'Main Characters',
        setting: 'Setting',
        plotOutline: 'Plot',
        imageStyle: 'Image Style',
        tone: 'Tone/Mood',
        totalPages: 'Number of Pages',
        totalChapters: 'Number of Chapters',
        wordsPerChapter: 'Words per Chapter',
        bookType: 'Book Type',
        writingStyle: 'Writing Style',
        pov: 'Narrative Perspective',
        tenseStyle: 'Tense',
        complexity: 'Language Complexity',
        themes: 'Themes',
        imagesPerPage: 'Images per Chapter',
        customPrompt: 'Additional Instructions'
      }

      Object.entries(context).forEach(([key, val]) => {
        if (val) {
          const label = fieldLabels[key] || key
          // Handle arrays (e.g., themes)
          if (Array.isArray(val)) {
            if (val.length > 0) {
              contextStr += `- ${label}: ${val.join(', ')}\n`
            }
          } else if (typeof val !== 'object') {
            contextStr += `- ${label}: ${val}\n`
          }
        }
      })

      return contextStr
    }

    // Build system prompt based on field type
    let systemPrompt = 'You are a professional book author and editor. '
    let userPrompt = ''
    const contextString = buildContextString()

    switch (field) {
      case 'title':
        systemPrompt += 'Improve the following book title to make it more appealing and marketable. Keep the core idea but make it more concise and memorable. Ensure the title fits with the other book information.'
        userPrompt = `Original title: "${value}"${contextString}\n\nReturn ONLY the improved title, without additional explanations.`
        break

      case 'description':
        systemPrompt += 'Improve the following book description to make it more appealing and detailed. Add emotional hooks and make it more interesting for the target audience. Ensure the description fits with all other book information.'
        userPrompt = `Original description: "${value}"${contextString}\n\nReturn ONLY the improved description, without additional explanations.`
        break

      case 'mainCharacters':
        systemPrompt += 'Improve the following character description by adding personality traits, backgrounds, and interesting details. Make the characters more vivid and three-dimensional. Ensure the characters fit the story and setting.'
        userPrompt = `Original character description: "${value}"${contextString}\n\nReturn ONLY the improved character description, without additional explanations.`
        break

      case 'setting':
        systemPrompt += 'Improve the following setting description by adding atmospheric details, sensory descriptions, and interesting elements. Make the location more vivid and immersive. Ensure the setting fits the story and characters.'
        userPrompt = `Original setting description: "${value}"${contextString}\n\nReturn ONLY the improved setting description, without additional explanations.`
        break

      case 'plotOutline':
        systemPrompt += 'Improve the following plot outline by adding a clear structure with beginning, middle, and end. Add turning points and moments of tension. Ensure the plot fits the characters, setting, and genre.'
        userPrompt = `Original plot outline: "${value}"${contextString}\n\nReturn ONLY the improved plot outline, without additional explanations.`
        break

      case 'imagePrompt':
        systemPrompt += 'Improve the following image prompt for AI image generation by adding more detailed visual descriptions, style specifications, and technical details. Make the prompt more precise for better results. Ensure the image style and visual elements fit the overall concept.'
        userPrompt = `Original image prompt: "${value}"${contextString}\n\nReturn ONLY the improved image prompt (in English for better image generation), without additional explanations.`
        break

      case 'customPrompt':
        systemPrompt += 'Improve the following custom prompt by making it clearer, more specific, and more effective. Add details that lead to better results. Ensure the prompt fits the overall book concept.'
        userPrompt = `Original prompt: "${value}"${contextString}\n\nReturn ONLY the improved prompt, without additional explanations.`
        break

      case 'chapterTitle':
        systemPrompt += 'Improve the following chapter title to make it more interesting and appealing. Keep the core idea but make it more exciting and memorable. Ensure the title fits the genre and story.'
        userPrompt = `Original chapter title: "${value}"${contextString}\n\nReturn ONLY the improved chapter title, without additional explanations.`
        break

      case 'chapterContent':
        systemPrompt += 'Improve the following chapter content. Make the text more vivid, engaging, and stylistically refined. Improve narrative flow, add emotional depth, and make descriptions more vivid. Keep the core plot and important elements. Ensure the content fits the overall book concept.'
        userPrompt = `Original chapter content: "${value}"${contextString}\n\nReturn ONLY the improved chapter content, without additional explanations or comments.`
        break

      default:
        systemPrompt += 'Improve the following text to make it more professional and effective. Ensure the text fits the overall book concept.'
        userPrompt = `Original text: "${value}"${contextString}\n\nReturn ONLY the improved text, without additional explanations.`
    }

    console.error('🤖 Improving prompt:', { field, originalLength: value.length })

    // Use higher token limit for chapter content
    const maxTokens = field === 'chapterContent' ? 2000 : 500

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    })

    const improvedValue = completion.choices[0]?.message?.content?.trim() || value

    console.error('✅ Prompt improved:', {
      field,
      originalLength: value.length,
      improvedLength: improvedValue.length
    })

    return NextResponse.json({
      success: true,
      field,
      originalValue: value,
      improvedValue,
      tokensUsed: completion.usage?.total_tokens || 0
    })

  } catch (error) {
    console.error('❌ Error improving prompt:', error)
    // Don't leak implementation details in error response
    return NextResponse.json({
      error: 'Unable to improve content at this time. Please try again later.'
    }, { status: 500 })
  }
}
