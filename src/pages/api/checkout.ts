/**
 * /api/checkout - Stripe Checkout Session Creator
 * 
 * ENGINE CONTRACT:
 * - POST { operatorId, productId?, offerId? }
 * - Validates item exists and has stripe.priceId
 * - Creates Stripe Checkout Session
 * - Returns { url } for redirect
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

interface CheckoutRequest {
  operatorId?: string;
  productId?: string;
  offerId?: string;
}

export const POST: APIRoute = async ({ request }) => {
  // === GUARD: Stripe not configured ===
  if (!stripe) {
    console.error('[Checkout] STRIPE_SECRET_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Payment processing not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === PARSE REQUEST ===
  let body: CheckoutRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { operatorId, productId, offerId } = body;

  // === VALIDATE: Need operator and item ID ===
  if (!operatorId) {
    return new Response(
      JSON.stringify({ error: 'operatorId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!productId && !offerId) {
    return new Response(
      JSON.stringify({ error: 'productId or offerId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === LOAD OPERATOR DATA ===
  // We need to dynamically import the operator's JSON to find the item
  // This is safe because operatorId is validated against actual files
  let operatorData: any;
  try {
    // Try to find operator by scanning known verticals
    const verticals = ['consultancy', 'fitness', 'tours', 'nightlife'];
    let found = false;
    
    for (const vertical of verticals) {
      try {
        // Dynamic import of operator JSON (Astro handles this at runtime)
        const module = await import(`../../content/operators/${vertical}/${operatorId}/en.json`);
        operatorData = module.default;
        found = true;
        break;
      } catch {
        // Not in this vertical, try next
        continue;
      }
    }

    if (!found) {
      return new Response(
        JSON.stringify({ error: 'Operator not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (e) {
    console.error('[Checkout] Failed to load operator:', e);
    return new Response(
      JSON.stringify({ error: 'Failed to load operator data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === FIND ITEM (product or offer) ===
  let item: any;
  let itemType: 'product' | 'offer';

  if (productId) {
    item = operatorData.products?.find((p: any) => p.id === productId);
    itemType = 'product';
  } else {
    item = operatorData.offers?.find((o: any) => o.id === offerId);
    itemType = 'offer';
  }

  if (!item) {
    return new Response(
      JSON.stringify({ error: `${itemType} not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === VALIDATE STRIPE PRICE ID ===
  const priceId = item.stripe?.priceId;
  
  if (!priceId) {
    // Item exists but no Stripe price configured
    // Client should show checkoutPending message
    return new Response(
      JSON.stringify({ error: 'Checkout not configured for this item' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === CREATE STRIPE CHECKOUT SESSION ===
  try {
    const origin = request.headers.get('origin') || 'http://localhost:4321';
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Success/cancel URLs - operator can override in future
      success_url: `${origin}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?checkout=cancelled`,
      
      // Collect customer email for fulfillment
      customer_email: undefined, // Stripe Checkout will collect this
      
      // Metadata for webhooks and fulfillment (REQUIRED for /api/webhook)
      metadata: {
        operatorId,
        ...(productId ? { productId } : {}),
        ...(offerId ? { offerId } : {}),
        itemName: item.name || item.title || '',
      },

      // FUTURE: Stripe Connect
      // Uncomment when implementing platform fees:
      // payment_intent_data: {
      //   application_fee_amount: calculateFee(item.price),
      //   transfer_data: {
      //     destination: operatorData.stripe?.accountId,
      //   },
      // },
    });

    // === RETURN CHECKOUT URL ===
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    console.log(`[Checkout] Session created for ${itemType}:${productId || offerId} -> ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    console.error('[Checkout] Stripe error:', e.message);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Reject other methods
export const ALL: APIRoute = () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
