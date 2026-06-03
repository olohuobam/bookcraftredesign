import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { refreshSignedUrls } from '@/lib/image-storage'
import ShareButton from '@/components/ShareButton'
import BookReviews from '@/components/BookReviews'

// Extract the storage-relative path from a Supabase signed/public URL so the
// (potentially expired) token can be refreshed. Older records store plain
// signed URLs without the #supaPath fragment.
function extractSupabaseStoragePath(url: string | null | undefined): string | null {
 if (!url) return null
 const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/([^?#]+)/)
 return match ? decodeURIComponent(match[1]) : null
}

// ─── Similar Books ────────────────────────────────────────────────────────────

interface SimilarBook {
 id: string
 title: string
 author: string | null
 cover_image: string | null
 genre: string | null
}

async function getSimilarBooks(currentBookId: string, genre: string | null, limit = 4): Promise<SimilarBook[]> {
 if (!supabaseAdmin || !genre) return []

 const { data, error } = await supabaseAdmin
 .from('books')
 .select('id, title, author, cover_image, genre')
 .eq('is_public', true)
 .eq('genre', genre)
 .neq('id', currentBookId)
 .order('view_count', { ascending: false })
 .limit(limit)

 if (error) return []
 return (data ?? []) as SimilarBook[]
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewChapter {
 title: string
 content: string
}

interface BookPreviewData {
 id: string
 title: string
 description: string | null
 genre: string | null
 author: string | null
 coverImage: string | null
 bookType: string
 totalChapters: number
 createdAt: string
}

// ─── Data Fetching ─────────────────────────────────────────────────────────────

const PUBLIC_PREVIEW_PAGES = 3

async function getBookPreview(
 bookId: string
): Promise<{ book: BookPreviewData; previewChapters: PreviewChapter[]; previewImages: string[] } | null> {
 if (!supabaseAdmin) return null

 const { data: book, error } = await supabaseAdmin
 .from('books')
 .select(
 'id, title, description, genre, author, cover_image, images, chapters_json, content, status, book_type, created_at'
 )
 .eq('id', bookId)
 .single()

 if (error || !book) return null

  // Don't expose drafts or still-generating books
 if (book.status === 'draft' || book.status === 'generating') return null

  // Parse chapters
 let chapters: PreviewChapter[] = []

 if (book.chapters_json) {
 try {
 const raw =
 typeof book.chapters_json === 'string'
 ? JSON.parse(book.chapters_json)
 : book.chapters_json

 if (Array.isArray(raw)) {
 chapters = raw.map((ch: { title?: string; content?: unknown }) => {
 let content = ''
 if (typeof ch.content === 'string') {
 content = ch.content
 } else if (
 ch.content &&
 typeof ch.content === 'object' &&
 'content' in (ch.content as object)
 ) {
 content = (ch.content as { content: string }).content
 }
 return { title: ch.title || 'Chapter', content }
 })
 }
 } catch {
      // fall through
 }
 }

 if (chapters.length === 0 && book.content) {
 const sections = book.content.split(/\n\n---\n\n/).filter(Boolean)
 if (sections.length > 1) {
 chapters = sections.map((section: string, i: number) => {
 const lines = section.split('\n')
 return {
 title: lines[0]?.trim() || `Chapter ${i + 1}`,
 content: lines.slice(1).join('\n').trim(),
 }
 })
 } else {
 chapters = [{ title: book.title, content: book.content }]
 }
 }

 const previewChapters = chapters.slice(0, PUBLIC_PREVIEW_PAGES).map((ch) => ({
 title: ch.title,
 content:
 ch.content.length > 1200
 ? ch.content.substring(0, 1200).replace(/\s+\S*$/, '') + '…'
 : ch.content,
 }))

  // Refresh the cover signed URL (stored tokens expire after ~7 days)
 let coverImage: string | null = book.cover_image ?? null
 if (coverImage) {
 const path = extractSupabaseStoragePath(coverImage)
 const [refreshed] = await refreshSignedUrls([
 path ? { storagePath: path, type: 'supabase' as const } : coverImage,
 ])
 if (refreshed?.signedUrl) coverImage = refreshed.signedUrl
 }

  // For picture books the readable content is the images, not text chapters.
 let previewImages: string[] = []
 if ((book.book_type ?? 'text') === 'picture' && Array.isArray(book.images)) {
 const rawImages = (book.images as unknown[])
 .filter((u): u is string => typeof u === 'string' && u.length > 0)
 .slice(0, PUBLIC_PREVIEW_PAGES)
 const refreshed = await refreshSignedUrls(
 rawImages.map((u) => {
 const path = extractSupabaseStoragePath(u)
 return path ? { storagePath: path, type: 'supabase' as const } : u
 })
 )
 previewImages = refreshed
 .map((asset, i) => asset?.signedUrl ?? rawImages[i])
 .filter((u): u is string => typeof u === 'string')
 }

 return {
 book: {
 id: book.id,
 title: book.title,
 description: book.description ?? null,
 genre: book.genre ?? null,
 author: book.author ?? null,
 coverImage,
 bookType: book.book_type ?? 'text',
 totalChapters: chapters.length,
 createdAt: book.created_at,
 },
 previewChapters,
 previewImages,
 }
}

// ─── Metadata (SEO + OG) ──────────────────────────────────────────────────────

export async function generateMetadata({
 params,
}: {
 params: Promise<{ 'book-id': string }>
}): Promise<Metadata> {
 const { 'book-id': bookId } = await params
 const data = await getBookPreview(bookId)

 if (!data) {
 return {
 title: 'Book Preview – bookcraft.dev',
 description: 'AI-powered book generation',
 }
 }

 const { book } = data
 const title = `${book.title} – Book Preview`
 const description =
 book.description ??
 `Read the first ${PUBLIC_PREVIEW_PAGES} pages of "${book.title}"${book.author ? ` by ${book.author}` : ''} — created with bookcraft.dev`

 const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookcraft.dev'
 const previewUrl = `${appUrl}/preview/${bookId}`

 return {
 title,
 description,
 openGraph: {
 type: 'book',
 title,
 description,
 url: previewUrl,
 siteName: 'bookcraft.dev',
 images: book.coverImage
 ? [
 {
 url: book.coverImage,
 width: 1200,
 height: 630,
 alt: book.title,
 },
 ]
 : [
 {
 url: `${appUrl}/og-default.png`,
 width: 1200,
 height: 630,
 alt: 'bookcraft.dev – AI Book Generation',
 },
 ],
 },
 twitter: {
 card: 'summary_large_image',
 title,
 description,
 images: book.coverImage ? [book.coverImage] : undefined,
 },
 alternates: {
 canonical: previewUrl,
 },
 }
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function BookPreviewPage({
 params,
}: {
 params: Promise<{ 'book-id': string }>
}) {
 const { 'book-id': bookId } = await params
 const data = await getBookPreview(bookId)

 if (!data) notFound()

 const { book, previewChapters, previewImages } = data
 const isPictureBook = book.bookType === 'picture' && previewImages.length > 0
 const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookcraft.dev'
 const previewUrl = `${appUrl}/preview/${bookId}`
 const similarBooks = await getSimilarBooks(bookId, book.genre)

 return (
 <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
 {/* ── Header ──────────────────────────────────────────────────────────── */}
 <header className="border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
 <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
 <Link
 href="/"
 className="flex items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity"
 >
 <span className="text-sm font-bold">bookcraft.dev</span>
 </Link>
 <Link
 href="/"
 className="inline-flex items-center gap-1.5 text-sm font-medium text-bookcraft-blue hover:text-bookcraft-blue/80 dark:text-bookcraft-blue/80 dark:hover:text-bookcraft-blue transition-colors"
 >
 Create your own
 <ArrowRight className="h-4 w-4" />
 </Link>
 </div>
 </header>

 <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
 {/* ── Book Hero ──────────────────────────────────────────────────────── */}
 <section className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-10">
 {/* Cover Image */}
 <div className="flex-shrink-0 mx-auto sm:mx-0">
 {book.coverImage ? (
 <div className="relative w-40 h-56 sm:w-48 sm:h-64 rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10">
 <Image
 src={book.coverImage}
 alt={`Cover of ${book.title}`}
 fill
 className="object-cover"
 priority
 sizes="(max-width: 640px) 160px, 192px"
 />
 </div>
 ) : (
 <div className="w-40 h-56 sm:w-48 sm:h-64 rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative">
  {/* Decorative elements */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-bookcraft-blue/20 rounded-full blur-2xl" />
  <div className="absolute bottom-0 left-0 w-24 h-24 bg-bookcraft-blue/20 rounded-full blur-2xl" />
  {/* Title */}
  <span className="text-white/90 text-center text-xs sm:text-sm font-semibold font-display leading-tight line-clamp-3 relative z-10">{book.title}</span>
 </div>
 )}
 </div>

 {/* Book Info */}
 <div className="flex-1 min-w-0 text-center sm:text-left">
 {book.genre && (
 <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-bookcraft-blue/60 bg-blue-50 dark:bg-blue-900/30 rounded-full">
 {book.genre}
 </span>
 )}

 <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
 {book.title}
 </h1>

 {book.author && (
 <p className="text-base text-muted-foreground mb-3">
 by <span className="font-medium text-foreground">{book.author}</span>
 </p>
 )}

 {book.description && (
 <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4 line-clamp-4">
 {book.description}
 </p>
 )}

 <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
 <span className="flex items-center gap-1.5">
 <BookOpen className="h-4 w-4" />
 {book.totalChapters} chapters
 </span>
 <span className="text-border">•</span>
 <span className="capitalize">{book.bookType === 'picture' ? 'Picture book' : 'Story'}</span>
 </div>

 {/* Share Button (client component) */}
 <div className="mt-5 flex flex-wrap gap-3 justify-center sm:justify-start">
 <ShareButton title={book.title} url={previewUrl} description={book.description ?? undefined} />
 </div>
 </div>
 </section>

 {/* ── Divider ──────────────────────────────────────────────────────── */}
 <div className="flex items-center gap-4 mb-8">
 <div className="h-px flex-1 bg-border" />
 <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
 Preview — first {isPictureBook ? previewImages.length : previewChapters.length} page{(isPictureBook ? previewImages.length : previewChapters.length) > 1 ? 's' : ''}
 </span>
 <div className="h-px flex-1 bg-border" />
 </div>

 {/* ── Preview Content ──────────────────────────────────────────────── */}
 {isPictureBook ? (
 <div className="space-y-8 mb-12">
 {previewImages.map((src, index) => (
 <article
 key={index}
 className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 sm:p-6 shadow-sm border border-border"
 >
 <div className="flex items-baseline gap-3 mb-4">
 <span className="text-xs font-bold uppercase tracking-widest text-bookcraft-blue/80 dark:text-bookcraft-blue/60">
 {index === 0 ? 'Opening' : `Page ${index + 1}`}
 </span>
 <div className="h-px flex-1 bg-border" />
 </div>
 <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
 <Image
 src={src}
 alt={`${book.title} — page ${index + 1}`}
 fill
 className="object-contain"
 sizes="(max-width: 896px) 100vw, 896px"
 />
 </div>
 </article>
 ))}
 </div>
 ) : (
 <div className="space-y-8 mb-12">
 {previewChapters.map((chapter, index) => (
 <article
 key={index}
 className="bg-white dark:bg-slate-800/60 rounded-2xl p-6 sm:p-8 shadow-sm border border-border"
 >
 <div className="flex items-baseline gap-3 mb-4">
 <span className="text-xs font-bold uppercase tracking-widest text-bookcraft-blue/80 dark:text-bookcraft-blue/60">
 {index === 0 ? 'Opening' : `Page ${index + 1}`}
 </span>
 <div className="h-px flex-1 bg-border" />
 </div>

 <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
 {chapter.title}
 </h2>

 <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
 {chapter.content.split('\n').map((paragraph, i) =>
 paragraph.trim() ? (
 <p key={i} className="mb-3 last:mb-0">
 {paragraph}
 </p>
 ) : null
 )}
 </div>
 </article>
 ))}
 </div>
 )}

 {/* ── "More pages" teaser ──────────────────────────────────────────── */}
 {book.totalChapters > PUBLIC_PREVIEW_PAGES && (
 <div className="relative mb-12">
 {/* Fade-out overlay */}
 <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-6 sm:p-8 shadow-sm border border-border opacity-30 select-none pointer-events-none">
 <p className="text-muted-foreground text-sm line-clamp-3">
 The story continues with {book.totalChapters - PUBLIC_PREVIEW_PAGES} more
 chapter{book.totalChapters - PUBLIC_PREVIEW_PAGES > 1 ? 's' : ''}…
 </p>
 </div>
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:via-slate-900/60 dark:to-slate-900 rounded-2xl" />
 </div>
 )}

 {/* ── Similar Books ─────────────────────────────────────────────── */}
 {/* TODO: i18n for server components */}
 {similarBooks.length > 0 && (
 <section className="mb-12">
 <div className="flex items-center gap-3 mb-6">
 <div className="h-px flex-1 bg-border" />
 <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
 You might also like
 </h2>
 <div className="h-px flex-1 bg-border" />
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {similarBooks.map(similar => (
 <Link
 key={similar.id}
 href={`/preview/${similar.id}`}
 className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md hover:border-bookcraft-blue/30 transition-all duration-300"
 >
 {/* Cover */}
 <div className="aspect-[3/4] bg-muted overflow-hidden">
 {similar.cover_image ? (
 <Image
 src={similar.cover_image}
 alt={similar.title}
 width={200}
 height={267}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 p-3">
 <BookOpen className="w-6 h-6 text-white/60 mb-1" />
 <p className="text-white/80 text-xs font-medium text-center line-clamp-2 leading-tight">{similar.title}</p>
 </div>
 )}
 </div>
 {/* Info */}
 <div className="p-3 flex-1 flex flex-col justify-between">
 <div>
 <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{similar.title}</h3>
 {similar.author && (
 <p className="text-xs text-muted-foreground mt-1 truncate">{similar.author}</p>
 )}
 </div>
 {similar.genre && (
 <span className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bookcraft-blue/10 text-bookcraft-blue">
 {similar.genre}
 </span>
 )}
 </div>
 </Link>
 ))}
 </div>
 </section>
 )}


 {/* ── Reviews ───────────────────────────────────────────── */}
 <BookReviews bookId={bookId} authToken={null} />

  {/* ── CTA ──────────────────────────────────────────────────────────── */}
 {/* TODO: i18n for server components */}
 <section className="text-center bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-3xl p-8 sm:p-12 shadow-xl text-white">
 <div className="mb-2 text-blue-200 text-sm font-semibold uppercase tracking-widest">
 Powered by AI
 </div>
 <h2 className="text-2xl sm:text-3xl font-bold mb-3">
 Create your own book →
 </h2>
 <p className="text-blue-100 mb-6 max-w-md mx-auto text-sm sm:text-base">
 Write a unique AI-generated story, novel, or picture book in minutes — for free.
 </p>
 <Link
 href="/"
 className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-3.5 rounded-full hover:bg-blue-50 transition-colors text-base shadow-lg shadow-blue-900/20"
 >
 Get started free
 <ArrowRight className="h-5 w-5" />
 </Link>
 <p className="mt-4 text-blue-200 text-xs">
 No credit card required · Ready in minutes
 </p>
 </section>
 </main>

 {/* ── Footer ────────────────────────────────────────────────────────── */}
 <footer className="border-t border-border mt-16 py-6 text-center text-xs text-muted-foreground">
 <p>
 This preview was shared via{' '}
 <Link href="/" className="underline hover:text-foreground transition-colors">
 bookcraft.dev
 </Link>
 {' '}— AI-powered book creation
 </p>
 </footer>
 </div>
 )
}
