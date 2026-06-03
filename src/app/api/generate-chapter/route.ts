import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import OpenAI from 'openai'
import { GenerateChapterSchema } from '@/lib/validation'
import { validateRequest } from '@/lib/validation-helper'

// Configure runtime for longer execution
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for individual chapter generation

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // User profile should already exist from authentication
    // No need to ensure profile exists here

    // Validate request body
    const validation = await validateRequest(await request.json(), GenerateChapterSchema)
    if (!validation.success) {
      return validation.response
    }

    const {
      bookId,
      chapterIndex,
      title,
      description,
      genre,
      style,
      targetAudience,
      bookType,
      context,
      prompt
    } = validation.data

    if (!bookId || chapterIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if book exists and belongs to user
    const book = await SupabaseDB.getBook(bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    
    if (book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create chapter-specific prompt with full context
    const isPictureBook = bookType === 'picture'
    const chapterPrompt = `
Generate ${isPictureBook ? 'a short, child-appropriate story for this page' : 'a detailed chapter'} for:

Book: "${title}"
Description: ${description}
Genre: ${genre}
Style: ${style}
Target audience: ${targetAudience}
${isPictureBook ? 'Page' : 'Chapter'}: ${chapterIndex + 1}

${context ? `IMPORTANT CONTEXT - Previous ${isPictureBook ? 'pages' : 'chapters'}:\n${context}` : ''}

${prompt ? `Additional instructions: ${prompt}` : ''}

${isPictureBook
  ? `PICTURE BOOK SPECIFIC INSTRUCTIONS:
- Write short, simple texts (1-3 sentences per section)
- Focus on visual descriptions and actions
- Ensure characters are described consistently with previous pages
- Use simple, child-appropriate language but with emotional depth
- Each text section should be suitable for an illustration
- Mark important visual elements with [IMAGE: detailed scene description]
- Ensure continuous character development even with short texts
- The text should fit the story and previous pages
- Build tension and curiosity for the next page`
  : `TEXT BOOK INSTRUCTIONS:
- Write an exciting chapter with rich descriptions and engaging narrative
- Reference previous chapters and advance the story
- Ensure character development and plot progression
- Use literary techniques for tension and atmosphere`
}

IMPORTANT: Write all content in English, regardless of the language of the input description.

Respond EXCLUSIVELY with a valid JSON object in the following format (without additional text or markdown):
{
  "title": "Title of the ${isPictureBook ? 'page' : 'chapter'}",
  "content": "${isPictureBook ? 'Short, visual text for children\'s book with [IMAGE: description] markers' : 'Detailed chapter content with rich descriptions'}"
}
`

    try {
      const openai = getOpenAI()
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: isPictureBook
              ? `You are an expert in children's books and visual storytelling. Write engaging, age-appropriate stories with consistent characters and clear visual narrative. Always write in English. ALWAYS respond with valid JSON. Ensure character consistency across all pages.`
              : `You are a professional author specializing in creative writing. Always write in English.

IMPORTANT: You must respond ONLY with a valid JSON object. Do not include any other text, explanations, or markdown formatting. Your response must be parseable by JSON.parse().

Example response format:
{"title": "Chapter Title", "content": "Chapter content here..."}`
          },
          {
            role: "user",
            content: chapterPrompt
          }
        ],
        max_tokens: bookType === 'picture' ? 500 : 2000,
        temperature: 0.7,
      })

      const rawContent = completion.choices[0]?.message?.content || ''
      console.error('Raw AI response:', rawContent)
      
      // Try to extract JSON from the response
      let parsedResponse;
      try {
        // First try to parse as direct JSON
        parsedResponse = JSON.parse(rawContent)
      } catch {
        // If that fails, try to extract JSON from markdown code blocks or other formats
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedResponse = JSON.parse(jsonMatch[0])
          } catch {
            // If JSON parsing completely fails, create a fallback response
            console.error('Failed to parse JSON, creating fallback response:', rawContent)
            parsedResponse = {
              title: `${bookType === 'picture' ? 'Page' : 'Chapter'} ${chapterIndex + 1}`,
              content: rawContent.replace(/```json|```/g, '').trim()
            }
          }
        } else {
          // No JSON structure found, use raw content
          console.error('No JSON structure found, using raw content:', rawContent)
          parsedResponse = {
            title: `${bookType === 'picture' ? 'Page' : 'Chapter'} ${chapterIndex + 1}`,
            content: rawContent.trim()
          }
        }
      }

      return NextResponse.json({
        success: true,
        chapter: {
          title: parsedResponse.title || `${bookType === 'picture' ? 'Page' : 'Chapter'} ${chapterIndex + 1}`,
          content: parsedResponse.content || 'Content could not be generated. Please try again.'
        }
      })

    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      return NextResponse.json({ 
        error: 'Failed to generate chapter. Please check your OpenAI API key and try again.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
