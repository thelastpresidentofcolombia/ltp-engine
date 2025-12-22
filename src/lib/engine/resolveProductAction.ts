/**
 * resolveProductAction.ts
 * Engine resolver that determines what happens when a product CTA is clicked.
 * 
 * Components don't decide behavior — the engine does.
 * This keeps skins "dumb" and business logic centralized.
 * 
 * Action types:
 * - checkout: Trigger Stripe checkout flow
 * - scroll: Scroll to intel section or specific anchor
 * - details: Open product details modal/expand
 */

import type { Product, ProductPrimaryAction } from '@/types/products';

// =============================================================================
// ACTION TYPES (What the UI layer receives)
// =============================================================================

export type ProductAction =
  | { type: 'checkout'; productId: string }
  | { type: 'scroll'; target: string }
  | { type: 'details'; productId: string };

// =============================================================================
// RESOLVER
// =============================================================================

/**
 * Resolve what action should be taken when a product CTA is clicked.
 * 
 * @param product - The product being acted upon
 * @returns ProductAction describing what the UI should do
 * 
 * @example
 * const action = resolveProductAction(product);
 * 
 * if (action.type === 'checkout') {
 *   // POST /api/checkout with action.productId
 * }
 * if (action.type === 'scroll') {
 *   // scroll to #${action.target}
 * }
 * if (action.type === 'details') {
 *   // open modal for action.productId
 * }
 */
export function resolveProductAction(product: Product): ProductAction {
  const primary: ProductPrimaryAction = product.action?.primary ?? 'checkout';

  switch (primary) {
    case 'scrollToIntel':
      return {
        type: 'scroll',
        target: product.action?.intelTargetId ?? 'intel',
      };

    case 'openDetails':
      return {
        type: 'details',
        productId: product.id,
      };

    case 'checkout':
    default:
      return {
        type: 'checkout',
        productId: product.id,
      };
  }
}

// =============================================================================
// HELPERS (For UI layer)
// =============================================================================

/**
 * Check if a product has Stripe integration configured
 */
export function hasStripeIntegration(product: Product): boolean {
  return !!(product.stripe?.priceId || product.stripe?.productId);
}

/**
 * Get the Stripe price ID for checkout
 * Returns null if not configured
 */
export function getStripePriceId(product: Product): string | null {
  return product.stripe?.priceId ?? null;
}
