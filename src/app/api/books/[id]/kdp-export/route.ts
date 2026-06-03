import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import jsPDF from 'jspdf'
import JSZip from 'jszip'

// KDP Standard Paperback: 6" x 9"
const KDP_WIDTH_IN = 6
const KDP_HEIGHT_IN = 9
// Margins in inches (converted from cm)
// Inner: 1.9cm, Outer: 1.3cm, Top/Bottom: 1.9cm
const KDP_MARGIN_INNER = 0.748 // 1.9cm
const KDP_MARGIN_OUTER = 0.512 // 1.3cm
const KDP_MARGIN_TOP = 0.748 // 1.9cm
const KDP_MARGIN_BOTTOM = 0.748 // 1.9cm

interface BookChapter {
  title: string
  content: string
}

function parseChapters(book: { chapters_json?: unknown; content?: string }): BookChapter[] {
  if (book.chapters_json) {
    try {
      const chaptersData = typeof book.chapters_json === 'string'
        ? JSON.parse(book.chapters_json as string)
        : book.chapters_json

      if (Array.isArray(chaptersData)) {
        return chaptersData.map((ch: { title?: string; content?: string | { content?: string }; name?: string; text?: string }, index: number) => {
          let contentStr = ''
          if (typeof ch.content === 'string') {
            contentStr = ch.content
          } else if (ch.content && typeof ch.content === 'object' && ch.content.content) {
            contentStr = ch.content.content
          }
          return {
            title: ch.title || ch.name || `Chapter ${index + 1}`,
            content: contentStr || ch.text || ''
          }
        })
      }
    } catch {
      // fall through to content parse
    }
  }

  if (book.content) {
    const sections = (book.content as string).split(/\n\n---\n\n/).filter(Boolean)
    return sections.map((section: string, index: number) => {
      const lines = section.split('\n').filter(l => l.trim())
      return {
        title: lines[0]?.trim() || `Chapter ${index + 1}`,
        content: lines.slice(1).join('\n').trim()
      }
    })
  }

  return []
}

function generateKDPPdf(book: {
  title: string
  author?: string
  genre?: string
  publisher?: string
  description?: string
  chapters_json?: unknown
  content?: string
  back_cover_text?: string
}): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: [KDP_WIDTH_IN, KDP_HEIGHT_IN]
  })

  const pageWidth = KDP_WIDTH_IN
  const pageHeight = KDP_HEIGHT_IN
  const contentWidth = pageWidth - KDP_MARGIN_INNER - KDP_MARGIN_OUTER
  const lineHeight = 0.18 // ~1.3 line height at 11pt

  let pageNum = 0

  const addPageNumber = (num: number) => {
    if (num > 1) { // Skip title page
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(String(num), pageWidth / 2, pageHeight - 0.35, { align: 'center' })
    }
  }

  // ── Title Page ──
  pageNum++
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  const titleLines = doc.splitTextToSize(book.title, contentWidth)
  let titleY = 3.2
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, titleY, { align: 'center' })
    titleY += 0.45
  })

  if (book.author) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(14)
    doc.text(`by ${book.author}`, pageWidth / 2, titleY + 0.3, { align: 'center' })
  }

  if (book.publisher) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(book.publisher, pageWidth / 2, pageHeight - 0.7, { align: 'center' })
  }

  // ── Copyright Page ──
  doc.addPage()
  pageNum++
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const year = new Date().getFullYear()
  const copyrightText = book.author
    ? `Copyright © ${year} ${book.author}. All rights reserved.`
    : `Copyright © ${year}. All rights reserved.`
  doc.text(copyrightText, KDP_MARGIN_INNER, KDP_MARGIN_TOP + 0.3)
  doc.text('No part of this publication may be reproduced without permission.', KDP_MARGIN_INNER, KDP_MARGIN_TOP + 0.55)

  // ── Parse Chapters ──
  const chapters = parseChapters(book)

  // ── Table of Contents ──
  if (chapters.length > 0) {
    doc.addPage()
    pageNum++
    const tocStartPage = pageNum

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Table of Contents', pageWidth / 2, KDP_MARGIN_TOP, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    let tocY = KDP_MARGIN_TOP + 0.5

    // Estimate chapter start pages (chapters begin after: title, copyright, TOC)
    let estimatedChapterPage = tocStartPage + 1
    chapters.forEach((chapter, index) => {
      if (tocY > pageHeight - KDP_MARGIN_BOTTOM - 0.2) {
        doc.addPage()
        pageNum++
        tocY = KDP_MARGIN_TOP
      }

      const tocTitle = chapter.title.length > 45
        ? chapter.title.substring(0, 45) + '…'
        : chapter.title

      doc.text(`${index + 1}. ${tocTitle}`, KDP_MARGIN_INNER, tocY)
      doc.text(String(estimatedChapterPage), pageWidth - KDP_MARGIN_OUTER, tocY, { align: 'right' })
      tocY += 0.22

      const estPages = Math.max(1, Math.ceil(chapter.content.length / 1800))
      estimatedChapterPage += estPages
    })

    addPageNumber(tocStartPage)

    // ── Chapter Content ──
    chapters.forEach((chapter, index) => {
      doc.addPage()
      pageNum++
      let yPos = KDP_MARGIN_TOP

      // Chapter heading
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(`Chapter ${index + 1}`, KDP_MARGIN_INNER, yPos)
      yPos += 0.3

      doc.setFontSize(12)
      const chTitleLines = doc.splitTextToSize(chapter.title, contentWidth)
      chTitleLines.forEach((line: string) => {
        doc.text(line, KDP_MARGIN_INNER, yPos)
        yPos += 0.28
      })
      yPos += 0.25

      // Chapter body
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)

      const contentStr = typeof chapter.content === 'string' ? chapter.content : ''
      const paragraphs = contentStr.split(/\n\n+/).filter(p => p.trim())

      paragraphs.forEach(paragraph => {
        const lines = doc.splitTextToSize(paragraph.trim(), contentWidth)
        lines.forEach((line: string) => {
          if (yPos > pageHeight - KDP_MARGIN_BOTTOM - 0.2) {
            addPageNumber(pageNum)
            doc.addPage()
            pageNum++
            yPos = KDP_MARGIN_TOP
          }
          doc.text(line, KDP_MARGIN_INNER, yPos)
          yPos += lineHeight
        })
        yPos += lineHeight * 0.5 // paragraph spacing
      })

      addPageNumber(pageNum)
    })
  }

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

function generateKDPEpub(book: {
  title: string
  author?: string
  language?: string
  genre?: string
  description?: string
  cover_image_url?: string
  chapters_json?: unknown
  content?: string
}): Promise<Buffer> {
  const chapters = parseChapters(book)
  const bookId = `bookcraft-${Date.now()}`
  const lang = book.language || 'en'
  const author = book.author || 'Unknown Author'
  const year = new Date().getFullYear()

  const zip = new JSZip()

  // Required: mimetype (uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // META-INF/container.xml
  zip.folder('META-INF')!.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  const oebps = zip.folder('OEBPS')!

  // Stylesheet
  oebps.file('stylesheet.css', `
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.5;
  margin: 2em 2.5em;
  color: #1a1a1a;
}
h1 { font-size: 1.8em; text-align: center; margin-top: 3em; margin-bottom: 0.5em; }
h2 { font-size: 1.4em; margin-top: 3em; margin-bottom: 1em; page-break-before: always; }
p { text-align: justify; text-indent: 1.5em; margin: 0 0 0.5em 0; }
.title-page { text-align: center; margin-top: 30%; }
.title-page h1 { margin-top: 0; }
.title-page .author { font-size: 1.1em; font-style: italic; margin-top: 1em; }
.copyright { font-size: 0.8em; color: #555; margin-top: 4em; }
`)

  // Title page
  oebps.file('title.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(book.title)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(book.title)}</h1>
    <p class="author">by ${escapeXml(author)}</p>
    ${book.genre ? `<p style="margin-top:2em;font-size:0.9em;color:#666;">${escapeXml(book.genre)}</p>` : ''}
  </div>
</body>
</html>`)

  // Copyright page
  oebps.file('copyright.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>Copyright</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="copyright">
    <p>Copyright &#169; ${year} ${escapeXml(author)}. All rights reserved.</p>
    <p>No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without prior written permission.</p>
    ${book.description ? `<p style="margin-top:2em;font-style:italic;">${escapeXml(book.description)}</p>` : ''}
  </div>
</body>
</html>`)

  // Chapter files
  const chapterItems: string[] = []
  const chapterSpine: string[] = []
  const tocEntries: string[] = []
  const navPoints: string[] = []

  chapters.forEach((chapter, index) => {
    const chapterId = `chapter${index + 1}`
    const chapterFile = `${chapterId}.xhtml`
    chapterItems.push(`<item id="${chapterId}" href="${chapterFile}" media-type="application/xhtml+xml"/>`)
    chapterSpine.push(`<itemref idref="${chapterId}"/>`)
    tocEntries.push(`<li><a href="${chapterFile}">${escapeXml(chapter.title)}</a></li>`)
    navPoints.push(`<navPoint id="navpoint-${index + 1}" playOrder="${index + 3}">
      <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
      <content src="${chapterFile}"/>
    </navPoint>`)

    const contentStr = typeof chapter.content === 'string' ? chapter.content : ''
    const paragraphs = contentStr.split(/\n\n+/).filter(p => p.trim())
    const paragraphsHtml = paragraphs
      .map(p => `  <p>${escapeXml(p.trim())}</p>`)
      .join('\n')

    oebps.file(chapterFile, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <h2>Chapter ${index + 1}</h2>
  <h2 style="margin-top:0.5em;font-size:1.1em;">${escapeXml(chapter.title)}</h2>
${paragraphsHtml}
</body>
</html>`)
  })

  // Navigation document (EPUB 3)
  oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="title.xhtml">Title Page</a></li>
${tocEntries.map(e => `      ${e}`).join('\n')}
    </ol>
  </nav>
</body>
</html>`)

  // toc.ncx (EPUB 2 compatibility)
  oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`)

  // content.opf
  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:date>${year}</dc:date>
    ${book.genre ? `<dc:subject>${escapeXml(book.genre)}</dc:subject>` : ''}
    ${book.description ? `<dc:description>${escapeXml(book.description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="stylesheet" href="stylesheet.css" media-type="text/css"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
    <item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>
    ${chapterItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    <itemref idref="title"/>
    <itemref idref="copyright"/>
    ${chapterSpine.join('\n    ')}
  </spine>
</package>`)

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // KDP export requires purchased — no Pro bypass
    if (!book.purchased) {
      return NextResponse.json(
        { error: 'KDP export requires book purchase.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format') || 'pdf').toLowerCase()

    const safeTitle = book.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'book'

    if (format === 'pdf') {
      const pdfBuffer = generateKDPPdf(book)
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeTitle}-KDP.pdf"`,
        },
      })
    }

    if (format === 'epub') {
      const epubBuffer = await generateKDPEpub(book)
      return new NextResponse(new Uint8Array(epubBuffer), {
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Disposition': `attachment; filename="${safeTitle}-KDP.epub"`,
        },
      })
    }

    return NextResponse.json({ error: 'Unsupported format. Use pdf or epub.' }, { status: 400 })

  } catch (error) {
    console.error('KDP export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'KDP export failed' },
      { status: 500 }
    )
  }
}
