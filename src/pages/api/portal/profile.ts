/**
 * /api/portal/profile - User Profile CRUD
 *
 * ENGINE CONTRACT:
 * - GET: Returns user profile data
 * - POST: Updates user profile fields (name, phone, timezone)
 * - Uses resolveActor() for auth — no direct token handling
 * - Writes to users/{uid}.profile in Firestore
 */

import type { APIRoute } from 'astro';
import { db, auth, Collections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import type { UserDoc } from '../../../lib/firebase/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!db || !auth) {
    return new Response(
      JSON.stringify({ error: 'Service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const actor = await resolveActor(request, { auth, db });
  if (!actor) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const userDoc = await db.collection(Collections.USERS).doc(actor.uid).get();
    const userData = userDoc.data() as UserDoc | undefined;

    return new Response(
      JSON.stringify({
        uid: actor.uid,
        email: actor.email,
        profile: userData?.profile || {},
        stripe: userData?.stripe ? {
          status: userData.stripe.status,
          currentPeriodEnd: userData.stripe.currentPeriodEnd?.toDate?.().toISOString() || null,
        } : null,
        totals: userData?.totals || {},
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Profile GET] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!db || !auth) {
    return new Response(
      JSON.stringify({ error: 'Service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const actor = await resolveActor(request, { auth, db });
  if (!actor) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Only allow updating safe profile fields
  const allowedFields = ['name', 'phone', 'timezone', 'avatarUrl'];
  const updates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[`profile.${field}`] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid fields to update' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const userRef = db.collection(Collections.USERS).doc(actor.uid);
    await userRef.set(
      { ...updates, updatedAt: new Date() },
      { merge: true }
    );

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Profile POST] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to update profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
