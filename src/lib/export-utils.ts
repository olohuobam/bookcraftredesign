import { Book } from '@/lib/supabase-db'
import JSZip from 'jszip'

export interface ExportOptions {
 includeMetadata?: boolean
 includeTOC?: boolean
 includeBackCover?: boolean
 fontSize?: number
 fontFamily?: string
}

/**
 * Generate EPUB file for a book
 * EPUB is a standard e-book format based on HTML and CSS
 */
export async function generateEPUB(book: Book, options: ExportOptions = {}): Promise<Buffer> {
 const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
 includeMetadata = true,
 includeTOC = true,
 includeBackCover = true,
 fontSize = 12,
 fontFamily = 'Georgia, serif'
 } = options

 const zip = new JSZip()

  // Required EPUB structure
 zip.file('mimetype', 'application/epub+zip')

  // META-INF/container.xml
 const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
 <rootfiles>
 <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
 </rootfiles>
</container>`
 zip.folder('META-INF')!.file('container.xml', containerXml)

  // Parse chapters
 const chapters = parseChapters(book)

  // OEBPS/content.opf (package document)
 const contentOpf = generateContentOPF(book, chapters, includeBackCover)
 zip.folder('OEBPS')!.file('content.opf', contentOpf)

  // OEBPS/toc.ncx (navigation)
 const tocNcx = generateTocNCX(book, chapters, includeBackCover)
 zip.folder('OEBPS')!.file('toc.ncx', tocNcx)

  // OEBPS/stylesheet.css
 const stylesheet = `
body {
 font-family: ${fontFamily};
 font-size: ${fontSize}pt;
 line-height: 1.6;
 margin: 2em;
}

h1 {
 font-size: 2em;
 margin-bottom: 1em;
 text-align: center;
}

h2 {
 font-size: 1.5em;
 margin-top: 2em;
 margin-bottom: 1em;
 page-break-before: always;
}

p {
 text-align: justify;
 margin-bottom: 1em;
 text-indent: 1.5em;
}

.title-page {
 text-align: center;
 margin-top: 30%;
}

.author {
 font-size: 1.2em;
 font-style: italic;
 margin-top: 2em;
}

.metadata {
 margin-top: 4em;
 font-size: 0.9em;
 color: #666;
}

.toc {
 margin-top: 2em;
}

.toc ul {
 list-style: none;
 padding: 0;
}

.toc li {
 margin-bottom: 0.5em;
}

.chapter-title {
 font-size: 1.8em;
 margin-bottom: 1.5em;
}
`
 zip.folder('OEBPS')!.file('stylesheet.css', stylesheet)

  // Title page
 const titlePage = generateTitlePage(book)
 zip.folder('OEBPS')!.file('title.xhtml', titlePage)

  // Table of Contents (if enabled)
 if (includeTOC) {
 const tocPage = generateTOCPage(chapters)
 zip.folder('OEBPS')!.file('toc.xhtml', tocPage)
 }

  // Chapter files
 chapters.forEach((chapter, index) => {
 const chapterHtml = generateChapterHTML(chapter, index + 1)
 zip.folder('OEBPS')!.file(`chapter${index + 1}.xhtml`, chapterHtml)
 })

  // Back cover (if available and enabled)
 if (includeBackCover && book.back_cover_text) {
 const backCover = generateBackCoverHTML(book.back_cover_text)
 zip.folder('OEBPS')!.file('backcover.xhtml', backCover)
 }

  // Generate the ZIP file
 const epubBuffer = await zip.generateAsync({
 type: 'nodebuffer',
 compression: 'DEFLATE',
 compressionOptions: { level: 9 }
 })

 return epubBuffer
}

/**
 * Generate enhanced PDF with better formatting
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateEnhancedPDF(book: Book, options: ExportOptions = {}): any {
  // This will be used in the API route with jsPDF
 return {
 book,
 options,
 chapters: parseChapters(book)
 }
}

/**
 * Generate MOBI-compatible HTML
 * Note: True MOBI requires conversion tools like KindleGen
 * This generates a Kindle-friendly HTML format
 */
export function generateMOBIHTML(book: Book): string {
 const chapters = parseChapters(book)

 let html = `<!DOCTYPE html>
<html>
<head>
 <meta charset="UTF-8">
 <title>${escapeHtml(book.title)}</title>
 <style>
 body { font-family: serif; margin: 2em; }
 h1 { text-align: center; margin-bottom: 2em; }
 h2 { margin-top: 3em; page-break-before: always; }
 p { text-align: justify; margin-bottom: 1em; }
 </style>
</head>
<body>
 <div class="title-page">
 <h1>${escapeHtml(book.title)}</h1>
 ${book.author ? `<p class="author">by ${escapeHtml(book.author)}</p>` : ''}
 </div>

 <div class="metadata">
 <p><strong>Genre:</strong> ${escapeHtml(book.genre)}</p>
 ${book.publisher ? `<p><strong>Publisher:</strong> ${escapeHtml(book.publisher)}</p>` : ''}
 ${book.publication_date ? `<p><strong>Publication Year:</strong> ${escapeHtml(book.publication_date)}</p>` : ''}
 </div>
`

 if (book.description) {
 html += `
 <div class="description">
 <h2>Description</h2>
 <p>${escapeHtml(book.description)}</p>
 </div>
`
 }

 html += `
 <div class="toc">
 <h2>Table of Contents</h2>
 <ul>
`
 chapters.forEach((chapter, index) => {
 html += ` <li><a href="#chapter${index + 1}">${escapeHtml(chapter.title)}</a></li>\n`
 })
 html += ` </ul>
 </div>
`

 chapters.forEach((chapter, index) => {
    // Ensure content is a string
 const contentStr = typeof chapter.content === 'string' ? chapter.content : String(chapter.content || '')

 html += `
 <div class="chapter" id="chapter${index + 1}">
 <h2>${escapeHtml(chapter.title)}</h2>
 ${contentStr.split('\n\n').map(para =>
 para.trim() ? `<p>${escapeHtml(para)}</p>` : ''
 ).join('\n ')}
 </div>
`
 })

 if (book.back_cover_text) {
 html += `
 <div class="backcover">
 <h2>About This Book</h2>
 <p>${escapeHtml(book.back_cover_text)}</p>
 </div>
`
 }

 html += `
</body>
</html>`

 return html
}

// Helper functions

interface Chapter {
 title: string
 content: string
}

function parseChapters(book: Book): Chapter[] {
  // Try to parse from chapters_json first
 if (book.chapters_json) {
 try {
 const chaptersData = typeof book.chapters_json === 'string'
 ? JSON.parse(book.chapters_json)
 : book.chapters_json

 if (Array.isArray(chaptersData)) {
 return chaptersData.map(ch => {
          // Extract content string, handling nested structure
 let contentStr = ''
 if (typeof ch.content === 'string') {
 contentStr = ch.content
 } else if (ch.content && typeof ch.content === 'object' && ch.content.content) {
 contentStr = ch.content.content
 }

 return {
 title: ch.title || 'Untitled Chapter',
 content: contentStr || ''
 }
 })
 }
 } catch (e) {
      console.error('Error parsing chapters_json:', e)
 }
 }

  // Fallback: parse from content field
 if (!book.content) {
 return []
 }

 const chapterSections = book.content.split(/\n\n---\n\n/).filter(Boolean)
 return chapterSections.map((section, index) => {
 const lines = section.split('\n')
 const title = lines[0]?.trim() || `Chapter ${index + 1}`
 const content = lines.slice(1).join('\n').trim()
 return { title, content }
 })
}

function escapeHtml(text: string): string {
 const map: Record<string, string> = {
 '&': '&amp;',
 '<': '&lt;',
 '>': '&gt;',
 '"': '&quot;',
 "'": '&#039;'
 }
 return text.replace(/[&<>"']/g, m => map[m] || m)
}

function generateContentOPF(book: Book, chapters: Chapter[], includeBackCover: boolean): string {
 const bookId = book.id || 'unknown'
 const currentDate = new Date().toISOString().split('T')[0]

 let manifest = ` <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
 <item id="stylesheet" href="stylesheet.css" media-type="text/css"/>
 <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
 <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>`

 chapters.forEach((_, index) => {
 manifest += `\n <item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
 })

 if (includeBackCover && book.back_cover_text) {
 manifest += `\n <item id="backcover" href="backcover.xhtml" media-type="application/xhtml+xml"/>`
 }

 let spine = ` <itemref idref="title"/>
 <itemref idref="toc"/>`

 chapters.forEach((_, index) => {
 spine += `\n <itemref idref="chapter${index + 1}"/>`
 })

 if (includeBackCover && book.back_cover_text) {
 spine += `\n <itemref idref="backcover"/>`
 }

 return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
 <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
 <dc:title>${escapeHtml(book.title)}</dc:title>
 <dc:creator>${escapeHtml(book.author || 'Unknown')}</dc:creator>
 <dc:language>en</dc:language>
 <dc:identifier id="bookid">${bookId}</dc:identifier>
 <dc:publisher>${escapeHtml(book.publisher || 'Self-Published')}</dc:publisher>
 <dc:date>${book.publication_date || currentDate}</dc:date>
 <dc:subject>${escapeHtml(book.genre)}</dc:subject>
 ${book.description ? `<dc:description>${escapeHtml(book.description)}</dc:description>` : ''}
 </metadata>
 <manifest>
${manifest}
 </manifest>
 <spine toc="ncx">
${spine}
 </spine>
</package>`
}

function generateTocNCX(book: Book, chapters: Chapter[], includeBackCover: boolean): string {
 const bookId = book.id || 'unknown'

 let navPoints = ` <navPoint id="title" playOrder="1">
 <navLabel><text>Title Page</text></navLabel>
 <content src="title.xhtml"/>
 </navPoint>
 <navPoint id="toc" playOrder="2">
 <navLabel><text>Table of Contents</text></navLabel>
 <content src="toc.xhtml"/>
 </navPoint>`

 chapters.forEach((chapter, index) => {
 const playOrder = index + 3
 navPoints += `
 <navPoint id="chapter${index + 1}" playOrder="${playOrder}">
 <navLabel><text>${escapeHtml(chapter.title)}</text></navLabel>
 <content src="chapter${index + 1}.xhtml"/>
 </navPoint>`
 })

 if (includeBackCover && book.back_cover_text) {
 navPoints += `
 <navPoint id="backcover" playOrder="${chapters.length + 3}">
 <navLabel><text>About This Book</text></navLabel>
 <content src="backcover.xhtml"/>
 </navPoint>`
 }

 return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
 <head>
 <meta name="dtb:uid" content="${bookId}"/>
 <meta name="dtb:depth" content="1"/>
 <meta name="dtb:totalPageCount" content="0"/>
 <meta name="dtb:maxPageNumber" content="0"/>
 </head>
 <docTitle>
 <text>${escapeHtml(book.title)}</text>
 </docTitle>
 <navMap>
${navPoints}
 </navMap>
</ncx>`
}

function generateTitlePage(book: Book): string {
 return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
 <title>${escapeHtml(book.title)}</title>
 <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
 <div class="title-page">
 <h1>${escapeHtml(book.title)}</h1>
 ${book.author ? `<p class="author">by ${escapeHtml(book.author)}</p>` : ''}
 <div class="metadata">
 <p><strong>Genre:</strong> ${escapeHtml(book.genre)}</p>
 ${book.publisher ? `<p><strong>Publisher:</strong> ${escapeHtml(book.publisher)}</p>` : ''}
 ${book.publication_date ? `<p><strong>Publication Year:</strong> ${escapeHtml(book.publication_date)}</p>` : ''}
 </div>
 </div>
</body>
</html>`
}

function generateTOCPage(chapters: Chapter[]): string {
 const tocItems = chapters.map((chapter, index) =>
 ` <li><a href="chapter${index + 1}.xhtml">${escapeHtml(chapter.title)}</a></li>`
 ).join('\n')

 return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
 <title>Table of Contents</title>
 <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
 <div class="toc">
 <h2>Table of Contents</h2>
 <ul>
${tocItems}
 </ul>
 </div>
</body>
</html>`
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateChapterHTML(chapter: Chapter, chapterNum: number): string {
  // Ensure content is a string
 const contentStr = typeof chapter.content === 'string' ? chapter.content : String(chapter.content || '')

 const paragraphs = contentStr.split('\n\n')
 .filter(p => p.trim())
 .map(p => ` <p>${escapeHtml(p)}</p>`)
 .join('\n')

 return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
 <title>${escapeHtml(chapter.title)}</title>
 <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
 <div class="chapter">
 <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
${paragraphs}
 </div>
</body>
</html>`
}

function generateBackCoverHTML(backCoverText: string): string {
 return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
 <title>About This Book</title>
 <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
 <div class="backcover">
 <h2>About This Book</h2>
 <p>${escapeHtml(backCoverText)}</p>
 </div>
</body>
</html>`
}
