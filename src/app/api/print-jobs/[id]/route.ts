import { NextRequest, NextResponse } from 'next/server'
import { LuluAPI } from '@/lib/lulu-api'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { SupabaseDB } from '@/lib/supabase-db'
import { logError, errorContains } from '@/lib/api-errors'

/**
 * GET /api/print-jobs/[id]
 * Get the status and details of a specific print job.
 * [id] is the Lulu print job ID (lulu_print_job_id).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const luluPrintJobId = resolvedParams.id

    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify ownership via database
    const dbRecord = await SupabaseDB.getPrintJobByLuluId(luluPrintJobId)
    if (!dbRecord || dbRecord.user_id !== user.userId) {
      return NextResponse.json({ error: 'Print job not found or access denied' }, { status: 403 })
    }

    // 3. Check if Lulu API is configured
    if (!LuluAPI.isConfigured()) {
      return NextResponse.json({ error: 'Lulu API not configured' }, { status: 500 })
    }

    // 4. Fetch live status from Lulu
    const printJob = await LuluAPI.getPrintJob(luluPrintJobId)

    // 5. Return combined response (live Lulu data + cached DB fields)
    return NextResponse.json({
      id: printJob.id,
      status: printJob.status,
      external_id: printJob.external_id,
      total_cost: printJob.total_cost_incl_tax,
      created: printJob.created,
      updated: printJob.updated,
      line_items: printJob.line_items.map(
        (item: { id: string; title: string; quantity: number; status: string }) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          status: item.status,
        })
      ),
      shipping_address: printJob.shipping_address,
      // Cached tracking info from webhooks
      tracking_number: dbRecord.tracking_number,
      tracking_url: dbRecord.tracking_url,
      carrier: dbRecord.carrier,
      estimated_delivery_date: dbRecord.estimated_delivery_date,
    })
  } catch (error) {
    logError('print-jobs/[id]/get', error)

    if (errorContains(error, '404')) {
      return NextResponse.json({ error: 'Print job not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to retrieve print job' }, { status: 500 })
  }
}
