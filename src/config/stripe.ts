/**
 * Stripe Configuration
 * Payment integration settings
 */

// Load from environment
const STRIPE_PUBLIC_KEY = import.meta.env.STRIPE_PUBLIC_KEY || '';
const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || '';

export const stripeConfig = {
  publicKey: STRIPE_PUBLIC_KEY,
  secretKey: STRIPE_SECRET_KEY,
  
  // Checkout settings
  checkout: {
    successUrl: '/checkout/success',
    cancelUrl: '/checkout/cancel',
    allowPromotionCodes: true,
    billingAddressCollection: 'auto' as const,
  },
  
  // Currency defaults
  defaultCurrency: 'usd',
  supportedCurrencies: ['usd', 'eur', 'gbp', 'cop', 'mxn'],
  
  // Webhook events to handle
  webhookEvents: [
    'checkout.session.completed',
    'payment_intent.succeeded',
    'customer.subscription.created',
    'customer.subscription.deleted',
  ],
};

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_PUBLIC_KEY && STRIPE_SECRET_KEY);
}

// Helper to build checkout URL
export function buildCheckoutUrl(priceId: string, successUrl?: string, cancelUrl?: string): string {
  const params = new URLSearchParams({
    price: priceId,
    success_url: successUrl || stripeConfig.checkout.successUrl,
    cancel_url: cancelUrl || stripeConfig.checkout.cancelUrl,
  });
  
  return `/api/checkout?${params.toString()}`;
}
