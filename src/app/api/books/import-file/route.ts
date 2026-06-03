import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import mammoth from 'mammoth'

// POST /api/books/import-file
// Accepts a multipart/form-data file upload and imports it as a book.
// Supported formats: .doc, .docx, .txt, .json (file upload).
// Handles text extraction from Word documents and plain text files, with automatic
// chapter detection. JSON files are validated and imported directly as structured books.
// For programmatic JSON body imports (no file), use /api/books/import instead.

// PDF text extraction using pdfjs-dist (compatible with Next.js 15 / serverless)
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid bundling issues; disable worker for serverless/Node.js
  const pdfjsLib = await import('pdfjs-dist')

  // In Node.js/serverless environments, PDF.js uses an inline fake worker.
  // Setting workerSrc to '' prevents attempts to load an external worker script.
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const uint8Array = new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
  const pdfDoc = await loadingTask.promise

  const textParts: string[] = []

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textParts.push(pageText)
  }

  return textParts.join('\n\n')
}


export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)

    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Ensure user profile exists
    if (user.email) {
      await ensureUserProfile(user.userId, user.email)
    }

    // Get form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file size (max 15 MB)
    const MAX_FILE_SIZE = 15 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum allowed size is 15 MB.' },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))

    // Validate extension is among supported formats
    const SUPPORTED_EXTENSIONS = ['.doc', '.docx', '.txt', '.json']
    if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
      if (fileExtension === '.pdf') {
        return NextResponse.json(
          { error: 'PDF import is currently unavailable. Please use TXT, DOCX, or JSON files.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Unsupported file format: ${fileExtension}. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    let extractedText = ''
    let bookTitle = file.name.replace(/\.[^/.]+$/, '') // Remove extension

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse based on file type
    switch (fileExtension) {
      case '.pdf':
        try {
          extractedText = await extractTextFromPdf(buffer)
        } catch (err) {
          console.error('[PDF Import]', err)
          throw new Error('PDF file could not be read. Please ensure it is a valid PDF.')
        }
        break


      case '.doc':
      case '.docx':
        try {
          const result = await mammoth.extractRawText({ buffer })
          if (!result.value || result.value.trim().length === 0) {
            throw new Error('The Word document appears to be empty or could not be read. Please check the file and try again.')
          }
          extractedText = result.value
        } catch (e) {
          if (e instanceof Error && e.message.includes('empty or could not be read')) throw e
          throw new Error('The Word document could not be processed. Make sure it is a valid .doc/.docx file.')
        }
        break

      case '.txt':
        extractedText = buffer.toString('utf-8')
        if (!extractedText || extractedText.trim().length === 0) {
          return NextResponse.json({ error: 'The text file is empty.' }, { status: 400 })
        }
        break

      case '.json':
        try {
          const jsonData = JSON.parse(buffer.toString('utf-8'))

          // Validate required fields
          if (!jsonData.title || typeof jsonData.title !== 'string' || !jsonData.title.trim()) {
            throw new Error('JSON must contain a non-empty "title" string field')
          }
          if (!jsonData.genre || typeof jsonData.genre !== 'string' || !jsonData.genre.trim()) {
            throw new Error('JSON must contain a non-empty "genre" string field')
          }

          // Validate optional enum fields
          const bookType = jsonData.book_type || jsonData.bookType || 'text'
          if (!['text', 'picture', 'production'].includes(bookType)) {
            throw new Error(`Invalid book_type "${bookType}". Must be "text", "picture", or "production"`)
          }
          const status = jsonData.status || 'draft'
          if (!['draft', 'generating', 'processing', 'completed', 'error', 'preview'].includes(status)) {
            throw new Error(
              `Invalid status "${status}". Must be "draft", "generating", "processing", "completed", "error", or "preview"`
            )
          }

          // Parse / validate chapters_json
          let chaptersJson = jsonData.chapters_json
          if (typeof chaptersJson === 'string') {
            try {
              JSON.parse(chaptersJson) // validate it is parseable
            } catch {
              throw new Error('chapters_json must be a valid JSON string')
            }
          } else if (chaptersJson && typeof chaptersJson === 'object') {
            chaptersJson = JSON.stringify(chaptersJson)
          }

          // Parse images if needed
          let images = jsonData.images
          if (typeof images === 'string') {
            try {
              images = JSON.parse(images)
            } catch {
              throw new Error('images must be valid JSON')
            }
          }

          // Create the book directly from JSON
          const book = await SupabaseDB.createBook({
            title: jsonData.title.trim(),
            genre: jsonData.genre.trim(),
            description: jsonData.description || '',
            content: jsonData.content || '',
            chapters: typeof jsonData.chapters === 'number' ? jsonData.chapters : 0,
            style: jsonData.style || '',
            target_audience: jsonData.target_audience || jsonData.targetAudience || '',
            book_type: bookType,
            user_id: user.userId,
            status,
            images: images || null,
            chapters_json: chaptersJson || null,
            cover_image: jsonData.cover_image || jsonData.coverImage || null,
            back_cover_image: jsonData.back_cover_image || jsonData.backCoverImage || null,
            back_cover_text: jsonData.back_cover_text || jsonData.backCoverText || null,
            author: jsonData.author || null,
            publisher: jsonData.publisher || null,
            isbn: jsonData.isbn || null,
            publication_date: jsonData.publication_date || jsonData.publicationDate || null
          })

          return NextResponse.json({
            success: true,
            book: {
              ...book,
              chaptersJson: book.chapters_json,
              coverImage: book.cover_image,
              backCoverImage: book.back_cover_image,
              backCoverText: book.back_cover_text,
              bookType: book.book_type,
              targetAudience: book.target_audience,
              publicationDate: book.publication_date,
              createdAt: book.created_at,
              updatedAt: book.updated_at
            }
          })
        } catch (e) {
          // Surface specific validation errors with 400, not 500
          const message = e instanceof Error ? e.message : 'JSON file could not be processed'
          return NextResponse.json({ error: message }, { status: 400 })
        }

      default:
        return NextResponse.json(
          { error: `Unsupported file format: ${fileExtension}. Supported formats: .doc, .docx, .txt, .json` },
          { status: 400 }
        )
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the file')
    }

    // Clean and process text
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Try to detect chapters
    const chapters = detectAndSplitChapters(cleanedText)

    // Extract potential title from first line or use filename
    const lines = cleanedText.split('\n')
    const firstLine = lines[0]?.trim()
    if (firstLine && firstLine.length < 100 && firstLine.length > 3) {
      bookTitle = firstLine
    }

    // Create chapters_json
    const chaptersJson = chapters.map((chapter, index) => ({
      id: String(index + 1),
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.content.split(/\s+/).length
    }))

    // Create the book
    const book = await SupabaseDB.createBook({
      title: bookTitle,
      genre: 'Imported',
      description: `Imported from ${file.name}`,
      content: cleanedText,
      chapters: chapters.length,
      style: '',
      target_audience: '',
      book_type: 'text',
      user_id: user.userId,
      status: 'draft',
      chapters_json: JSON.stringify(chaptersJson)
    })

    return NextResponse.json({
      success: true,
      book: {
        ...book,
        chaptersJson: book.chapters_json,
        coverImage: book.cover_image,
        backCoverImage: book.back_cover_image,
        backCoverText: book.back_cover_text,
        bookType: book.book_type,
        targetAudience: book.target_audience,
        publicationDate: book.publication_date,
        createdAt: book.created_at,
        updatedAt: book.updated_at
      }
    })
  } catch (e) {
    console.error('Error importing file:', e instanceof Error ? e.stack : e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Error importing file'
    }, { status: 500 })
  }
}

// Helper function to detect and split chapters
function detectAndSplitChapters(text: string): { title: string; content: string }[] {
  const chapters: { title: string; content: string }[] = []

  // Common chapter patterns (English and German)
  const chapterPatterns = [
    /^(Kapitel|Chapter|KAPITEL|CHAPTER)\s+(\d+|[IVXLCDM]+)[\s:.-]*(.*?)$/gim,
    /^(\d+)\.\s+(.*?)$/gm,
    /^#{1,3}\s+(.*?)$/gm // Markdown headers
  ]

  let foundChapters = false

  for (const pattern of chapterPatterns) {
    const matches = [...text.matchAll(pattern)]

    if (matches.length >= 2) { // Need at least 2 chapters to be meaningful
      foundChapters = true
      let lastIndex = 0

      matches.forEach((match, index) => {
        const matchIndex = match.index!

        if (index === 0) {
          // Capture any content that appears before the very first chapter heading
          const preChapterContent = text.substring(0, matchIndex).trim()
          if (preChapterContent) {
            chapters.push({
              title: 'Introduction',
              content: preChapterContent
            })
          }
        } else {
          // Content between the previous chapter heading and this one belongs to the previous chapter.
          // Use the previous match's header text as the chapter title (was previously using the
          // last *pushed* chapter title, which caused all intermediate chapters to be mis-titled).
          const prevMatch = matches[index - 1]
          const content = text.substring(lastIndex, matchIndex).trim()
          if (content) {
            chapters.push({
              title: prevMatch[0].trim(),
              content
            })
          }
        }

        lastIndex = matchIndex + match[0].length
      })

      // Add final chapter — content after the last heading
      const finalContent = text.substring(lastIndex).trim()
      if (finalContent) {
        const lastMatch = matches[matches.length - 1]
        chapters.push({
          title: lastMatch[0].trim(),
          content: finalContent
        })
      }

      break
    }
  }

  // If no chapters detected, split by page breaks or create single chapter
  if (!foundChapters || chapters.length === 0) {
    const pageBreaks = text.split(/\f|\n{5,}/)

    if (pageBreaks.length > 1) {
      pageBreaks.forEach((section, index) => {
        const trimmed = section.trim()
        if (trimmed) {
          chapters.push({
            title: `Section ${index + 1}`,
            content: trimmed
          })
        }
      })
    } else {
      // Single chapter for entire document
      chapters.push({
        title: 'Entire text',
        content: text.trim()
      })
    }
  }

  return chapters
}
