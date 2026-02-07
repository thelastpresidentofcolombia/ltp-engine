/**
 * /api/portal/messages — Message CRUD
 *
 * ENGINE CONTRACT:
 * - GET: List messages for a conversation (paginated, ASC by createdAt)
 * - POST: Send a message to a conversation
 * - Requires 'messaging' feature to be enabled
 * - Messages stored as subcollection: conversations/{id}/messages/{msgId}
 * - Conversation metadata (lastMessageAt, unread counts) updated atomically on send
 *
 * GUARD STACK:
 *   resolveActor → requireFeature('messaging') → conversation membership check
 *
 * CONVERSATION MEMBERSHIP CHECK (inline, not via requireOperatorAccess):
 *   1. Load conversation doc
 *   2. requireOperatorAccess(actor, convo.operatorId)
 *   3. If client: also verify convo.clientUid == actor.uid
 *   This prevents clients from accessing other clients' conversations
 *   with the same operator.
 */

import type { APIRoute } from 'astro';
import { db, auth, PortalCollections } from '../../../lib/firebase/admin';
import { resolveActor } from '../../../lib/portal/resolveActor';
import { requireFeature, requireOperatorAccess } from '../../../lib/portal/guards';
import { resolvePortalFeatures } from '../../../lib/engine/resolvePortalFeatures';
import type { MessageDoc, ConversationDoc } from '../../../types/messaging';

export const prerender = false;

// ============================================================
// GET — List messages for a conversation
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

  const resolvedPortal = resolvePortalFeatures(undefined);
  const denied = requireFeature('messaging', resolvedPortal.features);
  if (denied) return denied;

  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');
  const limitParam = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const cursor = url.searchParams.get('cursor');

  if (!conversationId) {
    return new Response(
      JSON.stringify({ error: 'conversationId query param required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ── Verify conversation exists and actor has access ──
    const convoRef = db.collection(PortalCollections.CONVERSATIONS).doc(conversationId);
    const convo = await convoRef.get();

    if (!convo.exists) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const convoData = convo.data() as ConversationDoc;

    // Scope check: actor must be participant
    const scopeCheck = requireOperatorAccess(actor, convoData.operatorId);
    if (scopeCheck) return scopeCheck;

    if (actor.role === 'client' && convoData.clientUid !== actor.uid) {
      return new Response(
        JSON.stringify({ error: 'Not your conversation' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch messages ──
    let msgQuery = convoRef
      .collection(PortalCollections.MESSAGES)
      .orderBy('createdAt', 'asc');

    if (cursor) {
      const cursorDoc = await convoRef
        .collection(PortalCollections.MESSAGES)
        .doc(cursor)
        .get();
      if (cursorDoc.exists) {
        msgQuery = msgQuery.startAfter(cursorDoc);
      }
    }

    msgQuery = msgQuery.limit(limitParam);
    const msgSnap = await msgQuery.get();

    const messages: MessageDoc[] = msgSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      conversationId,
      ...serializeMessage(docSnap.data()),
    }));

    const hasMore = msgSnap.size === limitParam;

    return new Response(
      JSON.stringify({
        conversationId,
        messages,
        hasMore,
        cursor: hasMore ? messages[messages.length - 1]?.id : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Messages GET] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load messages' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// POST — Send a message
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

  const resolvedPortal = resolvePortalFeatures(undefined);
  const denied = requireFeature('messaging', resolvedPortal.features);
  if (denied) return denied;

  let body: { conversationId: string; text: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { conversationId, text } = body;
  if (!conversationId || !text?.trim()) {
    return new Response(
      JSON.stringify({ error: 'conversationId and text are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Enforce max message length from engine config
  const maxLen = resolvedPortal.messaging.maxMessageLength ?? 2000;
  if (text.length > maxLen) {
    return new Response(
      JSON.stringify({ error: `Message too long (max ${maxLen} characters)` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ── Verify conversation exists and actor has access ──
    const convoRef = db.collection(PortalCollections.CONVERSATIONS).doc(conversationId);
    const convo = await convoRef.get();

    if (!convo.exists) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const convoData = convo.data() as ConversationDoc;

    // Scope check: actor must be participant
    const scopeCheck = requireOperatorAccess(actor, convoData.operatorId);
    if (scopeCheck) return scopeCheck;

    if (actor.role === 'client' && convoData.clientUid !== actor.uid) {
      return new Response(
        JSON.stringify({ error: 'Not your conversation' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Write message ──
    const now = new Date().toISOString();
    const trimmedText = text.trim();

    const messageData: Omit<MessageDoc, 'id'> = {
      conversationId,
      senderUid: actor.uid,
      senderRole: actor.role,
      type: 'text',
      body: trimmedText,
      createdAt: now,
      readAt: null,
    };

    const msgRef = await convoRef
      .collection(PortalCollections.MESSAGES)
      .add(messageData);

    // ── Update conversation metadata ──
    const preview = trimmedText.length > 80
      ? trimmedText.substring(0, 77) + '…'
      : trimmedText;

    const convoUpdate: Record<string, any> = {
      lastMessageAt: now,
      lastMessagePreview: preview,
      updatedAt: now,
    };

    // Increment unread for the OTHER party
    if (actor.role === 'client') {
      convoUpdate.unreadByCoach = (convoData.unreadByCoach ?? 0) + 1;
      convoUpdate.unreadByClient = 0; // sender just saw it
    } else {
      convoUpdate.unreadByClient = (convoData.unreadByClient ?? 0) + 1;
      convoUpdate.unreadByCoach = 0; // sender just saw it
    }

    // Set coachUid on first coach reply (enables tighter Firestore rules later)
    if (!convoData.coachUid && actor.role !== 'client') {
      convoUpdate.coachUid = actor.uid;
    }

    await convoRef.update(convoUpdate);

    return new Response(
      JSON.stringify({
        conversationId,
        messageId: msgRef.id,
        createdAt: now,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Messages POST] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to send message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================
// HELPERS
// ============================================================

/** Serialize a Firestore message doc to a clean MessageDoc shape. */
function serializeMessage(data: any): Omit<MessageDoc, 'id' | 'conversationId'> {
  return {
    senderUid: data.senderUid ?? '',
    senderRole: data.senderRole ?? 'client',
    type: data.type ?? 'text',
    body: data.body ?? data.text ?? '',
    attachmentUrl: data.attachmentUrl,
    attachmentName: data.attachmentName,
    createdAt: toISOSafe(data.createdAt) ?? new Date().toISOString(),
    readAt: toISOSafe(data.readAt),
  };
}

/** Safely convert Firestore Timestamp or ISO string to ISO string. */
function toISOSafe(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return null;
}
