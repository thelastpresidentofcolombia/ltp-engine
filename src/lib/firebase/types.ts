/**
 * Firestore Type Definitions
 * 
 * ENGINE CONTRACT:
 * - TypeScript interfaces for all Firestore documents
 * - Matches security rules v1
 * - Commission-ready fields included
 */

import type { Timestamp } from 'firebase-admin/firestore';

// ============================================================
// ENUMS / CONSTANTS
// ============================================================

export type Vertical = 'fitness' | 'tours' | 'consultancy';
export type EntitlementType = 'program' | 'subscription' | 'session-pack' | 'booking';
export type EntitlementStatus = 'active' | 'expired' | 'revoked';
export type EntitlementSource = 'checkout' | 'gift' | 'manual';
export type PaymentMode = 'payment' | 'subscription';
export type MembershipStatus = 'active' | 'churned';
export type BookingType = 'discovery' | 'coaching' | 'checkin' | 'strategy';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type MeetingProvider = 'google-meet' | 'zoom' | 'none';
export type StripeStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

// ============================================================
// OPERATORS
// ============================================================

export interface OperatorDoc {
  operatorId: string;
  vertical: Vertical;
  status: 'active' | 'paused';
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// WAITLIST
// ============================================================

export interface WaitlistDoc {
  email: string;
  emailLower: string;
  emailHash: string;
  operatorId: string;
  vertical: Vertical;
  source: string;
  sourceModule?: string;
  tags: string[];
  createdAt: Timestamp;
  convertedAt: Timestamp | null;
  uid: string | null;
}

// ============================================================
// USERS
// ============================================================

export interface UserProfile {
  name?: string;
  phone?: string;
  timezone?: string;
  avatarUrl?: string;
}

export interface UserStripe {
  customerId?: string;
  subscriptionId?: string | null;
  status?: StripeStatus;
  currentPeriodEnd?: Timestamp | null;
}

export interface UserTotals {
  totalSpentCents?: number;
  lastPurchaseAt?: Timestamp | null;
}

export interface UserDoc {
  uid: string;
  email: string;
  emailLower: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  profile: UserProfile;
  stripe: UserStripe;
  totals: UserTotals;
}

// ============================================================
// MEMBERSHIPS (users/{uid}/memberships/{operatorId})
// ============================================================

export interface MembershipProfile {
  timezone?: string;
  goals?: string[];
  notes?: string;
}

export interface MembershipDoc {
  operatorId: string;
  vertical: Vertical;
  status: MembershipStatus;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
  profile: MembershipProfile;
}

// ============================================================
// ENTITLEMENTS (users/{uid}/entitlements/{entId})
// ============================================================

export interface EntitlementDoc {
  operatorId: string;
  vertical: Vertical;
  createdAt: Timestamp;
  source: EntitlementSource;
  sourceModule: string;

  type: EntitlementType;
  resourceId: string;
  status: EntitlementStatus;

  grantedAt: Timestamp;
  expiresAt: Timestamp | null;

  quota: number | null;
  used: number | null;

  // Stripe linkage + idempotency
  stripeSessionId: string;
  stripeEventId: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;

  // Commission fields
  mode: PaymentMode;
  amountTotal: number; // cents
  currency: string;
  platformFeeCents: number;
  engineVersion: string;
}

// ============================================================
// PENDING ENTITLEMENTS (pendingEntitlements/{emailHash}/items/{id})
// ============================================================

export interface PendingEntitlementDoc {
  email: string;
  emailLower: string;
  emailHash: string;

  operatorId: string;
  vertical: Vertical;
  createdAt: Timestamp;
  source: 'checkout';
  sourceModule: string;

  type: EntitlementType;
  resourceId: string;
  status: 'active';

  stripeSessionId: string;
  stripeEventId: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;

  mode: PaymentMode;
  amountTotal: number;
  currency: string;
  platformFeeCents: number;
  engineVersion: string;

  claimedAt: Timestamp | null;
  claimedByUid: string | null;
}

// ============================================================
// STRIPE CUSTOMERS (stripeCustomers/{cusId})
// ============================================================

export interface StripeCustomerDoc {
  stripeCustomerId: string;
  uid: string;
  emailLower: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// STRIPE EVENTS LEDGER (events_stripe/{eventId})
// ============================================================

export interface StripeEventDoc {
  stripeEventId: string;
  type: string;
  receivedAt: Timestamp;
  processed: boolean;
}

// ============================================================
// CHECKINS (users/{uid}/checkins/{checkinId})
// ============================================================

export interface CheckinMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}

export interface CheckinPhotos {
  front?: string;
  side?: string;
  back?: string;
}

export interface CheckinDoc {
  operatorId: string;
  vertical: Vertical;
  createdAt: Timestamp;
  source: 'portal';
  sourceModule: 'checkin-form';

  date: Timestamp;
  weekNumber: number | null;

  weight: number | null;
  bodyFat: number | null;
  measurements: CheckinMeasurements | null;
  photos: CheckinPhotos | null;

  energyLevel: number; // 1-10
  sleepQuality: number; // 1-10
  stressLevel: number; // 1-10
  adherence: number; // 0-100
  notes: string;

  // Coach lane
  coachFeedback: string | null;
  coachReviewedAt: Timestamp | null;
}

// ============================================================
// BOOKINGS (users/{uid}/bookings/{bookingId})
// ============================================================

export interface BookingDoc {
  operatorId: string;
  vertical: Vertical;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'portal';
  sourceModule: 'booking';

  type: BookingType;
  title: string;
  durationMin: number;

  startTime: Timestamp;
  endTime: Timestamp;
  timezone: string;

  status: BookingStatus;

  meetingUrl: string | null;
  meetingProvider: MeetingProvider;

  entitlementId: string | null;
  googleEventId: string | null;

  clientNotes: string | null;
  coachNotes: string | null;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface WaitlistRequest {
  email: string;
  operatorId: string;
  vertical: Vertical;
  source: string;
  sourceModule?: string;
  tags?: string[];
}

export interface CheckoutRequest {
  operatorId: string;
  vertical: Vertical;
  productId: string; // resourceId
  mode: PaymentMode;
  sourceModule: string;
  email?: string;
}

export interface PortalBootstrapResponse {
  user: {
    uid: string;
    email: string;
    profile: UserProfile;
  };
  memberships: Array<{ operatorId: string; status: MembershipStatus }>;
  entitlements: EntitlementDoc[];
  engineVersion: string;
}
