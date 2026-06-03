// POST /api/stripe/checkout
// Primary checkout endpoint used by all frontend purchase flows (book purchase + subscription).
// Supersedes the legacy /api/create-checkout endpoint (deleted), which only handled bulk
// purchases without server-side price validation or coupon support.
import { NextRequest, NextResponse } from "next/server";
import { stripe, getMainAppUrl } from "@/lib/stripe";
import { PRICING, getBookPrice } from "@/lib/pricing";
import { SupabaseDB } from "@/lib/supabase-db";
import { supabaseAdmin, verifySupabaseToken } from '@/lib/supabase-admin'
import { checkIsPro } from '@/lib/subscription-utils'

// Allowed subscription plan IDs
const ALLOWED_PLANS: Record<string, { name: string; description: string }> = {
  pro: {
    name: "Bookcraft Pro",
    description: "Unlimited book creation with Bookcraft Pro",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, couponCode } = body;

    const mainAppUrl = getMainAppUrl();

    // Handle subscription checkout
    if (type === "subscription") {
      const { itemId } = body;

      if (!itemId) {
        return NextResponse.json(
          { error: "Missing required parameter: itemId" },
          { status: 400 },
        );
      }

      // Validate plan against allow-list — derive name server-side
      const plan = ALLOWED_PLANS[itemId];
      if (!plan) {
        return NextResponse.json(
          { error: "Invalid subscription plan" },
          { status: 400 },
        );
      }

      const successUrl = `${mainAppUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${mainAppUrl}/dashboard/billing?canceled=true`;

      console.error("Creating subscription checkout session for plan:", itemId);

      let trialPeriodDays: number | undefined = 7

      const authorization = request.headers.get('authorization')
      const token = authorization?.replace('Bearer ', '')

      if (token && supabaseAdmin) {
        const userData = await verifySupabaseToken(token)
        if (userData?.userId) {
          const { data: previousProSubscription } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', userData.userId)
            .eq('plan', 'pro')
            .limit(1)
            .maybeSingle()

          if (previousProSubscription) {
            trialPeriodDays = undefined
          }
        }
      }

      // Create Stripe checkout session for subscription using price_data
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: { name: plan.name, description: plan.description },
              unit_amount: PRICING.SUBSCRIPTION.PRO,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          type: "subscription",
          plan: itemId,
          planName: plan.name,
        },
        subscription_data: {
          metadata: {
            plan: itemId,
          },
          ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
        },
        // Note: customer_creation is NOT allowed in subscription mode (Stripe creates customer automatically)
      });

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    }

    // Handle book purchase checkout (default)
    const { bookId } = body;

    if (!bookId) {
      return NextResponse.json(
        { error: "Missing required parameter: bookId" },
        { status: 400 },
      );
    }

    // Check if user is Pro subscriber (Pro users have full access, no purchase needed)
    const authorization = request.headers.get('authorization')
    const bookToken = authorization?.replace('Bearer ', '')
    if (bookToken && supabaseAdmin) {
      try {
        const userData = await verifySupabaseToken(bookToken)
        if (userData?.userId) {
          const isPro = await checkIsPro(userData.userId)
          if (isPro) {
            return NextResponse.json(
              { error: 'Pro subscribers have full access \u2014 no purchase needed', isPro: true },
              { status: 409 },
            )
          }
        }
      } catch {
        // Token verification failed — continue to checkout (guest purchase)
      }
    }

    // Fetch book from database to calculate price server-side (prevents price tampering)
    const book = await SupabaseDB.getBook(bookId);
    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 },
      );
    }

    const bookTitle = book.title || "Untitled Book";
    const bookType = book.book_type || "text";
    const chapterOrPageCount = book.chapters || 5;

    // Calculate price server-side from authoritative book data
    const unitAmount = getBookPrice(bookType, chapterOrPageCount);

    // Success URL zur Haupt-App
    const successUrl = `${mainAppUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&book_id=${bookId}`;
    const cancelUrl = `${mainAppUrl}/books/${bookId}?canceled=true`;

    console.error("Creating checkout session with success URL:", successUrl);
    console.error("Cancel URL:", cancelUrl);
    console.error("Server-calculated price:", unitAmount, "cents for", bookType, "with", chapterOrPageCount, "chapters/pages");

    // If coupon code provided, create a Stripe coupon for this session
    let discounts: { coupon: string }[] | undefined;
    if (couponCode) {
      try {
        // Dynamically import to avoid circular deps
        const { validateCoupon, incrementCouponUsage } = await import('@/lib/discounts');
        const result = await validateCoupon(couponCode, unitAmount);
        if (result.valid && result.coupon) {
          // Create a one-time Stripe coupon
          const stripeCoupon = await stripe.coupons.create(
            result.coupon.discount_type === 'percentage'
              ? { percent_off: result.coupon.discount_value, duration: 'once' }
              : { amount_off: result.coupon.discount_value, currency: 'eur', duration: 'once' }
          );
          discounts = [{ coupon: stripeCoupon.id }];
          // Increment usage
          await incrementCouponUsage(result.coupon.id);
        }
      } catch (e) {
        console.warn('Coupon processing failed, proceeding without discount:', e);
      }
    }

    // Create Stripe checkout session for book purchase
    // Note: do NOT hardcode payment_method_types — let Stripe auto-select based on account settings
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: bookTitle,
              description: `Purchase your book: ${bookTitle}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      ...(discounts ? { discounts } : {}),
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookId: bookId.toString(),
        bookTitle: bookTitle,
        couponCode: couponCode || '',
      },
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      customer_creation: "always",
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Log Stripe-specific details so the real cause is visible in server logs
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeErr = error as { type: string; code?: string; statusCode?: number };
      console.error("Stripe error creating checkout session:", stripeErr.type, stripeErr.code, stripeErr.statusCode, message);
    } else {
      console.error("Error creating checkout session:", message, error);
    }
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
