/**
 * Resource Page Client Controller
 * 
 * ENGINE CONTRACT:
 * - Resource definition passed from server via data attribute (NOT imported)
 * - Handles auth check via Firebase client
 * - Verifies entitlement via /api/portal/bootstrap
 * - Renders resource content based on action type
 * 
 * CRITICAL: This file cannot import from @/data/resources
 * because client bundles can't resolve server-side Node modules.
 */

import {
  auth,
  onAuthStateChanged,
} from "../firebase/client.client";

import type { ResourceDefinition, ResourceSection } from "@/types/resources";

// ============================================================
// TYPES
// ============================================================

interface BootstrapResponse {
  user: { uid: string; email?: string | null };
  entitlements: Array<{
    id: string;
    operatorId: string;
    resourceId: string;
    status: string;
    type: string;
    [key: string]: unknown;
  }>;
}

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderDenied(root: HTMLElement, message: string): void {
  root.innerHTML = `
    <div class="card">
      <h1 class="error">Access Denied</h1>
      <p class="muted">${escapeHtml(message)}</p>
      <p class="muted">If you believe this is a mistake, please contact support.</p>
      <div style="margin-top: 24px;">
        <a class="btn" href="/portal">Return to Portal</a>
      </div>
    </div>
  `;
}

function renderError(root: HTMLElement, error: string): void {
  root.innerHTML = `
    <div class="card">
      <h1 class="error">Error</h1>
      <p class="muted">${escapeHtml(error)}</p>
      <div style="margin-top: 24px;">
        <a class="btn" href="/portal">Return to Portal</a>
      </div>
    </div>
  `;
}

function renderSection(section: ResourceSection): string {
  const title = section.title ? `<h3>${escapeHtml(section.title)}</h3>` : "";
  
  switch (section.type) {
    case "markdown":
      // Simple markdown-ish rendering (paragraphs, lists)
      // For full markdown, you'd use a library
      return `
        ${title}
        <div class="section-content">${escapeHtml(section.content)}</div>
      `;
    
    case "video":
      return `
        ${title}
        <div class="video-wrapper">
          <iframe 
            src="${escapeHtml(section.content)}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      `;
    
    case "checklist":
      // content is JSON array
      try {
        const items = JSON.parse(section.content) as string[];
        const listHtml = items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
        return `${title}<ul>${listHtml}</ul>`;
      } catch {
        return `${title}<p class="muted">Invalid checklist data</p>`;
      }
    
    case "callout":
      return `
        ${title}
        <div class="card" style="background: rgba(255,255,255,0.05); border-left: 4px solid #fafafa;">
          <p style="margin: 0;">${escapeHtml(section.content)}</p>
        </div>
      `;
    
    default:
      return `${title}<p class="muted">${escapeHtml(section.content)}</p>`;
  }
}

function renderPageContent(root: HTMLElement, resource: ResourceDefinition): void {
  const content = resource.content;
  
  if (!content) {
    root.innerHTML = `
      <div class="card">
        <h1>${escapeHtml(resource.label)}</h1>
        ${resource.description ? `<p class="muted">${escapeHtml(resource.description)}</p>` : ""}
        <p class="muted" style="margin-top: 24px;">This resource page is ready but has no content defined yet.</p>
      </div>
    `;
    return;
  }
  
  // Hero section
  let heroHtml = "";
  if (content.hero) {
    heroHtml = `
      <div style="margin-bottom: 32px;">
        <h1>${escapeHtml(content.hero.headline)}</h1>
        ${content.hero.subheadline ? `<p class="muted" style="font-size: 1.1rem;">${escapeHtml(content.hero.subheadline)}</p>` : ""}
      </div>
    `;
  } else {
    heroHtml = `<h1 style="margin-bottom: 24px;">${escapeHtml(content.title)}</h1>`;
  }
  
  // Sections
  const sectionsHtml = content.sections.map(renderSection).join("");
  
  // Downloads
  let downloadsHtml = "";
  if (content.downloads && content.downloads.length > 0) {
    const items = content.downloads.map(dl => `
      <div class="download-item">
        <span class="download-item-label">${escapeHtml(dl.label)}</span>
        <button class="btn" type="button" data-download-key="${escapeHtml(dl.fileKey)}">
          Download
        </button>
      </div>
    `).join("");
    
    downloadsHtml = `
      <div style="margin-top: 32px;">
        <h3>Downloads</h3>
        ${items}
      </div>
    `;
  }
  
  root.innerHTML = `
    <div class="card">
      ${heroHtml}
      ${sectionsHtml}
      ${downloadsHtml}
    </div>
  `;
  
  // Wire download buttons (placeholder for Phase 2)
  root.querySelectorAll<HTMLButtonElement>("button[data-download-key]").forEach(btn => {
    btn.addEventListener("click", () => {
      const fileKey = btn.dataset.downloadKey;
      alert(`Download endpoint not yet implemented.\nFile: ${fileKey}\n\nThis will be wired in Phase 2.`);
    });
  });
}

function renderExternal(root: HTMLElement, resource: ResourceDefinition): void {
  if (resource.action.type !== "external") return;
  
  root.innerHTML = `
    <div class="card">
      <h1>${escapeHtml(resource.label)}</h1>
      ${resource.description ? `<p class="muted">${escapeHtml(resource.description)}</p>` : ""}
      <div style="margin-top: 24px;">
        <a class="btn btn-primary" href="${escapeHtml(resource.action.href)}" target="_blank" rel="noopener noreferrer">
          Open Resource →
        </a>
      </div>
    </div>
  `;
}

function renderEmbed(root: HTMLElement, resource: ResourceDefinition): void {
  if (resource.action.type !== "embed") return;
  
  root.innerHTML = `
    <div class="card">
      <h1>${escapeHtml(resource.label)}</h1>
      ${resource.description ? `<p class="muted">${escapeHtml(resource.description)}</p>` : ""}
      <div class="video-wrapper" style="margin-top: 24px;">
        <iframe 
          src="${escapeHtml(resource.action.embedUrl)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;
}

function renderDownload(root: HTMLElement, resource: ResourceDefinition): void {
  if (resource.action.type !== "download") return;
  
  root.innerHTML = `
    <div class="card">
      <h1>${escapeHtml(resource.label)}</h1>
      ${resource.description ? `<p class="muted">${escapeHtml(resource.description)}</p>` : ""}
      <div style="margin-top: 24px;">
        <button class="btn btn-primary" type="button" data-download-key="${escapeHtml(resource.action.fileKey)}">
          Download File
        </button>
      </div>
    </div>
  `;
  
  const btn = root.querySelector<HTMLButtonElement>("button[data-download-key]");
  if (btn) {
    btn.addEventListener("click", () => {
      const fileKey = btn.dataset.downloadKey;
      alert(`Download endpoint not yet implemented.\nFile: ${fileKey}\n\nThis will be wired in Phase 2.`);
    });
  }
}

function renderResource(root: HTMLElement, resource: ResourceDefinition): void {
  switch (resource.action.type) {
    case "page":
      renderPageContent(root, resource);
      break;
    case "external":
      renderExternal(root, resource);
      break;
    case "embed":
      renderEmbed(root, resource);
      break;
    case "download":
      renderDownload(root, resource);
      break;
    default:
      root.innerHTML = `
        <div class="card">
          <h1>${escapeHtml(resource.label)}</h1>
          <p class="muted">Unknown resource action type.</p>
        </div>
      `;
  }
}

// ============================================================
// BOOTSTRAP API
// ============================================================

async function fetchBootstrap(idToken: string): Promise<BootstrapResponse> {
  const res = await fetch("/api/portal/bootstrap", {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bootstrap failed (${res.status}): ${text || res.statusText}`);
  }
  
  return res.json();
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const root = document.getElementById("resource-root");
  if (!root) {
    console.error("[ResourcePage] Missing #resource-root");
    return;
  }
  
  const operatorId = root.dataset.operatorId;
  const resourceId = root.dataset.resourceId;
  const resourceJson = root.dataset.resource;
  
  if (!operatorId || !resourceId || !resourceJson) {
    renderError(root, "Missing resource data. Please return to the portal.");
    return;
  }
  
  // Parse resource from server-provided JSON
  let resource: ResourceDefinition;
  try {
    resource = JSON.parse(resourceJson);
  } catch (e) {
    renderError(root, "Invalid resource data.");
    return;
  }
  
  console.log("[ResourcePage] Loaded resource:", resource.id);
  
  // Auth gate
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in → redirect to portal
      console.log("[ResourcePage] Not authenticated, redirecting to /portal");
      window.location.href = "/portal";
      return;
    }
    
    try {
      // Fetch entitlements
      const token = await user.getIdToken();
      const bootstrap = await fetchBootstrap(token);
      
      console.log("[ResourcePage] Bootstrap received, checking entitlement");
      
      // Check if user has entitlement for this resource
      const hasAccess = bootstrap.entitlements.some(
        ent => ent.operatorId === operatorId && ent.resourceId === resourceId && ent.status === "active"
      );
      
      if (!hasAccess) {
        console.log("[ResourcePage] No active entitlement found");
        renderDenied(root, "You do not have an active entitlement for this resource.");
        return;
      }
      
      console.log("[ResourcePage] Access verified, rendering resource");
      renderResource(root, resource);
      
    } catch (err: any) {
      console.error("[ResourcePage] Error:", err);
      renderError(root, err?.message || "Failed to verify access.");
    }
  });
}

// Boot
main().catch(err => {
  console.error("[ResourcePage] Fatal error:", err);
  const root = document.getElementById("resource-root");
  if (root) {
    renderError(root, err?.message || "An unexpected error occurred.");
  }
});
