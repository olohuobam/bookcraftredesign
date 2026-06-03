import { NextRequest, NextResponse } from 'next/server'
import { LuluAPI } from '@/lib/lulu-api'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { SupabaseDB, PrintJob } from '@/lib/supabase-db'
import { LuluPDFGenerator } from '@/lib/lulu-pdf-generator'
import { stripe } from '@/lib/stripe'
import { PrintOrderSchema } from '@/lib/validation'
import { createErrorResponse, logError, errorContains } from '@/lib/api-errors'
import { PRINT_ON_DEMAND_ENABLED, PRINT_DISABLED_RESPONSE } from '@/lib/feature-flags'

/**
 * POST /api/print-jobs
 * Create a new Lulu print job for a book.
 * Requires a completed Stripe payment before submitting to Lulu.
 */
export async function POST(request: NextRequest) {
  try {
    if (!PRINT_ON_DEMAND_ENABLED) {
      return NextResponse.json(PRINT_DISABLED_RESPONSE, { status: 503 })
    }

    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate request body with Zod
    const body = await request.json()
    let validatedData

    try {
      validatedData = PrintOrderSchema.parse({
        bookId: body.bookId,
        paymentIntentId: body.paymentIntentId,
        quantity: body.quantity || 1,
        shippingAddress: body.shippingAddress,
        email: body.shippingAddress?.email || user.email,
      })
    } catch (error) {
      return createErrorResponse(error, 'Invalid request body', 400)
    }

    const { bookId, shippingAddress, quantity, paymentIntentId } = validatedData

    // Additional options (not validated by Zod)
    const shippingLevel = body.shippingLevel || 'MAIL'
    const bookFormat = body.bookFormat || '6x9'
    const paperType = body.paperType || 'white'
    const coverType = body.coverType || 'matte'

    // 3. Verify payment with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment not completed. Status: ' + paymentIntent.status },
          { status: 402 }
        )
      }

      if (paymentIntent.metadata.user_id !== user.userId) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 403 })
      }

      console.error(
        `✅ Payment verified: ${paymentIntentId} (${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()})`
      )
    } catch (stripeError) {
      console.error('❌ Stripe verification error:', stripeError)
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 })
    }

    // 4. Check if Lulu API is configured
    if (!LuluAPI.isConfigured()) {
      return NextResponse.json(
        {
          error:
            'Lulu API not configured. Please set LULU_CLIENT_ID and LULU_CLIENT_SECRET environment variables.',
        },
        { status: 500 }
      )
    }

    // 5. Get book data from database
    const bookData = await SupabaseDB.getBookById(bookId, user.userId!)
    if (!bookData) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // 6. Ensure book is completed
    if (bookData.status !== 'completed') {
      return NextResponse.json(
        {
          error:
            'Book must be completed before printing. Current status: ' + bookData.status,
        },
        { status: 400 }
      )
    }

    // 7. Generate PDF buffers
    let coverPDF: Buffer
    let interiorPDF: Buffer

    try {
      coverPDF = LuluPDFGenerator.generateCoverPDF(bookData)
      interiorPDF = LuluPDFGenerator.generateInteriorPDF(bookData)
    } catch (error) {
      logError('print-jobs/pdf-generation', error)
      return createErrorResponse(error, 'Failed to generate PDF files for printing')
    }

    // Validate PDFs are non-empty AND begin with the PDF magic bytes (%PDF-).
    // Lulu rejects malformed files; catching this here gives a clearer error
    // than waiting for Lulu's API to fail.
    const MIN_PDF_SIZE = 1024
    const PDF_MAGIC = Buffer.from('%PDF-', 'ascii')
    const isValidPDF = (buf: Buffer | undefined): boolean =>
      !!buf && buf.length >= MIN_PDF_SIZE && buf.subarray(0, 5).equals(PDF_MAGIC)

    if (!isValidPDF(coverPDF) || !isValidPDF(interiorPDF)) {
      return NextResponse.json(
        {
          error: 'PDF generation failed - invalid PDF buffers',
          details: [
            `Cover PDF: ${coverPDF?.length ?? 0} bytes`,
            `Interior PDF: ${interiorPDF?.length ?? 0} bytes`,
          ],
        },
        { status: 400 }
      )
    }

    // 8. Get Lulu product configuration
    const productId = LuluPDFGenerator.getLuluProductId(bookData, bookFormat, paperType, coverType)
    const estimatedCost = LuluPDFGenerator.estimatePrintCost(bookData, bookFormat, paperType, coverType)

    // 9. Build Lulu print job payload
    const luluShippingAddress = {
      name: shippingAddress.name,
      street1: shippingAddress.street1,
      street2: shippingAddress.street2,
      city: shippingAddress.city,
      state_code: shippingAddress.stateCode,
      country_code: shippingAddress.countryCode,
      postcode: shippingAddress.postcode,
    }

    const printJobData = {
      contact_email: user.email || 'noreply@bookcraft.com',
      external_id: `book-${bookId}-${Date.now()}`,
      line_items: [
        {
          external_id: `item-${bookId}`,
          print_cost: estimatedCost,
          product_id: productId,
          quantity: quantity,
          title: bookData.title as string,
        },
      ],
      production_delay: 120,
      shipping_address: luluShippingAddress,
      shipping_level: shippingLevel as string,
    }

    // 10. Create print job with Lulu
    const printJob = await LuluAPI.createPrintJobWithBuffers(printJobData, coverPDF, interiorPDF)

    // 11. Store print job in database
    try {
      await SupabaseDB.createPrintJob({
        user_id: user.userId!,
        book_id: bookId,
        lulu_print_job_id: printJob.id,
        external_id: printJobData.external_id,
        status: printJob.status,
        total_cost_incl_tax: printJob.total_cost_incl_tax,
        shipping_address: shippingAddress,
        shipping_level: shippingLevel,
        line_items: printJobData.line_items,
        product_id: productId,
        print_job_data: printJob as unknown as Record<string, unknown>,
        quantity: quantity,
        payment_intent_id: paymentIntentId,
        payment_status: 'succeeded',
      })
    } catch (dbError) {
      console.error('Error storing print job in database:', dbError)
      // Print job was created with Lulu — don't fail the request
    }

    // 12. Return success response
    return NextResponse.json({
      success: true,
      print_job_id: printJob.id,
      status: printJob.status,
      total_cost: printJob.total_cost_incl_tax,
      external_id: printJob.external_id,
      book_title: bookData.title,
      product_id: productId,
      estimated_cost: estimatedCost,
      message: 'Print job created successfully',
    })
  } catch (error) {
    logError('print-jobs/create', error)

    if (errorContains(error, '401')) {
      return NextResponse.json(
        { error: 'Lulu API authentication failed. Check your credentials.', code: 'LULU_AUTH_ERROR' },
        { status: 500 }
      )
    }

    if (errorContains(error, '400')) {
      return NextResponse.json(
        {
          error: 'Invalid print job data. Check file URLs and product configuration.',
          code: 'LULU_VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    return createErrorResponse(error, 'Failed to create print job')
  }
}

/**
 * GET /api/print-jobs
 * List all print jobs for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Optional limit
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const bookId = searchParams.get('bookId')

    // 3. Fetch user's print jobs
    let printJobs = await SupabaseDB.getUserPrintJobs(user.userId!, limit)
    
    // Filter by bookId if provided
    if (bookId) {
      printJobs = printJobs.filter((job) => job.book_id === bookId)
    }

    // 4. Format response
    const formattedJobs = printJobs.map((job: PrintJob & { books?: { title?: string; author?: string; book_type?: string; cover_image?: string } }) => ({
      id: job.id,
      lulu_print_job_id: job.lulu_print_job_id,
      external_id: job.external_id,
      status: job.status,
      book_id: job.book_id,
      book_title: job.books?.title || 'Unknown Book',
      book_author: job.books?.author,
      book_type: job.books?.book_type,
      cover_image: job.books?.cover_image || null,
      total_cost_incl_tax: job.total_cost_incl_tax,
      shipping_level: job.shipping_level,
      shipping_address: job.shipping_address,
      line_items: job.line_items,
      product_id: job.product_id,
      tracking_number: job.tracking_number,
      tracking_url: job.tracking_url,
      carrier: job.carrier,
      created_at: job.created_at,
      updated_at: job.updated_at,
      last_webhook_update: job.webhook_updates?.length
        ? job.webhook_updates[job.webhook_updates.length - 1]?.received_at
        : null,
    }))

    return NextResponse.json({
      print_jobs: formattedJobs,
      total_count: formattedJobs.length,
    })
  } catch (error) {
    console.error('Error fetching print jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch print jobs' }, { status: 500 })
  }
}
