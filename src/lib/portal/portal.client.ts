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
  window.history.replaceState({}, document.title, "/portal");
}

async function sendLink(email: string) {
  const actionCodeSettings = {
    url: `${window.location.origin}/portal`,
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

async function loadPortal() {
  render(`<div class="loading">Loading your portal...</div>`);

  // 1) Claim pending entitlements (engine invariant)
  const claimResult = await postAuthed("/api/portal/claim");
  console.log("[Portal] Claim result:", claimResult);

  // 2) Bootstrap portal data
  const data = await getAuthed("/api/portal/bootstrap");
  console.log("[Portal] Bootstrap data:", data);

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

  if (operatorIds.length === 0) {
    entitlementsHtml = `
      <div class="card">
        <h3>No Active Access</h3>
        <p style="margin:0;">You don't have any active programs or subscriptions yet.</p>
      </div>
    `;
  } else {
    for (const opId of operatorIds) {
      const ents = entitlementsByOperator[opId];
      const items = ents.map(e => `
        <div class="entitlement-item">
          <div>
            <div class="entitlement-type">${e.type}</div>
            <div class="entitlement-resource">${e.resourceId}</div>
          </div>
          <div class="status-active">${e.status}</div>
        </div>
      `).join("");

      entitlementsHtml += `
        <div class="card">
          <h3>${opId}</h3>
          ${items}
        </div>
      `;
    }
  }

  // Render portal
  render(`
    <div class="user-header">
      <div>
        <div class="user-label">Signed in as</div>
        <div class="user-email">${data.user?.email || ""}</div>
      </div>
      <button id="logout" class="btn-ghost">Log out</button>
    </div>

    <h3 style="margin: 0 0 16px; font-size: 1rem; opacity: 0.7;">Your Access</h3>
    ${entitlementsHtml}

    <div class="card" style="margin-top: 24px;">
      <h3>Need Help?</h3>
      <p style="margin:0;">Contact your coach directly via WhatsApp or email for support.</p>
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
      <h3>Sign in</h3>
      <p>Get a magic link sent to your email — no password needed.</p>
      <input id="email" type="email" placeholder="you@email.com" />
      <button id="send" class="btn-primary">Send login link</button>
      <div id="err" class="error"></div>
    </div>
  `);

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const btn = document.getElementById("send") as HTMLButtonElement;
  const err = document.getElementById("err") as HTMLElement;

  btn.addEventListener("click", async () => {
    err.textContent = "";
    const email = String(emailInput.value || "").trim();
    if (!email) {
      err.textContent = "Please enter your email.";
      return;
    }
    try {
      btn.disabled = true;
      btn.textContent = "Sending...";
      await sendLink(email);
    } catch (e: any) {
      console.error("[Portal] Send link error:", e);
      err.textContent = e?.message || "Failed to send link.";
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
