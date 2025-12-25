/**
 * /api/waitlist - Lead Capture Endpoint
 * 
 * ENGINE CONTRACT:
 * - POST { email, operatorId, vertical, source, sourceModule?, tags? }
 * - Server-only writes to Firestore
 * - Rate limiting via simple IP check (upgrade to Redis later)
 * - Honeypot field detection
 * - Triggers Brevo welcome sequence
 * 
 * SECURITY:
 * - No direct Firestore writes from client
 * - Email normalization + hashing
 * - Basic spam protection
 */

import type { APIRoute } from 'astro';
import { db, Collections } from '../../lib/firebase/admin';
import { normalizeEmail, hashEmail, serverTimestamp, ENGINE_VERSION } from '../../lib/firebase/utils';
import type { WaitlistDoc, WaitlistRequest, Vertical } from '../../lib/firebase/types';

export const prerender = false;

// Simple in-memory rate limiting (upgrade to Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  
  record.count++;
  return record.count > RATE_LIMIT;
}

// Valid verticals
const VALID_VERTICALS: Vertical[] = ['fitness', 'tours', 'consultancy'];

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // === GUARD: Firebase not configured ===
  if (!db) {
    console.error('[Waitlist] Firebase not configured');
    return new Response(
      JSON.stringify({ error: 'Service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === RATE LIMITING ===
  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    console.warn('[Waitlist] Rate limited IP:', ip);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === PARSE REQUEST ===
  let body: WaitlistRequest & { _hp?: string }; // _hp is honeypot field
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === HONEYPOT CHECK ===
  if (body._hp) {
    // Bot filled in the hidden honeypot field
    console.warn('[Waitlist] Honeypot triggered from IP:', ip);
    // Return success to not tip off the bot
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === VALIDATION ===
  const { email, operatorId, vertical, source, sourceModule, tags } = body;

  if (!email || typeof email !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Invalid email format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!operatorId || typeof operatorId !== 'string') {
    return new Response(
      JSON.stringify({ error: 'operatorId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!vertical || !VALID_VERTICALS.includes(vertical as Vertical)) {
    return new Response(
      JSON.stringify({ error: 'Invalid vertical' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!source || typeof source !== 'string') {
    return new Response(
      JSON.stringify({ error: 'source is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Sanitize tags (limit to 10 tags, 50 chars each)
  const sanitizedTags = Array.isArray(tags) 
    ? tags.slice(0, 10).map(t => String(t).slice(0, 50))
    : [];

  // === NORMALIZE EMAIL ===
  const emailLower = normalizeEmail(email);
  const emailHash = hashEmail(email);

  // === CHECK FOR EXISTING LEAD ===
  try {
    const existingQuery = await db
      .collection(Collections.WAITLIST)
      .where('emailHash', '==', emailHash)
      .where('operatorId', '==', operatorId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Already on waitlist for this operator
      return new Response(
        JSON.stringify({ success: true, message: 'Already registered' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('[Waitlist] Query error:', err);
    return new Response(
      JSON.stringify({ error: 'Database error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === CREATE WAITLIST ENTRY ===
  const waitlistDoc: Omit<WaitlistDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    email,
    emailLower,
    emailHash,
    operatorId,
    vertical: vertical as Vertical,
    source,
    sourceModule: sourceModule || source,
    tags: sanitizedTags,
    createdAt: serverTimestamp(),
    convertedAt: null,
    uid: null,
  };

  try {
    const docRef = await db.collection(Collections.WAITLIST).add(waitlistDoc);
    console.log('[Waitlist] Created lead:', docRef.id, 'for operator:', operatorId);

    // === TRIGGER BREVO SEQUENCE (optional) ===
    // TODO: Add Brevo API call to add contact to list and trigger welcome sequence
    // await triggerBrevoWelcomeSequence(email, operatorId, vertical);

    return new Response(
      JSON.stringify({ success: true, leadId: docRef.id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Waitlist] Write error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to register' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Block other methods
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
