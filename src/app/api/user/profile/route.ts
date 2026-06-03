import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { createSignedUrl, attachPathFragment, splitSignedUrl } from '@/lib/image-storage'
import type { Language } from '@/lib/translations'

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user profile from Supabase
    if (!userData.userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }
    const user = await SupabaseDB.getProfile(userData.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get book count
    const books = await SupabaseDB.getUserBooks(userData.userId)
    const bookCount = books.length

    // Refresh profile image signed URL if needed
    let refreshedImageUrl = user.image
    if (user.image) {
      try {
        // Extract the storage path from the URL (handles #!path= fragment)
        const { storagePath } = splitSignedUrl(user.image)

        // Only refresh if this looks like a Supabase storage URL with a valid path
        if (storagePath) {
          // Generate a fresh signed URL with new expiration
          const newSignedUrl = await createSignedUrl(storagePath)
          if (newSignedUrl) {
            refreshedImageUrl = attachPathFragment(newSignedUrl, storagePath)
          }
        }
      } catch (err) {
        // Keep original URL if refresh fails (might be local or external URL)
        console.warn('Could not refresh profile image URL:', err)
      }
    }

    // Return user data in camelCase format
    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        image: refreshedImageUrl,
        language: user.language,
        theme: user.theme,
        emailNotifications: user.email_notifications,
        pushNotifications: user.push_notifications,
        weeklyReport: user.weekly_report,
        bookCompletionAlert: user.book_completion_alert,
        has_completed_onboarding: user.has_completed_onboarding,
        cover_generation_credits: user.cover_generation_credits ?? 3, // Default 3 free
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        _count: {
          books: bookCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch user profile' 
    }, { status: 500 })
  }
}

// PATCH /api/user/profile - update name/email using Supabase token
export async function PATCH(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      email,
      bio,
      image,
      language,
      theme,
      emailNotifications,
      pushNotifications,
      weeklyReport,
      bookCompletionAlert,
      has_completed_onboarding
    } = body as {
      name?: string
      email?: string
      bio?: string
      image?: string
      language?: Language
      theme?: string
      emailNotifications?: boolean
      pushNotifications?: boolean
      weeklyReport?: boolean
      bookCompletionAlert?: boolean
      has_completed_onboarding?: boolean
    }

    if (!name && !email && bio === undefined && image === undefined && !language && !theme &&
        emailNotifications === undefined && pushNotifications === undefined &&
        weeklyReport === undefined && bookCompletionAlert === undefined &&
        has_completed_onboarding === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Ensure user profile exists - check user ID first
    if (!userData.userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }

    // Update user profile in Supabase
    const updates: Record<string, unknown> = {}
    if (name) updates.name = name
    if (email) updates.email = email
    if (bio !== undefined) updates.bio = bio
    if (image !== undefined) updates.image = image
    if (language) updates.language = language
    if (theme) updates.theme = theme
    if (emailNotifications !== undefined) updates.email_notifications = emailNotifications
    if (pushNotifications !== undefined) updates.push_notifications = pushNotifications
    if (weeklyReport !== undefined) updates.weekly_report = weeklyReport
    if (bookCompletionAlert !== undefined) updates.book_completion_alert = bookCompletionAlert
    if (has_completed_onboarding !== undefined) updates.has_completed_onboarding = has_completed_onboarding

    const updated = await SupabaseDB.updateProfile(userData.userId, updates)

    // Return user data in camelCase format
    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        bio: updated.bio,
        image: updated.image,
        language: updated.language,
        theme: updated.theme,
        emailNotifications: updated.email_notifications,
        pushNotifications: updated.push_notifications,
        weeklyReport: updated.weekly_report,
        bookCompletionAlert: updated.book_completion_alert,
        has_completed_onboarding: updated.has_completed_onboarding,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

// DELETE /api/user/profile - delete account and cascade
export async function DELETE(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Delete all user books first (cascade) - check user ID first
    if (!userData.userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }
    const userBooks = await SupabaseDB.getUserBooks(userData.userId)
    console.error(`🔥 DELETE: Deleting ${userBooks.length} books`)
    for (const book of userBooks) {
      if (!book.id) {
        console.warn('🔴 DELETE: Book without persistent ID encountered, skipping deletion', book)
        continue
      }
      await SupabaseDB.deleteBook(book.id)
    }
    console.error('🟢 DELETE: All books deleted')

    // Delete user profile from Supabase (auth user deletion managed by Supabase)
    console.error('🔥 DELETE: Deleting user profile from Supabase database')
    await SupabaseDB.deleteProfile(userData.userId)
    console.error('🟢 DELETE: User profile deleted')
    
    // Note: In Supabase, auth user deletion should be handled by the client or RLS policies
    console.error('🟢 DELETE: Account deletion completed successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Profile and data deleted. Auth user deletion managed by Supabase client.'
    })
  } catch (error) {
    console.error('🔴 DELETE: Error deleting user account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
