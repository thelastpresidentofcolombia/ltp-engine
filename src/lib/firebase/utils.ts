/**
 * Firebase Utility Functions
 * 
 * ENGINE CONTRACT:
 * - Email normalization and hashing
 * - Timestamp helpers
 * - Common Firestore operations
 */

import { createHash } from 'crypto';
import { admin } from './admin';

// ============================================================
// EMAIL UTILITIES
// ============================================================

/**
 * Normalize email to lowercase, trimmed
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Create SHA256 hash of normalized email
 * Used as document ID for pendingEntitlements
 */
export function hashEmail(email: string): string {
  const normalized = normalizeEmail(email);
  return createHash('sha256').update(normalized).digest('hex');
}

// ============================================================
// TIMESTAMP HELPERS
// ============================================================

/**
 * Get Firestore server timestamp
 */
export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Get current timestamp as Firestore Timestamp
 */
export function nowTimestamp() {
  return admin.firestore.Timestamp.now();
}

// ============================================================
// ENGINE METADATA
// ============================================================

export const ENGINE_VERSION = '1.0.0';

/**
 * Standard fields for every document
 */
export function engineMetadata(operatorId: string, vertical: string, source: string, sourceModule: string) {
  return {
    operatorId,
    vertical,
    createdAt: serverTimestamp(),
    source,
    sourceModule,
    engineVersion: ENGINE_VERSION,
  };
}
