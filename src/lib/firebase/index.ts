/**
 * Firebase Library Index
 * 
 * Re-exports all Firebase utilities for clean imports
 */

export { admin, db, auth, Collections, Subcollections } from './admin';
export { normalizeEmail, hashEmail, serverTimestamp, nowTimestamp, engineMetadata, ENGINE_VERSION } from './utils';
export * from './types';
