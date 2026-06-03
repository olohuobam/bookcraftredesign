import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { refreshSignedUrls, attachPathFragment } from '@/lib/image-storage'
import { normaliseImageLike, ImageLike, ImageAssetInput } from '@/types/images'
import { checkIsPro } from '@/lib/subscription-utils'

// Helper function to fetch images from book_images table and convert to flat array
async function fetchImagesFromBookImagesTable(bookId: string, configuredImagesPerPage?: number): Promise<string[]> {
  try {
    // Get the latest job for this book
    const job = await SupabaseDB.getLatestBookJob(bookId)
    if (!job || !job.id) {
      console.error(`📷 No job found for book ${bookId}`)
      return []
    }

    console.error(`📷 Found job ${job.id} for book ${bookId}, fetching book_images...`)

    // Fetch images from book_images table
    const bookImages = await SupabaseDB.getBookImagesByJobId(job.id)
    if (!bookImages || bookImages.length === 0) {
      console.error(`📷 No images in book_images table for job ${job.id}`)
      return []
    }

    console.error(`📷 Found ${bookImages.length} images in book_images table`)

    // Prefer the configured imagesPerPage from the book's pictureBookConfig.
    // Fall back to max(panel_index)+1 only when no config is available — that
    // fallback misaligns slots whenever any page has fewer panels than the max.
    const maxPanelIndex = Math.max(...bookImages.map(img => img.panel_index))
    const imagesPerPage = configuredImagesPerPage && configuredImagesPerPage > 0
      ? configuredImagesPerPage
      : maxPanelIndex + 1

    // Find the maximum page number
    const maxPageNumber = Math.max(...bookImages.map(img => img.page_number))

    // Create flat array with correct size
    const totalSlots = maxPageNumber * imagesPerPage
    const flatImages: string[] = new Array(totalSlots).fill('')

    // Fill in the images at their correct positions
    // page_number is 1-indexed, panel_index is 0-indexed
    for (const img of bookImages) {
      if (img.image_url) {
        const flatIndex = (img.page_number - 1) * imagesPerPage + img.panel_index
        if (flatIndex >= 0 && flatIndex < totalSlots) {
          flatImages[flatIndex] = img.image_url
        }
      }
    }

    console.error(`📷 Converted ${bookImages.length} book_images to flat array of ${totalSlots} slots`)
    return flatImages
  } catch (error) {
    console.error(`📷 Error fetching images from book_images table:`, error)
    return []
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData = null

    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const book = await SupabaseDB.getBook(params.id)
    if (!book || book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check if we need to fetch images from book_images table as fallback
    let imagesToProcess: ImageLike[] = Array.isArray(book.images) ? book.images : []
    const hasValidImages = imagesToProcess.some((img: ImageLike) => img && (typeof img === 'string' ? img.length > 0 : true))

    console.error(`📷 Book ${book.id} image check:`, {
      bookType: book.book_type,
      imagesArrayLength: imagesToProcess.length,
      hasValidImages,
      chaptersJsonLength: book.chapters_json ? String(book.chapters_json).length : 0
    })

    // If no valid images and it's a picture book, try book_images table
    if (!hasValidImages && book.book_type === 'picture') {
      console.error(`📷 Book ${book.id} has no images in book.images, trying book_images table...`)
      // Read imagesPerPage from the book's pictureBookConfig so panels align
      // to the right pages even when some pages have fewer panels than others.
      let configuredImagesPerPage: number | undefined
      try {
        const cj = typeof book.chapters_json === 'string'
          ? JSON.parse(book.chapters_json)
          : book.chapters_json
        configuredImagesPerPage =
          cj?.pictureBookConfig?.imagesPerPage ||
          cj?.imagesPerPage ||
          undefined
      } catch {
        configuredImagesPerPage = undefined
      }
      const fallbackImages = await fetchImagesFromBookImagesTable(book.id!, configuredImagesPerPage)
      if (fallbackImages.length > 0) {
        imagesToProcess = fallbackImages
        console.error(`📷 Using ${fallbackImages.length} images from book_images table`)
      } else {
        console.error(`📷 No images found in book_images table either - book may need regeneration`)
      }
    } else if (!hasValidImages) {
      console.error(`📷 Book ${book.id} has no images but book_type is '${book.book_type}', not 'picture' - skipping fallback`)
    }

    const images = await refreshSignedUrls(imagesToProcess)
    const serializedImages = images.map((asset) =>
      asset ? attachPathFragment(asset.signedUrl, asset.path) : null
    )

    // Refresh cover URLs (they also use SignedURLs that expire after 7 days)
    // Don't filter - maintain array positions so destructuring works correctly
    const [refreshedCover, refreshedBackCover] = await refreshSignedUrls([
      book.cover_image,
      book.back_cover_image
    ])
    const coverImage = refreshedCover ? attachPathFragment(refreshedCover.signedUrl, refreshedCover.path) : null
    const backCoverImage = refreshedBackCover ? attachPathFragment(refreshedBackCover.signedUrl, refreshedBackCover.path) : null

    // Check for active generation job
    const activeJob = await SupabaseDB.getBookActiveJob(book.id!)

    // ── Content gating (Free tier) ──────────────────────────────────────────
    // purchased: true books are always fully accessible (no breaking change)
    // Pro users: always full access
    // Free users on unpurchased books: gated content
    const isPro = await checkIsPro(userData.userId)
    const isFullAccess = book.purchased || isPro

    let gatedImages = serializedImages
    let isGated = false
    let gatedChapterCount = 0
    let gatedPageCount = 0

    // Parse chapters_json to determine total chapter/page count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chaptersJsonParsed: any = null
    if (book.chapters_json) {
      try {
        chaptersJsonParsed = typeof book.chapters_json === 'string'
          ? JSON.parse(book.chapters_json)
          : book.chapters_json
      } catch {
        // keep null
      }
    }

    if (!isFullAccess) {
      const bookType = book.book_type || 'text'

      if (bookType === 'text') {
        // Gate all chapters except the first one
        if (chaptersJsonParsed && Array.isArray(chaptersJsonParsed)) {
          const totalChapters = chaptersJsonParsed.length
          if (totalChapters > 1) {
            isGated = true
            gatedChapterCount = totalChapters - 1
            // Return only first chapter in chaptersJson
            const gatedChaptersJson = [chaptersJsonParsed[0]]
            chaptersJsonParsed = gatedChaptersJson
          }
        }
      } else {
        // picture / photobook: gate pages after the first FREE_PAGES
        const FREE_PAGES = 2
        // Read imagesPerPage from chapters_json config (default 1 if not set)
        const imagesPerPage: number =
          chaptersJsonParsed?.pictureBookConfig?.imagesPerPage ||
          chaptersJsonParsed?.imagesPerPage ||
          1
        const freeImageSlots = FREE_PAGES * imagesPerPage

        if (serializedImages.length > freeImageSlots) {
          isGated = true
          gatedImages = serializedImages.slice(0, freeImageSlots)
          // gatedPageCount is the number of locked pages (based on total pages)
          const totalPages = chaptersJsonParsed?.pictureBookConfig?.pages?.length
            || chaptersJsonParsed?.pages?.length
            || Math.ceil(serializedImages.length / imagesPerPage)
          gatedPageCount = totalPages - FREE_PAGES
        } else if (chaptersJsonParsed) {
          // Try to gate from chaptersJson pages
          const pages =
            chaptersJsonParsed?.pictureBookConfig?.pages ||
            chaptersJsonParsed?.pages ||
            null
          if (Array.isArray(pages) && pages.length > FREE_PAGES) {
            isGated = true
            gatedPageCount = pages.length - FREE_PAGES
            const gatedPages = pages.slice(0, FREE_PAGES)
            if (chaptersJsonParsed?.pictureBookConfig?.pages) {
              chaptersJsonParsed = { ...chaptersJsonParsed, pictureBookConfig: { ...chaptersJsonParsed.pictureBookConfig, pages: gatedPages } }
            } else {
              chaptersJsonParsed = { ...chaptersJsonParsed, pages: gatedPages }
            }
          }
        }
      }
    }

    // Convert snake_case to camelCase for consistent API response
    const bookResponse = {
      id: book.id,
      title: book.title,
      genre: book.genre,
      description: book.description,
      content: book.content,
      chapters: book.chapters,
      style: book.style,
      targetAudience: book.target_audience,
      bookType: book.book_type,
      userId: book.user_id,
      status: book.status,
      images: gatedImages,
      chaptersJson: chaptersJsonParsed !== null ? chaptersJsonParsed : book.chapters_json,
      coverImage,
      backCoverImage,
      backCoverText: book.back_cover_text,
      author: book.author,
      publisher: book.publisher,
      isbn: book.isbn,
      publicationDate: book.publication_date,
      purchased: book.purchased,
      aiGenerated: book.ai_generated,
      isPublic: book.is_public ?? false,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
      activeJobId: activeJob?.id || null,
      // Content gating fields
      isGated,
      gatedChapterCount,
      gatedPageCount,
    }

    return NextResponse.json({ book: bookResponse })
  } catch (e) {
    console.error('Error fetching book', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData = null
    
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      subtitle,
      description,
      content,
      status,
      images,
      author,
      genre,
      targetAudience,
      isbn,
      publisher,
      publicationDate,
      coverImage,
      backCoverImage,
      chapters_json,
      isPublic
    } = body

    const book = await SupabaseDB.getBook(params.id)
    if (!book || book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const preparedImages = Array.isArray(images)
      ? images.map((img: unknown) => {
          const normalized = normaliseImageLike(img as ImageLike)
          if (!normalized) return null
          return { path: normalized.path, type: normalized.type }
        })
      : book.images

    let nextChaptersJson = chapters_json ?? book.chapters_json

    if (subtitle !== undefined && nextChaptersJson) {
      try {
        const parsed = typeof nextChaptersJson === 'string' ? JSON.parse(nextChaptersJson) : nextChaptersJson
        nextChaptersJson = {
          ...parsed,
          photobookConfig: {
            ...(parsed?.photobookConfig || {}),
            subtitle,
          },
        }
      } catch {
        nextChaptersJson = chapters_json ?? book.chapters_json
      }
    }

    const updated = await SupabaseDB.updateBook(book.id!, {
      title: title ?? book.title,
      description: description ?? book.description,
      content: content ?? book.content,
      status: status ?? book.status,
      images: preparedImages ?? book.images,
      genre: genre ?? book.genre,
      target_audience: targetAudience ?? book.target_audience,
      style: book.style, // Keep existing style
      author: author ?? book.author,
      isbn: isbn ?? book.isbn,
      publisher: publisher ?? book.publisher,
      publication_date: publicationDate ?? book.publication_date,
      cover_image: coverImage ?? book.cover_image,
      back_cover_image: backCoverImage ?? book.back_cover_image,
      chapters_json: nextChaptersJson,
      is_public: isPublic !== undefined ? isPublic : book.is_public,
    })

    // Convert snake_case to camelCase for consistent API response
    const refreshedImages = await refreshSignedUrls(Array.isArray(updated.images) ? updated.images : [])
    const serializedImages = refreshedImages.map((asset) =>
      asset ? attachPathFragment(asset.signedUrl, asset.path) : null
    )

    // Refresh cover URLs (they also use SignedURLs that expire after 7 days)
    // Don't filter - maintain array positions so destructuring works correctly
    const [refreshedCoverAsset, refreshedBackCoverAsset] = await refreshSignedUrls([
      updated.cover_image,
      updated.back_cover_image
    ])
    const refreshedCoverImage = refreshedCoverAsset ? attachPathFragment(refreshedCoverAsset.signedUrl, refreshedCoverAsset.path) : null
    const refreshedBackCoverImage = refreshedBackCoverAsset ? attachPathFragment(refreshedBackCoverAsset.signedUrl, refreshedBackCoverAsset.path) : null

    const bookResponse = {
      id: updated.id,
      title: updated.title,
      genre: updated.genre,
      description: updated.description,
      content: updated.content,
      chapters: updated.chapters,
      style: updated.style,
      targetAudience: updated.target_audience,
      bookType: updated.book_type,
      userId: updated.user_id,
      status: updated.status,
      images: serializedImages,
      chaptersJson: updated.chapters_json,
      coverImage: refreshedCoverImage,
      backCoverImage: refreshedBackCoverImage,
      backCoverText: updated.back_cover_text,
      author: updated.author,
      publisher: updated.publisher,
      isbn: updated.isbn,
      publicationDate: updated.publication_date,
      purchased: updated.purchased,
      aiGenerated: updated.ai_generated,
      isPublic: updated.is_public,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    }

    return NextResponse.json({ book: bookResponse })
  } catch (e) {
    console.error('Error updating book', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData = null
    
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const book = await SupabaseDB.getBook(params.id)
    if (!book || book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await SupabaseDB.deleteBook(book.id!)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error deleting book', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
