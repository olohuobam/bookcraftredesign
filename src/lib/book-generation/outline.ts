import OpenAI from 'openai'
import { BookConfig, BookOutline, CharacterDescription, ChapterOutline } from './types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function generateBookOutline(config: BookConfig): Promise<string> {
  const isPictureBook = config.bookType === 'picture'

  const outlinePrompt = `
Create a detailed book outline for:

BOOK: "${config.title}"
GENRE: ${config.genre}
DESCRIPTION: ${config.description}
PLOT: ${config.plotOutline}
CHARACTERS: ${config.mainCharacters}
SETTING: ${config.setting}
THEMES: ${config.themes.join(', ')}

STRUCTURE:
- ${config.totalChapters} ${isPictureBook ? 'Pages' : 'Chapters'}
- ${config.wordsPerChapter} words per ${isPictureBook ? 'page' : 'chapter'}
- Style: ${config.writingStyle}
- Tone: ${config.tone}
- Perspective: ${config.pov === 'first' ? 'First-person narrator' : config.pov === 'third' ? 'Third-person narrator' : 'Mixed perspective'}
- Tense: ${config.tenseStyle === 'past' ? 'Past tense' : config.tenseStyle === 'present' ? 'Present tense' : 'Mixed tenses'}

${isPictureBook ? `
PICTURE BOOK SPECIFIC REQUIREMENTS:
- ${config.imagesPerPage} images per page
- Image style: ${config.imageStyle}
- Consistent character representation across all pages
- Clear visual narrative
- Simple, image-supporting texts
` : ''}

${config.customPrompt ? `ADDITIONAL INSTRUCTIONS: ${config.customPrompt}` : ''}

IMPORTANT: Write all content in English, regardless of the language of the input description.

Create a JSON response with a detailed ${isPictureBook ? 'page' : 'chapter'} overview:
{
  "bookSummary": "Brief summary of the entire book",
  ${isPictureBook ? `"characterDescriptions": {
    "character1": {
      "name": "Name",
      "appearance": "Detailed description for consistent visualization",
      "personality": "Character traits",
      "role": "Role in the story"
    }
  },
  "visualTheme": "Consistent visual design and color palette",
  ` : ''}
  "chapters": [
    {
      "number": 1,
      "title": "${isPictureBook ? 'Page title' : 'Chapter title'}",
      "summary": "What happens ${isPictureBook ? 'on this page' : 'in this chapter'}",
      "keyEvents": ["Event 1", "Event 2"],
      "characters": ["Characters ${isPictureBook ? 'on this page' : 'in this chapter'}"],
      "themes": ["Main themes"],
      ${isPictureBook ? `"visualScenes": ["Description of key visual scenes"],
      "imagePrompts": ["Specific image prompts for consistency"],
      ` : ''}"wordCount": ${config.wordsPerChapter}
    }
  ],
  "characterArcs": {
    "character1": "Character development throughout the book",
    "character2": "..."
  }${isPictureBook ? `,
  "consistencyGuidelines": {
    "characters": "How characters should be depicted consistently in all images",
    "settings": "How locations should be consistently visualized",
    "style": "Specific style guidelines for all images"
  }` : ''}
}
`

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional book author and structure expert. Create detailed, coherent book outlines. Always write in English. ALWAYS respond with valid JSON.`
      },
      {
        role: 'user',
        content: outlinePrompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.8,
  })

  const rawResponse = completion.choices[0]?.message?.content || ''
  const normalizedResponse = rawResponse
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  try {
    const outline: BookOutline = JSON.parse(normalizedResponse)

    let contextString = `
BOOK SUMMARY: ${outline.bookSummary}

CHARACTER DEVELOPMENT: ${Object.entries(outline.characterArcs || {}).map(([char, arc]) => `${char}: ${arc}`).join('\n')}
`

    if (isPictureBook && outline.characterDescriptions) {
      contextString += `
CHARACTER DESCRIPTIONS FOR CONSISTENCY:
${Object.entries(outline.characterDescriptions).map(([name, desc]) => {
  const character = desc as CharacterDescription
  return `${name}: ${character.appearance} - ${character.personality} (${character.role})`
}).join('\n')}

VISUAL CONSISTENCY:
- Theme: ${outline.visualTheme || 'Not specified'}
- Character depiction: ${outline.consistencyGuidelines?.characters || 'Standard'}
- Settings: ${outline.consistencyGuidelines?.settings || 'Standard'}
- Style direction: ${outline.consistencyGuidelines?.style || config.imageStyle}
`
    }

    contextString += `
${isPictureBook ? 'PAGE OVERVIEW' : 'CHAPTER OVERVIEW'}:
${outline.chapters?.map((ch: ChapterOutline) => {
  let pageInfo = `${isPictureBook ? 'Page' : 'Chapter'} ${ch.number} - ${ch.title}: ${ch.summary}`
  if (isPictureBook && ch.visualScenes) {
    pageInfo += `\nVisual scenes: ${ch.visualScenes.join(', ')}`
  }
  if (isPictureBook && ch.imagePrompts) {
    pageInfo += `\nImage prompts: ${ch.imagePrompts.join(' | ')}`
  }
  return pageInfo
}).join('\n\n')}
    `.trim()

    console.error('Generated book outline:', contextString)
    return contextString
  } catch (error) {
    console.error("Error in generateBookOutline:", error)
    console.error('Failed to parse outline, using raw response', {
      error,
      snippet: normalizedResponse.slice(0, 1000)
    })
    return rawResponse
  }
}
