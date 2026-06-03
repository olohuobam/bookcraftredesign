import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import jsPDF from 'jspdf'

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

    if (!book || !book.purchased) {
      return NextResponse.json({ error: 'Book not found or not purchased' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'txt'

    if (format === 'pdf') {
      // Generate PDF
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
        doc.addPage()
        doc.setFontSize(16)
        doc.text('Description', 20, 30)
        doc.setFontSize(10)
        const descriptionLines = doc.splitTextToSize(book.description, 170)
        let yPos = 45
        descriptionLines.forEach((line: string) => {
          doc.text(line, 20, yPos)
          yPos += 7
        })
      }
      
      // Table of Contents
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Table of Contents', 20, 30)
      doc.setFontSize(10)
      
      // Parse chapters from content
      const chapters = book.content.split(/\n\n---\n\n/).filter(Boolean)
      let tocY = 50

      chapters.forEach((chapter: string, index: number) => {
        const lines = chapter.split('\n')
        const title = lines[0] || `Chapter ${index + 1}`
        const pageNum = index + 3 // Accounting for title and TOC pages

        doc.text(`${index + 1}. ${title}`, 20, tocY)
        doc.text(`${pageNum}`, 180, tocY, { align: 'right' })
        tocY += 10
        
        if (tocY > 280) {
          doc.addPage()
          tocY = 30
        }
      })
      
      // Content
      let yPosition = 30
      chapters.forEach((chapter: string, index: number) => {
        doc.addPage()
        yPosition = 30
        
        const lines = chapter.split('\n')
        const title = lines[0] || `Chapter ${index + 1}`
        const content = lines.slice(1).join('\n').trim()
        
        // Chapter title
        doc.setFontSize(14)
        doc.text(title, 20, yPosition)
        yPosition += 15
        
        // Chapter content
        doc.setFontSize(10)
        const contentLines = doc.splitTextToSize(content, 170)
        contentLines.forEach((line: string) => {
          if (yPosition > 280) {
            doc.addPage()
            yPosition = 30
          }
          doc.text(line, 20, yPosition)
          yPosition += 7
        })
      })
      
      // Back cover if available
      if (book.backCoverText) {
        doc.addPage()
        doc.setFontSize(16)
        doc.text('About This Book', 20, 30)
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
          'Content-Disposition': `attachment; filename="${book.title}.pdf"`,
        },
      })
    } else {
      // Generate TXT with enhanced metadata
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

      // Table of Contents
      txtContent += `TABLE OF CONTENTS:\n`
      txtContent += `${'='.repeat(17)}\n\n`

      const chapters = book.content.split(/\n\n---\n\n/).filter(Boolean)
      chapters.forEach((chapter: string, index: number) => {
        const lines = chapter.split('\n')
        const title = lines[0] || `Chapter ${index + 1}`
        txtContent += `${index + 1}. ${title}\n`
      })
      txtContent += '\n'

      // Content
      txtContent += `CONTENT:\n`
      txtContent += `${'='.repeat(7)}\n\n`
      txtContent += book.content

      if (book.backCoverText) {
        txtContent += `\n\n${'='.repeat(50)}\n`
        txtContent += `ABOUT THIS BOOK:\n\n`
        txtContent += book.backCoverText
      }
      
      return new NextResponse(txtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${book.title}.txt"`,
        },
      })
    }

  } catch (error) {
    console.error('Error downloading book:', error)
    return NextResponse.json({ error: 'Failed to download book' }, { status: 500 })
  }
}
