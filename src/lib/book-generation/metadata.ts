import { createBook, updateBook, ensureUserExists } from '@/lib/db-utils'
import { BookConfig, ChapterData } from './types'

export async function createBookInDatabase(
  config: BookConfig,
  userId: string,
  userEmail: string
): Promise<string> {
  await ensureUserExists(userId, userEmail)

  const book = await createBook({
    title: config.title,
    genre: config.genre,
    description: config.description,
    content: 'Being generated...',
    chapters: config.totalChapters,
    style: config.writingStyle || 'Modern',
    target_audience: config.targetAudience || 'General',
    book_type: config.bookType,
    user_id: userId,
    status: 'generating'
  })

  return book.id
}

export async function updateBookInDatabase(
  bookId: string,
  chapters: ChapterData[]
): Promise<void> {
  const fullContent = chapters
    .map(ch => `# ${ch.title}\n\n${ch.content}`)
    .join('\n\n---\n\n')

  const chaptersJson = JSON.stringify(chapters.map((ch, index) => ({
    number: index + 1,
    title: ch.title,
    content: ch.content,
    images: ch.images || []
  })))

  await updateBook(bookId, {
    content: fullContent,
    chapters_json: chaptersJson,
    status: 'generating'
  })
}

export async function finalizeBookInDatabase(bookId: string, chapters?: ChapterData[]): Promise<void> {
  // Calculate word count from generated chapters
  const word_count = chapters
    ? chapters.reduce((total, ch) => {
        if (!ch.content) return total
        return total + ch.content.split(/\s+/).filter(Boolean).length
      }, 0)
    : undefined

  await updateBook(bookId, {
    status: 'completed',
    ...(word_count !== undefined && { word_count }),
  })
}
