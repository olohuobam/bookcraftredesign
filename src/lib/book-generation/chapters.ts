import OpenAI from 'openai'
import { BookConfig, ChapterData } from './types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const COMPLEXITY_INSTRUCTIONS: Record<string, string> = {
  simple: 'Use simple, clear language. Short sentences. Easy to understand.',
  medium: 'Balanced writing style with varying sentence lengths. Appropriate complexity.',
  complex: 'Literarily sophisticated language. Complex sentences and deep descriptions.'
}

const POV_INSTRUCTIONS: Record<string, string> = {
  first: 'Write in first-person (I-narrator).',
  third: 'Write in third-person (he/she narrator).',
  mixed: 'Vary between first and third-person narration depending on the situation.'
}

const TENSE_INSTRUCTIONS: Record<string, string> = {
  past: 'Use past tense.',
  present: 'Use present tense.',
  mixed: 'Mix tenses depending on the narrative situation.'
}

export async function generateChapter(
  config: BookConfig,
  bookContext: string,
  previousChapters: ChapterData[],
  chapterIndex: number
): Promise<ChapterData> {
  const isPictureBook = config.bookType === 'picture'
  const previousContext = previousChapters.length > 0
    ? `PREVIOUS ${isPictureBook ? 'PAGES' : 'CHAPTERS'}:\n${previousChapters.map((ch, idx) =>
        `${isPictureBook ? 'Page' : 'Chapter'} ${chapterIndex - previousChapters.length + idx + 1} - ${ch.title}: ${ch.content.substring(0, 500)}...`
      ).join('\n\n')}`
    : ''

  const pictureBookInstructions = isPictureBook ? `
PICTURE BOOK SPECIFIC INSTRUCTIONS:
- Write short, simple texts (1-3 sentences per section)
- Focus on visual descriptions and actions
- Use the CHARACTER DESCRIPTIONS from the context for consistent representation
- Reference the visual consistency guidelines
- Each text section should be suitable for an illustration
- Mark important visual elements with [IMAGE: detailed scene description]
- Ensure continuous character development even with short texts
- Use simple, child-appropriate language but with emotional depth
` : `
TEXT BOOK INSTRUCTIONS:
- Write a complete, detailed chapter with vivid descriptions, dialogues, and character development
- Use the full range of literary techniques
- Develop characters and plot substantially
`

  const chapterPrompt = `
You are a professional ${isPictureBook ? 'children\'s book author and storyteller' : 'author'}. Write ${isPictureBook ? 'page' : 'chapter'} ${chapterIndex + 1} for the book "${config.title}".

BOOK CONTEXT:
${bookContext}

${isPictureBook ? 'PAGE' : 'CHAPTER'}-SPECIFIC INSTRUCTIONS:
- Target word count: ${config.wordsPerChapter} words (write AT LEAST this many words!)
- Genre: ${config.genre}
- Style: ${config.writingStyle}
- Tone: ${config.tone}
- ${COMPLEXITY_INSTRUCTIONS[config.complexity]}
- ${POV_INSTRUCTIONS[config.pov]}
- ${TENSE_INSTRUCTIONS[config.tenseStyle]}

CHARACTERS: ${config.mainCharacters}
SETTING: ${config.setting}
MAIN THEMES: ${config.themes.join(', ')}

${previousContext}

${pictureBookInstructions}

${config.customPrompt ? `ADDITIONAL INSTRUCTIONS: ${config.customPrompt}` : ''}

IMPORTANT:
- Write all content in English, regardless of the language of the input description
- Write AT LEAST ${config.wordsPerChapter} words
- Advance the plot
- Reference previous ${isPictureBook ? 'pages' : 'chapters'}
- Keep tone and style consistent
- ${isPictureBook ? 'Use character descriptions for visual consistency' : 'Create vivid, engaging scenes'}
- ${isPictureBook ? 'Each scene should be suitable for an illustration' : 'Build tension and character depth'}

Respond with JSON:
{
  "title": "${isPictureBook ? 'Page' : 'Chapter'} title",
  "content": "Complete ${isPictureBook ? 'page' : 'chapter'} content here... (AT LEAST ${config.wordsPerChapter} words)"
}
`

  try {
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: isPictureBook
            ? `You are an expert in children's books and visual storytelling. Write engaging, age-appropriate stories with consistent characters and clear visual narrative. Always write in English. ALWAYS respond with valid JSON. Write AT LEAST ${config.wordsPerChapter} words per page. Ensure character consistency across all pages.`
            : `You are a bestselling author. Write engaging, detailed chapters. Always write in English. ALWAYS respond with valid JSON. Write AT LEAST ${config.wordsPerChapter} words per chapter.`
        },
        {
          role: 'user',
          content: chapterPrompt
        }
      ],
      max_tokens: Math.max(4000, Math.round(config.wordsPerChapter * 1.5)),
      temperature: 0.8,
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    try {
      const parsedResponse = JSON.parse(rawContent)
      return {
        title: parsedResponse.title || `${isPictureBook ? 'Page' : 'Chapter'} ${chapterIndex + 1}`,
        content: parsedResponse.content || `${isPictureBook ? 'Page' : 'Chapter'} could not be generated.`
      }
    } catch {
      // Fallback parsing
      const lines = rawContent.split('\n')
      const title = lines.find(line => line.includes('title') || line.includes(isPictureBook ? 'Page' : 'Chapter'))?.replace(/[{}"':]/g, '').trim() || `${isPictureBook ? 'Page' : 'Chapter'} ${chapterIndex + 1}`
      const content = rawContent.replace(/```json|```/g, '').replace(/[{}]/g, '').split('content')[1]?.replace(/[":]/g, '').trim() || rawContent

      return { title, content }
    }
  } catch (error) {
    console.error(`Error generating ${isPictureBook ? 'page' : 'chapter'} ${chapterIndex + 1}:`, error)
    return {
      title: `${isPictureBook ? 'Page' : 'Chapter'} ${chapterIndex + 1}`,
      content: `Error generating ${isPictureBook ? 'page' : 'chapter'} ${chapterIndex + 1}. Please try again later.`
    }
  }
}
