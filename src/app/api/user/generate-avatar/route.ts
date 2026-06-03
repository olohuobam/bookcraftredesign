import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { downloadAndSaveImage, saveImageBufferToStorage } from '@/lib/image-storage'

export const dynamic = 'force-dynamic'

/**
 * Generate an AI profile avatar using GPT Image 1.5
 * - Includes the user's name in the avatar design
 * - If user has books: Generate avatar based on book themes/genres
 * - If no books: Generate a creative random avatar
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifySupabaseToken(token)
    if (!user || !user.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.userId

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Get user profile to retrieve the name
    const userProfile = await SupabaseDB.getProfile(userId)
    const userName = userProfile?.name || userProfile?.email?.split('@')[0] || 'Author'

    // Get user's books to personalize the avatar
    const books = await SupabaseDB.getUserBooks(userId)

    // Build personalized prompt based on books and user name
    const prompt = buildAvatarPrompt(books, userName)

    console.error('🎨 Generating AI avatar')
    console.error('📚 Books found:', books?.length || 0)

    // Generate image using GPT Image 1.5 (better text rendering, 4x faster)
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "high", // low, medium, or high
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const imageData = response.data?.[0]

    // GPT Image 1.5 can return either base64 or URL
    let storedImage

    if (imageData?.b64_json) {
      // Handle base64 response
      console.error('📥 Saving base64 avatar image to PUBLIC storage (URLs never expire)...')
      const nodeBuffer = Buffer.from(imageData.b64_json, 'base64')
      const arrayBuffer = nodeBuffer.buffer.slice(
        nodeBuffer.byteOffset,
        nodeBuffer.byteOffset + nodeBuffer.byteLength
      )
      storedImage = await saveImageBufferToStorage(arrayBuffer, {
        userId: userId,
        filenamePrefix: 'avatar',
        contentType: 'image/png',
        directory: 'avatars',
        usePublicBucket: true  // Public bucket - URLs NEVER expire!
      })
    } else if (imageData?.url) {
      // Handle URL response
      console.error('📥 Downloading avatar image to PUBLIC storage (URLs never expire)...')
      storedImage = await downloadAndSaveImage(imageData.url, {
        userId: userId,
        filenamePrefix: 'avatar',
        contentType: 'image/png',
        directory: 'avatars',
        usePublicBucket: true  // Public bucket - URLs NEVER expire!
      })
    } else {
      throw new Error('No image data returned from OpenAI GPT Image 1.5')
    }

    // Public URLs don't need a path fragment (never expire)
    const avatarUrl = storedImage.signedUrl || ''

    // Update user profile with new avatar
    await SupabaseDB.updateProfile(userId, {
      image: avatarUrl
    })

    console.error('✅ AI avatar generated and saved successfully')

    return NextResponse.json({
      success: true,
      imageUrl: avatarUrl,
      message: 'Avatar generated successfully'
    })

  } catch (error: unknown) {
    console.error('❌ Error generating AI avatar:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar' },
      { status: 500 }
    )
  }
}

/**
 * Save base64 image buffer to storage
 */
async function saveBase64Image(buffer: Buffer, userId: string) {
  const { saveImageBufferToStorage } = await import('@/lib/image-storage')

  return saveImageBufferToStorage(buffer.buffer as ArrayBuffer, {
    userId,
    filenamePrefix: 'avatar',
    contentType: 'image/png',
    directory: 'avatars'
  })
}

/**
 * Build avatar prompt based on user's books and name
 */
function buildAvatarPrompt(books: Array<{ title?: string; genre?: string; description?: string; book_type?: string }> | null, userName: string): string {
  // Base avatar style requirements with user name
  const baseStyle = `Create a stylized, artistic profile avatar design for "${userName}".

The avatar should be:
- A creative, artistic profile picture design
- Circular composition suitable for a profile picture
- High-quality, detailed illustration
- Include the name "${userName}" elegantly integrated into the design
- The name should be clearly readable, styled as part of the artistic composition
- Warm, friendly, and approachable appearance
- Professional yet creative design
- Clean background that works well as an avatar

IMPORTANT: The name "${userName}" must be prominently displayed in elegant, readable typography as part of the avatar design.`

  // If user has no books, generate a creative random avatar
  if (!books || books.length === 0) {
    const randomThemes = [
      'surrounded by floating books and magical sparkles',
      'with galaxies and stars as a backdrop',
      'with a quill pen and ancient scrolls',
      'with light bulbs and creative energy around',
      'in a library of infinite stories',
      'with colorful paint splashes as a backdrop',
      'with glowing runes and enchanted books',
      'with gears and ideas floating around'
    ]

    const randomTheme = randomThemes[Math.floor(Math.random() * randomThemes.length)]

    return `${baseStyle}

Theme: A creative writer ${randomTheme}

Style: Whimsical digital art illustration with rich colors and magical atmosphere.
The design should represent a creative person who loves books and storytelling.
The name "${userName}" should be the focal text element of the design.`
  }

  // Analyze books for personalization
  const genres = books.map(b => b.genre).filter((g): g is string => Boolean(g))
  const bookTypes = books.map(b => b.book_type).filter((t): t is string => Boolean(t))
  const uniqueGenres = [...new Set(genres)]
  const hasPictureBooks = bookTypes.includes('picture')

  // Genre-specific themes
  const genreThemes: Record<string, string> = {
    'Fantasy': 'magical elements, mystical aura, enchanted atmosphere',
    'Science Fiction': 'futuristic elements, technological vibes, cosmic energy',
    'Mystery': 'mysterious atmosphere, detective vibes, intriguing shadows',
    'Romance': 'romantic aesthetic, warm colors, elegant style',
    'Thriller': 'dramatic lighting, intense expression, suspenseful mood',
    'Horror': 'gothic elements, dramatic shadows, mysterious presence',
    'Historical': 'vintage aesthetic, classical elements, timeless elegance',
    'Adventure': 'explorer vibes, dynamic energy, adventurous spirit',
    'Biography': 'professional look, dignified presence, wisdom',
    'Children': 'playful, colorful, cheerful and fun aesthetic',
    'Young Adult': 'modern, trendy, youthful energy',
    'Non-Fiction': 'intellectual, scholarly, thoughtful presence'
  }

  // Build genre-based theme
  const themeElements: string[] = []
  for (const genre of uniqueGenres.slice(0, 3)) {
    if (genreThemes[genre]) {
      themeElements.push(genreThemes[genre])
    }
  }

  const bookCount = books.length
  let creatorDescription = 'a creative author'

  if (bookCount >= 10) {
    creatorDescription = 'a prolific master storyteller with an aura of wisdom'
  } else if (bookCount >= 5) {
    creatorDescription = 'an experienced author with creative confidence'
  } else if (bookCount >= 3) {
    creatorDescription = 'a developing writer with growing talent'
  }

  if (hasPictureBooks) {
    creatorDescription += ' who loves creating visual stories'
  }

  const genreDescription = uniqueGenres.length > 0
    ? `Their favorite genres are ${uniqueGenres.slice(0, 3).join(', ')}.`
    : ''

  const themeDescription = themeElements.length > 0
    ? `Incorporate subtle elements of: ${themeElements.join('; ')}.`
    : ''

  return `${baseStyle}

Character: ${creatorDescription}
${genreDescription}
${themeDescription}

The avatar should reflect someone who has created ${bookCount} book${bookCount !== 1 ? 's' : ''} and loves storytelling.
Style: Digital art illustration with rich details and an artistic, creative feel.
The name "${userName}" should be elegantly displayed as the primary text element.`
}
