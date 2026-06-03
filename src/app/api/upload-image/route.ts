import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { saveImageBufferToStorage, attachPathFragment } from '@/lib/image-storage'

export async function POST(request: NextRequest) {
  try {
    // Verify Supabase token
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const storedImage = await saveImageBufferToStorage(arrayBuffer, {
      userId: user.userId,
      filename: file.name,
      contentType: file.type,
      directory: 'uploads'
    })

    const imageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)

    return NextResponse.json({
      success: true,
      imageUrl,
      image: { ...storedImage, signedUrl: imageUrl }
    })

  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
