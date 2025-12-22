/**
 * mergeById.ts
 * Engine utility for merging core (invariants) + lang (translations) arrays by ID.
 * 
 * Used by loadOperator() to merge:
 * - products (core.products + lang.products)
 * - founders (core.founders + lang.founders)
 * - offers (core.offers + lang.offers)
 * 
 * Core data comes first, lang data overlays matching IDs.
 * Items only in lang (no core match) are still included.
 */

/**
 * Merge two arrays of objects by their `id` field.
 * Core items are the base, lang items overlay/extend matching IDs.
 * 
 * @param core - Array from core.json (language-agnostic data)
 * @param lang - Array from {lang}.json (translated content)
 * @returns Merged array with combined properties
 * 
 * @example
 * const core = [{ id: 'p1', price: 99 }];
 * const lang = [{ id: 'p1', title: 'Product One' }];
 * mergeById(core, lang);
 * // => [{ id: 'p1', price: 99, title: 'Product One' }]
 */
export function mergeById<
  T extends { id: string },
  U extends { id: string }
>(
  core: T[] = [],
  lang: U[] = []
): Array<T & U> {
  const map = new Map<string, any>();

  // Add all core items first
  for (const c of core) {
    map.set(c.id, { ...c });
  }

  // Overlay lang items (merge if exists, add if new)
  for (const l of lang) {
    map.set(l.id, { ...(map.get(l.id) || {}), ...l });
  }

  return Array.from(map.values());
}
