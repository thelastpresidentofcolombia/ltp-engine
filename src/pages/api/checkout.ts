/**
 * /api/checkout - Stripe Checkout Session Creator
 * 
 * ENGINE CONTRACT:
 * - GET  /api/checkout?operator=X&product=Y  → Redirect to Stripe
 * - POST { operatorId, productId?, offerId? } → JSON { url }
 * - Validates item exists and has stripe.priceId OR stripePriceId
 * - Creates Stripe Checkout Session with engine metadata
 * - Returns redirect (GET) or JSON (POST)
 * 
 * CHECKOUT-URL-FIRST PATTERN:
 * Client scripts check for checkoutUrl first and redirect directly.
 * This endpoint is only called when item needs Stripe session creation.
 * 
 * FUTURE: Stripe Connect
 * - Add application_fee_amount for platform commission
 * - Or use transfer_data for destination charges
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

// Astro 5: API routes must explicitly opt out of prerendering
export const prerender = false;

// Initialize Stripe (will fail gracefully if key missing)
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Engine version for metadata tracking
const ENGINE_VERSION = '1.0.0';

interface CheckoutParams {
  operatorId: string;
  vertical: string;
  productId?: string;
  offerId?: string;
}

/**
 * Shared checkout logic for both GET and POST
 */
async function createCheckoutSession(
  params: CheckoutParams,
  origin: string
): Promise<{ url: string } | { error: string; status: number }> {
  
  const { operatorId, vertical, productId, offerId } = params;

  // === LOAD OPERATOR DATA ===
  let operatorData: any;
  try {
    // Dynamic import of operator JSON
    const module = await import(`../../data/operators/${vertical}/${operatorId}/en.json`);
    operatorData = module.default;
  } catch (e) {
    console.error('[Checkout] Failed to load operator:', e);
    return { error: 'Operator not found', status: 404 };
  }

  // === FIND ITEM (product or offer) ===
  let item: any;
  let itemType: 'product' | 'offer' = 'product';
  const itemId = productId || offerId;

  if (productId) {
    item = operatorData.products?.find((p: any) => p.id === productId);
    itemType = 'product';
  } else if (offerId) {
    item = operatorData.offers?.find((o: any) => o.id === offerId);
    itemType = 'offer';
  }

  if (!item) {
    return { error: `${itemType} not found`, status: 404 };
  }

  // === VALIDATE STRIPE PRICE ID ===
  // Support both nested stripe.priceId and flat stripePriceId
  const priceId = item.stripe?.priceId || item.stripePriceId;
  
  if (!priceId) {
    return { error: 'Checkout not configured for this item', status: 400 };
  }

  // === CREATE STRIPE CHECKOUT SESSION ===
  try {
    const session = await stripe!.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Success/cancel URLs
      success_url: `${origin}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?checkout=cancelled`,
      
      // Metadata for webhooks (REQUIRED for /api/stripe/webhook)
      metadata: {
        operatorId,
        vertical,
        sourceModule: itemType === 'product' ? 'products' : 'offers',
        ...(productId ? { productId } : {}),
        ...(offerId ? { offerId } : {}),
        itemName: item.name || item.title || '',
        engineVersion: ENGINE_VERSION,
      },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    console.log(`[Checkout] Session created: ${itemType}:${itemId} operator:${operatorId} -> ${session.id}`);

    return { url: session.url };

  } catch (e: any) {
    console.error('[Checkout] Stripe error:', e.message);
    return { error: 'Failed to create checkout session', status: 500 };
  }
}

/**
 * GET /api/checkout?operator=X&vertical=Y&product=Z
 * → Redirect directly to Stripe Checkout
 */
export const GET: APIRoute = async ({ request, url }) => {
  // === GUARD: Stripe not configured ===
  if (!stripe) {
    console.error('[Checkout] STRIPE_SECRET_KEY not configured');
    return new Response('Payment processing not configured', { status: 503 });
  }

  // === PARSE QUERY PARAMS ===
  const operatorId = url.searchParams.get('operator');
  const vertical = url.searchParams.get('vertical');
  const productId = url.searchParams.get('product') || undefined;
  const offerId = url.searchParams.get('offer') || undefined;

  // === VALIDATE ===
  if (!operatorId || !vertical) {
    return new Response('Missing operator or vertical parameter', { status: 400 });
  }

  if (!productId && !offerId) {
    return new Response('Missing product or offer parameter', { status: 400 });
  }

  // === CREATE SESSION ===
  const origin = new URL(request.url).origin;
  const result = await createCheckoutSession({ operatorId, vertical, productId, offerId }, origin);

  if ('error' in result) {
    return new Response(result.error, { status: result.status });
  }

  // === REDIRECT TO STRIPE ===
  return Response.redirect(result.url, 303);
};
