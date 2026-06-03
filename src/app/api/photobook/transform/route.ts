import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { verifySupabaseToken, isSupabaseConfigured } from '@/lib/supabase-admin'
import { saveImageBufferToStorage, attachPathFragment } from '@/lib/image-storage'
import {
  downloadImageAsBase64,
  transformImage,
  STYLE_PROMPTS,
} from '@/lib/photobook-transform'
import type { PhotoTransformStyle } from '@/types/photobook'

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { imageUrl, imageBase64: providedBase64, style, photoId } = body as {
      imageUrl?: string
      imageBase64?: string
      style: PhotoTransformStyle
      photoId?: string
    }

    if (!style) {
      return NextResponse.json({ error: 'Style is required' }, { status: 400 })
    }

    // Fix 4: Validate that style is a known value
    const validStyles = Object.keys(STYLE_PROMPTS) as string[]
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: `Invalid style "${style}". Valid styles: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    if (!imageUrl && !providedBase64) {
      return NextResponse.json({ error: 'Either imageUrl or imageBase64 is required' }, { status: 400 })
    }

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })
    }

    // Get image as base64
    let imageBase64: string
    let mimeType: string = 'image/png'

    if (providedBase64) {
      if (providedBase64.startsWith('data:')) {
        const matches = providedBase64.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          mimeType = matches[1]
          imageBase64 = matches[2]
        } else {
          imageBase64 = providedBase64
        }
      } else {
        imageBase64 = providedBase64
      }
    } else if (imageUrl) {
      const downloaded = await downloadImageAsBase64(imageUrl)
      imageBase64 = downloaded.base64
      mimeType = downloaded.mimeType
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Transform the image
    console.error(`🎨 Starting transformation: ${style} for photo ${photoId || 'unknown'}`)
    const transformedBase64 = await transformImage(openai, imageBase64, mimeType, style)

    // Save transformed image to storage if Supabase is configured
    let transformedUrl = `data:image/png;base64,${transformedBase64}`
    let storagePath: string | undefined

    if (isSupabaseConfigured) {
      try {
        const buffer = Buffer.from(transformedBase64, 'base64')
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        const uniqueSuffixPost = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const storedImage = await saveImageBufferToStorage(arrayBuffer, {
          userId: user.userId,
          filename: `transformed-${style}-${photoId || Date.now().toString(36)}-${uniqueSuffixPost}.png`,
          contentType: 'image/png',
          directory: 'photobook-transformed',
        })
        transformedUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)
        storagePath = storedImage.path
        console.error('✅ Transformed image saved to storage:', storagePath)
      } catch (storageError) {
        console.warn('⚠️ Could not save transformed image to storage:', storageError)
        // Keep base64 URL as fallback
      }
    }

    return NextResponse.json({
      success: true,
      photoId,
      style,
      originalUrl: imageUrl,
      transformedUrl,
      transformedBase64,
      storagePath,
    })
  } catch (error) {
    console.error('Error transforming photo:', error)
    return NextResponse.json({
      error: 'Failed to transform photo',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// Batch transform multiple photos
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { photos, style } = body as {
      photos: Array<{ id: string; url: string }>
      style: PhotoTransformStyle
    }

    if (!style || style === 'original') {
      return NextResponse.json({ error: 'Valid transformation style is required' }, { status: 400 })
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'Photos array is required' }, { status: 400 })
    }

    console.error(`🎨 Starting batch transformation: ${photos.length} photos to ${style} style`)

    const results = []
    let successful = 0
    let failed = 0

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      console.error(`📸 Transforming photo ${i + 1}/${photos.length}: ${photo.id}`)

      try {
        const { base64, mimeType } = await downloadImageAsBase64(photo.url)
        const transformedBase64 = await transformImage(openai, base64, mimeType, style)

        let transformedUrl = `data:image/png;base64,${transformedBase64}`
        let storagePath: string | undefined

        if (isSupabaseConfigured) {
          try {
            const buffer = Buffer.from(transformedBase64, 'base64')
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
            const uniqueSuffixPut = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
            const storedImage = await saveImageBufferToStorage(arrayBuffer, {
              userId: user.userId,
              filename: `transformed-${style}-${photo.id}-${uniqueSuffixPut}.png`,
              contentType: 'image/png',
              directory: 'photobook-transformed',
            })
            transformedUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)
            storagePath = storedImage.path
          } catch (storageError) {
            console.warn('⚠️ Could not save to storage:', storageError)
          }
        }

        results.push({
          id: photo.id,
          success: true,
          originalUrl: photo.url,
          transformedUrl,
          storagePath,
        })
        successful++
      } catch (error) {
        console.error(`❌ Failed to transform photo ${photo.id}:`, error)
        results.push({
          id: photo.id,
          success: false,
          originalUrl: photo.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failed++
      }

      // Small delay between transformations to avoid rate limits
      if (i < photos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.error(`✅ Batch transformation complete: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      style,
      total: photos.length,
      successful,
      failed,
      results,
    })
  } catch (error) {
    console.error('Error in batch transform:', error)
    return NextResponse.json({
      error: 'Failed to batch transform photos',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
