import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB, Book } from '@/lib/supabase-db'
import { downloadAndSaveImage, saveImageBufferToStorage, attachPathFragment } from '@/lib/image-storage'
import OpenAI from 'openai'

// Configure runtime for longer execution
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for cover generation

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * POST /api/books/[id]/generate-cover
 * Generates a book cover using OpenAI GPT Image 1.5 based on book metadata
 *
 * Credit System:
 * - First 3 generations: FREE
 * - After that: 0.99€ per cover (via Stripe)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params

    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user profile to check cover generation credits
    const userProfile = await SupabaseDB.getProfile(userData.userId)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Initialize cover_generation_credits if not set (default: 3 free)
    const coverCredits = userProfile.cover_generation_credits ?? 3

    // Check if user has credits or needs to pay
    if (coverCredits <= 0) {
      // User needs to pay 0.99€ for this cover generation
      return NextResponse.json({
        error: 'no_credits',
        message: 'No free cover generations available',
        requiresPayment: true,
        price: 0.99,
        currency: 'EUR'
      }, { status: 402 }) // 402 Payment Required
    }

    // Check if book exists and belongs to user
    const book = await SupabaseDB.getBook(bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.error('🎨 Generating cover for book:', {
      bookId,
      title: book.title,
      genre: book.genre,
      style: book.style,
      creditsRemaining: coverCredits
    })

    // Build DALL-E prompt based on book metadata
    const coverPrompt = buildCoverPrompt(book)

    try {
      const openai = getOpenAI()

      // Generate image - try GPT Image 1.5 first, fall back to DALL-E 3
      let imageData: { b64_json?: string; url?: string } | undefined

      try {
        // Generate image with GPT Image 1.5 - Portrait format for book cover (front only, no spine)
        // Note: gpt-image-1.5 does NOT accept response_format parameter — it always returns b64_json
        const response = await openai.images.generate({
          model: "gpt-image-1.5",
          prompt: coverPrompt,
          n: 1,
          size: "1024x1536",
          quality: "high",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        imageData = response.data?.[0]
        console.error('✅ Cover generated via gpt-image-1.5')
      } catch (primaryError) {
        console.error('❌ gpt-image-1.5 failed for book cover, trying dall-e-3 fallback:', primaryError)
        try {
          const fallbackResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: coverPrompt,
            n: 1,
            size: "1024x1792", // Closest portrait format available in dall-e-3
            quality: "standard",
            response_format: "url"
          })
          imageData = fallbackResponse.data?.[0]
          console.error('✅ Cover generated via dall-e-3 fallback')
        } catch (fallbackError) {
          console.error('❌ dall-e-3 fallback also failed for book cover:', fallbackError)
        }
      }

      // GPT Image 1.5 can return either base64 or URL; DALL-E 3 returns URL
      let storedImage

      if (imageData?.b64_json) {
        console.error('✅ Cover generated (base64), saving to persistent storage...')
        const nodeBuffer = Buffer.from(imageData.b64_json, 'base64')
        const arrayBuffer = nodeBuffer.buffer.slice(
          nodeBuffer.byteOffset,
          nodeBuffer.byteOffset + nodeBuffer.byteLength
        )
        storedImage = await saveImageBufferToStorage(arrayBuffer, {
          userId: userData.userId,
          bookId: bookId,
          filenamePrefix: 'cover',
          contentType: 'image/png'
        })
      } else if (imageData?.url) {
        console.error('✅ Cover generated (URL), downloading for persistent storage...')
        // OpenAI image URLs are temporary (expire after ~1 hour)
        storedImage = await downloadAndSaveImage(imageData.url, {
          userId: userData.userId,
          bookId: bookId,
          filenamePrefix: 'cover',
          contentType: 'image/png'
        })
      } else {
        throw new Error('No image data returned from OpenAI (both gpt-image-1.5 and dall-e-3 failed)')
      }

      // Build the full URL with storage path for later URL refresh
      const coverImageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)

      console.error('✅ Cover saved to persistent storage:', storedImage.type)

      // Update book with persistently stored cover image URL
      await SupabaseDB.updateBook(bookId, {
        cover_image: coverImageUrl
      })

      // Generate back cover
      let backCoverImageUrl: string | null = null
      try {
        console.error('🎨 Generating back cover...')
        const backCoverPrompt = buildBackCoverPrompt(book)

        let backImageData: { b64_json?: string; url?: string } | undefined

        try {
          const backResponse = await openai.images.generate({
            model: "gpt-image-1.5",
            prompt: backCoverPrompt,
            n: 1,
            size: "1024x1536",
            quality: "high",
            // Note: gpt-image-1.5 does NOT accept response_format — it always returns b64_json
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          backImageData = backResponse.data?.[0]
          console.error('✅ Back cover generated via gpt-image-1.5')
        } catch (backPrimaryError) {
          console.error('❌ gpt-image-1.5 failed for back cover, trying dall-e-3:', backPrimaryError)
          try {
            const backFallback = await openai.images.generate({
              model: "dall-e-3",
              prompt: backCoverPrompt,
              n: 1,
              size: "1024x1792",
              quality: "standard",
              response_format: "url"
            })
            backImageData = backFallback.data?.[0]
            console.error('✅ Back cover generated via dall-e-3 fallback')
          } catch (backFallbackError) {
            console.error('❌ dall-e-3 fallback also failed for back cover:', backFallbackError)
          }
        }

        let storedBackImage
        if (backImageData?.b64_json) {
          const nodeBuffer = Buffer.from(backImageData.b64_json, 'base64')
          const arrayBuffer = nodeBuffer.buffer.slice(
            nodeBuffer.byteOffset,
            nodeBuffer.byteOffset + nodeBuffer.byteLength
          )
          storedBackImage = await saveImageBufferToStorage(arrayBuffer, {
            userId: userData.userId,
            bookId: bookId,
            filenamePrefix: 'back-cover',
            contentType: 'image/png'
          })
        } else if (backImageData?.url) {
          storedBackImage = await downloadAndSaveImage(backImageData.url, {
            userId: userData.userId,
            bookId: bookId,
            filenamePrefix: 'back-cover',
            contentType: 'image/png'
          })
        }

        if (storedBackImage) {
          backCoverImageUrl = attachPathFragment(storedBackImage.signedUrl, storedBackImage.path)
          await SupabaseDB.updateBook(bookId, {
            back_cover_image: backCoverImageUrl
          })
          console.error('✅ Back cover saved to persistent storage')
        }
      } catch (backCoverError) {
        console.warn('⚠️ Back cover generation failed, continuing without it:', backCoverError)
      }

      // Deduct one cover credit from user
      const newCreditCount = coverCredits - 1
      await SupabaseDB.updateProfile(userData.userId, {
        cover_generation_credits: newCreditCount
      })

      console.error(`💳 Cover credit used. Remaining: ${newCreditCount}`)

      return NextResponse.json({
        success: true,
        coverImageUrl,
        backCoverImageUrl,
        message: 'Cover successfully generated',
        creditsRemaining: newCreditCount,
        freeCreditsUsed: coverCredits > 0 ? (3 - newCreditCount) : 3
      })

    } catch (error: unknown) {
      const apiError = error as { message?: string; error?: { code?: string; message?: string }; status?: number; stack?: string }
      console.error('❌ Error in cover generation pipeline:', error)
      console.error('❌ Error details:', {
        message: apiError?.message,
        code: apiError?.error?.code,
        status: apiError?.status,
        stack: apiError?.stack
      })

      // Handle specific OpenAI errors
      if (apiError?.error?.code === 'content_policy_violation') {
        return NextResponse.json({
          error: 'Content policy violation. Please adjust your book description.',
          details: apiError.error.message
        }, { status: 400 })
      }

      return NextResponse.json({
        error: 'Failed to generate cover. Please check your OpenAI API key and try again.',
        details: apiError?.message || String(error)
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Unexpected error generating cover:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Build a detailed prompt for book cover generation
 */
function buildCoverPrompt(book: Book): string {
  const { title, author, genre, description, style, target_audience, book_type } = book

  // For picture books, extract style context from chapters_json
  let styleContext = ''
  if (book_type === 'picture' && book.chapters_json) {
    try {
      const parsed = typeof book.chapters_json === 'string'
        ? JSON.parse(book.chapters_json)
        : book.chapters_json

      if (parsed.characterDescription) {
        styleContext += `\n\nIMPORTANT - Character & Style Reference (match exactly):\n${parsed.characterDescription}`
      }
      if (parsed.imageStyle) {
        styleContext += `\n\nArt Style: ${parsed.imageStyle} - maintain this exact style for consistency with interior illustrations.`
      }
    } catch (err) {
      console.warn('Could not parse chapters_json for style context:', err)
    }
  }

  // Determine visual style based on book metadata
  let visualStyle = 'professional book cover design'

  if (book_type === 'picture') {
    visualStyle = 'children\'s book cover illustration, colorful and engaging'
  } else if (style) {
    visualStyle = `${style} book cover design`
  }

  // Map genre to visual themes
  const genreStyles: Record<string, string> = {
    'Fantasy': 'magical, mystical elements with enchanted atmosphere',
    'Science Fiction': 'futuristic, technological, space or sci-fi elements',
    'Mystery': 'dark, intriguing atmosphere with mysterious shadows',
    'Romance': 'romantic, elegant design with warm colors',
    'Thriller': 'suspenseful, dramatic with bold contrasts',
    'Horror': 'eerie, haunting atmosphere with dark tones',
    'Historical': 'vintage, period-appropriate styling',
    'Adventure': 'exciting, dynamic composition with action elements',
    'Biography': 'professional, dignified design',
    'Children': 'bright, playful, cheerful illustrations',
    'Young Adult': 'modern, trendy design appealing to teens',
    'Non-Fiction': 'clean, professional, informative design'
  }

  const genreStyle = genreStyles[genre] || 'creative and eye-catching design'

  // Build the comprehensive prompt - PURE FRONT COVER IMAGE ONLY
  const prompt = `Create a ${visualStyle} artwork for a book titled "${title}"${author ? ` by ${author}` : ''}.

CRITICAL REQUIREMENTS:
- Generate ONLY the front cover artwork as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges, NO shadows suggesting a physical book
- NO back cover, NO wraparound design
- The entire image should be filled with the cover artwork edge-to-edge
- This is a flat rectangular image that will be printed as a book cover
${book_type === 'picture' ? '- This cover must match the exact art style, color palette, and character designs of the interior illustrations\n- Use identical line weight, shading technique, and color saturation as the interior pages' : ''}

Genre: ${genre}
${description ? `Description: ${description}` : ''}
${target_audience ? `Target Audience: ${target_audience}` : ''}

Visual Style Requirements:
- ${genreStyle}
- Include the book title "${title}" in elegant, readable typography
${author ? `- Include the author name "${author}" on the cover` : ''}
- Professional cover layout filling the entire image
- High-quality, print-ready artwork
- Color scheme appropriate for ${genre} genre
${book_type === 'picture' ? '- Vibrant, child-friendly illustration style' : '- Sophisticated, market-ready design'}${styleContext}

Output: A single flat cover image, NOT a 3D book mockup.`

  console.error('📝 Cover prompt:', prompt)

  return prompt
}

/**
 * Build a prompt for back cover generation
 */
function buildBackCoverPrompt(book: Book): string {
  const { title, author, genre, description, target_audience, book_type } = book

  const genreBackgrounds: Record<string, string> = {
    'Fantasy': 'mystical, enchanted background with subtle magical elements',
    'Science Fiction': 'futuristic, cosmic background with subtle tech elements',
    'Mystery': 'moody, atmospheric background with shadowy elements',
    'Romance': 'warm, elegant background with soft romantic elements',
    'Thriller': 'dark, dramatic background with tense atmosphere',
    'Horror': 'eerie, unsettling background with dark overtones',
    'Historical': 'vintage-styled background with period-appropriate elements',
    'Adventure': 'adventurous landscape background with dynamic elements',
    'Children': 'bright, playful background with cheerful elements',
  }

  const backgroundStyle = genreBackgrounds[genre] || 'clean, professional background design'

  const blurb = description
    ? description.length > 300 ? description.substring(0, 300) + '...' : description
    : 'A captivating story that will keep you turning pages.'

  const prompt = `Create a back cover design for a ${genre} book titled "${title}"${author ? ` by ${author}` : ''}.

CRITICAL REQUIREMENTS:
- This is the BACK COVER of a book, as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges
- The entire image should be filled with the back cover artwork edge-to-edge
- This is a flat rectangular image that will be printed as the back of a book cover

BACK COVER LAYOUT:
- Background: ${backgroundStyle}
- Upper area: Book synopsis/blurb text area with the following text displayed elegantly: "${blurb}"
${author ? `- Middle area: Author name "${author}" in clean typography` : ''}
- Bottom area: Leave space for a barcode/ISBN area (a small white rectangle in the bottom-right corner)
- Overall design should complement the front cover

Genre: ${genre}
${target_audience ? `Target Audience: ${target_audience}` : ''}

Visual Style Requirements:
- Professional back cover layout
- Readable typography for the blurb text
- Color scheme matching the ${genre} genre
- ${book_type === 'picture' ? 'Child-friendly, colorful design' : 'Sophisticated, market-ready design'}
- Include a small barcode placeholder area at the bottom

Output: A single flat back cover image, NOT a 3D book mockup.`

  console.error('📝 Back cover prompt:', prompt)

  return prompt
}
