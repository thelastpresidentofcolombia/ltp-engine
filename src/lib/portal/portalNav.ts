/**
 * Portal Navigation Helpers — Operator-Scoped URLs
 *
 * ENGINE CONTRACT:
 * - Every portal page lives at /portal/{operatorId}/{page}.
 * - These helpers read the active operatorId from the current URL path.
 * - All internal portal links MUST use `portalHref()` to stay operator-scoped.
 * - Falls back gracefully if operatorId is missing (legacy bookmark → redirect stub).
 *
 * URL PATTERN:
 *   /portal/{operatorId}/dashboard
 *   /portal/{operatorId}/sessions
 *   /portal/{operatorId}/programs
 *   etc.
 */

/**
 * Read the active operatorId from the current URL path.
 * Pattern: /portal/{operatorId}/...
 * Returns empty string if not on an operator-scoped portal page.
 */
export function getActiveOperatorId(): string {
  const match = window.location.pathname.match(/^\/portal\/([^/]+)\//);
  return match?.[1] ?? '';
}

/**
 * Build an operator-scoped portal URL.
 * Reads operatorId from the current URL path automatically.
 *
 * @param page - The page slug (e.g., 'dashboard', 'sessions', 'goals#new')
 * @param operatorId - Optional override (e.g., when switching operators)
 * @returns Scoped URL like `/portal/fitness-demo/sessions`
 */
export function portalHref(page: string, operatorId?: string): string {
  const opId = operatorId || getActiveOperatorId();
  if (opId) return `/portal/${opId}/${page}`;
  // Fallback: unscoped (should only happen on redirect stubs)
  return `/portal/${page}`;
}

/**
 * Navigate to a portal page within the current operator scope.
 * Uses standard navigation (works with ClientRouter / view transitions).
 */
export function portalNavigate(page: string, operatorId?: string): void {
  window.location.href = portalHref(page, operatorId);
}

/**
 * Extract the page slug from an operator-scoped portal URL.
 * /portal/{operatorId}/sessions → 'sessions'
 * /portal/sessions → 'sessions' (legacy fallback)
 */
export function getPortalPage(pathname?: string): string {
  const path = pathname ?? window.location.pathname;
  // Operator-scoped: /portal/{opId}/{page}
  const scopedMatch = path.match(/^\/portal\/[^/]+\/([^/?#]+)/);
  if (scopedMatch) return scopedMatch[1];
  // Legacy: /portal/{page}
  const legacyMatch = path.match(/^\/portal\/([^/?#]+)/);
  return legacyMatch?.[1] ?? 'dashboard';
}
