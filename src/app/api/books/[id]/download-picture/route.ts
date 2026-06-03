import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { createSignedUrl } from '@/lib/image-storage'
import jsPDF from 'jspdf'

interface BookPage {
  text?: string;
  image?: string;
  panels?: Array<{
    description?: string;
    image?: string;
  }>;
}

type ImageRef = string | { path: string; type?: string }

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

    // Find the picture book
    const book = await SupabaseDB.getBookById(resolvedParams.id, user.userId)
    
    if (book && book.bookType !== 'picture') {
      return NextResponse.json({ error: 'This is not a picture book' }, { status: 400 })
    }

    if (!book || !book.purchased) {
      return NextResponse.json({ error: 'Picture book not found or not purchased' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'txt'

    // Parse the picture book data
    let images: ImageRef[] = []
    let chaptersData: { pages?: Array<{ text?: string; image?: string }> } = {}
    let pages: Array<{ text?: string; image?: string }> = []

    try {
      // Handle images - could be array or JSON string
      if (Array.isArray(book.images)) {
        images = book.images
      } else if (typeof book.images === 'string') {
        images = JSON.parse(book.images)
      } else if (book.images && typeof book.images === 'object') {
        images = Object.values(book.images as Record<string, string>)
      }

      // Handle chapters data - could be object or JSON string
      if (typeof book.chaptersJson === 'string') {
        chaptersData = JSON.parse(book.chaptersJson)
      } else if (book.chaptersJson && typeof book.chaptersJson === 'object') {
        chaptersData = book.chaptersJson
      }

      pages = chaptersData.pages || []
      
      console.error('Debug - Images:', images.length)
      console.error('Debug - Pages:', pages.length)
      console.error('Debug - First page structure:', pages[0])
      
    } catch (parseError) {
      console.error('Error parsing book data:', parseError)
      return NextResponse.json({ error: 'Invalid book data format' }, { status: 500 })
    }

    if (format === 'pdf') {
      const doc = new jsPDF()
      
      // Title page with metadata
      doc.setFontSize(24)
      doc.text(book.title, 105, 40, { align: 'center' })

      doc.setFontSize(14)
      if (book.author) {
        doc.text(`by ${book.author}`, 105, 55, { align: 'center' })
      }
      
      doc.setFontSize(12)
      doc.text(`Genre: ${book.genre}`, 105, 70, { align: 'center' })
      
      if (book.publisher) {
        doc.text(book.publisher, 105, 280, { align: 'center' })
      }
      
      if (book.publicationDate) {
        doc.text(book.publicationDate, 105, 290, { align: 'center' })
      }
      
      if (book.description) {
        doc.setFontSize(10)
        const descLines = doc.splitTextToSize(book.description, 160)
        let yPos = 85
        descLines.forEach((line: string) => {
          if (yPos > 270) {
            doc.addPage()
            yPos = 30
          }
          doc.text(line, 105, yPos, { align: 'center' })
          yPos += 7
        })
      }
      
      // ── Helper: fetch an image URL (signed URL or HTTPS) and return base64 ──
      async function fetchImageAsBase64(imageRef: ImageRef): Promise<{ base64: string; format: string } | null> {
        try {
          let url: string | null = null

          if (typeof imageRef === 'string') {
            // Could be a signed URL, a raw storage path, or a data: URL
            if (imageRef.startsWith('data:')) {
              const [header, b64] = imageRef.split(',')
              const fmt = header.includes('png') ? 'PNG' : 'JPEG'
              return { base64: b64, format: fmt }
            }
            // Always try fresh signed URL first (handles expired signed URLs and storage paths)
            url = await createSignedUrl(imageRef)
            // Fall back to direct URL if signing failed and it is a plain HTTP(S) URL
            if (!url && imageRef.startsWith('http')) {
              url = imageRef
            }
          } else if (imageRef && typeof imageRef === 'object' && 'path' in imageRef) {
            const p = (imageRef as Record<string, unknown>).path
            if (typeof p === 'string') {
              url = await createSignedUrl(p)
            }
          }

          // Resolve relative/local paths to absolute URL (local dev / non-Supabase env)
          if (url && url.startsWith('/') && !url.startsWith('//')) {
            const origin = new URL(request.url).origin
            url = origin + url
          }

          if (!url) return null

          const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) })
          if (!resp.ok) {
            console.warn(`⚠️ Failed to fetch image (${resp.status}): ${url}`)
            return null
          }
          const buffer = Buffer.from(await resp.arrayBuffer())
          const base64 = buffer.toString('base64')
          const format = url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG'
          return { base64, format }
        } catch (err) {
          console.warn('⚠️ Error fetching image:', err)
          return null
        }
      }

      // Process each page directly (no table of contents)
      let imageIndex = 0
      
      for (let i = 0; i < pages.length; i++) {
        const page: BookPage = pages[i]
        doc.addPage()
        
        // Add page number
        doc.setFontSize(8)
        doc.text(`Page ${i + 1}`, 190, 15, { align: 'right' })
        
        let yPosition = 30
        
        // Handle panels on this page
        if (page.panels && Array.isArray(page.panels)) {
          for (let panelIdx = 0; panelIdx < page.panels.length; panelIdx++) {
            const panel = page.panels[panelIdx]
            
            // Add image for this panel if available
            if (imageIndex < images.length) {
              const imagePath = images[imageIndex]
              console.error(`Processing image ${imageIndex}: ${typeof imagePath === 'string' ? imagePath.substring(0, 80) : JSON.stringify(imagePath).substring(0, 80)}`)
              
              const maxWidth = page.panels.length > 1 ? 80 : 160
              const maxHeight = 120
              const xPos = panelIdx === 0 ? 25 : 105

              // Fetch image from Supabase Storage / URL
              const imgData = await fetchImageAsBase64(imagePath)

              if (imgData) {
                const { base64, format } = imgData
                // Use 1:1 square aspect ratio for picture book pages (images are 1024x1024)
                const scaledWidth = Math.min(maxWidth, maxHeight)
                const scaledHeight = scaledWidth

                doc.addImage(
                  `data:image/${format.toLowerCase()};base64,${base64}`,
                  format, xPos, yPosition, scaledWidth, scaledHeight
                )

                // Add panel description below image
                doc.setFontSize(9)
                const textLines = doc.splitTextToSize(panel.description || '', Math.max(scaledWidth - 5, 80))
                let textY = yPosition + scaledHeight + 5
                textLines.forEach((line: string) => {
                  doc.text(line, xPos, textY)
                  textY += 5
                })

                console.error(`✅ Added image ${imageIndex + 1} to PDF`)
              } else {
                // Placeholder when image can't be fetched
                doc.setFontSize(10)
                doc.rect(xPos, yPosition, maxWidth, maxHeight)
                doc.text('Image unavailable', xPos + maxWidth / 2, yPosition + maxHeight / 2, { align: 'center' })
              }

              imageIndex++
            }
          }
          
          // Move to next row
          yPosition += 140
        }
      }
      
      // Back cover if available
      if (book.backCoverText) {
        doc.addPage()
        doc.setFontSize(16)
        doc.text('About this book', 20, 30)
        doc.setFontSize(10)
        const backCoverLines = doc.splitTextToSize(book.backCoverText, 170)
        let backY = 50
        backCoverLines.forEach((line: string) => {
          doc.text(line, 20, backY)
          backY += 7
        })
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${book.title}-PictureBook.pdf"`,
        },
      })
    } else {
      // Generate TXT format for picture book
      let txtContent = `${book.title}\n`
      txtContent += `${'='.repeat(book.title.length)}\n\n`

      if (book.author) {
        txtContent += `Author: ${book.author}\n`
      }
      txtContent += `Genre: ${book.genre}\n`
      if (book.publisher) {
        txtContent += `Publisher: ${book.publisher}\n`
      }
      if (book.publicationDate) {
        txtContent += `Publication Year: ${book.publicationDate}\n`
      }
      if (book.isbn) {
        txtContent += `ISBN: ${book.isbn}\n`
      }
      txtContent += '\n'

      if (book.description) {
        txtContent += `DESCRIPTION:\n${book.description}\n\n`
      }

      txtContent += `PICTURE BOOK CONTENT\n`
      txtContent += `====================\n\n`

      let imageIndex = 0

      pages.forEach((page: { text?: string; image?: string; panels?: Array<{ description?: string }> }, index: number) => {
        txtContent += `--- PAGE ${index + 1} ---\n\n`

        if (page.panels && Array.isArray(page.panels)) {
          page.panels.forEach((panel: { description?: string }, panelIdx: number) => {
            txtContent += `Panel ${panelIdx + 1}:\n`

            if (imageIndex < images.length) {
              const imgRef = images[imageIndex]
              txtContent += `Image: ${typeof imgRef === 'string' ? imgRef : imgRef.path}\n`
              imageIndex++
            }

            if (panel.description && panel.description.trim()) {
              txtContent += `Description: ${panel.description}\n\n`
            }
          })
        }

        txtContent += `${'─'.repeat(40)}\n\n`
      })

      if (book.backCoverText) {
        txtContent += `\n\n${'='.repeat(50)}\n`
        txtContent += `ABOUT THIS BOOK:\n\n`
        txtContent += book.backCoverText
      }

      return new NextResponse(txtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${book.title}-PictureBook.txt"`,
        },
      })
    }

  } catch (error) {
    console.error('Error downloading picture book:', error)
    return NextResponse.json({ error: 'Failed to download picture book' }, { status: 500 })
  }
}
