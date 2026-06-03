import { GoogleGenerativeAI } from '@google/generative-ai'
import { BookConfig, ChapterData } from './types'

function getGeminiAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
}

const STYLE_PROMPTS: Record<string, string> = {
  realistic: 'photorealistic, high quality, detailed',
  cartoon: 'cartoon style, colorful, playful, consistent character design',
  anime: 'anime style, manga, stylized, consistent character features',
  watercolor: 'watercolor painting, soft colors, artistic, consistent style',
  'digital-art': 'digital art, modern, vibrant, consistent character design',
  'oil-painting': 'oil painting style, classical, artistic, consistent brushwork',
  sketch: 'pencil sketch, black and white, artistic, consistent line work',
  photographic: 'photograph, realistic, high resolution, consistent lighting'
}

export async function generateImage(
  config: BookConfig,
  chapter: ChapterData,
  bookContext: string,
  imageIndex: number,
  chapterIndex: number
): Promise<string | null> {
  try {
    // Extract visual descriptions from chapter content
    const imageMatches = chapter.content.match(/\[BILD: ([^\]]+)\]/g)
    const specificImageDesc = imageMatches?.[imageIndex]?.replace(/\[BILD: ([^\]]+)\]/, '$1')

    const baseImagePrompt = specificImageDesc ||
      `Scene from page "${chapter.title}": ${chapter.content.substring(0, 300)}...`

    // Extract character consistency information from book context
    const contextLines = bookContext.split('\n')
    const characterDescLine = contextLines.find(line => line.startsWith('CHARACTER DESCRIPTIONS FOR CONSISTENCY:'))
    const visualConsistencyLines = contextLines.filter(line =>
      line.includes('VISUAL CONSISTENCY:') ||
      line.includes('Character depiction:') ||
      line.includes('Style direction:')
    )

    let consistencyPrompt = ''
    if (characterDescLine) {
      const charDescriptions = contextLines
        .slice(contextLines.indexOf(characterDescLine) + 1)
        .filter(line => line.trim() && !line.startsWith('VISUAL CONSISTENCY:'))
        .slice(0, 3)
        .join(' | ')

      if (charDescriptions) {
        consistencyPrompt += `Characters: ${charDescriptions}. `
      }
    }

    if (visualConsistencyLines.length > 0) {
      const visualGuides = visualConsistencyLines.join(' | ')
      consistencyPrompt += `Visual consistency: ${visualGuides}. `
    }

    if (chapterIndex > 0) {
      consistencyPrompt += `Maintain visual consistency with previous pages. Same character appearances and art style. `
    }

    const stylePrompt = STYLE_PROMPTS[config.imageStyle] || STYLE_PROMPTS.cartoon

    const fullPrompt = [
      baseImagePrompt,
      consistencyPrompt,
      stylePrompt,
      'children\'s book illustration',
      `book themes: ${config.themes.join(', ')}`,
      'high quality, professional illustration',
      chapterIndex > 0 ? 'consistent with previous illustrations' : ''
    ].filter(Boolean).join(', ')

    console.error(`Generating image for page ${chapterIndex + 1}, image ${imageIndex + 1} with Gemini:`, fullPrompt.substring(0, 200))

    const genAI = getGeminiAI()
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' })

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'image/png'
      }
    })

    const response = await result.response
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData

    if (imageData?.data) {
      return `data:${imageData.mimeType};base64,${imageData.data}`
    }

    return null
  } catch (error) {
    console.error(`Error generating image for page ${chapterIndex + 1}:`, error)
    return null
  }
}

export async function generateAllImages(
  config: BookConfig,
  chapters: ChapterData[],
  bookContext: string,
  onProgress: (current: number, total: number) => void
): Promise<void> {
  if (config.bookType !== 'picture') return

  const totalImages = chapters.length * config.imagesPerPage
  let imageProgress = 0

  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
    const chapter = chapters[chapterIndex]
    const images: string[] = []

    for (let imgIndex = 0; imgIndex < config.imagesPerPage; imgIndex++) {
      onProgress(imageProgress, totalImages)

      const imageUrl = await generateImage(config, chapter, bookContext, imgIndex, chapterIndex)
      if (imageUrl) images.push(imageUrl)
      imageProgress++
    }

    chapters[chapterIndex].images = images
  }
}
