import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { GenerateBookSchema } from '@/lib/validation'
import { createErrorResponse, logError } from '@/lib/api-errors'
import { checkIsPro } from '@/lib/subscription-utils'

type ChapterData = {
  number: number;
  title: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData = null
    
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.email || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Validate request body with Zod
    const body = await request.json()
    let validatedData

    try {
      validatedData = GenerateBookSchema.parse(body)
    } catch (error) {
      return createErrorResponse(error, 'Invalid request body', 400)
    }

    const { title, genre, description, chapters, style, targetAudience, bookType } = validatedData

    // Create initial empty book structure for the AI editor
    let bookContent = ''
    const chaptersData: ChapterData[] = []
    
    // Create empty chapters that will be generated in the AI editor
    const numberOfChapters = chapters || 5
    
    for (let i = 0; i < numberOfChapters; i++) {
      chaptersData.push({
        number: i + 1,
        title: bookType === 'picture' ? `Page ${i + 1}` : `Chapter ${i + 1}`,
        content: '' // Empty content - will be generated in the editor
      })
    }
    
    // Create minimal readable content for backward compatibility
    bookContent = chaptersData.map((chapter) => 
      `# ${chapter.title}\n\n`
    ).join('\n\n---\n\n')

    // Ensure user profile exists
    console.error('Ensuring user profile exists for:', userData.email)
    const userProfile = await ensureUserProfile(
      userData.userId, 
      userData.email, 
      userData.email.split('@')[0]
    )

        // Check Pro status (used for auto-purchased below)
    const isPro = await checkIsPro(userData.userId)

    // Create book for user
    console.error('Creating book for user:', userProfile.id)
    const savedBook = await SupabaseDB.createBook({
      title,
      genre,
      description: description || '',
      content: bookContent,
      chapters_json: chaptersData.length > 0 ? chaptersData : undefined,
      chapters: numberOfChapters,
      style: style || 'Modern',
      target_audience: targetAudience || 'Allgemein',
      book_type: bookType || 'text',
      user_id: userProfile.id,
      status: 'draft',
      ai_generated: true, // Mark books created through this API as AI-generated

    })

    return NextResponse.json({
      success: true,
      content: bookContent,
      chapters: chaptersData,
      title,
      genre,
      chapterCount: numberOfChapters,
      description: description || '',
      id: savedBook.id
    })

  } catch (error) {
    logError('generate-book', error)
    return createErrorResponse(error, 'Failed to generate book. Please try again.')
  }
}
