/**
 * Shared photobook image transformation logic.
 * Used by both /api/photobook/transform and /api/photobook/create.
 */
import OpenAI from 'openai'
import { saveImageBufferToStorage, attachPathFragment } from '@/lib/image-storage'
import { isSupabaseConfigured } from '@/lib/supabase-admin'
import type { PhotoTransformStyle } from '@/types/photobook'

// Style prompts for each transformation style
export const STYLE_PROMPTS: Record<PhotoTransformStyle, string> = {
  original: '', // No transformation
  comic: 'Transform this photo into a vibrant comic book style illustration with bold outlines, cel-shading, halftone dots, and dynamic colors. Make it look like a professional comic book panel.',
  watercolor: 'Transform this photo into a beautiful watercolor painting with soft, flowing colors, visible brush strokes, and gentle color bleeding. Create an artistic, hand-painted feel.',
  anime: 'Transform this photo into a high-quality anime/manga style illustration with characteristic large expressive eyes, clean lines, and vibrant anime coloring. Match the style of popular anime productions.',
  oil_painting: 'Transform this photo into a classical oil painting with visible brush strokes, rich textures, and the depth of traditional oil paint. Create an artistic masterpiece feel.',
  pencil_sketch: 'Transform this photo into a detailed pencil sketch with careful shading, cross-hatching, and the texture of graphite on paper. Make it look hand-drawn by a skilled artist.',
  pop_art: 'Transform this photo into a bold pop art style piece with bright contrasting colors, Ben-Day dots, and the distinctive style of Andy Warhol or Roy Lichtenstein.',
  vintage_film: 'Transform this photo to have a nostalgic vintage film look with warm tones, slight grain, soft vignette, and the aesthetic of 1970s analog photography.',
  pixel_art: 'Transform this photo into retro pixel art style with visible pixels, limited color palette, and the aesthetic of classic 8-bit or 16-bit video games.',
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MiB

/**
 * Returns the allowlisted hostname derived from NEXT_PUBLIC_SUPABASE_URL.
 * Falls back to an empty string (no host allowed) when the env var is absent.
 */
function getAllowedImageHost(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return ''
  try {
    return new URL(supabaseUrl).hostname
  } catch {
    return ''
  }
}

/**
 * Download an image from a URL and return it as base64.
 *
 * Security hardening (SSRF prevention):
 * - Only https: scheme is allowed.
 * - Host must match the configured Supabase hostname (allowlist).
 * - Response size is capped at MAX_IMAGE_BYTES (5 MiB) via Content-Length header
 *   and a streaming byte counter.
 */
export async function downloadImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // Handle data: URLs directly (base64-encoded images from failed storage uploads)
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',')
    if (commaIdx === -1) throw new Error('Invalid data: URL format')
    const meta = url.slice(5, commaIdx) // e.g. "image/jpeg;base64"
    const mimeType = meta.split(';')[0] || 'image/jpeg'
    const base64 = url.slice(commaIdx + 1)
    return { base64, mimeType }
  }

  // Scheme check
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid image URL: ${url}`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`Image URL must use https scheme, got: ${parsed.protocol}`)
  }

  // Host allowlist check
  const allowedHost = getAllowedImageHost()
  if (!allowedHost || parsed.hostname !== allowedHost) {
    throw new Error(`Image host "${parsed.hostname}" is not allowed. Only "${allowedHost}" is permitted.`)
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }

  // Content-Length pre-check
  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large: Content-Length ${contentLength} exceeds ${MAX_IMAGE_BYTES} bytes`)
  }

  // Stream with byte counter to enforce the size limit
  if (!response.body) {
    throw new Error('Response body is null')
  }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  const reader = response.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      totalBytes += value.byteLength
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel()
        throw new Error(`Image too large: stream exceeded ${MAX_IMAGE_BYTES} bytes`)
      }
      chunks.push(value)
    }
  }

  const combined = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }

  const base64 = Buffer.from(combined).toString('base64')
  const mimeType = response.headers.get('content-type') || 'image/png'
  return { base64, mimeType }
}

/**
 * Transform an image using GPT Image API.
 * Returns base64-encoded PNG of the transformed image.
 *
 * Fix: uses model "gpt-image-1.5" (gpt-image-1.5) without response_format parameter.
 * gpt-image-1.5 returns b64_json directly. Falls back to DALL-E 3 on error.
 */
export async function transformImage(
  openai: OpenAI,
  imageBase64: string,
  mimeType: string,
  style: PhotoTransformStyle
): Promise<string> {
  if (style === 'original') {
    return imageBase64
  }

  const stylePrompt = STYLE_PROMPTS[style]

  // Step 1: Analyze the image content with GPT-4o vision
  const analysisResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Describe this image in detail for recreation. Include: subjects, poses, expressions, clothing, setting, lighting, colors, composition. Be very specific about positions and details. Do not add any interpretations, just describe what you see factually. Maximum 500 words.',
          },
        ],
      },
    ],
    max_tokens: 800,
  })

  const imageDescription = analysisResponse.choices[0]?.message?.content || 'A photograph'

  const fullPrompt = `${stylePrompt}

Based on this image description, create a new artwork:
${imageDescription}

Important: Maintain the exact composition, subjects, and details from the description while applying the artistic style.`

  console.log('🎨 Transforming image with style:', style)
  console.log('📝 Image description:', imageDescription.substring(0, 200) + '...')

  // Step 2: Generate transformed image with gpt-image-1.5
  // NOTE: gpt-image-1.5 does NOT accept response_format parameter —
  //       it always returns b64_json in imageResponse.data[0].b64_json
  try {
    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1.5',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const item = imageResponse.data?.[0]

    // gpt-image-1.5 returns b64_json directly
    if (item?.b64_json) {
      return item.b64_json
    }

    // Fallback: if a URL was returned (shouldn't happen for gpt-image-1.5, but just in case)
    if (item?.url) {
      const downloaded = await downloadImageAsBase64(item.url)
      return downloaded.base64
    }

    throw new Error('No image data returned from gpt-image-1.5')
  } catch (gptImageError) {
    console.warn('⚠️ gpt-image-1.5 failed, falling back to DALL-E 3:', gptImageError)

    // DALL-E 3 fallback — uses response_format: "b64_json"
    const fallbackResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      response_format: 'b64_json',
    })

    const fallbackItem = fallbackResponse.data?.[0]

    if (fallbackItem?.b64_json) {
      return fallbackItem.b64_json
    }

    if (fallbackItem?.url) {
      const downloaded = await downloadImageAsBase64(fallbackItem.url)
      return downloaded.base64
    }

    throw new Error('No image data from DALL-E 3 fallback either')
  }
}

/**
 * High-level helper: downloads a photo URL, transforms it, saves to Supabase storage,
 * and returns the new URL. Falls back to the original URL on any error.
 */
export async function transformAndSavePhoto(opts: {
  openai: OpenAI
  photoUrl: string
  photoId: string
  style: PhotoTransformStyle
  userId: string | undefined
}): Promise<string> {
  const { openai, photoUrl, photoId, style, userId } = opts

  if (style === 'original') return photoUrl

  try {
    const { base64, mimeType } = await downloadImageAsBase64(photoUrl)
    const transformedBase64 = await transformImage(openai, base64, mimeType, style)

    // Save to Supabase storage if configured, otherwise return base64 data URL
    if (isSupabaseConfigured) {
      try {
        const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const buffer = Buffer.from(transformedBase64, 'base64')
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        const storedImage = await saveImageBufferToStorage(arrayBuffer, {
          userId,
          filename: `transformed-${style}-${photoId}-${uniqueSuffix}.png`,
          contentType: 'image/png',
          directory: 'photobook-transformed',
        })
        const url = attachPathFragment(storedImage.signedUrl, storedImage.path)
        console.log(`✅ Saved transformed image for photo ${photoId}:`, storedImage.path)
        return url
      } catch (storageErr) {
        // Fix 3: The OpenAI transformation already succeeded and cost money.
        // Don't discard it — return the base64 data URL so the caller can still use the result.
        console.error(`❌ Failed to save transformed photo ${photoId} to storage, returning base64 data URL:`, storageErr)
        return `data:image/png;base64,${transformedBase64}`
      }
    }

    return `data:image/png;base64,${transformedBase64}`
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`❌ Failed to transform photo ${photoId} (style: ${style}):`, errMsg)
    // Re-throw so the caller can decide how to handle (don't silently ignore)
    throw new Error(`Transform failed for photo ${photoId}: ${errMsg}`)
  }
}
