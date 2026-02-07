/**
 * Messaging Client Module — Browser Bundle
 *
 * ENGINE CONTRACT:
 * - Provides messaging functionality for portal pages.
 * - Mutations (send, create, markRead) → API routes (full guard stack).
 * - Subscriptions (realtime messages) → Firestore onSnapshot (client-side).
 * - Imported by messages.astro's inline <script>.
 *
 * PATTERN:
 *   import { listConversations, subscribeToMessages, sendMessage } from './messaging.client';
 *
 * REALTIME STRATEGY:
 *   Message subscriptions use Firestore onSnapshot for instant delivery.
 *   Conversation list uses API fetch (refreshed on send / convo switch).
 *   Firestore rules require authentication — API guard stack is the
 *   primary access control layer.
 */

import {
  firestoreDb,
  collection,
  query,
  orderBy,
  onSnapshot,
} from '../firebase/firestore.client';
import { getAuthed, postAuthed } from './portalAuth.client';
import type { ConversationSummary, MessageDoc } from '../../types/messaging';

// ============================================================
// CONVERSATION OPERATIONS (via API)
// ============================================================

/**
 * List all conversations for the current user.
 * Delegates to GET /api/portal/conversations (full guard stack).
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  const resp = await getAuthed('/api/portal/conversations');
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load conversations (${resp.status})`);
  }
  const data = await resp.json();
  return data.conversations ?? [];
}

/**
 * Get or create a conversation with an operator (idempotent).
 * Delegates to POST /api/portal/conversations (full guard stack).
 * Returns the conversation doc (existing or newly created).
 */
export async function getOrCreateConversation(
  operatorId: string
): Promise<{ id: string; [key: string]: any }> {
  const resp = await postAuthed('/api/portal/conversations', { operatorId });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create conversation (${resp.status})`);
  }
  const data = await resp.json();
  return data.conversation;
}

/**
 * Mark a conversation as read for the current user.
 * Delegates to PATCH /api/portal/conversations (full guard stack).
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const resp = await postAuthed('/api/portal/conversations', { conversationId }, 'PATCH');
  if (!resp.ok) {
    console.warn('[Messaging] Mark-read failed:', resp.status);
  }
}

// ============================================================
// MESSAGE OPERATIONS
// ============================================================

/**
 * Load messages for a conversation (initial page via API).
 * Delegates to GET /api/portal/messages (full guard stack).
 * Useful as a fallback if onSnapshot isn't available.
 */
export async function loadMessages(
  conversationId: string,
  messageLimit = 50
): Promise<MessageDoc[]> {
  const resp = await getAuthed(
    `/api/portal/messages?conversationId=${encodeURIComponent(conversationId)}&limit=${messageLimit}`
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load messages (${resp.status})`);
  }
  const data = await resp.json();
  return data.messages ?? [];
}

/**
 * Subscribe to realtime message updates for a conversation.
 * Uses Firestore onSnapshot for instant delivery.
 *
 * The first snapshot fires with all existing messages (initial load).
 * Subsequent snapshots fire on any new/changed/deleted message.
 *
 * @returns An unsubscribe function. Call it when switching conversations.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: MessageDoc[]) => void
): () => void {
  const messagesRef = collection(
    firestoreDb,
    'conversations',
    conversationId,
    'messages'
  );
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: MessageDoc[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          conversationId,
          senderUid: d.senderUid ?? '',
          senderRole: d.senderRole ?? 'client',
          type: d.type ?? 'text',
          body: d.body ?? '',
          createdAt: toISOSafe(d.createdAt) ?? '',
          readAt: toISOSafe(d.readAt),
        };
      });
      callback(messages);
    },
    (error) => {
      console.error('[Messaging] onSnapshot error:', error);
      // Fallback: load via API on error
      loadMessages(conversationId)
        .then(callback)
        .catch((err) => console.error('[Messaging] Fallback load failed:', err));
    }
  );
}

/**
 * Send a message to a conversation.
 * Delegates to POST /api/portal/messages (full guard stack).
 * The onSnapshot subscription will pick up the new message automatically.
 */
export async function sendMessage(
  conversationId: string,
  text: string
): Promise<{ conversationId: string; messageId: string; createdAt: string }> {
  const resp = await postAuthed('/api/portal/messages', { conversationId, text });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to send message (${resp.status})`);
  }
  return resp.json();
}

// ============================================================
// HELPERS
// ============================================================

/** Safely convert Firestore Timestamp or ISO string to ISO string. */
function toISOSafe(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return null;
}
