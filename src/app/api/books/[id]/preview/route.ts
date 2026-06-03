import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

// Configuration for preview limits
const PREVIEW_CONFIG = {
  // Number of chapters to show in preview (minimum)
  minChapters: 2,
  // Percentage of total chapters to show (maximum)
  maxPercentage: 30,
  // Maximum number of chapters to show regardless of percentage
  maxChapters: 5,
  // Maximum characters per chapter in preview
  maxCharsPerChapter: 3000
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)

    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const book = await SupabaseDB.getBookById(resolvedParams.id, user.userId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Parse chapters from the book
    let chapters: { title: string; content: string }[] = []

    // Try to get chapters from chapters_json first
    if (book.chapters_json) {
      try {
        const chaptersData = typeof book.chapters_json === 'string'
          ? JSON.parse(book.chapters_json)
          : book.chapters_json

        if (Array.isArray(chaptersData)) {
          chapters = chaptersData.map(ch => ({
            title: ch.title || 'Untitled Chapter',
            content: ch.content || ''
          }))
        }
      } catch (e) {
        console.error('Error parsing chapters_json:', e)
      }
    }

    // Fallback: parse from content field
    if (chapters.length === 0 && book.content) {
      const sections = book.content.split(/\n\n---\n\n/).filter(Boolean)
      chapters = sections.map((section: string, index: number) => {
        const lines = section.split('\n')
        return {
          title: lines[0]?.trim() || `Chapter ${index + 1}`,
          content: lines.slice(1).join('\n').trim()
        }
      })
    }

    // If still no chapters, create a single chapter from content
    if (chapters.length === 0 && book.content) {
      chapters = [{
        title: book.title,
        content: book.content
      }]
    }

    const totalChapters = chapters.length

    // Calculate how many chapters to show in preview
    let previewChapterCount: number

    if (book.purchased) {
      // If already purchased, show all chapters
      previewChapterCount = totalChapters
    } else {
      // Calculate preview based on configuration
      const percentageBased = Math.ceil(totalChapters * (PREVIEW_CONFIG.maxPercentage / 100))
      previewChapterCount = Math.max(
        PREVIEW_CONFIG.minChapters,
        Math.min(percentageBased, PREVIEW_CONFIG.maxChapters)
      )
      // Don't show more chapters than exist
      previewChapterCount = Math.min(previewChapterCount, totalChapters)
    }

    // Get preview chapters
    const previewChapters = chapters.slice(0, previewChapterCount).map((chapter, index) => {
      let content = chapter.content

      // Truncate chapter content if it's too long (only for preview)
      if (!book.purchased && content.length > PREVIEW_CONFIG.maxCharsPerChapter) {
        content = content.substring(0, PREVIEW_CONFIG.maxCharsPerChapter)
        // Try to break at a sentence or paragraph
        const lastPeriod = content.lastIndexOf('.')
        const lastNewline = content.lastIndexOf('\n')
        const breakPoint = Math.max(lastPeriod, lastNewline)
        if (breakPoint > PREVIEW_CONFIG.maxCharsPerChapter * 0.8) {
          content = content.substring(0, breakPoint + 1)
        }
        content += '\n\n[...]'
      }

      return {
        title: chapter.title,
        content: content,
        isPreview: !book.purchased && index < previewChapterCount
      }
    })

    // Calculate preview percentage
    const previewPercentage = totalChapters > 0
      ? Math.round((previewChapterCount / totalChapters) * 100)
      : 0

    // Return preview data
    return NextResponse.json({
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        description: book.description,
        chapters: book.chapters,
        purchased: book.purchased || false,
        targetAudience: book.target_audience,
        style: book.style
      },
      previewChapters,
      totalChapters,
      previewPercentage,
      isFullAccess: book.purchased || false
    })

  } catch (error) {
    console.error('Error loading book preview:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error loading preview'
    }, { status: 500 })
  }
}
