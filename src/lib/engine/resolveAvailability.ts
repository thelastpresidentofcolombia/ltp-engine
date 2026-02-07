/**
 * resolveAvailability() — Engine Availability Resolver
 *
 * ENGINE CONTRACT:
 * - Computes available time slots for session booking.
 * - Reads ScheduleConfig from operator portal config (or engine defaults).
 * - Subtracts existing booked sessions to prevent double-booking.
 * - Returns an array of AvailabilitySlot objects ready for the booking UI.
 *
 * SLOT GENERATION:
 *   For each available day in the requested range:
 *     For each window in that day:
 *       Generate slots at slotDurationMin intervals with bufferMin gaps.
 *       Filter out slots that overlap with existing sessions.
 *       Filter out blocked dates.
 *       Filter out slots in the past or within minBookingHours.
 *
 * LIMITATIONS (v1):
 * - Single-timezone per operator (operator's timezone).
 * - No recurring exceptions (use blockedDates for one-offs).
 * - Capacity is always 1 (1:1 sessions).
 *
 * TIMEZONE HANDLING:
 * - All window times (e.g. "09:00") are interpreted in the OPERATOR's timezone.
 * - Slot .start/.end are stored as UTC ISO strings (correct for Firestore + comparison).
 * - Uses Intl.DateTimeFormat for DST-safe wall-time → UTC conversion.
 * - Display in the user's timezone is the client's responsibility.
 */

import type { AvailabilitySlot, ScheduleConfig, SessionDoc, SessionDelivery } from '../../types/sessions';

// ============================================================
// ENGINE DEFAULT SCHEDULE
// ============================================================

/**
 * Fallback schedule when operator hasn't configured one.
 * Mon–Fri, 9am–5pm, 60-min slots, 15-min buffer, America/Bogota.
 */
export const ENGINE_DEFAULT_SCHEDULE: ScheduleConfig = {
  availableDays: [1, 2, 3, 4, 5], // Mon–Fri
  windows: [{ start: '09:00', end: '17:00' }],
  slotDurationMin: 60,
  bufferMin: 15,
  timezone: 'America/Bogota',
  blockedDates: [],
};

// ============================================================
// RESOLVER
// ============================================================

export interface ResolveAvailabilityInput {
  /** Operator's schedule config (or undefined for engine defaults). */
  schedule?: ScheduleConfig;
  /** Start of the range to check (ISO date string, e.g. '2026-02-05'). */
  rangeStart: string;
  /** End of the range to check (ISO date string, e.g. '2026-02-19'). */
  rangeEnd: string;
  /** Existing sessions in the range (to subtract from availability). */
  existingSessions: Array<Pick<SessionDoc, 'startTime' | 'endTime' | 'status'>>;
  /** Minimum hours from now before a slot can be booked. */
  minBookingHours?: number;
  /** Delivery methods the operator supports (for tagging slots). */
  delivery?: SessionDelivery[];
}

/**
 * Compute available time slots for a date range.
 *
 * @returns Array of bookable AvailabilitySlot objects, sorted chronologically.
 */
export function resolveAvailability(input: ResolveAvailabilityInput): AvailabilitySlot[] {
  const schedule = input.schedule ?? ENGINE_DEFAULT_SCHEDULE;
  const minHours = input.minBookingHours ?? 24;
  const delivery = input.delivery ?? ['virtual'];
  const blockedSet = new Set(schedule.blockedDates ?? []);

  const slots: AvailabilitySlot[] = [];
  const now = new Date();
  const earliestBookable = new Date(now.getTime() + minHours * 60 * 60 * 1000);

  // Parse range
  const rangeStartDate = parseLocalDate(input.rangeStart);
  const rangeEndDate = parseLocalDate(input.rangeEnd);

  if (!rangeStartDate || !rangeEndDate || rangeEndDate <= rangeStartDate) {
    return [];
  }

  // Build a set of blocked time ranges from existing sessions
  const bookedRanges = input.existingSessions
    .filter((s) => s.status !== 'cancelled' && s.status !== 'no-show')
    .map((s) => ({
      start: new Date(s.startTime).getTime(),
      end: new Date(s.endTime).getTime(),
    }));

  // Iterate each day in the range
  const current = new Date(rangeStartDate);
  while (current <= rangeEndDate) {
    const dateStr = toDateString(current);
    const dayOfWeek = getDayOfWeekInTz(dateStr, schedule.timezone);

    // Skip if day not available or date is blocked
    if (!schedule.availableDays.includes(dayOfWeek) || blockedSet.has(dateStr)) {
      current.setUTCDate(current.getUTCDate() + 1);
      continue;
    }

    // Generate slots for each window
    for (const window of schedule.windows) {
      const windowStart = zonedWallTimeToUtc(dateStr, window.start, schedule.timezone);
      const windowEnd = zonedWallTimeToUtc(dateStr, window.end, schedule.timezone);
      if (!windowStart || !windowEnd) continue;

      let slotStart = windowStart.getTime();
      const slotDuration = schedule.slotDurationMin * 60 * 1000;
      const buffer = schedule.bufferMin * 60 * 1000;

      while (slotStart + slotDuration <= windowEnd.getTime()) {
        const slotEnd = slotStart + slotDuration;
        const slotStartDate = new Date(slotStart);

        // Check: not in the past / not within minBookingHours
        if (slotStartDate > earliestBookable) {
          // Check: doesn't overlap with any existing session (including buffer)
          const hasConflict = bookedRanges.some(
            (booked) => slotStart < booked.end + buffer && slotEnd > booked.start - buffer
          );

          if (!hasConflict) {
            slots.push({
              start: slotStartDate.toISOString(),
              end: new Date(slotEnd).toISOString(),
              durationMin: schedule.slotDurationMin,
              delivery,
              remaining: 1, // 1:1 sessions for v1
            });
          }
        }

        // Advance by slot duration + buffer
        slotStart += slotDuration + buffer;
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return slots;
}

// ============================================================
// DATE HELPERS — Timezone-correct using Intl.DateTimeFormat
// No external dependencies. Handles DST properly.
// ============================================================

// IMPORTANT:
// Wall-time (HH:mm) is interpreted in operator timezone.
// Never use server-local Date setters here.
// All results are returned as UTC Date objects.

/**
 * Convert a "wall time" in a specific timezone to a UTC Date.
 *
 * Algorithm (DST-safe):
 * 1. Build a naive UTC carrier: YYYY-MM-DDTHH:mm:00Z
 * 2. Format that carrier instant into the target tz → get parts
 * 3. Reconstruct a Date from those parts as-if-UTC
 * 4. Diff between carrier and reconstructed = tz offset at that instant
 * 5. Apply offset to get the correct UTC time for the wall clock time
 *
 * Example: "2026-07-15 09:00" in "Europe/Paris" (UTC+2 summer)
 *   carrier = 2026-07-15T09:00:00Z
 *   formatted in Paris = 2026-07-15 11:00 (carrier shows 11:00 wall in Paris)
 *   reconstructed = 2026-07-15T11:00:00Z
 *   offset = reconstructed - carrier = +2h
 *   result = carrier - offset = 2026-07-15T07:00:00Z  ✓ (09:00 Paris = 07:00 UTC)
 */
function zonedWallTimeToUtc(dateStr: string, timeStr: string, timezone: string): Date | null {
  const dateParts = dateStr.split('-');
  const timeParts = timeStr.split(':');
  if (dateParts.length !== 3 || timeParts.length < 2) return null;

  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  const day = parseInt(dateParts[2]);
  const hour = parseInt(timeParts[0]);
  const minute = parseInt(timeParts[1]);

  // Step 1: Naive UTC carrier
  const carrier = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  if (isNaN(carrier.getTime())) return null;

  // Step 2: Format the carrier instant in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(carrier);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const val = parts.find((p) => p.type === type)?.value ?? '0';
    return parseInt(val);
  };

  const tzYear = get('year');
  const tzMonth = get('month');
  const tzDay = get('day');
  let tzHour = get('hour');
  const tzMinute = get('minute');

  // Intl can return hour=24 for midnight — normalize
  if (tzHour === 24) tzHour = 0;

  // Step 3: Reconstruct as-if-UTC
  const reconstructed = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0, 0));

  // Step 4: Offset = how far the tz is from UTC at this instant
  const offsetMs = reconstructed.getTime() - carrier.getTime();

  // Step 5: The actual UTC time for the desired wall time
  const result = new Date(carrier.getTime() - offsetMs);
  return isNaN(result.getTime()) ? null : result;
}

/**
 * Get the day-of-week for a date string in a specific timezone.
 * Returns 0=Sunday .. 6=Saturday.
 */
function getDayOfWeekInTz(dateStr: string, timezone: string): number {
  // Noon UTC on that date — avoids day boundary issues
  const parts = dateStr.split('-');
  const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const weekday = formatter.format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? d.getUTCDay();
}

/**
 * Parse a date string like '2026-02-05' into a Date at noon UTC.
 * Used only as a day-cursor for iteration — not for slot anchoring.
 */
function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date to 'YYYY-MM-DD' (UTC-based, since our day cursor is at noon UTC).
 */
function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
