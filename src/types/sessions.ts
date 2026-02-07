/**
 * Session Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Vertical-agnostic scheduling contracts.
 * - "Session" replaces "booking" to be neutral across verticals.
 *   fitness → coaching session, consultancy → strategy call, tours → guided experience
 * - Availability is computed by resolveAvailability() in engine lib.
 *
 * FIRESTORE PATH: users/{uid}/sessions/{sessionId}
 */

import type { Vertical } from './operator';

// ============================================================
// ENUMS
// ============================================================

/** How the session is delivered. */
export type SessionDelivery = 'virtual' | 'in-person';

/** Category of session — vertical-neutral naming. */
export type SessionCategory =
  | 'discovery'    // Free intro / assessment
  | 'standard'     // Regular session
  | 'premium'      // Extended / priority session
  | 'review'       // Check-in / progress review
  | 'custom';      // Operator-defined

export type SessionStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export type MeetingProvider = 'google-meet' | 'zoom' | 'none';

// ============================================================
// SESSION DOCUMENT (Firestore)
// ============================================================

/**
 * Canonical session record stored in Firestore.
 * Replaces the legacy BookingDoc with vertical-neutral fields.
 */
export interface SessionDoc {
  /** Firestore document ID. */
  id?: string;

  operatorId: string;
  vertical: Vertical;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  source: 'portal' | 'coach' | 'system';
  sourceModule: string;

  /** Category of session. */
  category: SessionCategory;
  /** Human-readable title (from operator config or custom). */
  title: string;
  /** Duration in minutes. */
  durationMin: number;
  /** Delivery method. */
  delivery: SessionDelivery;

  /** Scheduling — all ISO 8601 strings. */
  startTime: string;
  endTime: string;
  timezone: string;

  status: SessionStatus;

  /** Virtual session details. */
  meetingUrl: string | null;
  meetingProvider: MeetingProvider;

  /** Links session to an entitlement (if session-pack based). */
  entitlementId: string | null;
  /** External calendar event ID for sync. */
  externalCalendarId: string | null;

  /** Notes from both sides. */
  clientNotes: string | null;
  coachNotes: string | null;
}

// ============================================================
// AVAILABILITY
// ============================================================

/**
 * A single bookable time slot surfaced to the client.
 * Computed by resolveAvailability() from operator schedule config.
 */
export interface AvailabilitySlot {
  /** ISO 8601 start. */
  start: string;
  /** ISO 8601 end. */
  end: string;
  /** Duration in minutes. */
  durationMin: number;
  /** Which delivery methods are available for this slot. */
  delivery: SessionDelivery[];
  /** Remaining capacity (usually 1 for 1:1, could be >1 for group). */
  remaining: number;
}

/**
 * Operator-defined schedule rules.
 * Lives in operator core.json → portal.sessions or in Firestore.
 */
export interface ScheduleConfig {
  /** Days of week available (0 = Sunday … 6 = Saturday). */
  availableDays: number[];
  /** Daily windows as [startHHMM, endHHMM] pairs. */
  windows: Array<{ start: string; end: string }>;
  /** Slot duration in minutes. */
  slotDurationMin: number;
  /** Buffer between sessions in minutes. */
  bufferMin: number;
  /** Timezone of the operator. */
  timezone: string;
  /** Blocked date ranges (ISO date strings). */
  blockedDates?: string[];
}

// ============================================================
// API REQUEST / RESPONSE
// ============================================================

/** Client-sent payload to book a session. */
export interface SessionCreateRequest {
  operatorId: string;
  category: SessionCategory;
  delivery: SessionDelivery;
  /** ISO 8601 start time. */
  startTime: string;
  /** Duration in minutes (must match an allowed option). */
  durationMin: number;
  timezone: string;
  clientNotes?: string;
  /** Optional entitlement to debit a session from. */
  entitlementId?: string;
}

/** Response after successful session creation. */
export interface SessionCreateResponse {
  session: SessionDoc;
  /** Meeting URL if virtual session was auto-created. */
  meetingUrl: string | null;
}

/** Payload for rescheduling. */
export interface SessionRescheduleRequest {
  /** New start time (ISO 8601). */
  startTime: string;
  /** New duration if changed. */
  durationMin?: number;
  timezone?: string;
}
