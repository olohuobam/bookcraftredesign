import OpenAI from 'openai'
import { SupabaseDB, Book } from './supabase-db'
import { downloadAndSaveImage, saveImageBufferToStorage, attachPathFragment } from './image-storage'

/**
 * Automatically generates a book cover using GPT Image 1.5
 * This runs asynchronously and does not block the calling function
 */
export async function generateBookCoverAsync(bookId: string): Promise<void> {
 try {
    console.log('🎨 Starting automatic cover generation for book:', bookId)

    // Fetch book details
 const book = await SupabaseDB.getBook(bookId)
 if (!book) {
      console.error('❌ Book not found for cover generation:', bookId)
 return
 }

    // Skip if cover already exists
 if (book.cover_image) {
      console.log('⏭️  Cover already exists, skipping generation:', bookId)
 return
 }

 const imageResult = await generateCoverImage(book)

    // Save image to persistent storage (handle both base64 and URL)
 let storedImage

 if (imageResult.type === 'base64') {
      console.log('📥 Saving base64 cover image to persistent storage...')
 const nodeBuffer = Buffer.from(imageResult.data, 'base64')
 const arrayBuffer = nodeBuffer.buffer.slice(
 nodeBuffer.byteOffset,
 nodeBuffer.byteOffset + nodeBuffer.byteLength
 )
 storedImage = await saveImageBufferToStorage(arrayBuffer, {
 userId: book.user_id,
 bookId: bookId,
 filenamePrefix: 'cover',
 contentType: 'image/png'
 })
 } else {
      // Download from URL - OpenAI image URLs are temporary (expire after ~1 hour)
      console.log('📥 Downloading cover image for persistent storage...')
 storedImage = await downloadAndSaveImage(imageResult.data, {
 userId: book.user_id,
 bookId: bookId,
 filenamePrefix: 'cover',
 contentType: 'image/png'
 })
 }

    // Build the full URL with storage path for later URL refresh
 const coverImageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)

    // Update book with persistently stored cover image
 await SupabaseDB.updateBook(bookId, {
 cover_image: coverImageUrl
 })

    console.log('✅ Cover generated and saved successfully for book:', bookId, '- Storage type:', storedImage.type)
 } catch (error) {
    console.error('❌ Error in automatic cover generation:', error)
    // Don't throw - we don't want to break book creation if cover generation fails
 }
}

/**
 * Generate a cover image using GPT Image 1.5
 * GPT Image 1.5 offers better text rendering and is 4x faster than previous models
 * Returns either a URL or base64 data depending on the API response
 */
export async function generateCoverImage(book: Book): Promise<{ type: 'url' | 'base64'; data: string }> {
 const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
 })

 const prompt = buildCoverPrompt(book)

  // Generate cover in portrait format - front cover only, no spine
  // GPT Image 1.5 supports: 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), auto
 const response = await openai.images.generate({
 model: "gpt-image-1.5",
 prompt: prompt,
 n: 1,
 size: "1024x1536", // Portrait format for book covers (2:3 ratio)
 quality: "high", // low, medium, or high
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } as any)

 const imageData = response.data?.[0]

  // GPT Image 1.5 can return base64 or URL
 if (imageData?.b64_json) {
 return { type: 'base64', data: imageData.b64_json }
 }

 if (imageData?.url) {
 return { type: 'url', data: imageData.url }
 }

 throw new Error('No image data returned from GPT Image 1.5')
}

/**
 * Build a detailed prompt for book cover generation
 */
function buildCoverPrompt(book: Book): string {
 const { title, genre, description, style, target_audience, book_type } = book

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
 const prompt = `Create a ${visualStyle} artwork for a book titled "${title}".

CRITICAL REQUIREMENTS:
- Generate ONLY the front cover artwork as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges, NO shadows suggesting a physical book
- NO back cover, NO wraparound design
- The entire image should be filled with the cover artwork edge-to-edge
- This is a flat rectangular image that will be printed as a book cover

Genre: ${genre}
${description ? `Description: ${description}` : ''}
${target_audience ? `Target Audience: ${target_audience}` : ''}

Visual Style Requirements:
- ${genreStyle}
- Include the book title "${title}" in elegant, readable typography
- Professional cover layout filling the entire image
- High-quality, print-ready artwork
- Color scheme appropriate for ${genre} genre
${book_type === 'picture' ? '- Vibrant, child-friendly illustration style' : '- Sophisticated, market-ready design'}

Output: A single flat cover image, NOT a 3D book mockup.`

 return prompt
}
