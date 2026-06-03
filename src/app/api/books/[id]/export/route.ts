import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { generateEPUB, generateMOBIHTML } from '@/lib/export-utils'
import { checkIsPro } from '@/lib/subscription-utils'
import { refreshSignedUrls } from '@/lib/image-storage'
import { getImageCountForLayout, type PageLayout } from '@/types/picturebook'
import jsPDF from 'jspdf'

// Photobook PDFs fetch and embed images, which can take a while.
export const maxDuration = 60

interface PhotobookPhoto {
  url: string
  caption?: string
}

interface PictureBookPage {
  text?: string
  panels: Array<{ url: string; description?: string }>
}

function extractPhotobookPhotos(chaptersJson: unknown): PhotobookPhoto[] {
  let cj = chaptersJson
  if (typeof cj === 'string') {
    try { cj = JSON.parse(cj) } catch { return [] }
  }
  const obj = cj as { isPhotobook?: boolean; pages?: Array<{ photos?: Array<{ url?: string; caption?: string }> }> } | null
  if (!obj || obj.isPhotobook !== true || !Array.isArray(obj.pages)) return []

  const photos: PhotobookPhoto[] = []
  for (const page of obj.pages) {
    for (const photo of page?.photos ?? []) {
      if (photo?.url) photos.push({ url: photo.url, caption: photo.caption })
    }
  }
  return photos
}

// Pull picture-book pages out of chapters_json. Handles multiple shapes:
// - editor: { type: 'picture', pages: [...] }
// - generator: { pictureBookConfig: { pages: [...] }, imagesPerPage }
// Falls back to the flat book.images array indexed cumulatively across pages.
function extractPictureBookPages(
  chaptersJson: unknown,
  flatImageUrls: (string | null)[]
): PictureBookPage[] {
  let cj = chaptersJson
  if (typeof cj === 'string') {
    try { cj = JSON.parse(cj) } catch { return [] }
  }
  const root = cj as {
    type?: string
    imagesPerPage?: number
    pages?: PicturePageLike[]
    pictureBookConfig?: {
      imagesPerPage?: number
      pages?: PicturePageLike[]
    }
  } | null
  if (!root) return []

  const cfgPages = root.pictureBookConfig?.pages
  const directPages = root.pages
  const pages: PicturePageLike[] | undefined = Array.isArray(cfgPages)
    ? cfgPages
    : Array.isArray(directPages)
      ? directPages
      : undefined
  if (!pages) return []

  const globalPerPage = Math.max(1, root.pictureBookConfig?.imagesPerPage || root.imagesPerPage || 1)

  const result: PictureBookPage[] = []
  let flatCursor = 0
  for (const page of pages) {
    const expected = page.layout
      ? getImageCountForLayout(page.layout)
      : (Array.isArray(page.panels) ? page.panels.length : globalPerPage)
    const panels: PictureBookPage['panels'] = []
    for (let i = 0; i < expected; i++) {
      const panel = page.panels?.[i]
      const inline = panel?.imageUrl
      const url = inline || flatImageUrls[flatCursor + i] || null
      if (url) panels.push({ url, description: panel?.description })
    }
    flatCursor += expected
    // Stop at the first page that should have had images but doesn't —
    // that's where the free preview cut off for unpurchased books.
    if (expected > 0 && panels.length === 0) break
    if (panels.length > 0 || page.text?.trim()) {
      result.push({ text: page.text, panels })
    }
  }
  return result
}

type PicturePageLike = {
  number?: number
  pageIndex?: number
  layout?: PageLayout
  text?: string
  panels?: Array<{ panelIndex?: number; imageUrl?: string; description?: string; imagePrompt?: string }>
}

async function fetchImageData(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) return url

    const cleaned = url.split('#')[0]

    let parsed: URL
    try {
      parsed = new URL(cleaned)
    } catch {
      return null
    }

    if (parsed.protocol !== 'https:') return null

    const allowedHosts = new Set<string>()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL
    try { if (supabaseUrl) allowedHosts.add(new URL(supabaseUrl).hostname) } catch {}
    try { if (cdnUrl) allowedHosts.add(new URL(cdnUrl).hostname) } catch {}

    if (allowedHosts.size === 0 || !allowedHosts.has(parsed.hostname)) {
      console.warn(`[export] Blocked image host: ${parsed.hostname}. Allowed: ${[...allowedHosts].join(', ') || '(none — env missing)'}`)
      return null
    }

    const res = await fetch(cleaned)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.warn('[export] Failed to fetch image:', err)
    return null
  }
}

type ImagePropsLike = { width: number; height: number; fileType: string }
function getImageProps(doc: jsPDF, data: string): ImagePropsLike | null {
  try {
    return (doc as unknown as { getImageProperties: (d: string) => ImagePropsLike })
      .getImageProperties(data)
  } catch {
    return null
  }
}

function getPageCount(doc: jsPDF): number {
  return (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
}

// Full-bleed cover image. Falls back to a minimal centered title-only page
// when no cover image is available.
function drawCoverPage(
  doc: jsPDF,
  book: { title: string; author?: string },
  coverImage?: { data: string; fileType: string }
) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  if (coverImage) {
    const props = getImageProps(doc, coverImage.data)
    if (props) {
      // Cover-fit (no whitespace, may crop slightly to fill A4).
      const r = Math.max(w / props.width, h / props.height)
      const iw = props.width * r
      const ih = props.height * r
      doc.addImage(coverImage.data, coverImage.fileType, (w - iw) / 2, (h - ih) / 2, iw, ih)
      return
    }
  }

  // Plain text fallback when no cover exists.
  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text(book.title, w / 2, h / 2 - 4, { align: 'center', maxWidth: w - 40 })
  if (book.author) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(14)
    doc.text(`by ${book.author}`, w / 2, h / 2 + 12, { align: 'center' })
  }
}

function drawBackCover(doc: jsPDF, text: string, backCoverImage?: { data: string; fileType: string }) {
  doc.addPage()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  if (backCoverImage) {
    const props = getImageProps(doc, backCoverImage.data)
    if (props) {
      const r = Math.max(w / props.width, h / props.height)
      const iw = props.width * r
      const ih = props.height * r
      doc.addImage(backCoverImage.data, backCoverImage.fileType, (w - iw) / 2, (h - ih) / 2, iw, ih)
      return
    }
  }

  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('About this book', w / 2, 40, { align: 'center', charSpace: 1 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  const lines = doc.splitTextToSize(text, w - 60)
  doc.text(lines, w / 2, 60, { align: 'center', maxWidth: w - 60, lineHeightFactor: 1.5 })
}

function drawRunningHeader(doc: jsPDF, bookTitle: string) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(140, 140, 140)
  doc.text(bookTitle, w / 2, 12, { align: 'center', maxWidth: w - 40 })
  doc.setTextColor(20, 20, 20)
}

function drawPageNumber(doc: jsPDF, n: number) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(140, 140, 140)
  doc.text(String(n), w / 2, h - 10, { align: 'center' })
  doc.setTextColor(20, 20, 20)
}

async function loadCoverImage(
  doc: jsPDF,
  raw: unknown
): Promise<{ data: string; fileType: string } | undefined> {
  if (!raw) return undefined
  const [refreshed] = await refreshSignedUrls([raw as Parameters<typeof refreshSignedUrls>[0][number]])
  const url = refreshed?.signedUrl
  if (!url) return undefined
  const data = await fetchImageData(url)
  if (!data) return undefined
  const props = getImageProps(doc, data)
  if (!props) return undefined
  return { data, fileType: props.fileType }
}

async function buildPhotobookPdf(
  book: { title: string; author?: string; cover_image?: unknown; back_cover_image?: unknown; back_cover_text?: string },
  photos: PhotobookPhoto[]
): Promise<Buffer> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18

  const coverData = await loadCoverImage(doc, book.cover_image)
  drawCoverPage(doc, book, coverData)

  const refreshed = await refreshSignedUrls(photos.map(p => p.url))

  for (let i = 0; i < photos.length; i++) {
    doc.addPage()
    const caption = photos[i].caption?.trim() || ''
    const captionSpace = caption ? 22 : 0
    const availW = pageW - margin * 2
    const availH = pageH - margin * 2 - captionSpace

    const url = refreshed[i]?.signedUrl || photos[i].url
    const data = await fetchImageData(url)
    if (data) {
      const props = getImageProps(doc, data)
      if (props) {
        const r = Math.min(availW / props.width, availH / props.height)
        const iw = props.width * r
        const ih = props.height * r
        doc.addImage(data, props.fileType, (pageW - iw) / 2, margin + (availH - ih) / 2, iw, ih)
      }
    }

    if (caption) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      const lines = doc.splitTextToSize(caption, availW)
      doc.text(lines, pageW / 2, pageH - margin - 6, { align: 'center' })
      doc.setTextColor(20, 20, 20)
    }

    drawPageNumber(doc, i + 1)
  }

  const backCoverData = await loadCoverImage(doc, book.back_cover_image)
  if (backCoverData || book.back_cover_text) {
    drawBackCover(doc, book.back_cover_text || '', backCoverData)
  }

  return Buffer.from(doc.output('arraybuffer'))
}

async function buildPictureBookPdf(
  book: { title: string; author?: string; cover_image?: unknown; back_cover_image?: unknown; back_cover_text?: string },
  pages: PictureBookPage[]
): Promise<Buffer> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 16

  const coverData = await loadCoverImage(doc, book.cover_image)
  drawCoverPage(doc, book, coverData)

  // Fetch every image once, in order.
  const allUrls = pages.flatMap(p => p.panels.map(panel => panel.url))
  const fetched = await Promise.all(allUrls.map(fetchImageData))
  const urlToData = new Map<string, string | null>()
  allUrls.forEach((u, i) => urlToData.set(u, fetched[i]))

  let pageNumber = 0
  for (const page of pages) {
    doc.addPage()
    pageNumber++
    const text = page.text?.trim() || ''
    const textSpace = text ? 34 : 0
    const availW = pageW - margin * 2
    const availH = pageH - margin * 2 - textSpace

    const n = page.panels.length
    if (n > 0) {
      const cols = n <= 1 ? 1 : 2
      const rows = Math.ceil(n / cols)
      const gap = n > 1 ? 4 : 0
      const cellW = (availW - gap * (cols - 1)) / cols
      const cellH = (availH - gap * (rows - 1)) / rows

      for (let i = 0; i < n; i++) {
        const data = urlToData.get(page.panels[i].url) || null
        if (!data) continue
        const props = getImageProps(doc, data)
        if (!props) continue

        const col = i % cols
        const row = Math.floor(i / cols)
        const cellX = margin + col * (cellW + gap)
        const cellY = margin + row * (cellH + gap)
        const r = Math.min(cellW / props.width, cellH / props.height)
        const iw = props.width * r
        const ih = props.height * r
        doc.addImage(data, props.fileType, cellX + (cellW - iw) / 2, cellY + (cellH - ih) / 2, iw, ih)
      }
    }

    if (text) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(13)
      doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(text, availW - 10)
      doc.text(lines, pageW / 2, pageH - margin - 20, { align: 'center', maxWidth: availW - 10, lineHeightFactor: 1.45 })
      doc.setTextColor(20, 20, 20)
    }

    drawPageNumber(doc, pageNumber)
  }

  const backCoverData = await loadCoverImage(doc, book.back_cover_image)
  if (backCoverData || book.back_cover_text) {
    drawBackCover(doc, book.back_cover_text || '', backCoverData)
  }

  return Buffer.from(doc.output('arraybuffer'))
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

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'

    const lowerFormat = format.toLowerCase()
    const proOnlyFormats = ['epub', 'mobi', 'azw']
    const isPro = await checkIsPro(user.userId)

    if (proOnlyFormats.includes(lowerFormat) && !isPro) {
      return NextResponse.json(
        {
          error: 'upgrade_required',
          message: 'EPUB and MOBI export requires a Pro subscription. Upgrade auf Pro für EPUB & MOBI Export.',
        },
        { status: 403 }
      )
    }

    switch (format.toLowerCase()) {
      case 'epub': {
        const epubBuffer = await generateEPUB(book, {
          includeMetadata: true,
          includeTOC: true,
          includeBackCover: true
        })

        return new NextResponse(new Uint8Array(epubBuffer), {
          headers: {
            'Content-Type': 'application/epub+zip',
            'Content-Disposition': `attachment; filename="${book.title}.epub"`,
          },
        })
      }

      case 'mobi':
      case 'azw': {
        const mobiHTML = generateMOBIHTML(book)

        return new NextResponse(mobiHTML, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${book.title}.html"`,
          },
        })
      }

      case 'pdf': {
        const photobookPhotos = extractPhotobookPhotos(book.chapters_json)
        if (photobookPhotos.length > 0) {
          const pdfBuffer = await buildPhotobookPdf(book, photobookPhotos)
          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${book.title}.pdf"`,
            },
          })
        }

        if (book.book_type === 'picture') {
          const rawImages = Array.isArray(book.images) ? book.images : []
          const resolved = await refreshSignedUrls(rawImages)
          const resolvedUrls = resolved.map(a => a?.signedUrl || null)
          const picturePages = extractPictureBookPages(book.chapters_json, resolvedUrls)
          if (picturePages.length > 0) {
            const pdfBuffer = await buildPictureBookPdf(book, picturePages)
            return new NextResponse(new Uint8Array(pdfBuffer), {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${book.title}.pdf"`,
              },
            })
          }
        }

        // Text book — book-style layout with branded cover, justified prose,
        // running header, page numbers and a TOC with leader dots.
        const doc = new jsPDF({ format: 'a4', unit: 'mm' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const marginX = 24
        const marginTop = 26
        const marginBottom = 22
        const contentW = pageW - marginX * 2

        // Parse chapters first so we know the count before reserving TOC pages.
        let chapters: { title: string; content: string }[] = []
        if (book.chapters_json) {
          try {
            const chaptersData = typeof book.chapters_json === 'string'
              ? JSON.parse(book.chapters_json)
              : book.chapters_json

            if (Array.isArray(chaptersData)) {
              chapters = chaptersData.map(ch => {
                let contentStr = ''
                if (typeof ch.content === 'string') contentStr = ch.content
                else if (ch.content && typeof ch.content === 'object' && ch.content.content) contentStr = ch.content.content
                return { title: ch.title || 'Untitled Chapter', content: contentStr || '' }
              })
            }
          } catch (e) {
            console.error('Error parsing chapters:', e)
          }
        }
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

        // 1) Cover — full-bleed cover image if the book has one
        const coverData = await loadCoverImage(doc, book.cover_image)
        drawCoverPage(doc, book, coverData)

        // 2) Description page
        if (book.description) {
          doc.addPage()
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(11)
          doc.setTextColor(110, 110, 110)
          doc.text('DESCRIPTION', pageW / 2, marginTop + 8, { align: 'center', charSpace: 2 })
          doc.setDrawColor(180, 180, 180)
          doc.setLineWidth(0.3)
          doc.line(pageW / 2 - 18, marginTop + 12, pageW / 2 + 18, marginTop + 12)

          doc.setTextColor(40, 40, 40)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(12)
          const descLines = doc.splitTextToSize(book.description, contentW - 20)
          doc.text(descLines, pageW / 2, marginTop + 28, {
            align: 'center',
            maxWidth: contentW - 20,
            lineHeightFactor: 1.6,
          })
          doc.setTextColor(20, 20, 20)
        }

        // 3) Reserve TOC pages (about 28 entries per page).
        const tocStartPage = chapters.length > 0 ? getPageCount(doc) + 1 : 0
        const tocPageCount = chapters.length > 0 ? Math.max(1, Math.ceil(chapters.length / 28)) : 0
        for (let i = 0; i < tocPageCount; i++) doc.addPage()

        // 4) Chapters — render and remember each one's printed page label
        // (PDF page minus the cover, since the cover doesn't get a number).
        const chapterStarts: number[] = []
        chapters.forEach((chapter, index) => {
          doc.addPage()
          chapterStarts.push(getPageCount(doc) - 1)

          // Chapter opener — eyebrow + title + rule
          let y = marginTop + 24
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(120, 120, 120)
          doc.text(`CHAPTER ${index + 1}`, pageW / 2, y, { align: 'center', charSpace: 3 })
          y += 10

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(22)
          doc.setTextColor(20, 20, 20)
          const titleLines = doc.splitTextToSize(chapter.title, contentW)
          doc.text(titleLines, pageW / 2, y, { align: 'center' })
          y += titleLines.length * 9

          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.3)
          doc.line(pageW / 2 - 14, y + 2, pageW / 2 + 14, y + 2)
          y += 16

          // Body
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(11)
          doc.setTextColor(30, 30, 30)
          const contentStr = typeof chapter.content === 'string' ? chapter.content : String(chapter.content || '')
          const paragraphs = contentStr.split('\n\n').filter(p => p.trim())

          paragraphs.forEach(paragraph => {
            const lines = doc.splitTextToSize(paragraph.replace(/\n/g, ' ').trim(), contentW)
            const lineH = 5.6
            const blockH = lines.length * lineH
            if (y + blockH > pageH - marginBottom) {
              doc.addPage()
              y = marginTop
            }
            doc.text(lines, marginX, y, {
              maxWidth: contentW,
              align: 'justify',
              lineHeightFactor: 1.5,
            })
            y += blockH + 3
          })
          doc.setTextColor(20, 20, 20)
        })

        // 5) Back cover — use back_cover_image if available, otherwise text page
        const backCoverData = await loadCoverImage(doc, book.back_cover_image)
        if (backCoverData || book.back_cover_text) {
          drawBackCover(doc, book.back_cover_text || '', backCoverData)
        }

        // 6) Fill in the reserved TOC pages now that we know real page numbers.
        if (tocPageCount > 0) {
          const entriesPerPage = 28
          for (let p = 0; p < tocPageCount; p++) {
            doc.setPage(tocStartPage + p)
            // Heading on the first TOC page only.
            let y = marginTop + 8
            if (p === 0) {
              doc.setFont('helvetica', 'bold')
              doc.setFontSize(11)
              doc.setTextColor(110, 110, 110)
              doc.text('TABLE OF CONTENTS', pageW / 2, y, { align: 'center', charSpace: 2 })
              doc.setDrawColor(180, 180, 180)
              doc.setLineWidth(0.3)
              doc.line(pageW / 2 - 24, y + 4, pageW / 2 + 24, y + 4)
              y += 22
            }

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(11)
            doc.setTextColor(30, 30, 30)
            const start = p * entriesPerPage
            const end = Math.min(chapters.length, start + entriesPerPage)
            for (let i = start; i < end; i++) {
              const title = `${i + 1}. ${chapters[i].title}`
              const pageNum = String(chapterStarts[i])
              const numW = doc.getTextWidth(pageNum)
              const titleW = doc.getTextWidth(title)
              // Leader dots between title and page number.
              const dotsAvail = contentW - titleW - numW - 4
              const dotW = doc.getTextWidth('.')
              const dotCount = Math.max(3, Math.floor(dotsAvail / dotW))
              const leader = ' ' + '.'.repeat(dotCount) + ' '
              doc.text(title + leader, marginX, y)
              doc.text(pageNum, pageW - marginX, y, { align: 'right' })
              y += 8
            }
            doc.setTextColor(20, 20, 20)
          }
        }

        // 7) Add running header + page numbers on every content page (skip
        // cover at page 1 and the optional back cover at the last page).
        const total = getPageCount(doc)
        const hasBackCover = !!(backCoverData || book.back_cover_text)
        for (let i = 2; i <= total; i++) {
          if (hasBackCover && i === total) continue
          doc.setPage(i)
          drawRunningHeader(doc, book.title)
          drawPageNumber(doc, i - 1)
        }

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${book.title}.pdf"`,
          },
        })
      }

      case 'txt': {
        let txtContent = `${book.title}\n`
        txtContent += `${'='.repeat(book.title.length)}\n\n`

        if (book.author) {
          txtContent += `Author: ${book.author}\n`
        }
        txtContent += `Genre: ${book.genre}\n`
        if (book.publisher) {
          txtContent += `Publisher: ${book.publisher}\n`
        }
        if (book.publication_date) {
          txtContent += `Publication Year: ${book.publication_date}\n`
        }
        txtContent += '\n'

        if (book.description) {
          txtContent += `DESCRIPTION:\n${book.description}\n\n`
        }

        txtContent += `${'='.repeat(50)}\n\n`
        txtContent += book.content

        if (book.back_cover_text) {
          txtContent += `\n\n${'='.repeat(50)}\n`
          txtContent += `ABOUT THIS BOOK:\n\n${book.back_cover_text}`
        }

        return new NextResponse(txtContent, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${book.title}.txt"`,
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error exporting book:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to export book'
    }, { status: 500 })
  }
}
