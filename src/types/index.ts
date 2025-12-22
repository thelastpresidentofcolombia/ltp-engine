/**
 * Type Definitions Index
 * Re-exports all types for convenient importing
 */

// Core types
export * from './operator';
export * from './vibe';
export * from './modules';

// Data types
export * from './proof';
export * from './intel';
export * from './products';
export * from './offers';

// Configuration types
export * from './presentation';
export * from './nomenclature';

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
