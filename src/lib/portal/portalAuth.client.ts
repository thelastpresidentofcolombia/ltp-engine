/**
 * Portal Auth + Bootstrap — Shared Client Module
 *
 * ENGINE CONTRACT:
 * - Imported by every portal page's .client.ts script.
 * - Handles: magic link completion, auth state, bootstrap v2 call.
 * - Caches bootstrap data in memory so repeat calls are free.
 * - Controls showing login screen vs authenticated shell.
 *
 * USAGE:
 *   import { initPortal, getBootstrap, getActor } from './portalAuth.client';
 *   const data = await initPortal();  // blocks until authed + bootstrapped
 *   // data.actor, data.features, data.operators, data.summary
 */

import {
  auth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
} from '../firebase/client.client';

import type { PortalBootstrapV2 } from '../../types/portal';
import { getActiveOperatorId } from './portalNav';

// ============================================================
// STATE
// ============================================================

let cachedBootstrap: PortalBootstrapV2 | null = null;
let initPromise: Promise<PortalBootstrapV2> | null = null;

// ============================================================
// SESSION STORAGE CACHE (instant page transitions)
// ============================================================

const CACHE_KEY = 'ltp_portal_bootstrap';
const CACHE_TTL = 30_000; // 30 seconds

function getCachedBootstrap(): PortalBootstrapV2 | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: PortalBootstrapV2; ts: number };
    if (Date.now() - entry.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCachedBootstrap(data: PortalBootstrapV2) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full — non-fatal */ }
}

function clearCachedBootstrap() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

// ============================================================
// API RESPONSE CACHE (per-endpoint sessionStorage)
// ============================================================

const API_CACHE_PREFIX = 'ltp_api_';
const DEFAULT_API_TTL = 30_000; // 30 seconds

/**
 * Authenticated GET with sessionStorage caching.
 * Returns cached Response if fresh, otherwise fetches + caches.
 * Use for read-heavy endpoints; call clearApiCache() after mutations.
 */
async function cachedGet(url: string, ttl: number = DEFAULT_API_TTL): Promise<Response> {
  const key = API_CACHE_PREFIX + url;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const entry = JSON.parse(raw);
      if (Date.now() - entry.ts < ttl) {
        return new Response(JSON.stringify(entry.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      sessionStorage.removeItem(key);
    }
  } catch {}

  const resp = await getAuthed(url);
  // Only cache successful, parseable JSON responses.
  // Never cache 401/403/5xx — a transient auth hiccup must not become a 30s broken state.
  if (resp.ok) {
    try {
      const clone = resp.clone();
      const data = await clone.json();
      if (data && typeof data === 'object') {
        sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch { /* JSON parse failure — don't cache */ }
  }
  return resp;
}

/**
 * Clear cached API responses. Pass a URL substring to target specific endpoints,
 * or call with no args to clear all API caches.
 */
function clearApiCache(urlPattern?: string) {
  try {
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.startsWith(API_CACHE_PREFIX)) {
        if (!urlPattern || key.includes(urlPattern)) {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch {}
}

// ============================================================
// AUTH HELPERS
// ============================================================

function getEmailFromStorage(): string {
  return window.localStorage.getItem('ltp_portal_email') || '';
}

function setEmailToStorage(email: string) {
  window.localStorage.setItem('ltp_portal_email', email);
}

function clearEmailStorage() {
  window.localStorage.removeItem('ltp_portal_email');
}

/**
 * Authenticated GET request. Returns the raw Response object.
 * Callers should check resp.ok and call resp.json() themselves.
 */
async function getAuthed(url: string): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Authenticated POST/PATCH/PUT request. Returns the raw Response object.
 * @param method — HTTP method, defaults to 'POST'
 */
async function postAuthed(url: string, body?: any, method: string = 'POST'): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================
// MAGIC LINK COMPLETION
// ============================================================

async function completeEmailLinkIfPresent() {
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return;

  let email = getEmailFromStorage();
  if (!email) {
    email = window.prompt('Enter the email you used to request the login link:') || '';
    if (!email) return;
    setEmailToStorage(email);
  }

  await signInWithEmailLink(auth, email, href);
  clearEmailStorage();

  // Strip Firebase auth params from URL
  const clean = new URL(window.location.origin + window.location.pathname);
  window.history.replaceState({}, document.title, clean.pathname);
}

// ============================================================
// BOOTSTRAP v2
// ============================================================

async function fetchBootstrap(): Promise<PortalBootstrapV2> {
  // Claim pending entitlements first (engine invariant)
  try {
    const claimResp = await postAuthed('/api/portal/claim');
    // Non-fatal — just consume it
    if (!claimResp.ok) { /* no pending items, that's fine */ }
  } catch {
    // Non-fatal — claim endpoint may not have pending items
  }

  const resp = await getAuthed('/api/portal/bootstrap');
  if (!resp.ok) throw new Error(`Bootstrap failed (${resp.status})`);
  const data = await resp.json();
  return data as PortalBootstrapV2;
}

/**
 * Get cached bootstrap data. Call initPortal() first.
 */
export function getBootstrap(): PortalBootstrapV2 | null {
  return cachedBootstrap;
}

/**
 * Force-refresh bootstrap data (e.g. after a mutation).
 */
export async function refreshBootstrap(): Promise<PortalBootstrapV2> {
  cachedBootstrap = await fetchBootstrap();
  setCachedBootstrap(cachedBootstrap);
  updateShellFromBootstrap(cachedBootstrap);
  return cachedBootstrap;
}

// ============================================================
// SHELL UI WIRING
// ============================================================

function getInitials(email: string): string {
  return email.split('@')[0].substring(0, 2).toUpperCase();
}

function updateShellFromBootstrap(data: PortalBootstrapV2) {
  // Remove layout skeleton (slot content or dynamic innerHTML now visible)
  document.getElementById('portal-skeleton')?.remove();

  // ── Resolve active operator: URL → session memory → first membership ──
  const operatorIds = Object.keys(data.operators);
  const urlOpId = getActiveOperatorId();
  const activeOpId = (urlOpId && operatorIds.includes(urlOpId))
    ? urlOpId
    : operatorIds[0] ?? null;
  const primary = activeOpId ? data.operators[activeOpId] : null;

  if (primary?.accentColor) {
    const root = document.documentElement.style;
    root.setProperty('--portal-accent', primary.accentColor);
    // Derive lighter hover variant via color-mix (CSS L4) with white fallback
    root.setProperty('--portal-accent-hover',
      `color-mix(in srgb, ${primary.accentColor} 75%, white)`);
  }

  // Meta theme-color for mobile browser chrome
  const themeMeta = document.getElementById('meta-theme-color');
  if (themeMeta && primary?.accentColor) {
    themeMeta.setAttribute('content', primary.accentColor);
  }

  // Dynamic title: replace "Portal" suffix with operator brand name
  if (primary?.brandName) {
    document.title = document.title.replace(/\| Portal$/, `| ${primary.brandName}`);
  }

  // Sidebar user info
  const avatarEl = document.getElementById('sidebar-avatar');
  const emailEl = document.getElementById('sidebar-email');
  if (avatarEl) avatarEl.textContent = getInitials(data.actor.email);
  if (emailEl) emailEl.textContent = data.actor.email;

  // Sidebar brand: logo image (if available), brand name, tagline
  const brandLogoEl = document.getElementById('sidebar-brand-logo');
  if (brandLogoEl && primary) {
    if (primary.logo) {
      brandLogoEl.innerHTML = `<img src="${primary.logo}" alt="${primary.brandName || 'Logo'}" />`;
    } else {
      brandLogoEl.textContent = primary.brandName || 'Portal';
    }
  }

  const taglineEl = document.getElementById('sidebar-brand-tagline');
  if (taglineEl && primary?.tagline) {
    taglineEl.textContent = primary.tagline;
  }

  // Login screen brand injection (for users still on login card)
  const loginBrand = document.getElementById('login-brand');
  if (loginBrand && primary) {
    const parts: string[] = [];
    if (primary.logo) parts.push(`<img src="${primary.logo}" alt="${primary.brandName || ''}" />`);
    parts.push(`<div class="login-brand-name">${primary.brandName || ''}</div>`);
    if (primary.tagline) parts.push(`<div class="login-brand-tagline">${primary.tagline}</div>`);
    loginBrand.innerHTML = parts.join('');
  }

  // Hide nav items not in resolved features
  const navLinks = document.querySelectorAll('.nav-item[data-nav-id]');
  navLinks.forEach((link) => {
    const navId = link.getAttribute('data-nav-id');
    if (navId && !data.features.includes(navId as any)) {
      link.setAttribute('data-hidden', 'true');
    } else {
      link.removeAttribute('data-hidden');
    }
  });

  // Set badge counts
  const setBadge = (id: string, count: number) => {
    const badge = document.querySelector(`[data-badge-id="${id}"]`);
    if (badge) {
      badge.textContent = count > 0 ? String(count) : '';
      badge.setAttribute('data-count', String(count));
    }
  };

  setBadge('messaging', data.summary.unreadMessages);
  setBadge('sessions', data.summary.upcomingSessions);
}

// ============================================================
// INIT
// ============================================================

/**
 * Initialize the portal page. Returns bootstrapped data once authenticated.
 * Shows login screen if not authenticated.
 * Idempotent: safe to call on every view-transition navigation.
 */
export function initPortal(): Promise<PortalBootstrapV2> {
  // Fast path: already bootstrapped (view transition navigation)
  // Still call updateShellFromBootstrap — new page has fresh DOM (skeleton, etc.)
  if (cachedBootstrap) {
    updateShellFromBootstrap(cachedBootstrap);
    wireLogout();
    return Promise.resolve(cachedBootstrap);
  }

  // Dedup: return existing promise if init is in progress
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    async function boot() {
      try {
        await completeEmailLinkIfPresent();
      } catch (e) {
        console.error('[Portal] Magic link error:', e);
      }

      onAuthStateChanged(auth, async (user) => {
        // Fresh DOM lookups (resilient to view-transition swaps)
        const loginScreen = document.getElementById('portal-login');
        const shellEl = document.getElementById('portal-shell');

        if (!user) {
          cachedBootstrap = null;
          initPromise = null;
          clearCachedBootstrap();
          clearApiCache();
          if (loginScreen) loginScreen.style.display = '';
          if (shellEl) shellEl.style.display = 'none';
          wireLoginForm();
          return;
        }

        // Authenticated
        if (loginScreen) loginScreen.style.display = 'none';
        if (shellEl) shellEl.style.display = '';

        try {
          // ── Instant load from sessionStorage cache ──
          const cached = getCachedBootstrap();
          if (cached) {
            cachedBootstrap = cached;
            updateShellFromBootstrap(cached);
            wireLogout();
            resolve(cached);
            document.dispatchEvent(new CustomEvent('portal:bootstrapped'));
            // Background refresh keeps data fresh
            fetchBootstrap().then((fresh) => {
              cachedBootstrap = fresh;
              setCachedBootstrap(fresh);
              updateShellFromBootstrap(fresh);
            }).catch(() => {});
            return;
          }

          // No cache — full bootstrap (first load only)
          cachedBootstrap = await fetchBootstrap();
          setCachedBootstrap(cachedBootstrap);
          updateShellFromBootstrap(cachedBootstrap);
          wireLogout();
          resolve(cachedBootstrap);
          document.dispatchEvent(new CustomEvent('portal:bootstrapped'));
        } catch (err: any) {
          console.error('[Portal] Bootstrap failed:', err);
          initPromise = null;
          const content = document.getElementById('portal-content');
          if (content) {
            content.innerHTML = `
              <div class="card" style="text-align:center; padding:48px;">
                <div style="width:48px;height:48px;margin:0 auto 12px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:var(--portal-error);">!</div>
                <h3 style="margin-bottom:8px;">Something went wrong</h3>
                <p style="color:var(--portal-text-secondary);">${err.message || 'Failed to load portal data.'}</p>
              </div>
            `;
          }
          reject(err);
        }
      });
    }

    boot();
  });

  return initPromise;
}

// ============================================================
// LOGIN FORM
// ============================================================

function wireLoginForm() {
  const emailInput = document.getElementById('login-email') as HTMLInputElement;
  const btn = document.getElementById('login-send') as HTMLButtonElement;
  const errEl = document.getElementById('login-error') as HTMLElement;

  if (!btn || !emailInput) return;

  async function handleSend() {
    const email = emailInput.value.trim();
    if (!email) {
      errEl.textContent = 'Please enter your email.';
      errEl.style.display = 'block';
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Sending...';
      errEl.style.display = 'none';

      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}${window.location.pathname}`,
        handleCodeInApp: true,
      });

      setEmailToStorage(email);

      // Replace login card with success message
      const card = document.querySelector('.portal-login-card');
      if (card) {
        card.innerHTML = `
          <div class="portal-login-success">
            <h3>Check your email</h3>
            <p style="color:var(--portal-text-secondary); margin-top:4px;">
              We sent a sign-in link to <strong>${email}</strong>.
              Click it to access your portal.
            </p>
          </div>
        `;
      }
    } catch (e: any) {
      console.error('[Portal] Send link error:', e);
      errEl.textContent = e?.message || 'Failed to send link.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Send login link';
    }
  }

  btn.addEventListener('click', handleSend);
  emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}

// ============================================================
// LOGOUT
// ============================================================

function wireLogout() {
  const logoutBtn = document.getElementById('sidebar-logout');
  if (!logoutBtn || (logoutBtn as HTMLElement).dataset.wired === 'true') return;
  (logoutBtn as HTMLElement).dataset.wired = 'true';
  logoutBtn.addEventListener('click', async () => {
    cachedBootstrap = null;
    initPromise = null;
    clearCachedBootstrap();
    clearApiCache();
    await signOut(auth);
    window.location.reload();
  });
}

// ============================================================
// RE-EXPORTS for page scripts
// ============================================================

export { getAuthed, postAuthed, cachedGet, clearApiCache };
