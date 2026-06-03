import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB, type MediaLibraryItem } from '@/lib/supabase-db'
import { refreshSignedUrls, attachPathFragment } from '@/lib/image-storage'
import type { ImageLike } from '@/types/images'

/**
 * Stored media-library signed URLs expire (older records used a short TTL),
 * so re-sign every Supabase-backed url/thumbnail before returning them —
 * otherwise the browser hits expired tokens and Supabase returns 400.
 */
async function refreshMediaLibraryUrls(items: MediaLibraryItem[]): Promise<MediaLibraryItem[]> {
  const records: ImageLike[] = []
  // Track where each refreshed asset belongs so we can map results back.
  const slots: Array<{ item: MediaLibraryItem; field: 'url' | 'thumbnail_url' }> = []

  for (const item of items) {
    if (item.storage_type !== 'supabase') continue

    if (item.url) {
      records.push(
        item.storage_path
          ? { storagePath: item.storage_path, signedUrl: item.url, type: 'supabase' }
          : item.url
      )
      slots.push({ item, field: 'url' })
    }
    if (item.thumbnail_url) {
      // The schema has no separate thumbnail storage path. Reuse the item's
      // storage_path as a best-effort hint so the URL is recognised as a
      // Supabase asset and gets re-signed instead of being treated as remote.
      records.push(
        item.storage_path
          ? { storagePath: item.storage_path, signedUrl: item.thumbnail_url, type: 'supabase' }
          : item.thumbnail_url
      )
      slots.push({ item, field: 'thumbnail_url' })
    }
  }

  if (records.length === 0) return items

  const refreshed = await refreshSignedUrls(records)

  refreshed.forEach((asset, index) => {
    if (!asset?.signedUrl) return
    const { item, field } = slots[index]
    // Keep the storage path in the fragment so future refreshes can resolve it.
    item[field] = attachPathFragment(asset.signedUrl, asset.path)
  })

  return items
}

// GET - List user's media library
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || undefined
    const analysisStatus = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Get media library items
    const items = await refreshMediaLibraryUrls(
      await SupabaseDB.getUserMediaLibrary(user.userId!, {
        folder,
        analysisStatus,
        limit,
        offset
      })
    )

    // Get total count
    const totalCount = await SupabaseDB.getMediaLibraryCount(user.userId!)

    // Get folders
    const folders = await SupabaseDB.getMediaLibraryFolders(user.userId!)

    return NextResponse.json({
      success: true,
      items,
      total: totalCount,
      folders,
      pagination: {
        limit,
        offset,
        hasMore: offset + items.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching media library:', error)
    return NextResponse.json({
      error: 'Failed to fetch media library',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete media library items
export async function DELETE(request: NextRequest) {
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
    const { itemIds } = body as { itemIds: string[] }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({
        error: 'itemIds array is required'
      }, { status: 400 })
    }

    // Verify all items belong to the user before deleting
    const items = await SupabaseDB.getMediaLibraryItems(itemIds)
    const unauthorizedItems = items.filter(item => item.user_id !== user.userId)

    if (unauthorizedItems.length > 0) {
      return NextResponse.json({
        error: 'Unauthorized to delete some items'
      }, { status: 403 })
    }

    // Delete items
    await SupabaseDB.deleteMediaLibraryItems(itemIds)

    return NextResponse.json({
      success: true,
      deletedCount: itemIds.length
    })

  } catch (error) {
    console.error('Error deleting media library items:', error)
    return NextResponse.json({
      error: 'Failed to delete items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
