/**
 * /api/portal/conversations — Conversation CRUD
 *
 * ENGINE CONTRACT:
 * - GET: List conversations for the authenticated user
 * - POST: Create or retrieve a conversation (idempotent, deterministic ID)
 * - PATCH: Mark conversation as read (reset unread counter)
 * - Requires 'messaging' feature to be enabled
 * - Uses global conversations collection (PortalCollections.CONVERSATIONS)
 * - Conversation ID convention: `${clientUid}--${operatorId}`
 *
 * GUARD STACK:
 *   resolveActor → requireFeature('messaging') → requireOperatorAccess
 *
 * QUERY STRATEGY:
 *   Clients:       WHERE clientUid == actor.uid AND status == 'active' ORDER BY lastMessageAt DESC
 *   Coaches/Admins: WHERE operatorId IN actor.operatorIds AND status == 'active' ORDER BY lastMessageAt DESC
 *   Superadmin:    WHERE status == 'active' ORDER BY lastMessageAt DESC LIMIT 100
 */

import type { APIRoute } from 'astro';
import { db, auth, PortalCollections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess, resolveActorPortal } from '../../../lib/portal/guards';
import type { ConversationDoc, ConversationSummary } from '../../../types/messaging';

export const prerender = false;

// ============================================================
// GET — List conversations
// ============================================================

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

  const resolvedPortal = resolveActorPortal(actor);
  const denied = requireFeature('messaging', resolvedPortal.features);
  if (denied) return denied;

  try {
    const convoRef = db.collection(PortalCollections.CONVERSATIONS);
    let queryRef;

    if (actor.role === 'client') {
      // Clients see their own conversations
      queryRef = convoRef
        .where('clientUid', '==', actor.uid)
        .where('status', '==', 'active')
        .orderBy('lastMessageAt', 'desc');
    } else if (actor.operatorIds.length === 0) {
      // Superadmin: see all active conversations (capped)
      queryRef = convoRef
        .where('status', '==', 'active')
        .orderBy('lastMessageAt', 'desc')
        .limit(100);
    } else {
      // Coaches/admins: see conversations for their operators
      // Firestore 'in' queries limited to 30 values — fine for coaches
      queryRef = convoRef
        .where('operatorId', 'in', actor.operatorIds.slice(0, 30))
        .where('status', '==', 'active');
      // Note: Firestore 'in' + orderBy on a different field requires
      // the composite index (operatorId ASC, status ASC, lastMessageAt DESC).
      // We sort in JS to avoid issues with 'in' + orderBy limitations.
    }

    const snap = await queryRef.get();
    const conversations: ConversationSummary[] = snap.docs.map((docSnap) => {
      const d = docSnap.data() as ConversationDoc;
      const unreadCount = actor.role === 'client'
        ? (d.unreadByClient ?? 0)
        : (d.unreadByCoach ?? 0);

      return {
        id: docSnap.id,
        operatorId: d.operatorId,
        operatorBrandName: d.operatorId, // TODO: resolve from operator config
        lastMessageAt: d.lastMessageAt ?? d.createdAt,
        lastMessagePreview: d.lastMessagePreview ?? '',
        unreadCount,
      };
    });

    // Sort by lastMessageAt DESC (handles coach 'in' query without server orderBy)
    conversations.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));

    return new Response(
      JSON.stringify({ conversations }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Conversations GET] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load conversations' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// POST — Create or retrieve a conversation (idempotent)
// ============================================================

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

  const resolvedPortal = resolveActorPortal(actor);
  const denied = requireFeature('messaging', resolvedPortal.features);
  if (denied) return denied;

  let body: { operatorId: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { operatorId } = body;
  if (!operatorId) {
    return new Response(
      JSON.stringify({ error: 'operatorId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === Operator scope gate ===
  const scopeDenied = requireOperatorAccess(actor, operatorId);
  if (scopeDenied) return scopeDenied;

  try {
    // Deterministic conversation ID: ${clientUid}--${operatorId}
    const conversationId = `${actor.uid}--${operatorId}`;
    const convoRef = db.collection(PortalCollections.CONVERSATIONS).doc(conversationId);

    // Check if already exists (idempotent)
    const existing = await convoRef.get();
    if (existing.exists) {
      return new Response(
        JSON.stringify({ conversation: { id: existing.id, ...existing.data() } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create new conversation
    const now = new Date().toISOString();
    const newConvo: Omit<ConversationDoc, 'id'> = {
      operatorId,
      vertical: 'fitness', // TODO: resolve from operator config when multi-vertical
      clientUid: actor.uid,
      clientEmail: actor.email,
      coachUid: null,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: '',
      unreadByClient: 0,
      unreadByCoach: 0,
      status: 'active',
    };

    await convoRef.set(newConvo);

    return new Response(
      JSON.stringify({ conversation: { id: conversationId, ...newConvo } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Conversations POST] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create conversation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// PATCH — Mark conversation as read
// ============================================================

export const PATCH: APIRoute = async ({ request }) => {
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

  const resolvedPortal = resolveActorPortal(actor);
  const denied = requireFeature('messaging', resolvedPortal.features);
  if (denied) return denied;

  let body: { conversationId: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { conversationId } = body;
  if (!conversationId) {
    return new Response(
      JSON.stringify({ error: 'conversationId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const convoRef = db.collection(PortalCollections.CONVERSATIONS).doc(conversationId);
    const convo = await convoRef.get();

    if (!convo.exists) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = convo.data() as ConversationDoc;

    // Scope check: verify actor is a participant
    const scopeCheck = requireOperatorAccess(actor, data.operatorId);
    if (scopeCheck) return scopeCheck;

    if (actor.role === 'client' && data.clientUid !== actor.uid) {
      return new Response(
        JSON.stringify({ error: 'Not your conversation' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reset unread counter for this participant
    const updateField = actor.role === 'client' ? 'unreadByClient' : 'unreadByCoach';
    await convoRef.update({
      [updateField]: 0,
      updatedAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Conversations PATCH] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to mark as read' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
