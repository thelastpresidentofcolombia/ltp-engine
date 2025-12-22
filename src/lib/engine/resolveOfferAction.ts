/**
 * resolveOfferAction.ts
 * Engine resolver that determines what happens when an offer CTA is clicked.
 * 
 * Components don't decide behavior — the engine does.
 * This keeps skins "dumb" and business logic centralized.
 * 
 * Action types:
 * - checkout: Trigger checkout flow (checkoutUrl-first, then /api/checkout fallback)
 * - scroll: Scroll to specific anchor (e.g., intel, products, conversion)
 * - details: Open offer details modal/expand
 * - contact: Scroll to conversion or open contact form
 * 
 * Priority chain (same as Products):
 * 1. offer.checkoutUrl → direct redirect (Gumroad, Stripe Payment Links, etc.)
 * 2. offer.stripe.priceId → /api/checkout with { operatorId, offerId }
 * 3. else → graceful fallback (label from operator.ui.labels.offers.checkoutPending)
 */

// =============================================================================
// TYPES (Engine-first offer structure)
// =============================================================================

/**
 * OfferCore - Language-agnostic data (lives in core.json)
 * Contains: pricing, IDs, stripe refs, action defaults
 */
export interface OfferCore {
  id: string;
  
  // Pricing
  priceUsd?: number;          // In cents for Stripe, or null for "Contact"
  priceCurrency?: string;     // Default: 'USD'
  priceUnit?: string;         // "/ mo", "/ project", "one-time"
  
  // Stripe integration
  stripe?: {
    priceId?: string;         // Stripe Price ID for checkout
    productId?: string;       // Stripe Product ID (for reference)
  };
  
  // Direct checkout (bypasses API — Gumroad, Teachable, Payment Links)
  checkoutUrl?: string;
  
  // Action configuration
  action?: {
    primary?: OfferPrimaryAction;
    scrollTarget?: string;     // For 'scroll' action type
  };
  
  // Display flags
  featured?: boolean;
  
  // What's included/excluded (language-agnostic IDs that map to lang strings)
  includedIds?: string[];
  excludedIds?: string[];
}

/**
 * OfferLang - Translatable content (lives in en.json, es.json)
 */
export interface OfferLang {
  id: string;                  // Must match OfferCore.id
  
  // Copy
  name: string;
  kicker?: string;             // Small text above name ("Most Popular", "Best Value")
  description?: string;
  
  // Features (bullets)
  features?: string[];
  included?: string[];         // What's included (for bundles)
  excluded?: string[];         // What's NOT included (for comparison)
  
  // Display
  badge?: string;              // "POPULAR", "BEST VALUE", etc.
  priceDisplay?: string;       // "Contact", "$2,500", "From $99/mo"
  priceNote?: string;          // "billed annually", "one-time payment"
  scarcityNote?: string;       // "Only 3 spots left", "Ends Dec 31"
  
  // CTA labels (operator can override per-offer)
  cta?: string;                // Primary CTA label
  secondaryCta?: string;       // Secondary CTA label
}

/**
 * Offer - Merged type (core + lang, produced by mergeById)
 */
export interface Offer extends OfferCore, Omit<OfferLang, 'id'> {}

/**
 * What the primary CTA should do
 */
export type OfferPrimaryAction = 
  | 'checkout'      // Trigger Stripe/external checkout
  | 'scroll'        // Scroll to anchor (e.g., #intel, #conversion)
  | 'details'       // Open details modal/drawer
  | 'contact';      // Scroll to conversion/contact section

// =============================================================================
// ACTION TYPES (What the UI layer receives)
// =============================================================================

export type OfferAction =
  | { type: 'checkout'; offerId: string }
  | { type: 'scroll'; target: string }
  | { type: 'details'; offerId: string }
  | { type: 'contact'; target: string };

// =============================================================================
// RESOLVER
// =============================================================================

/**
 * Resolve what action should be taken when an offer CTA is clicked.
 * 
 * @param offer - The offer being acted upon
 * @returns OfferAction describing what the UI should do
 * 
 * @example
 * const action = resolveOfferAction(offer);
 * 
 * switch (action.type) {
 *   case 'checkout':
 *     // Check offer.checkoutUrl first → else POST /api/checkout
 *     break;
 *   case 'scroll':
 *     // Smooth scroll to #${action.target}
 *     break;
 *   case 'details':
 *     // Open modal for action.offerId
 *     break;
 *   case 'contact':
 *     // Scroll to #${action.target} (usually 'conversion')
 *     break;
 * }
 */
export function resolveOfferAction(offer: Offer): OfferAction {
  const primary: OfferPrimaryAction = offer.action?.primary ?? 'checkout';

  switch (primary) {
    case 'scroll':
      return {
        type: 'scroll',
        target: offer.action?.scrollTarget ?? 'intel',
      };

    case 'details':
      return {
        type: 'details',
        offerId: offer.id,
      };

    case 'contact':
      return {
        type: 'contact',
        target: offer.action?.scrollTarget ?? 'conversion',
      };

    case 'checkout':
    default:
      return {
        type: 'checkout',
        offerId: offer.id,
      };
  }
}

// =============================================================================
// HELPERS (For UI layer)
// =============================================================================

/**
 * Check if an offer has Stripe integration configured
 */
export function hasOfferStripeIntegration(offer: Offer): boolean {
  return !!(offer.stripe?.priceId || offer.stripe?.productId);
}

/**
 * Get the Stripe price ID for checkout
 * Returns null if not configured
 */
export function getOfferStripePriceId(offer: Offer): string | null {
  return offer.stripe?.priceId ?? null;
}

/**
 * Check if offer has a direct checkout URL (bypasses API)
 */
export function hasDirectCheckoutUrl(offer: Offer): boolean {
  return !!offer.checkoutUrl;
}

/**
 * Get the direct checkout URL
 * Returns null if not configured
 */
export function getDirectCheckoutUrl(offer: Offer): string | null {
  return offer.checkoutUrl ?? null;
}

/**
 * Determine if an offer can be purchased (has checkout capability)
 * Either via direct URL or Stripe integration
 */
export function isOfferPurchasable(offer: Offer): boolean {
  return hasDirectCheckoutUrl(offer) || hasOfferStripeIntegration(offer);
}
