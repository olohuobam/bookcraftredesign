import { NextRequest, NextResponse } from 'next/server'
import { SupabaseDB } from '@/lib/supabase-db'
import { createSignedUrl, attachPathFragment, splitSignedUrl } from '@/lib/image-storage'

// GET /api/user/public-profile?userId=... — fetch any user's public profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const user = await SupabaseDB.getProfile(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Refresh profile image signed URL if needed
    let refreshedImageUrl = user.image
    if (user.image) {
      try {
        const { storagePath } = splitSignedUrl(user.image)
        if (storagePath) {
          const newSignedUrl = await createSignedUrl(storagePath)
          if (newSignedUrl) {
            refreshedImageUrl = attachPathFragment(newSignedUrl, storagePath)
          }
        }
      } catch (err) {
        console.warn('Could not refresh profile image URL:', err)
      }
    }

    // Return only public-safe fields (no email, no settings)
    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        image: refreshedImageUrl,
        bio: user.bio,
        createdAt: user.created_at,
      }
    })
  } catch (error) {
    console.error('Error fetching public user profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
