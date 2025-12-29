/**
 * /api/webhook - Stripe Webhook Handler
 * 
 * ENGINE CONTRACT:
 * - Verifies Stripe signature (STRIPE_WEBHOOK_SECRET)
 * - Handles checkout.session.completed events
 * - Extracts { operatorId, productId?, offerId? } from session metadata
 * - Sends fulfillment email via shared sendAccessEmail function
 * - Returns 500 on fulfillment failure (triggers Stripe retry)
 * 
 * REQUIRED ENV VARS:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET (from Stripe webhook endpoint config)
 * - BREVO_API_KEY (from Brevo SMTP & API settings)
 * - FULFILLMENT_FROM_EMAIL (verified Brevo sender, e.g., bookings@lovethisplace.co)
 * - FULFILLMENT_BCC_EMAIL (optional, internal ledger)
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { sendAccessEmail, sendEmailBrevo, type AccessEmailResource } from '../../lib/email/sendAccessEmail';

// Astro 5: API routes must explicitly opt out of prerendering
export const prerender = false;

// Initialize Stripe
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// ============================================================
// WEBHOOK HANDLER
// ============================================================

export const POST: APIRoute = async ({ request }) => {
  // === GUARD: Stripe not configured ===
  if (!stripe) {
    console.error('[Webhook] STRIPE_SECRET_KEY not configured');
    return new Response('Stripe not configured', { status: 500 });
  }

  // === VERIFY SIGNATURE ===
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return new Response('Webhook not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Stripe requires raw body for signature verification
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err?.message);
    return new Response(`Webhook signature verification failed: ${err?.message ?? 'Unknown error'}`, {
      status: 400,
    });
  }

  // === HANDLE EVENT ===
  // Only handle checkout.session.completed for v1
  if (event.type !== 'checkout.session.completed') {
    // Acknowledge but ignore other events
    return new Response('Ignored', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // === EXTRACT METADATA ===
  const operatorId = session.metadata?.operatorId;
  const productId = session.metadata?.productId;
  const offerId = session.metadata?.offerId;
  const itemName = session.metadata?.itemName;

  if (!operatorId || (!productId && !offerId)) {
    // Don't fail Stripe retries forever; accept but log warning
    console.warn('[Webhook] Missing metadata:', {
      operatorId,
      productId,
      offerId,
      sessionId: session.id,
    });
    return new Response('Missing metadata (accepted)', { status: 200 });
  }

  // === EXTRACT PAYMENT INFO ===
  const customerEmail = session.customer_details?.email || 
    (typeof session.customer_email === 'string' ? session.customer_email : undefined);
  
  const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : null;
  const currency = session.currency?.toUpperCase() ?? 'USD';

  // === BUILD RESOURCE INFO ===
  const resourceId = productId || offerId || 'unknown';
  const resourceLabel = itemName || resourceId;

  // === SEND FULFILLMENT EMAIL ===
  try {
    if (customerEmail) {
      // Get origin from request for fallback portal URL
      const origin = new URL(request.url).origin;
      
      // Build resource for email
      const resources: AccessEmailResource[] = [{
        operatorId: operatorId!,
        resourceId,
        resourceLabel,
      }];
      
      // Send "Your access is ready" email via shared function
      const portalUrl = import.meta.env.PUBLIC_PORTAL_URL || `${origin}/portal`;

      await sendAccessEmail({
        toEmail: customerEmail,
        resources,
        portalUrl,
      });

      console.log(`[Webhook] Fulfillment email sent to ${customerEmail} for ${operatorId}/${productId || offerId}`);
    } else {
      // No customer email — send internal notification only
      const from = import.meta.env.FULFILLMENT_FROM_EMAIL;
      const bcc = import.meta.env.FULFILLMENT_BCC_EMAIL;
      
      if (bcc && from) {
        await sendEmailBrevo({
          from: { name: 'LTP Engine', email: from },
          to: [{ email: bcc }],
          subject: `LTP Engine — Checkout completed (${operatorId})`,
          htmlContent: `
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#1a1a1a;margin-bottom:16px">Checkout completed ✅</h2>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:16px">
                <p style="margin:0 0 8px 0"><strong>Operator:</strong> ${operatorId}</p>
                <p style="margin:0 0 8px 0"><strong>Resource:</strong> ${resourceLabel}</p>
                <p style="margin:0"><strong>Session:</strong> ${session.id}</p>
              </div>
              <p style="color:#b91c1c;font-size:14px">
                ⚠️ No customer email present in session.
              </p>
            </div>
          `,
        });

        console.log(`[Webhook] Internal notification sent (no customer email) for ${operatorId}/${productId || offerId}`);
      } else {
        console.warn(`[Webhook] No customer email and no BCC configured - no email sent for ${session.id}`);
      }
    }
  } catch (err: any) {
    // IMPORTANT: Return 500 so Stripe retries (prevents "customers paid but nothing happened")
    console.error('[Webhook] Fulfillment email failed:', err?.message ?? err);
    return new Response('Fulfillment failed — retrying', { status: 500 });
  }

  // === SUCCESS ===
  // Acknowledge so Stripe stops retrying
  return new Response('OK', { status: 200 });
};

// Reject other methods (Stripe only uses POST)
export const ALL: APIRoute = () => {
  return new Response('Method not allowed', { status: 405 });
};
