/**
 * Astro Middleware — Subdomain Routing
 * 
 * ENGINE CONTRACT:
 * - portal.lovethisplace.co root (/) → redirect to /portal
 * - All other routes pass through unchanged
 * 
 * WHY: Clean UX for portal subdomain without duplicating /portal/portal
 */

import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async ({ request }, next) => {
  const url = new URL(request.url);

  const isPortalDomain = url.hostname === 'portal.lovethisplace.co';
  const isRootPath = url.pathname === '/';

  if (isPortalDomain && isRootPath) {
    return Response.redirect(
      new URL('/portal', url.origin),
      302
    );
  }

  return next();
};
