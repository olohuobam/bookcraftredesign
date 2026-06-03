import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import { SupabaseDB } from '@/lib/supabase-db'

// Support both live and test webhook secrets (allows test webhooks on production domain)
const webhookSecrets = [
  process.env.STRIPE_WEBHOOK_SECRET,
  process.env.STRIPE_WEBHOOK_SECRET_TEST,
].filter(Boolean) as string[]

export async function POST(req: NextRequest) {
  if (webhookSecrets.length === 0) {
    console.error('No STRIPE_WEBHOOK_SECRET configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 })
  }

  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event

  // Try each secret until one works (supports live + test webhooks on same endpoint)
  let lastError: unknown
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret)
      break
    } catch (err) {
      lastError = err
    }
  }

  if (!event) {
    console.error('⚠️  Webhook signature verification failed with all secrets.', lastError)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log(`🔔 Stripe webhook received: ${event.type}`)

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      console.log(`✅ Payment Intent succeeded: ${paymentIntent.id}`)
      
      try {
        // Extract metadata
        const {
          type,
          userId,
          bookId,
          bookTitle,
          quantity,
          selectedBookIds
          // paymentType reserved for future use
        } = paymentIntent.metadata

        // 🔥 NEW: Handle different payment types
        if (type === 'digital_purchase' && bookId) {
          // Digital book purchase - mark single book as purchased with Payment Intent reference
          try {
            // Idempotency: if this book is already linked to this PaymentIntent, skip.
            const existingBook = await SupabaseDB.getBookById(bookId, userId)
            if (
              existingBook?.purchased &&
              (existingBook as { stripe_payment_intent_id?: string }).stripe_payment_intent_id === paymentIntent.id
            ) {
              console.log(`⏭️ Book ${bookId} already marked as purchased for PI ${paymentIntent.id} — skipping`)
              break
            }

            await SupabaseDB.markBookAsPurchased(
              bookId,
              userId,
              paymentIntent.id  // ← Store Payment Intent ID (links to foreign table)
            )
            
            console.log(`📚 Digital book ${bookId} "${bookTitle}" purchased successfully`)
            console.log(`💳 Payment Intent: ${paymentIntent.id}`)
            console.log(`💰 Amount: ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)}`)
            
            // The detailed payment data is automatically in stripe_payment_intents (foreign table)
            // No need to manually insert - Supabase Wrappers handles it!
            
          } catch (error) {
            console.error(`❌ Failed to mark digital book ${bookId} as purchased:`, error)
          }
        } 
        else if (type === 'print_order' && bookId) {
          // 🚀 Print order processing with database tracking
          try {
            const { printOption, quantity, shippingCountry } = paymentIntent.metadata
            
            // Create print job in database
            const printJob = await SupabaseDB.createPrintJob({
              user_id: userId,
              book_id: bookId,
              lulu_print_job_id: '', // Will be updated when submitted to Lulu
              external_id: paymentIntent.id, // Use Stripe Payment Intent ID as external reference
              status: 'payment_received',
              total_cost_incl_tax: (paymentIntent.amount / 100).toFixed(2),
              shipping_address: {
                country: shippingCountry
              },
              shipping_level: 'standard',
              line_items: [{
                print_option: printOption,
                quantity: parseInt(quantity),
                book_title: bookTitle
              }],
              print_job_data: {
                payment_provider: 'stripe',
                payment_intent_id: paymentIntent.id,
                print_option: printOption,
                quantity: parseInt(quantity)
              }
            })
            
            console.log(`🖨️ Print job created: ${printJob.id} for book ${bookId}`)
            console.log(`💰 Payment: €${(paymentIntent.amount / 100).toFixed(2)} via Stripe`)
            
            // TODO Phase 4: Submit to Lulu API and update lulu_print_job_id
            
          } catch (error) {
            console.error(`❌ Failed to create print job for book ${bookId}:`, error)
          }
        }
        else if (selectedBookIds) {
          // Legacy bulk purchase logic
          const bookIds = JSON.parse(selectedBookIds)
          
          // Mark selected books as purchased
          for (const bookIdLegacy of bookIds) {
            try {
              await SupabaseDB.markBookAsPurchased(bookIdLegacy, userId)
              console.log(`📚 Book ${bookIdLegacy} marked as purchased`)
            } catch (error) {
              console.error(`❌ Failed to mark book ${bookIdLegacy} as purchased:`, error)
            }
          }
        }

        console.log(`🎉 Successfully processed ${type || 'legacy'} payment for ${quantity || '1'} book(s)`)
        
      } catch (error) {
        console.error('❌ Error processing payment intent:', error)
      }
      break

    case 'checkout.session.completed': {
      const session = event.data.object
      console.log(`✅ Checkout Session completed: ${session.id}`)

      const meta = session.metadata || {}
      if (meta.order_type === 'print_order') {
        try {
          // Idempotency: skip if a print job already exists for this checkout session.
          const existingJob = await SupabaseDB.getPrintJobByExternalId(session.id)
          if (existingJob) {
            console.log(`⏭️ Print job already exists for session ${session.id} (id=${existingJob.id}) — skipping`)
            break
          }

          const printJob = await SupabaseDB.createPrintJob({
            user_id: meta.user_id || '',
            book_id: meta.book_id || '',
            lulu_print_job_id: '', // updated when submitted to Lulu
            external_id: session.id,
            status: 'payment_received',
            total_cost_incl_tax: ((session.amount_total ?? 0) / 100).toFixed(2),
            shipping_address: {
              name: meta.addr_name,
              street1: meta.addr_street1,
              street2: meta.addr_street2 || undefined,
              city: meta.addr_city,
              postcode: meta.addr_postcode,
              country: meta.addr_country_code,
              state: meta.addr_state_code || undefined,
              phone: meta.addr_phone,
            },
            shipping_level: meta.shipping_level || 'MAIL',
            line_items: [{
              quantity: parseInt(meta.quantity || '1'),
              book_title: meta.book_title,
              book_format: meta.book_format,
              paper_type: meta.paper_type,
              cover_type: meta.cover_type,
              book_type: meta.book_type,
            }],
            print_job_data: {
              payment_provider: 'stripe',
              checkout_session_id: session.id,
              lulu_cost_cents: meta.lulu_cost_cents,
              service_fee_cents: meta.service_fee_cents,
              book_format: meta.book_format,
              paper_type: meta.paper_type,
              cover_type: meta.cover_type,
              book_type: meta.book_type,
              shipping_level: meta.shipping_level,
            },
          })
          console.log(`🖨️ Print job created via Checkout Session: ${printJob.id} for book ${meta.book_id}`)
        } catch (error) {
          console.error(`❌ Failed to create print job from Checkout Session ${session.id}:`, error)
        }
      }
      break
    }

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object
      console.error(`❌ Payment Intent failed: ${failedPayment.id}`)
      // Handle failed payment
      break

    default:
      console.log(`🤷 Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}