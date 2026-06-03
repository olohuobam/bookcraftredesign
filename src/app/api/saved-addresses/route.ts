import { NextRequest, NextResponse } from 'next/server'
import { SupabaseDB } from '@/lib/supabase-db'
import { getSupabaseUser } from '@/lib/auth-helpers'

// GET /api/saved-addresses - Get user's saved addresses
export async function GET(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await SupabaseDB.getUserSavedAddresses(user.userId!)

    return NextResponse.json({
      success: true,
      addresses
    })
  } catch (error) {
    console.error('Error fetching saved addresses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved addresses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/saved-addresses - Create new saved address
export async function POST(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { label, name, street1, street2, city, state_code, country_code, postcode, phone_number, is_default } = body

    // Validation
    if (!label || !name || !street1 || !city || !country_code || !postcode || !phone_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const address = await SupabaseDB.createSavedAddress({
      user_id: user.userId!,
      label,
      name,
      street1,
      street2,
      city,
      state_code,
      country_code,
      postcode,
      phone_number,
      is_default: is_default || false
    })

    return NextResponse.json({
      success: true,
      address
    })
  } catch (error) {
    console.error('Error creating saved address:', error)
    return NextResponse.json(
      { error: 'Failed to create saved address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/saved-addresses?id=xxx - Delete a saved address
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const addressId = searchParams.get('id')

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 })
    }

    // Verify ownership
    const address = await SupabaseDB.getSavedAddress(addressId)
    if (!address || address.user_id !== user.userId!) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 })
    }

    await SupabaseDB.deleteSavedAddress(addressId)

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting saved address:', error)
    return NextResponse.json(
      { error: 'Failed to delete saved address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH /api/saved-addresses - Update a saved address
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 })
    }

    // Verify ownership
    const address = await SupabaseDB.getSavedAddress(id)
    if (!address || address.user_id !== user.userId!) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 })
    }

    const updatedAddress = await SupabaseDB.updateSavedAddress(id, updates)

    return NextResponse.json({
      success: true,
      address: updatedAddress
    })
  } catch (error) {
    console.error('Error updating saved address:', error)
    return NextResponse.json(
      { error: 'Failed to update saved address', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
