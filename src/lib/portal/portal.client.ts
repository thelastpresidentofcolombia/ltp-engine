/**
 * Portal Client Script - Browser Bundle
 * 
 * ENGINE CONTRACT:
 * - .client.ts suffix forces Astro to bundle for browser
 * - All Firebase + portal logic in one bundled file
 */

import {
  auth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
} from "../firebase/client.client";
import { getIcon } from '../ui/icons';

const root = document.getElementById("portal-root");

function render(html: string) {
  if (root) root.innerHTML = html;
}

console.log("[Portal] Firebase client loaded, auth:", !!auth);

function getEmailFromStorage() {
  return window.localStorage.getItem("ltp_portal_email") || "";
}

function setEmailToStorage(email: string) {
  window.localStorage.setItem("ltp_portal_email", email);
}

function clearEmailStorage() {
  window.localStorage.removeItem("ltp_portal_email");
}

async function postAuthed(url: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`POST ${url} failed (${res.status})`);
  return res.json();
}

async function getAuthed(url: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json();
}

/**
 * Resolve entitlement to clickable href based on resource action.
 * ENGINE CONTRACT: Portal never re-implements routing logic.
 */
function resolveEntitlementHref(ent: any): string | null {
  if (!ent.resource?.action) return null;
  
  const action = ent.resource.action;
  
  switch (action.type) {
    case 'page':
    case 'embed':
    case 'download':
      // All these render on gated page
      return `/portal/r/${ent.operatorId}/${ent.resourceId}`;
    
    case 'external':
      // Direct external link
      return action.href;
    
    default:
      return null;
  }
}

/**
 * Get destination from URL query param for deep linking
 */
function getDestFromUrl(): string | null {
  const u = new URL(window.location.href);
  const dest = u.searchParams.get("dest");
  if (!dest) return null;

  // Basic safety: allow only same-site paths
  if (!dest.startsWith("/")) return null;
  return dest;
}

/**
 * Clear destination param from URL after using it
 */
function clearDestFromUrl() {
  const u = new URL(window.location.href);
  u.searchParams.delete("dest");
  // Keep current pathname but strip dest param
  window.history.replaceState({}, document.title, `${u.pathname}${u.search}${u.hash}`);
}

async function completeEmailLinkIfPresent() {
  const href = window.location.href;

  if (!isSignInWithEmailLink(auth, href)) return;

  let email = getEmailFromStorage();

  if (!email) {
    email = window.prompt("Enter the email you used to request the login link:") || "";
    if (!email) return;
    setEmailToStorage(email);
  }

  await signInWithEmailLink(auth, email, href);

  clearEmailStorage();
  // After completing sign-in, strip Firebase auth params BUT keep any "dest" for deep linking
  const u = new URL(window.location.href);
  
  // Firebase adds auth params; we only keep "dest" if present
  const dest = u.searchParams.get("dest");
  const clean = new URL(window.location.origin + window.location.pathname);
  if (dest) clean.searchParams.set("dest", dest);
  
  window.history.replaceState({}, document.title, clean.pathname + clean.search);
}

async function sendLink(email: string) {
  const actionCodeSettings = {
    // Send magic link back to the exact path the user is on
    // (e.g. /en/portal in dev, /portal in production).
    url: `${window.location.origin}${window.location.pathname}`,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  setEmailToStorage(email);

  render(`
    <div class="card success-card">
      <h3>Check your email ✉️</h3>
      <p style="margin:0;">
        We sent a secure sign-in link to <strong>${email}</strong>.<br/>
        Click the link in your email to access your portal.
      </p>
    </div>
  `);
}

/**
 * Get user initials from email for avatar fallback
 */
function getInitials(email: string): string {
  const name = email.split('@')[0];
  return name.substring(0, 2).toUpperCase();
}

/**
 * Get operator avatar HTML (logo or initials fallback)
 */
function getOperatorAvatarHtml(branding: any): string {
  if (branding?.logo) {
    return `<img src="${branding.logo}" alt="${branding.brandName}" class="operator-logo" />`;
  }
  const initials = (branding?.shortName || branding?.brandName || '?').substring(0, 2).toUpperCase();
  return `<div class="operator-avatar">${initials}</div>`;
}

/**
 * Check if entitlement is expired
 */
function isExpired(ent: any): boolean {
  if (!ent.expiresAt) return false;
  return new Date(ent.expiresAt) < new Date();
}

/**
 * Get status pill HTML
 */
function getStatusPillHtml(ent: any): string {
  if (isExpired(ent)) {
    return `<span class="status-pill status-expired">Expired</span>`;
  }
  return `<span class="status-pill status-active">Active</span>`;
}

async function loadPortal() {
  // Show loading with spinner
  render(`
    <div class="loading">
      <div class="loading-spinner"></div>
      Loading your portal...
    </div>
  `);

  // 1) Claim pending entitlements (engine invariant)
  const claimResult = await postAuthed("/api/portal/claim");
  console.log("[Portal] Claim result:", claimResult);

  // 2) Bootstrap portal data
  const data = await getAuthed("/api/portal/bootstrap");
  console.log("[Portal] Bootstrap data:", data);

  // 3) Check for deep link destination from URL (e.g. ?dest=/en/v/consultancy/jose-espinosa/r/...)
  const dest = getDestFromUrl();
  if (dest) {
    clearDestFromUrl();
    console.log("[Portal] Deep linking to:", dest);
    window.location.href = dest;
    return;
  }

  // 4) Auto-redirect if only one entitlement (skip portal listing)
  const entitlements = data.entitlements || [];
  if (entitlements.length === 1) {
    const singleEnt = entitlements[0];
    const href = resolveEntitlementHref(singleEnt);
    if (href && !isExpired(singleEnt)) {
      console.log("[Portal] Single entitlement, auto-redirecting to:", href);
      window.location.href = href;
      return;
    }
  }

  // Group entitlements by operator
  const entitlementsByOperator: Record<string, any[]> = {};
  for (const ent of data.entitlements || []) {
    if (!entitlementsByOperator[ent.operatorId]) {
      entitlementsByOperator[ent.operatorId] = [];
    }
    entitlementsByOperator[ent.operatorId].push(ent);
  }

  // Build entitlements HTML
  let entitlementsHtml = "";
  const operatorIds = Object.keys(entitlementsByOperator);
  const totalEntitlements = data.entitlements?.length || 0;

  if (operatorIds.length === 0) {
    // Premium empty state
    entitlementsHtml = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">${getIcon('package', 'empty-icon-svg')}</div>
          <h3 class="empty-title">No Active Access Yet</h3>
          <p class="empty-desc">
            Once you purchase a program or get access granted, your content will appear here.
          </p>
        </div>
      </div>
    `;
  } else {
    for (const opId of operatorIds) {
      const ents = entitlementsByOperator[opId];
      const branding = data.operators?.[opId];
      const brandName = branding?.brandName || opId;
      const tagline = branding?.tagline || '';
      
      const items = ents.map(e => {
        const href = resolveEntitlementHref(e);
        const label = e.resource?.label || e.resourceId;
        const description = e.resource?.description || '';
        const isExternal = e.resource?.action?.type === 'external';
        const expired = isExpired(e);
        
        if (href && !expired) {
          return `
            <a href="${href}" class="entitlement-link" ${isExternal ? 'target="_blank" rel="noreferrer"' : ''}>
              <div class="entitlement-item">
                <div class="entitlement-content">
                  <div class="entitlement-label">
                    ${label}
                    ${getStatusPillHtml(e)}
                  </div>
                  ${description ? `<div class="entitlement-desc">${description}</div>` : ''}
                </div>
                <div class="entitlement-arrow">${isExternal ? getIcon('external-link', 'arrow-icon') : getIcon('arrow-right', 'arrow-icon')}</div>
              </div>
            </a>
          `;
        } else if (expired) {
          return `
            <div class="entitlement-item entitlement-unavailable">
              <div class="entitlement-content">
                <div class="entitlement-label">
                  ${label}
                  ${getStatusPillHtml(e)}
                </div>
                <div class="entitlement-desc">Access has expired</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="entitlement-item entitlement-unavailable">
              <div class="entitlement-content">
                <div class="entitlement-label">${label}</div>
                <div class="entitlement-desc">Content coming soon</div>
              </div>
            </div>
          `;
        }
      }).join("");

      entitlementsHtml += `
        <div class="card operator-card">
          <div class="operator-header">
            ${getOperatorAvatarHtml(branding)}
            <div class="operator-info">
              <div class="operator-name">${brandName}</div>
              ${tagline ? `<div class="operator-tagline">${tagline}</div>` : ''}
            </div>
          </div>
          <div class="operator-entitlements">
            ${items}
          </div>
        </div>
      `;
    }
  }

  // Get user initials for avatar
  const userEmail = data.user?.email || "";
  const userInitials = getInitials(userEmail);

  // Render portal
  render(`
    <div class="user-header">
      <div class="user-info">
        <div class="user-avatar">${userInitials}</div>
        <div>
          <div class="user-label">Signed in as</div>
          <div class="user-email">${userEmail}</div>
        </div>
      </div>
      <button id="logout" class="btn-ghost">Log out</button>
    </div>

    <div class="section-header">
      <h3 class="section-title">Your Access</h3>
      ${totalEntitlements > 0 ? `<span class="section-count">${totalEntitlements} item${totalEntitlements !== 1 ? 's' : ''}</span>` : ''}
    </div>
    ${entitlementsHtml}

    <div class="card help-card">
      <h3>Need Help? ${getIcon('message', 'help-icon')}</h3>
      <p>Contact your coach directly via WhatsApp or email for support.</p>
    </div>
  `);

  // Logout handler
  document.getElementById("logout")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.reload();
  });
}

function renderLogin() {
  render(`
    <div class="card">
      <h3 style="text-transform: none; letter-spacing: normal; font-size: 1.25rem; color: #0f172a;">Welcome Back ${getIcon('sparkle', 'welcome-icon')}</h3>
      <p>Get a magic link sent to your email — no password needed.</p>
      <input id="email" type="email" placeholder="you@email.com" />
      <button id="send" class="btn-primary">Send login link</button>
      <div id="err" class="error" style="display: none;"></div>
    </div>
  `);

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const btn = document.getElementById("send") as HTMLButtonElement;
  const err = document.getElementById("err") as HTMLElement;

  btn.addEventListener("click", async () => {
    err.textContent = "";
    err.style.display = "none";
    const email = String(emailInput.value || "").trim();
    if (!email) {
      err.textContent = "Please enter your email.";
      err.style.display = "block";
      return;
    }
    try {
      btn.disabled = true;
      btn.textContent = "Sending...";
      await sendLink(email);
    } catch (e: any) {
      console.error("[Portal] Send link error:", e);
      err.textContent = e?.message || "Failed to send link.";
      err.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Send login link";
    }
  });

  // Allow Enter key
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btn.click();
  });
}

// Boot
async function boot() {
  try {
    await completeEmailLinkIfPresent();

    onAuthStateChanged(auth, (user) => {
      if (!user) {
        renderLogin();
      } else {
        loadPortal().catch((e) => {
          console.error("[Portal] Load error:", e);
          render(`<div class="card"><p class="error">${e.message}</p></div>`);
        });
      }
    });
  } catch (e: any) {
    console.error("[Portal] Boot error:", e);
    render(`<div class="card"><p class="error">${e?.message || "Authentication failed."}</p></div>`);
  }
}

boot();
