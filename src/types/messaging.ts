/**
 * Messaging Type Definitions — Engine Contract v1
 *
 * ENGINE CONTRACT:
 * - Vertical-agnostic direct messaging between client and coach/operator.
 * - Uses Firestore realtime listeners on the client (no SSE).
 * - One conversation per (client, operator) pair.
 * - Messages are ordered by createdAt.
 *
 * FIRESTORE PATHS:
 *   conversations/{conversationId}
 *   conversations/{conversationId}/messages/{messageId}
 *
 * CONVERSATION ID CONVENTION:
 *   Format: `${clientUid}--${operatorId}`
 *   Delimiter is "--" (double dash), NOT "_" (underscore).
 *   Reason: Firebase UIDs can contain underscores. Double-dash is safe to split on.
 *
 *   IMPORTANT: Security rules must NEVER parse the ID to check access.
 *   Instead, rules check the explicit `clientUid` and `operatorId` fields
 *   stored on the document. The deterministic ID is only for deduplication
 *   and client-side lookups.
 *
 * COLLECTION SCOPING DECISION (locked):
 *   Option A chosen: global `conversations/` collection (not operator-nested).
 *   Rationale:
 *   - "Show all my conversations" = single collection query where clientUid == me
 *   - Avoids nested collection complexity in multi-operator portal
 *   - operatorId is an indexed field for operator-scoped queries
 *   - Security rules use clientUid + operatorId fields (not ID parsing)
 *
 * REQUIRED FIRESTORE INDEXES:
 *   conversations: clientUid ASC, status ASC, lastMessageAt DESC
 *   conversations: operatorId ASC, status ASC, lastMessageAt DESC
 */

import type { Vertical } from './operator';

// ============================================================
// CONVERSATION
// ============================================================

/**
 * Top-level conversation document.
 * One per (client, operator) pair. Created lazily on first message.
 */
export interface ConversationDoc {
  /**
   * Deterministic ID: `${clientUid}--${operatorId}`.
   * Delimiter is "--" to avoid collision with UIDs containing "_".
   * Do NOT parse this ID for access control — use clientUid/operatorId fields.
   */
  id: string;
  operatorId: string;
  vertical: Vertical;
  /** Client's Firebase UID. */
  clientUid: string;
  clientEmail: string;
  /** Coach/operator UID (assigned on first reply or from operator config). */
  coachUid: string | null;
  /** ISO 8601 — when the conversation was created. */
  createdAt: string;
  /** ISO 8601 — when the conversation was last updated. */
  updatedAt: string;
  /** ISO 8601 — last message timestamp (for sorting). */
  lastMessageAt: string;
  /** Preview of the last message (truncated). */
  lastMessagePreview: string;
  /** Unread message count for the client. */
  unreadByClient: number;
  /** Unread message count for the coach/operator side. */
  unreadByCoach: number;
  /** Whether the conversation is active or archived. */
  status: 'active' | 'archived';
}

// ============================================================
// MESSAGE
// ============================================================

export type MessageType = 'text' | 'image' | 'file' | 'system';

/**
 * A single message in a conversation.
 */
export interface MessageDoc {
  /** Firestore document ID. */
  id?: string;
  /** Parent conversation ID (explicit foreign key). */
  conversationId: string;
  /** UID of the sender. */
  senderUid: string;
  /** Role of the sender at time of sending. */
  senderRole: 'client' | 'coach' | 'admin' | 'system';
  /** Message type. */
  type: MessageType;
  /** Text content (for 'text' and 'system' types). */
  body: string;
  /** Attachment URL (for 'image' and 'file' types). */
  attachmentUrl?: string;
  /** Original filename for file attachments. */
  attachmentName?: string;
  /** ISO 8601 — when the message was sent. */
  createdAt: string;
  /** ISO 8601 — when the message was read by the other party. */
  readAt: string | null;
}

// ============================================================
// API REQUEST / RESPONSE
// ============================================================

/** Send a message. */
export interface MessageSendRequest {
  operatorId: string;
  body: string;
  type?: MessageType;
  attachmentUrl?: string;
  attachmentName?: string;
}

/** Response after sending a message. */
export interface MessageSendResponse {
  conversationId: string;
  messageId: string;
  createdAt: string;
}

/** Paginated message list response. */
export interface MessageListResponse {
  conversationId: string;
  messages: MessageDoc[];
  hasMore: boolean;
  cursor?: string;
}

/** Conversation list item (for sidebar). */
export interface ConversationSummary {
  id: string;
  operatorId: string;
  operatorBrandName: string;
  operatorAvatar?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

// ============================================================
// UI VIEW MODEL
// ============================================================

/**
 * Fully resolved messaging state for the portal UI.
 * Combines conversation list + active thread for single-payload bootstrap.
 */
export interface MessagingView {
  /** All conversations for the current actor (sorted by lastMessageAt DESC). */
  conversations: ConversationSummary[];
  /** Currently active conversation + its messages (if one is selected). */
  activeConversation?: {
    conversation: ConversationSummary;
    messages: MessageDoc[];
  };
}
