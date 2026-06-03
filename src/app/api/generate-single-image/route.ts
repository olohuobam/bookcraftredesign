import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { downloadAndSaveImage, attachPathFragment } from '@/lib/image-storage'

// Configure runtime for image generation
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for single image generation

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifySupabaseToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { 
      bookId, 
      chapterIndex, 
      title, 
      description, 
      chapterTitle, 
      chapterContent, 
      context,
      style = 'watercolor',
      prompt,
      bookType = 'text', // Add book type to determine if consistency is needed
      characterDescriptions, // Optional character descriptions for consistency
      previousImages // References to previous images for visual consistency
    } = await req.json()

    if (!title || !chapterContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: title and chapterContent' 
      }, { status: 400 })
    }

    const isPictureBook = bookType === 'picture'

    // Build comprehensive prompt with strong anti-text requirements
    const stylePrompts = {
      watercolor: "beautiful watercolor painting style, soft flowing colors, artistic brush strokes, dreamy atmosphere, consistent character design",
      oil: "classic oil painting style, rich textures, vibrant colors, masterful brushwork, consistent character features",
      digital: "modern digital art style, crisp details, vibrant colors, contemporary aesthetic, consistent character appearance",
      sketch: "pencil sketch style, detailed line work, artistic shading, hand-drawn appearance, consistent line quality",
      cartoon: "friendly cartoon illustration style, bright colors, whimsical characters, child-friendly, consistent character design",
      realistic: "photorealistic style, detailed textures, natural lighting, lifelike appearance, consistent character features"
    }

    const baseStylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.watercolor

    // CRITICAL REQUIREMENTS for no text in images
    const antiTextPrompt = `

CRITICAL REQUIREMENTS - ABSOLUTELY MANDATORY:
- ABSOLUTELY NO TEXT of any kind in the image
- NO LETTERS, NO NUMBERS, NO WORDS, NO SYMBOLS
- NO WRITING, NO SIGNS, NO LABELS, NO CAPTIONS
- NO BOOK PAGES, NO NEWSPAPERS, NO DOCUMENTS
- NO READABLE CONTENT of any form
- PURE VISUAL ILLUSTRATION ONLY

`

    // Enhanced consistency for picture books
    let consistencyPrompt = ''
    if (isPictureBook) {
      if (characterDescriptions) {
        consistencyPrompt += `\nCHARACTER CONSISTENCY (maintain exact appearance):\n${characterDescriptions}\n`
      }
      if (previousImages && chapterIndex > 0) {
        consistencyPrompt += `\nVISUAL CONSISTENCY: Maintain the same art style, character designs, and visual elements as previous illustrations. Same character appearances, proportions, and color schemes.\n`
      }
      consistencyPrompt += `\nPICTURE BOOK REQUIREMENTS: Child-friendly imagery, clear visual storytelling, consistent character design across all pages, engaging and age-appropriate content.\n`
    }

    const scenePrompt = prompt || `Illustrate a scene from: "${chapterContent.substring(0, 500)}"`

    const finalPrompt = `${baseStylePrompt}

Create a beautiful illustration for the ${isPictureBook ? 'children\'s picture book' : 'book'} "${title}", specifically for the ${isPictureBook ? 'page' : 'chapter'} "${chapterTitle}".

Scene to illustrate: ${scenePrompt}

Book context: ${description}
${isPictureBook ? 'Page' : 'Chapter'} context: ${context?.substring(0, 300) || chapterContent.substring(0, 300)}

${consistencyPrompt}

${antiTextPrompt}

Style: ${baseStylePrompt}
Focus on: Visual storytelling, emotional atmosphere, vivid imagery, artistic composition${isPictureBook ? ', character consistency, child-friendly design' : ''}
Avoid: Any form of text, writing, or readable content`

    console.error('Generating single image with Gemini Imagen, prompt:', finalPrompt.substring(0, 200) + '...')

    // Use Gemini Imagen 3 for image generation
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" })

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: finalPrompt
        }]
      }],
      generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "image/png"
      }
    })

    // Get the generated image data
    const response = await result.response
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData

    if (!imageData?.data) {
      throw new Error('No image data received from Gemini')
    }

    console.error('Single image generated successfully with Gemini, downloading and saving locally...')

    // Convert base64 to data URL for download function
    const imageDataUrl = `data:${imageData.mimeType};base64,${imageData.data}`

    // Download and save the image
    const storedImage = await downloadAndSaveImage(imageDataUrl, {
      userId: user.userId,
      bookId,
      filenamePrefix: `chapter-${(chapterIndex ?? 0) + 1}`
    })

    console.error('Image saved at:', storedImage.path)

    const imageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)

    return NextResponse.json({
      success: true,
      imageUrl,
      image: { ...storedImage, signedUrl: imageUrl },
      chapterIndex,
      bookId
    })

  } catch (error: unknown) {
    console.error('Error generating single image with Gemini:', error)

    const errorObj = error as { message?: string; status?: number }

    // Handle Gemini API specific errors
    if (errorObj.message?.includes('quota')) {
      return NextResponse.json({
        error: 'API quota exceeded. Please try again later.',
        details: errorObj.message
      }, { status: 429 })
    }

    if (errorObj.message?.includes('safety') || errorObj.message?.includes('blocked')) {
      return NextResponse.json({
        error: 'Content blocked by safety filters. Please try a different description.',
        details: errorObj.message
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to generate image with Gemini',
      details: errorObj.message || 'Unknown error'
    }, { status: 500 })
  }
}