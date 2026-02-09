# LTP Engine — Multi-Vertical Static Business Factory

> **Version:** 2.0.0  
> **Last Updated:** February 9, 2026  
> **Status:** Engine-First Architecture ✅ | Astro 5 ✅ | Stripe Checkout ✅ | Webhook ✅ | Firebase Auth ✅ | Portal v2 (SaaS) ✅ | Entitlements ✅ | Gated Content ✅ | Email Delivery ✅ | View Transitions ✅ | Deploy Gate ✅ | Production Ready 🚀

---

## 📋 Changelog

### v2.0.0 (February 2026) — Client Portal System (Post-Purchase SaaS)

#### 🚀 SYSTEM JUMP: From Static Business Factory to Full SaaS Platform

This release introduces **Portal v2** — a complete, operator-scoped, feature-gated client SaaS that replaces the v1 entitlement lobby. The engine is no longer just a landing-page factory. It now includes a post-purchase platform suitable for fitness coaches, consultants, tour operators, educators, and other service businesses.

---

#### Portal v2 Architecture Overview

**Operator-Scoped Routing**

Portal v2 uses a dedicated route namespace: `/portal/{operatorId}/{page}`. Each operator gets a fully isolated portal experience. The lobby at `/portal` handles authentication and resolves the user's operator, then redirects into the scoped space.

**Feature Resolution**

Each operator declares which portal features are enabled via `portal.features[]` in the operator registry. The engine resolves available features at bootstrap time via `resolvePortalFeatures()`. Pages and navigation items that reference disabled features are hidden — no dead links, no broken states.

**Role + Feature Gating**

Every API endpoint uses a server-side guard stack: `requireAuth()` → `requireActor()` → `requireFeature()`. The actor model resolves a Firebase token into a typed identity (uid, email, role, operatorIds). Features are checked against the operator config before any data is returned.

**Dual-Read API Strategy**

Portal v2 APIs for entries and sessions use a dual-read approach: they query the canonical v2 Firestore subcollection first, then fall back to legacy subcollection names (e.g., `checkins` → `entries`, `bookings` → `sessions`). This allows gradual migration without data loss.

**View Transitions**

Portal v2 uses Astro's `ClientRouter` with `fade` transitions for instant-feeling navigation. Every portal page registers an `astro:page-load` listener with a URL guard, ensuring re-initialization fires on both initial load and subsequent navigations. Firestore subscriptions (messaging) are cleaned up via `astro:before-swap`.

**Layout System**

A shared `PortalLayout.astro` provides the chrome: sidebar navigation on desktop (persisted across transitions), bottom tab bar on mobile, and a neutral dark theme not tied to any operator brand. Nine navigation items: Dashboard, Sessions, Programs, Entries, Timeline, Messaging, Goals, Reports, Profile.

---

#### Portal v2 Capability Matrix

| Capability | Description | Status |
|------------|-------------|--------|
| **Dashboard** | Widget-based bento grid, operator-configurable widget set | ✅ Complete |
| **Sessions** | Booking form with availability slots, upcoming/past list, cancel/reschedule | ✅ Complete |
| **Programs** | Entitlements grouped by operator, clickable resource cards | ✅ Complete |
| **Entries** | Metric input form driven by operator config, entry history with categories | ✅ Complete |
| **Timeline** | Canvas chart visualization, range picker (7d–all), stat cards — zero external deps | ✅ Complete |
| **Messaging** | Two-panel realtime messaging via Firestore `onSnapshot`, singleton subscription | ✅ Complete |
| **Goals** | CRUD with templates, progress rings, linked metrics, archive | ✅ Complete |
| **Reports** | Client-deliverable report configurator, section picker, print-to-PDF | ✅ Complete |
| **Profile** | Identity, stats, role badge, timezone, glass-card layout | ✅ Complete |
| **Command Palette** | Cmd+K palette with fuzzy search, keyboard nav, operator-scoped commands | ✅ Complete |
| **Gated Resources** | Auth + entitlement verification, content rendered by action type | ✅ Complete |
| **View Transitions** | Astro ClientRouter, page-load re-init guards on all 9 pages | ✅ Complete |
| **Deploy Gate** | 4-stage pipeline: validate → canary → check → build | ✅ Complete |
| **Admin / Coach UI** | Operator-side dashboard for managing clients | 🔄 Planned |
| **Subscriptions** | Stripe recurring billing + entitlement renewal | 🔄 Planned |
| **Stripe Connect** | Split payouts to operators (platform fee model) | 🔄 Planned |

---

#### Portal v2 API Surface

| Endpoint | Methods | Purpose |
|----------|---------|--------|
| `/api/portal/bootstrap` | GET | Master bootstrap — actor, features, branding, summary counts |
| `/api/portal/claim` | POST | Claim pending entitlements by email |
| `/api/portal/entries` | GET, POST | List + create metric entries |
| `/api/portal/goals` | GET, POST, PATCH | Full CRUD for goals |
| `/api/portal/sessions` | GET, POST | List + book sessions |
| `/api/portal/sessions/[id]` | PATCH | Cancel or reschedule a session |
| `/api/portal/availability` | GET | Bookable time slots |
| `/api/portal/timeline` | GET | Chart-ready timeline data |
| `/api/portal/profile` | GET, POST | Read/update user profile |
| `/api/portal/messages` | GET, POST | List + send messages within a conversation |
| `/api/portal/conversations` | GET, POST, PATCH | List, create (idempotent), mark-as-read |
| `/api/portal/resend` | POST | Resend access email (60s rate limit) |

All endpoints require Firebase auth. Role and feature checks are enforced server-side.

---

#### Portal v2 Type System

Portal v2 introduced dedicated type contracts for each feature domain:

| Type File | Covers |
|-----------|--------|
| `types/portal.ts` | PortalBootstrapV2, PortalFeature, PortalActor, SummaryCounts |
| `types/goals.ts` | GoalDoc, GoalSummary, GoalTemplate, GoalCategory, GoalDirection |
| `types/sessions.ts` | SessionDoc, AvailabilitySlot, ScheduleConfig |
| `types/entries.ts` | EntryDoc, EntryCategory, MetricConfig |
| `types/messaging.ts` | ConversationDoc, MessageDoc, MessageSendRequest |
| `types/timeline.ts` | TimelinePoint, TimelineSeries, TimelineStats |
| `types/reports.ts` | ReportConfig, ReportPeriod, ReportSectionId, ReportData |
| `types/commands.ts` | CommandId, CommandScope, CommandEntry |

These are system-level contracts. Internal schemas (Firestore document shapes, CSS classes) are intentionally not documented here — they change frequently and belong in code comments.

---

#### Business Viability Update

Portal v2 elevates the engine from a static business factory to a **full post-purchase SaaS platform**. The complete loop is now:

```
Discover (SEO landing page)
    → Convert (Stripe checkout)
    → Fulfill (webhook + email)
    → Retain (Portal v2: dashboard, sessions, goals, messaging, reports)
```

This is no longer a landing-page generator with a login screen bolted on. It is a client-retention and service-delivery platform. Operators can run their entire client relationship through the portal.

---

#### Commits (v1.8.0 → v2.0.0)

| Hash | Summary |
|------|---------|
| `6652e7c` | feat: full portal v2 — pages, types, APIs, gate system |
| `ab491ef` | fix: restore polished UI + deep-link support |
| `fd82c17` | fix: wire /portal lobby + redirect /en/portal to v2 |
| `fa8a947` | fix: resolve features from operator config |
| `738030c` | perf: 5x cache TTL + alignment + mobile responsive |
| `b640179` | fix: null-safe DOM + generation guards for view transitions |
| `cdfc478` | fix(i18n): manual routing — stop 404-ing portal routes |
| `16f8321` | fix: messaging 500 + perf + mobile UX |
| `723a902` | fix(mobile): programs card overflow + reports scroll |
| `e74d810` | fix: kill onSnapshot leak, center portal content |
| `47fb57a` | fix: remove eager Firebase import, tighten mobile padding |
| `8327c13` | fix: tighten desktop layout (920px), mobile dashboard |
| `4a2bd58` | fix: reports layout — single-column centered config |
| `4e8eccd` | fix: all 9 portal pages re-init on view-transition navigation |

---

### v1.8.0 (December 27, 2025) — Portal UX Polish (Phase 2.3)

#### 🎨 Premium SaaS Portal Experience

Portal now looks like a polished product, not a prototype:

| Feature | Before | After |
|---------|--------|-------|
| Loading | Plain "Loading..." text | Skeleton cards with shimmer animation |
| Operator Cards | Just operator ID | Logo/avatar, brand name, tagline |
| Status | No indicator | Pills: Active (green), Expired (red) |
| Empty State | Plain text | Icon, title, helpful description |
| User Header | Just email | Avatar with initials, styled layout |
| Sections | No header | "Your Programs & Access" with item count |

**New Files:**
- `src/data/operators/index.ts` — Operator branding registry for portal

**Updated Files:**
- `src/pages/portal.astro` — Premium CSS with skeletons, pills, cards
- `src/lib/portal/portal.client.ts` — Renders operator branding, status pills, empty states
- `src/pages/api/portal/bootstrap.ts` — Now includes `operators` object with branding

**Visual Features:**
```
✨ Skeleton loaders with shimmer animation
🏢 Operator logos (or initial avatar fallback)  
💚 Status pills (Active/Expired)
👤 User avatar with initials
📦 Premium empty state
🔢 Section headers with item counts
📱 Responsive mobile layout
```

---

### v1.7.0 (December 26, 2025) — Resource Contract + Premium Email Pipeline

#### 🚀 MAJOR MILESTONE: Entitlements Now Deliver Actual Content

The payment pipeline is now **complete end-to-end**:

```
Buy → Stripe → Webhook → Entitlement → Email 
    → Portal Login → Click Entitlement → Gated Content Page
```

**Phase 1 & 2 Complete:** Users can now pay, receive a premium email, log in, and access their purchased content.

#### 🎫 Resource Contract v1 (Phase 1)

Defines **what an entitlement delivers** (not just what was bought):

| Action Type | Portal Click Result |
|-------------|---------------------|
| `page` | Navigate to `/portal/r/{operatorId}/{resourceId}` |
| `download` | Navigate to gated page (download button there) |
| `external` | Open external URL in new tab |
| `embed` | Navigate to gated page (embed renders there) |

**New Files:**
- `src/types/resources.ts` — Resource Contract types (`ResourceDefinition`, `ResourceAction`, etc.)
- `src/data/resources/index.ts` — Static registry (`getResourceDefinition()`, `getAllResourcePaths()`)
- `src/data/resources/fitness-demo/index.ts` — Demo operator resources with content

**Architecture:**
```
ResourceDefinition {
  id: "product-foundation"
  label: "Foundation Protocol"
  action: { type: "page" }
  content: { title, hero, sections[], downloads[] }
}
```

#### 🔒 Gated Resource Pages (Phase 1)

New route: `/portal/r/[operatorId]/[resourceId]`

| Feature | Status |
|---------|--------|
| Auth check (Firebase) | ✅ |
| Entitlement verification | ✅ |
| Content rendering by action type | ✅ |
| Access denied for unauthorized | ✅ |

**Files:**
- `src/pages/portal/r/[operatorId]/[resourceId].astro` — Gated route (SSG with client auth)
- `src/lib/portal/resourcePage.client.ts` — Client controller

**Key Pattern:** Server passes resource definition to client via `data-resource` JSON attribute (no client-side server imports).

#### 🔗 Portal → Gated Pages Wiring (Phase 1.5)

Portal entitlement cards are now **clickable links**:

| Before | After |
|--------|-------|
| Static cards showing `resourceId` | Clickable cards with labels, descriptions, arrows |
| No navigation | Click → correct gated page or external URL |

**Changes:**
- `src/pages/api/portal/bootstrap.ts` — Enriches entitlements with `resource.label`, `resource.description`, `resource.action`
- `src/lib/portal/portal.client.ts` — Added `resolveEntitlementHref()`, renders `<a>` cards
- `src/pages/portal.astro` — Added clickable card styles

#### ✅ Branded Checkout Pages (Phase 2.0)

New success/cancel pages replace query-param-on-landing-page pattern:

| URL | Purpose |
|-----|---------|
| `/checkout/success` | Payment confirmed → Check email → Go to Portal |
| `/checkout/cancel` | Reassurance (no charge) → Go Back / Return Home |

**Success Page Includes:**
1. ✅ Animated checkmark
2. Step 1: Check your email
3. Step 2: Sign in to portal
4. Big "Go to Portal" button
5. "Resend access email" button

**Files:**
- `src/pages/checkout/success.astro`
- `src/pages/checkout/cancel.astro`
- `src/pages/api/checkout.ts` — Updated redirect URLs

#### 📧 Premium Email Pipeline (Phase 2.1)

**Shared Email Function:**
- `src/lib/email/sendAccessEmail.ts` — Single source of truth for access emails

**Used By:**
- `/api/stripe/webhook` — Fulfillment after purchase
- `/api/portal/resend` — User-triggered resend

**Email Template Includes:**
```
✓ Your access is ready
    ↓
[Go to Portal →] (big CTA button)
    ↓
What you have access to:
  - Operator Name
    - Resource Label (with description)
    ↓
How to access:
  1. Click "Go to Portal"
  2. Sign in with this email
  3. Click any program to start
```

**Resend Endpoint:**
- `POST /api/portal/resend` — Requires Firebase auth, 60s rate limit
- Success page button wired with loading/success/error states

#### 🐛 Critical Bug Fixes

**Firestore Undefined Value Crash:**
```
Cannot use "undefined" as a Firestore value (found in field "stripe.customerId")
```
- **Cause:** Stripe returns `customer = null` unless explicitly created
- **Fix:** Added `stripUndefined()` helper to remove undefined values before Firestore writes
- **File:** `src/pages/api/stripe/webhook.ts`

**Email CTA Pointing to Wrong Domain:**
```
lovethisplace.co/portal  404
```
- **Cause:** Webhook had hardcoded `SITE_URL || 'lovethisplace.co'`
- **Fix:** Use shared `sendAccessEmail()` with `PUBLIC_PORTAL_URL` env var
- **Fallback default (when env is missing):** `https://ltp-engine.vercel.app/portal` (engine's built-in portal route)

#### 📁 Files Added This Version

| File | Purpose |
|------|---------|
| `src/types/resources.ts` | Resource Contract v1 types |
| `src/data/resources/index.ts` | Resources registry |
| `src/data/resources/fitness-demo/index.ts` | Demo operator resources |
| `src/pages/portal/r/[operatorId]/[resourceId].astro` | Gated resource route |
| `src/lib/portal/resourcePage.client.ts` | Gated page client controller |
| `src/pages/checkout/success.astro` | Branded success page |
| `src/pages/checkout/cancel.astro` | Branded cancel page |
| `src/lib/email/sendAccessEmail.ts` | Shared access email function |
| `src/pages/api/portal/resend.ts` | Resend access email endpoint |

#### 📁 Files Modified This Version

| File | Change |
|------|--------|
| `src/pages/api/portal/bootstrap.ts` | Enriches entitlements with resource info |
| `src/lib/portal/portal.client.ts` | Clickable entitlement cards |
| `src/pages/portal.astro` | Card link styles |
| `src/pages/api/checkout.ts` | Redirect to branded pages |
| `src/pages/api/stripe/webhook.ts` | `stripUndefined()`, shared email, correct portal URL |
| `src/pages/api/webhook.ts` | Uses shared `sendAccessEmail()` |

#### 🌐 Domain Architecture (Recommended)

```
portal.lovethisplace.co  → LTP Engine (portal subdomain)
ltp-engine.vercel.app    → LTP Engine (default/preview)
www.lovethisplace.co     → Main LoveThisPlace site (future)
```

**Env Var (recommended):** `PUBLIC_PORTAL_URL=https://portal.lovethisplace.co`

- For emails, `PUBLIC_PORTAL_URL` is treated as the **base portal URL**. In production, Vercel host rules redirect `https://portal.lovethisplace.co/` → `https://portal.lovethisplace.co/en/portal` (and `/es/portal` for Spanish).
- When `PUBLIC_PORTAL_URL` is not set, the engine falls back to `https://ltp-engine.vercel.app/portal`.

---

### v1.6.0 (December 26, 2025) — Client Portal + Full Payment Pipeline

#### 🚀 PRODUCTION MILESTONE: Complete Money → Access Loop

The LTP Engine now has a **complete end-to-end payment pipeline**:

```
Customer clicks "Buy" → Stripe Checkout → Payment → Webhook (200 OK) 
    → Pending Entitlement → Fulfillment Email → Portal Login 
    → Claim Entitlement → Access Dashboard
```

**This is a viable business.** The entire flow is live and tested in production.

#### 🔐 Firebase Authentication (Client Portal)

| Feature | Status | Notes |
|---------|--------|-------|
| Magic Link (Passwordless) | ✅ Working | No passwords, just email links |
| Email Link Sign-In | ✅ Working | Firebase `signInWithEmailLink` |
| Session Persistence | ✅ Working | Stays logged in across refreshes |
| Authorized Domains | ✅ Configured | `ltp-engine.vercel.app` + Vercel preview URLs |
| Sign Out | ✅ Working | Clears session correctly |

#### 🎫 Entitlements System (Firebase Firestore)

| Feature | Status | Notes |
|---------|--------|-------|
| Pending Entitlements | ✅ Working | Created by webhook for new users |
| Claim on Login | ✅ Working | `POST /api/portal/claim` moves pending → user |
| Bootstrap API | ✅ Working | `GET /api/portal/bootstrap` returns user + entitlements |
| Multi-Operator | ✅ Working | Entitlements grouped by `operatorId` |

**Firestore Structure:**
```
users/{uid}/entitlements/{entId}
pendingEntitlements/{email_operatorId_resourceId}
```

#### 🌐 Client Portal (`/portal` + `/[lang]/portal`)

| Feature | Status | Notes |
|---------|--------|-------|
| Login UI | ✅ Working | Premium card-based design (`/portal` and localized `/en/portal`, `/es/portal`) |
| Email Link Flow | ✅ Working | Magic link round-trips to the **current path** (e.g. `/en/portal`) |
| Entitlements Dashboard | ✅ Working | Shows operator, resource, status, branding, status pills |
| Empty State | ✅ Working | "No active programs" message with premium empty state |
| Error Handling | ✅ Working | Displays API errors gracefully |

#### 🔧 Technical: Astro + Firebase Client Bundling

**Problem Solved:** Browsers cannot resolve bare module specifiers like `"firebase/auth"`. Astro's `<script>` tag bundling is required.

**Solution:**
```
src/lib/firebase/client.client.ts   → Firebase SDK + auth functions (bundled)
src/lib/portal/portal.client.ts     → Portal logic (bundled)
src/pages/portal.astro              → Non-localized portal shell + global CSS
src/pages/[lang]/portal.astro       → Localized portal shell (`/en/portal`, `/es/portal`)
                                      <script>import "../lib/portal/portal.client"</script> via Astro bundling
```

**Build Output:** `portal.astro...js 172.30 kB` — Firebase properly bundled.

#### 💳 Stripe Test/Live Mode Support

| Env Var | Purpose |
|---------|---------|
| `STRIPE_MODE` | `test` or `live` (defaults to live in production) |
| `STRIPE_TEST_SECRET_KEY` | Test mode API key |
| `STRIPE_LIVE_SECRET_KEY` | Live mode API key |
| `STRIPE_TEST_WEBHOOK_SECRET` | Test mode webhook signature |
| `STRIPE_LIVE_WEBHOOK_SECRET` | Live mode webhook signature |

**Logic:** `STRIPE_MODE=test` forces test mode. In production without explicit mode, defaults to live (safe).

#### 📧 Fulfillment Email (Brevo)

Triggered by webhook after successful payment:
- Subject: "Your access is ready"
- Contains portal link
- Sent via Brevo API (`BREVO_API_KEY`)

#### 📁 Files Added/Modified

**New Files:**
- `src/lib/firebase/client.client.ts` — Browser-bundled Firebase SDK
- `src/lib/firebase/admin.ts` — Server-side Firebase Admin SDK
- `src/lib/portal/portal.client.ts` — Portal client logic (auth, claim, bootstrap)
- `src/pages/portal.astro` — Client portal page
- `src/pages/api/portal/claim.ts` — Claims pending entitlements for user
- `src/pages/api/portal/bootstrap.ts` — Returns user data + entitlements
- `src/pages/api/stripe/webhook.ts` — Stripe webhook with idempotency

**Modified Files:**
- `src/pages/api/checkout.ts` — Added GET support, test/live mode, slug param
- `src/components/skins/fitness/components/ProductsFitness.astro` — Fixed checkout URL

#### 🎨 Token-Driven Theming (Zero Hardcoding)
Major architectural fix: All background colors now flow from operator `vibe.tokens` through CSS variables.

**The Problem:**
- Tours skin had hardcoded hex colors (`bg-[#050505]`, `bg-[#0a0a0a]`, `bg-black`)
- This created "template smell" — every tours site would look identical
- CSS variables were being injected but overridden by `global.css` defaults

**The Solution:**
1. **Removed color defaults from `global.css`** — Color tokens are now ONLY injected inline by EngineLayout from operator vibe.tokens
2. **Converted all tours components to semantic classes** — `bg-engine-bg`, `bg-engine-bg-offset`, `bg-engine-bg-surface`
3. **Tailwind config maps semantic classes to CSS variables** — Already existed, now actually works!

**Token Flow:**
```
core.json (DATA)           →  vibe.tokens.bgBase: "#050505"
    ↓
EngineLayout (INJECTION)   →  <style>:root{--color-bg-base:#050505}</style>
    ↓
tailwind.config.cjs (MAP)  →  'engine.bg': 'var(--color-bg-base)'
    ↓
Components (CLASSES)       →  <section class="bg-engine-bg">
```

**Files Changed:**
- `src/styles/global.css` — Removed all `--color-*` defaults from `:root` (they conflicted with inline injection)
- `src/components/skins/tours/components/*.astro` (13 files) — Converted to `bg-engine-*` classes
- `src/data/operators/tours/demo/core.json` — Complete dark token set with `hoverBg`

**Engine Semantic Color Classes:**
| Class | CSS Variable | Purpose |
|-------|-------------|---------|
| `bg-engine-bg` | `--color-bg-base` | Primary page background |
| `bg-engine-bg-offset` | `--color-bg-offset` | Alternating section background |
| `bg-engine-bg-surface` | `--color-bg-surface` | Cards, elevated surfaces |
| `bg-engine-bg-inverse` | `--color-bg-inverse` | Dark sections on light themes |
| `text-engine-text` | `--color-text-primary` | Primary text color |
| `text-engine-text-secondary` | `--color-text-secondary` | Secondary text |
| `text-engine-text-muted` | `--color-text-muted` | Tertiary/muted text |

#### 🔧 Other Fixes
- **FIX:** Jose Espinosa operator now has `contact.whatsapp` for floating WhatsApp button
- **FIX:** Tours demo `core.json` — Added missing `hoverBg` token

### v1.4.0 (December 23, 2025) — Tours/Nightlife Vertical

#### 🎉 New Vertical: Tours (Nightlife)
Complete implementation of the tours/nightlife vertical with 11 custom modules:

| Module | Component | Purpose |
|--------|-----------|---------|
| `hero` | `HeroTours.astro` | Full-bleed hero with animated gradient overlay |
| `trustBar` | `TrustBarTours.astro` | Authority signals (ratings, badges, stats) |
| `vibe` | `VibeTours.astro` | Immersive gallery with vibe keywords |
| `proof` | `ProofTours.astro` | Field notes testimonials + metrics |
| `route` | `RouteTours.astro` | Night route timeline with venue stops |
| `products` | `ProductsTours.astro` | Experience tiers (Standard/VIP/Private) |
| `rules` | `RulesTours.astro` | House rules cards with icons |
| `localIntel` | `LocalIntelTours.astro` | Local guide + partner venues grid |
| `intel` | `IntelTours.astro` | FAQ accordion |
| `conversion` | `ConversionTours.astro` | Final CTA with urgency |
| `footer` | `FooterTours.astro` | Dark footer with social links |

#### 🔧 Engine Enhancements
- **NEW:** 5 module IDs added to `MODULE_DEFINITIONS`: `trustBar`, `vibe`, `route`, `localIntel`, `rules`
- **NEW:** TypeScript contracts in `src/types/tours.ts`:
  - `TrustSignal`, `TrustBarContent` — Trust bar module data
  - `GalleryItem` — Vibe gallery images with captions
  - `RouteStop`, `RouteContent` — Night route timeline
  - `LocalIntelContent` — Local guide + partner venues
  - `RuleCard` — House rules with icons
- **NEW:** Validation enforcement in `scripts/validate-operators.ts`:
  - Tours operators require minimum counts: 3 trust signals, 3 gallery items, 3 route stops, 4 rules
- **NEW:** `WhatsAppFloat.astro` — Engine-wide floating WhatsApp button
  - Uses `--color-accent` automatically per operator
  - Renders on all verticals when `contact.whatsapp` exists
  - Pulse animation, hover effects, mobile-responsive

#### 📝 Demo Data
- **NEW:** `src/data/operators/tours/demo/` — Complete demo operator
  - `core.json` — Brand, contact, vibe tokens, modules
  - `en.json` — English content (trust, gallery, route, rules, localIntel, products, proof)
  - `es.json` — Spanish translation

#### 🎨 Design Fixes
- **FIX:** `ProductsTours.astro` — Solid dark background (`#0a0a0a`) instead of semi-transparent
- **FIX:** `ProofTours.astro` — Centered metrics using flex instead of grid
- **FIX:** `TrustBarTours.astro` — Better contrast with darker bg and larger text
- **FIX:** `FooterTours.astro` — Reduced mobile spacing, cleaned up layout

### v1.3.2 (December 23, 2025)
- **SWITCH:** Email provider from Resend → **Brevo** (already configured for `@lovethisplace.co`)
- **UPDATED:** `/api/webhook` now uses Brevo API for fulfillment emails
- **UPDATED:** Vercel env vars: `BREVO_API_KEY`, `FULFILLMENT_FROM_EMAIL=bookings@lovethisplace.co`
- **REMOVED:** `RESEND_API_KEY` dependency (can delete from Vercel)

### v1.3.1 (December 23, 2025)
- **NEW:** `/api/webhook` — Stripe webhook handler with email fulfillment
- **NEW:** `.env` + `.env.example` — Local development environment template
- **UPDATED:** Vercel env vars documentation (Production vs Preview)
- **FIX:** Webhook signature validation working in production

### v1.3.0 (December 23, 2025)
- **BREAKING:** Upgraded to **Astro 5** + `@astrojs/vercel@9.x`
- **FIX:** Vercel deployment - Node 18 runtime deprecated, now emits `nodejs20.x`
- **UPDATED:** `astro.config.mjs` - `output: 'static'` (Astro 5 supports per-page SSR with static output)
- **UPDATED:** Import path `@astrojs/vercel/serverless` -> `@astrojs/vercel`
- **UPDATED:** API routes now require explicit `export const prerender = false`

#### Migration Notes (Astro 4 -> 5)
| Change | Before | After |
|--------|--------|-------|
| Adapter import | `@astrojs/vercel/serverless` | `@astrojs/vercel` |
| Output mode | `output: 'hybrid'` | `output: 'static'` (with per-route SSR) |
| API routes | Implicit SSR in hybrid | Explicit `prerender = false` required |
| Runtime | `nodejs18.x` (deprecated) | `nodejs20.x` |

> **Key Insight:** Astro 5 `output: 'static'` still supports serverless functions. Routes with `export const prerender = false` become Vercel functions. This is cleaner than `hybrid` because SSR is explicit, not implicit.

### v1.2.0 (December 23, 2025)
- **NEW:** `/api/checkout` — Stripe Checkout Session endpoint (Vercel serverless)
- **NEW:** `buildFaqJsonLd.ts` — Pure function for FAQPage JSON-LD schema
- **NEW:** FAQPage structured data injection in `EngineLayout.astro` (min 3 FAQs required)
- **UPDATED:** `OffersConsultancy.astro` — Full engine-first wiring with `resolveOfferAction()`
- **UPDATED:** `ProductsConsultancy.astro` — Passes operatorId to checkout API
- **FIX:** Suppressed Tailwind JIT verbose logging in dev mode

### v1.1.1 (December 23, 2025)
- **FIX:** checkoutUrl-first pattern — Products can bypass `/api/checkout` with direct URLs
- **FIX:** No hardcoded modal labels — All strings from `operator.ui.labels.products.*`
- **FIX:** Standardized module anchor IDs — `hero`, `fit`, `offers`, `products`, `tools`, `proof`, `intel`, `conversion`, `footer`
- **UPDATED:** `ProductsConsultancy.astro` — Full engine-first CTA wiring with modal
- **UPDATED:** `consultancyDefaults` — Added `detailsLabel`, `modalCta`, `checkoutPending` labels

### v1.1.0 (December 22, 2025)
- **NEW:** `mergeById()` — Merges core + lang arrays by ID
- **NEW:** `resolveProductAction()` — Centralizes CTA behavior (checkout/scroll/details)
- **NEW:** `ProductCore` + `ProductLang` types — Engine-first product contract
- **UPDATED:** `loadOperator()` — Now uses mergeById for products, founders, offers
- **ADDED:** Compatibility layer for legacy JSON format (no breaking changes)
- **DEPLOYED:** Jose Espinosa operator (consultancy vertical)

### v1.0.0 (December 2025)
- Initial engine architecture
- Multi-vertical support (consultancy, fitness, tours)
- Multi-language support (en, es)
- Module variants system
- Static output deployment to Vercel

### Known Gaps (Transparency)

**Completed (v1.x → v2.0)**

| Capability | Status |
|------------|--------|
| Client Portal (v2, 9 pages) | ✅ Complete |
| Firebase Auth (magic link) | ✅ Complete |
| Entitlements (pending → claim → user) | ✅ Complete |
| Payment Pipeline (Stripe → webhook → email → portal) | ✅ Complete |
| Token-driven backgrounds | ✅ Complete |
| Offers + Products engine-first | ✅ Complete |
| Schema.org FAQPage | ✅ Complete |
| Tours vertical (skin + types + validation) | ✅ Complete |
| WhatsApp floating button | ✅ Complete |
| Operator-scoped portal routing | ✅ Complete |
| Command palette (Cmd+K) | ✅ Complete |
| Reports system (configurator + PDF) | ✅ Complete |
| View transitions + page-load guards | ✅ Complete |
| Deploy gate (4-stage pipeline) | ✅ Complete |

**Open Gaps**

| Gap | Status | Notes |
|-----|--------|-------|
| **Stripe Connect** | 🔄 Planned | Direct checkout works; split payouts not yet implemented |
| **Zod runtime validation** | 🔄 Planned | Build-time validation exists via scripts |
| **Fitness skin components** | 🔄 Partial | Uses consultancy skin as fallback |
| **Nightlife vertical skin** | 🔄 Planned | No dedicated components yet |
| **Admin / Coach dashboard** | 🔄 Partial | Client portal exists; operator-side UI not yet built |
| **Subscription billing** | 🔄 Planned | One-time purchases only; Stripe recurring not wired |
| **Firestore security rules** | ⚠️ Needs tuning | Messaging permissions need tightening |
| **Operator registry gaps** | ⚠️ Known | `jose-espinosa` and `medellin-pub-crawl` not in `operators/index.ts` |

---

## 🚀 Business Viability Status

### What's Live and Working (Production)

| Capability | Status | Evidence |
|------------|--------|----------|
| Landing pages (3 verticals) | ✅ Live | `ltp-engine.vercel.app/en/v/fitness/demo` |
| Stripe checkout | ✅ Live | Real test purchases completed |
| Payment webhooks | ✅ Live | 200 OK responses, entitlements created |
| Email fulfillment | ✅ Live | Brevo sends "Your access is ready" |
| Portal v2 (full SaaS) | ✅ Live | `portal.lovethisplace.co` — 9 pages, view transitions |
| Firebase auth | ✅ Live | Magic link sign-in working |
| Entitlements | ✅ Live | Claims work, dashboard shows access |
| Dashboard + Widgets | ✅ Live | Operator-configurable bento grid |
| Session booking | ✅ Live | Availability slots, cancel/reschedule |
| Goal tracking | ✅ Live | CRUD, templates, progress rings |
| Metric entries | ✅ Live | Category-based input, history |
| Timeline charts | ✅ Live | Canvas rendering, zero external deps |
| Messaging | ✅ Live | Realtime via Firestore onSnapshot |
| Reports | ✅ Live | Configurator + browser print-to-PDF |
| Command palette | ✅ Live | Cmd+K, fuzzy search, keyboard nav |
| Deploy gate | ✅ Live | 4-stage: validate → canary → check → build |

### Revenue-Ready Checklist

| Requirement | Status |
|-------------|--------|
| Accept payments | ✅ Stripe Checkout |
| Deliver access | ✅ Entitlements + Portal v2 |
| Customer authentication | ✅ Firebase Magic Link |
| Fulfillment notification | ✅ Brevo Email |
| Post-purchase retention | ✅ Portal v2 (dashboard, goals, sessions, messaging) |
| Multi-operator support | ✅ Data-driven, feature-gated |
| Multi-language | ✅ en/es |

**Bottom Line:** This is no longer just a landing-page factory. It is a complete business platform — acquire, convert, fulfill, and retain — suitable for fitness coaches, consultants, tour operators, and service businesses. You can charge money, deliver access, and manage ongoing client relationships TODAY.

## 🧭 Client Onboarding & Custom Domains

This section describes how to take a new operator live and serve it on a dedicated client domain (while still using a single LTP Engine deployment).

### 1️⃣ Create the operator (site) in the engine

- Add a new operator folder under `src/data/operators/{vertical}/{slug}/` (for example `src/data/operators/fitness/apex-performance/`).
- Create:
  - `core.json` with language-agnostic data (vertical, modules, vibe tokens, products, etc.).
  - `{lang}.json` files for each supported language (at minimum `en.json`; optionally `es.json`).
- Run `npm run validate` to ensure the operator matches the engine contracts.
- Run `npm run dev` and visit `/{lang}/v/{vertical}/{slug}` (for example `/en/v/fitness/apex-performance`) to confirm the page renders correctly.

### 2️⃣ Connect the client's domain in Vercel

- In the `ltp-engine` project on Vercel, add the client's domain (for example `apexperformance.com`).
- Update the client's DNS to point the domain to Vercel (A/CNAME records as instructed by Vercel).

### 3️⃣ Map the domain root to the operator route

- In `vercel.json`, add host-based redirects for the new domain so that its root URL resolves to the operator path inside the engine. Example:

```json
{
  "source": "/",
  "has": [{ "type": "host", "value": "apexperformance.com" }],
  "destination": "/en/v/fitness/apex-performance",
  "permanent": false
}
```

- (Optional but recommended) Add `/en`, `/en/`, `/es`, `/es/` variants for that host, mirroring the pattern used for `portal.lovethisplace.co`.
- Redeploy the project. After deployment:
  - `https://apexperformance.com` → `https://apexperformance.com/en/v/fitness/apex-performance` (via Vercel redirect).

### 4️⃣ Portal behavior for all clients

- The **client portal** remains centralized at `https://portal.lovethisplace.co/en/portal` (with `/es/portal` for Spanish).
- Env var `PUBLIC_PORTAL_URL` should point to the portal subdomain base (recommended: `https://portal.lovethisplace.co`).
- Vercel host rules for `portal.lovethisplace.co` (see `vercel.json`) handle:
  - `/`, `/en`, `/en/`, `/portal` → `/en/portal`
  - `/es`, `/es/` → `/es/portal`
- The portal client script sends Firebase magic links back to **whatever path the user is currently on** (for example `/en/portal`), so:
  - Locally: `http://localhost:4321/en/portal`
  - Production: `https://portal.lovethisplace.co/en/portal`

### 5️⃣ Firebase authorized domains (production)

- In Firebase Authentication → Settings → Authorized domains, ensure the following are present:
  - `localhost`
  - `ltp-engine-dev.firebaseapp.com` / `ltp-engine-dev.web.app` (or your project equivalents)
  - `ltp-engine.vercel.app` (engine default domain)
  - `ltp-engine-git-main-juan-carlos-morales-projects.vercel.app` (preview domain)
  - `portal.lovethisplace.co` (portal subdomain)
- If you attach additional custom domains that should initiate portal flows directly, add them here as well.

### 🎯 Next Steps (Product Decisions)

These are no longer debugging tasks — they're business/product choices.

#### Completed Since v1.8 (Retired from this list)

| Task | Status |
|------|--------|
| Portal UI design | ✅ Portal v2 with 9 pages, glass-card design, view transitions |
| Loading skeletons | ✅ Skeleton shimmer on all pages |
| Error state improvements | ✅ Graceful error + retry states everywhere |
| Entitlement → action mapping | ✅ Clickable resource cards with navigation |
| Operator-specific portal routes | ✅ `/portal/{operatorId}/{page}` |
| Content delivery (gated pages) | ✅ `/portal/r/{operatorId}/{resourceId}` |

#### Immediate (Hardening)

| Task | Priority | Effort |
|------|----------|--------|
| Tighten Firestore security rules | 🔴 High | 1-2 hrs |
| Finish Firestore index creation | 🔴 High | Waiting on Firebase |
| Register real operators in index.ts | 🔴 High | 30 min |
| Deploy another real operator (end-to-end) | 🟡 Medium | 2-4 hrs |
| Email branding (custom domain DKIM) | 🟡 Medium | 1 hr |

#### Short-Term (Features)

| Task | Priority | Effort |
|------|----------|--------|
| Admin / Coach dashboard | 🔴 High | 8-16 hrs |
| *Operator sees their clients, grants entitlements, reviews sessions* |
| Subscription support (Stripe recurring) | 🟡 Medium | 4-8 hrs |
| *Recurring billing + entitlement renewal* |
| Notification system | 🟡 Medium | 4-8 hrs |
| *In-portal + email notifications for session reminders, goal milestones* |

#### Medium-Term (Scale)

| Task | Priority | Effort |
|------|----------|--------|
| Stripe Connect | 🟡 Medium | 8-16 hrs |
| *Multi-operator payouts (platform fee model)* |
| Fitness skin (dedicated components) | 🟡 Medium | 4-8 hrs |
| *Replace consultancy fallback with performance-themed skin* |
| Rate limiting | 🟡 Medium | 2-4 hrs |
| *Protect API endpoints* |
| Analytics | 🟢 Low | 2-4 hrs |
| *Track conversions, portal usage* |

---

## 📍 Purpose Statement

The **LTP Engine** is a **multi-vertical static site factory** that generates high-converting, single-page operator businesses from JSON configuration files. Each site is fully localized, SEO-optimized, and served globally via Vercel CDN.

**Core Philosophy:**  
> "The engine does the thinking. Operators provide the data. Skins provide the look."

---

## 🎯 Design Goals

| Goal | Description |
|------|-------------|
| **Engine-First** | All logic, types, and contracts live in `/lib/engine/`. Components consume what the engine provides. |
| **Data-Driven** | Operators are defined in JSON (`core.json` + `{lang}.json`). No code changes required to add operators. |
| **Multi-Vertical** | Same engine powers consultancy, fitness, tours, nightlife with vertical-specific skins. |
| **Multi-Language** | Full i18n via split JSON: `core.json` (invariant) + `en.json`/`es.json` (translatable). |
| **Zero Hardcoding** | No hardcoded colors, text, or URLs in components. Everything flows from operator data or CSS variables. |
| **Static-First** | Pages are pre-rendered (SSG) and served globally via Vercel CDN. Astro 5 is configured as `output: 'static'` with per-route SSR opt-in via `export const prerender = false`. API routes (`/api/checkout`) are serverless functions. |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LTP ENGINE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│   │   OPERATOR  │ ───▶ │   ENGINE    │ ───▶ │    SKIN     │                │
│   │   (JSON)    │      │   (Logic)   │      │ (Components)│                │
│   └─────────────┘      └─────────────┘      └─────────────┘                │
│         │                    │                     │                        │
│         ▼                    ▼                     ▼                        │
│   ┌──────────────────────────────────────────────────────┐                 │
│   │                   RENDERED PAGE                       │                 │
│   │  /en/v/consultancy/demo → Static HTML + CSS          │                 │
│   └──────────────────────────────────────────────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Operator JSON** → `loadOperator()` → Merged `Operator` object
2. **Operator** → `resolveSkin()` → `SkinConfig` (which components to render)
3. **Operator** → `resolveModules()` → Ordered module list
4. **Operator.vibe** → `applyThemeVars()` → CSS custom properties
5. **Everything** → `ModuleRenderer` → Rendered page

---

## 📜 Engine Contracts (v1)

> **CRITICAL:** These contracts are enforceable. Breaking changes require version bump.

### OperatorContract v1

The minimum viable operator data structure. Any JSON matching this contract will render.

```typescript
// REQUIRED fields - validation fails without these
interface OperatorContractV1 {
  id: string;                    // Unique identifier
  vertical: Vertical;            // Business domain
  contact: { email: string };    // Minimum contact
  vibe: { vibeId: string };      // Theme reference
  modules: ModuleId[];           // Render order
  
  // SEO (required for production)
  seo: {
    title: string;               // Max 60 chars
    description: string;         // Max 160 chars
  };
  
  // Hero (required - above the fold)
  hero: {
    headline: string;
    cta: { primary: string };
  };
  
  // Conversion (required - final CTA)
  conversion: {
    headline: string;
    cta: string;
  };
  
  // Footer (required - legal/contact)
  footer: {};
}
```

### SkinContract v1

Every skin must implement this interface to be registered.

```typescript
interface SkinContractV1 {
  id: string;                    // Unique skin identifier
  name: string;                  // Display name
  vertical: Vertical;            // Which vertical(s) this skin supports
  
  // Must provide component for each module
  components: {
    hero: AstroComponent;
    fitFilter: AstroComponent;
    offers: AstroComponent;
    products: AstroComponent;
    proof: AstroComponent;
    intel: AstroComponent;
    conversion: AstroComponent;
    footer: AstroComponent;
  };
  
  // Skin-level defaults (fallback when operator doesn't specify)
  defaults: {
    labels: Record<ModuleId, Record<string, string>>;
    cta: Record<string, string>;
  };
}
```

### ModuleContract v1

Every module component must accept this interface.

```typescript
interface ModuleContractV1 {
  // Props every module receives
  operator: Operator;            // Full merged operator data
  variant?: string;              // Optional variant override
}
```

### Contract Enforcement

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Build-time** | TypeScript interfaces + validation scripts | ✅ Implemented (`npm run validate`) |
| **Load-time** | Zod schema validation | 🔄 Planned (for runtime safety + clearer errors) |
| **Runtime** | Graceful degradation | ✅ Implemented (components handle missing optional data) |

### Breaking Change Rules

A change requires **v2** if it:
- Removes a required field from any contract
- Changes the type of an existing field
- Changes module render behavior in a non-additive way
- Modifies the fallback chain order

A change is **non-breaking** if it:
- Adds new optional fields
- Adds new modules (operator must opt-in via `modules` array)
- Adds new skins
- Adds new vibe tokens

---

## 📁 Folder Structure

```
engine/
├── src/
│   ├── components/
│   │   ├── engine/                    # Core rendering components
│   │   │   ├── ModuleRenderer.astro   # Renders modules in order
│   │   │   └── modules/               # Default/fallback module implementations
│   │   │       ├── Hero.astro
│   │   │       ├── FitFilter.astro
│   │   │       ├── Offers.astro
│   │   │       ├── Products.astro
│   │   │       ├── Proof.astro
│   │   │       ├── Intel.astro
│   │   │       ├── Conversion.astro
│   │   │       └── Footer.astro
│   │   │
│   │   └── skins/                     # Vertical-specific skins
│   │       └── consultancy/
│   │           ├── skin.ts            # Skin config + defaults
│   │           └── components/        # Consultancy-specific components
│   │               ├── HeroConsultancy.astro
│   │               ├── FitFilterConsultancy.astro
│   │               ├── OffersConsultancy.astro
│   │               ├── ProductsConsultancy.astro
│   │               ├── ProofConsultancy.astro
│   │               ├── IntelConsultancy.astro
│   │               ├── ConversionConsultancy.astro
│   │               └── FooterConsultancy.astro
│   │
│   ├── config/
│   │   ├── engine.ts                  # Engine constants (modules, verticals)
│   │   ├── seo.ts                     # SEO config (languages, URLs)
│   │   └── stripe.ts                  # Stripe integration config
│   │
│   ├── data/
│   │   ├── operators/                 # OPERATOR DATA LIVES HERE
│   │   │   ├── consultancy/
│   │   │   │   └── demo/
│   │   │   │       ├── core.json      # Language-agnostic data
│   │   │   │       ├── en.json        # English content
│   │   │   │       └── es.json        # Spanish content
│   │   │   ├── fitness/
│   │   │   │   └── demo/
│   │   │   └── tours/
│   │   │       └── demo/
│   │   └── ui/                        # Shared UI data (nomenclature, etc.)
│   │
│   ├── layouts/
│   │   └── EngineLayout.astro         # Base HTML layout (vibe tokens injected here)
│   │
│   ├── lib/
│   │   └── engine/                    # 🔥 ENGINE CORE LIBRARY
│   │       ├── index.ts               # Main exports
│   │       ├── loadOperator.ts        # Load & merge operator JSON
│   │       ├── resolveSkin.ts         # Determine skin for operator
│   │       ├── resolveModules.ts      # Determine module order
│   │       └── applyThemeVars.ts      # Generate CSS vars from vibe
│   │
│   ├── pages/
│   │   ├── index.astro                # Root redirect
│   │   ├── 404.astro                  # Error page
│   │   └── [lang]/
│   │       ├── index.astro            # Language index
│   │       └── v/
│   │           └── [vertical]/
│   │               └── [slug].astro   # THE MAIN ROUTE
│   │
│   ├── styles/
│   │   └── global.css                 # Tailwind + CSS variables + base styles
│   │
│   └── types/
│       ├── index.ts                   # Type exports
│       ├── operator.ts                # 🔥 OPERATOR TYPE DEFINITIONS
│       ├── vibe.ts                    # Vibe/theme types
│       ├── modules.ts                 # Module type definitions
│       ├── products.ts                # Product types
│       ├── offers.ts                  # Offer/pricing types
│       ├── proof.ts                   # Testimonial/proof types
│       └── intel.ts                   # FAQ/intel types
│
├── public/
│   └── images/                        # Static assets
│
├── astro.config.mjs                   # Astro configuration
├── tailwind.config.cjs                # Tailwind configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json                       # Dependencies
```

---

## 🔧 Engine Library (`/src/lib/engine/`)

The engine library is the **brain** of the system. All business logic lives here.

### Core Functions

| Function | File | Purpose |
|----------|------|---------|
| `loadOperator()` | `loadOperator.ts` | Loads and merges `core.json` + `{lang}.json` into a full `Operator` object |
| `loadAllOperatorPaths()` | `loadOperator.ts` | Returns all valid paths for `getStaticPaths()` |
| `resolveSkin()` | `resolveSkin.ts` | Determines which skin (component set) to use |
| `resolveModules()` | `resolveModules.ts` | Determines module render order |
| `applyThemeVars()` | `applyThemeVars.ts` | Converts vibe tokens to CSS custom properties |
| `mergeById()` | `mergeById.ts` | Merges core + lang arrays by ID (products, founders, offers) |
| `resolveProductAction()` | `resolveProductAction.ts` | Determines CTA behavior (checkout/scroll/details) |
| `resolveOfferAction()` | `resolveOfferAction.ts` | Determines offer CTA behavior (checkout/scroll/details/contact) |
| `hasStripeIntegration()` | `resolveProductAction.ts` | Checks if product has Stripe config |
| `getStripePriceId()` | `resolveProductAction.ts` | Gets Stripe price ID for checkout |

### Product Action Resolver (Engine-First Commerce)

The engine centralizes CTA behavior. Components don't decide what happens — the engine does.

```typescript
import { resolveProductAction } from '@/lib/engine';

const action = resolveProductAction(product);

// action.type can be:
// - 'checkout' → trigger Stripe checkout with action.productId
// - 'scroll' → scroll to #${action.target} (e.g., intel section)
// - 'details' → open modal/expand for action.productId
```

Products are defined in JSON:
- `core.json`: pricing, currency, delivery, stripe refs, action defaults
- `{lang}.json`: title, tagline, bullets, badge, CTA labels

The `mergeById()` function combines them at load time. A compatibility layer maps legacy JSON formats.

### Usage in Routes

```typescript
// src/pages/[lang]/v/[vertical]/[slug].astro
import { loadOperator, resolveSkin, resolveModules, applyThemeVars } from '@/lib/engine';

const operator = loadOperator(vertical, slug, lang);
const skin = resolveSkin(operator);
const modules = resolveModules(operator);
const { styleString } = applyThemeVars(operator);
```

---

## 📊 Operator Data Structure

### Core + Lang Split

| File | Contains | Example Fields |
|------|----------|----------------|
| `core.json` | Language-agnostic data | `id`, `vertical`, `contact`, `media`, `pricing`, `founders`, `vibe.tokens` |
| `en.json` / `es.json` | Translatable content | `brand.name`, `hero.headline`, `products[].title`, `proof[].quote` |

### Type Hierarchy

```typescript
// Types defined in /src/types/operator.ts

interface OperatorCore {
  id: string;
  vertical: Vertical;              // 'consultancy' | 'fitness' | 'tours' | 'nightlife'
  contact: OperatorContact;
  location: LocationConfig;
  vibe: VibeConfig;                // Contains tokens for CSS vars
  modules: string[];               // Module render order
  media: MediaConfig;
  founders?: FounderCore[];        // Images + socials (language-agnostic)
  pricing: PricingConfig;
  integrations?: IntegrationsConfig;
}

interface OperatorLang {
  lang: SupportedLang;
  brand: BrandConfig;              // name, tagline
  seo: SEOConfig;                  // title, description, ogImage
  hero: HeroContent;               // headline, positioning, CTAs
  fitFilter?: FitFilterContent;
  offers?: OfferLang[];
  products?: ProductLang[];
  proof?: ProofLang[];
  intel?: IntelContent;
  conversion?: ConversionContent;
  footer?: FooterContent;
  founders?: FounderLang[];        // name, title, bio (translatable)
}

// Merged at runtime by loadOperator()
interface Operator extends OperatorCore, OperatorLang {
  founders?: Founder[];            // Core + Lang merged by ID
}
```

---

## 🎨 Vibe Token System

The vibe system controls all visual styling via CSS custom properties.

### Token Flow

```
operator.vibe.tokens (core.json)
        ↓
EngineLayout.astro (injects into <style>)
        ↓
CSS Variables (--color-*, --font-*, etc.)
        ↓
Components use var(--color-accent), var(--color-bg-base), etc.
```

### Token Categories

| Category | Variables | Purpose |
|----------|-----------|---------|
| **Backgrounds** | `--color-bg-base`, `--color-bg-offset`, `--color-bg-surface`, `--color-bg-inverse` | Page and section backgrounds |
| **Text** | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse` | Typography colors |
| **Borders** | `--color-border`, `--color-border-strong` | Dividers and outlines |
| **Accent** | `--color-accent`, `--color-accent-hover` | Brand color, CTAs, highlights |
| **Semantic** | `--color-success`, `--color-error` | Status colors |
| **Typography** | `--font-body`, `--font-display`, `--font-mono` | Font families |

### Example Vibe Configuration

```json
// core.json
{
  "vibe": {
    "vibeId": "consultancy-executive",
    "tokens": {
      "bgBase": "#ffffff",
      "bgOffset": "#f8f8f8",
      "bgInverse": "#0a0a0a",
      "textMain": "#0a0a0a",
      "textMuted": "#8a8a8a",
      "accent": "#1e3a5f",
      "accentHover": "#2d4a6f"
    }
  }
}
```

---

## 📸 Image Specifications (Per Vertical)

All images should be optimized for web delivery. Recommended formats: WebP (primary), JPG (fallback).

### Consultancy Vertical

| Image Type | Location | Aspect Ratio | Recommended Size | Min Width | Notes |
|------------|----------|--------------|------------------|-----------|-------|
| **Founder Avatar** | `core.json` → `founders[].avatar` | 4:5 (portrait) | `800 × 1000 px` | 600px | Professional headshot, used in Hero panel |
| **Hero Background** | `core.json` → `media.heroImage` | 16:9 | `1920 × 1080 px` | 1200px | Subtle texture/grid, Swiss design aesthetic |
| **OG Image** | `core.json` → `media.ogImage` | ~1.91:1 | `1200 × 630 px` | 1200px | Social sharing preview (required) |

**Design Notes:**
- Consultancy uses a clean, minimal aesthetic — images should be high contrast, professional
- Founder avatar is the primary visual element; keep it crisp
- Background images work best as subtle textures (grids, patterns) rather than busy photos

### Tours (Nightlife) Vertical

| Image Type | Location | Aspect Ratio | Recommended Size | Min Width | Notes |
|------------|----------|--------------|------------------|-----------|-------|
| **Hero Image** | `core.json` → `media.heroImage` | 16:9 | `2560 × 1440 px` | 1920px | Full-bleed background with gradient overlay |
| **Gallery Images** | `{lang}.json` → `gallery[].src` | **3:4 (portrait)** | `800 × 1067 px` | 600px | Vibe section grid (3 images required) |
| **Conversion BG** | `{lang}.json` → `conversion.bgImage` | 16:9 | `2560 × 1440 px` | 1920px | Final CTA section background |
| **OG Image** | `core.json` → `media.ogImage` | ~1.91:1 | `1200 × 630 px` | 1200px | Social sharing preview (required) |

**Design Notes:**
- Tours skin uses dark theme with neon accents — high contrast nightlife imagery works best
- Gallery images display with grayscale filter, color on hover — choose vibrant source images
- Hero and Conversion BG get dark overlays — bright/colorful originals recommended

### Image Optimization Checklist

- [ ] All images under 500KB (ideally under 200KB for gallery)
- [ ] WebP format where possible
- [ ] Descriptive alt text in `*Alt` fields
- [ ] OG images include brand name/logo for social recognition
- [ ] Hero images work well with text overlay (avoid busy center areas)

---

## 🧩 Module System

### The 8 Engine Module Primitives

> **Note:** All 8 modules are **engine primitives** (skins must implement them). Individual operators may omit optional modules from their `modules[]` array, but production-grade operators (L3+) must include minimum modules per readiness level.

| # | Module | Purpose | Required Per Operator |
|---|--------|---------|----------------------|
| 1 | `hero` | Above-the-fold identity + primary CTA | ✅ Yes (always) |
| 2 | `fitFilter` | Qualify/disqualify visitors | Optional (recommended) |
| 3 | `offers` | Packages, bundles, promotions | Optional (L3+ recommended) |
| 4 | `products` | Individual products/services | Optional (L3+ recommended) |
| 5 | `proof` | Testimonials, metrics, logos | Optional (L2+ required) |
| 6 | `intel` | FAQ, knowledge base | Optional (L2+ required) |
| 7 | `conversion` | Final CTA zone | ✅ Yes (always) |
| 8 | `footer` | Legal, links, contact | ✅ Yes (always) |

### Module Resolution

```typescript
// operator.modules in core.json defines render order
"modules": ["hero", "fitFilter", "offers", "products", "proof", "intel", "conversion", "footer"]

// resolveModules() validates and returns the final list
const modules = resolveModules(operator);
// → ['hero', 'fitFilter', 'offers', 'products', 'proof', 'intel', 'conversion', 'footer']
```

---

## 🎭 Vertical vs Skin (Critical Distinction)

> **Vertical** = Business domain (consultancy, fitness, tours, nightlife)  
> **Skin** = Visual grammar + module implementations (multiple per vertical allowed)

### Key Rules

| Rule | Description |
|------|-------------|
| **One vertical, many skins** | Each vertical can have multiple registered skins |
| **Skin declares vertical** | Every skin must specify which vertical it belongs to |
| **Operator chooses skin** | Via `operator.vibe.skinId` (or engine resolves default) |
| **Skins are complete** | A skin must implement ALL 8 module components |

### Skin Resolution Order

```
1. operator.vibe.skinId → Look up custom skin
2. Not found? → Use vertical default skin
3. No vertical default? → Fall back to consultancy-canonical
```

### Current Skin Registry

| Vertical | Skin ID | Status |
|----------|---------|--------|
| `consultancy` | `consultancy-canonical` | ✅ Complete |
| `consultancy` | `consultancy-minimal` | 🔄 Planned |
| `fitness` | `fitness-energetic` | 🔄 Pending |
| `tours` | `tours-adventurous` | 🔄 Pending |
| `nightlife` | `nightlife-bold` | 🔄 Pending |

### Adding a New Skin

```typescript
// 1. Create skin folder
/skins/{vertical}/{skinName}/
├── skin.ts
└── components/
    └── Hero{SkinName}.astro
    └── ... (all 8 modules)

// 2. Export skin config in skin.ts
export const mySkin: SkinContractV1 = {
  id: 'consultancy-minimal',
  name: 'Minimal',
  vertical: 'consultancy',
  components: { ... },
  defaults: { ... },
};

// 3. Import in resolveSkin.ts registry
// Skins are registered via static imports in src/lib/engine/resolveSkin.ts
import { mySkin } from '@/components/skins/consultancy/minimal/skin';
const SKIN_REGISTRY = { ...existingSkins, [mySkin.id]: mySkin };
```

---

## 🎭 Skin System (Implementation)

Skins provide vertical-specific visual implementations of modules.

### Skin Structure

```
/skins/{vertical}/
├── skin.ts                    # Skin configuration + defaults
└── components/
    ├── Hero{Vertical}.astro
    ├── FitFilter{Vertical}.astro
    └── ... (one per module)
```

### Skin Config

```typescript
// /skins/consultancy/skin.ts
export const consultancySkin = {
  id: 'consultancy-canonical',
  name: 'Canonical Consultancy',
  vertical: 'consultancy',
  
  defaults: {
    // Skin-level defaults for labels, CTAs, nav
    labels: {
      fitFilter: { section: 'Operator Fit Assessment' },
      offers: { section: 'Entry Points' },
    },
    cta: {
      primary: 'View Systems',
      secondary: 'Free Diagnostic',
    },
  },
  
  components: {
    hero: HeroConsultancy,
    fitFilter: FitFilterConsultancy,
    // ... maps module IDs to components
  },
};
```

### Component Resolution

```
ModuleRenderer receives module list
        ↓
For each module ID, check skin.components[moduleId]
        ↓
If skin has component → use it
Else → use default from /engine/modules/
```

---

## � Authority Layer (SEO + Intel Rules)

> **Engine-enforced quality gates for search visibility and trust.**

### Required SEO Fields (Per Operator)

| Field | Location | Constraint | Enforced |
|-------|----------|------------|----------|
| `seo.title` | `{lang}.json` | Max 60 chars | ✅ Type |
| `seo.description` | `{lang}.json` | Max 160 chars | ✅ Type |
| `canonical` | Auto-generated | `/{lang}/v/{vertical}/{slug}` | ✅ Engine |
| `hreflang` | Auto-generated | All supported languages | ✅ Engine |
| `og:image` | `core.json` or auto | 1200x630 recommended | ⚠️ Warn |

### Intel Requirements (Per Vertical)

| Vertical | Min FAQ Count | Searchable | Schema.org FAQ |
|----------|--------------|------------|----------------|
| `consultancy` | 5 | ✅ Required | ✅ Auto |
| `fitness` | 3 | ✅ Required | ✅ Auto |
| `tours` | 5 | ✅ Required | ✅ Auto |
| `nightlife` | 3 | Optional | ✅ Auto |

### Internal Authority Loop

```
Hero (identity)
    ↓ links to
Offers/Products (value)
    ↓ links to
Proof (trust)
    ↓ links to
Intel/FAQ (education)
    ↓ links to
Conversion (action)
    ↓ backlinks to
Hero (via footer nav)
```

**Rule:** Every CTA must link to an internal anchor. External links only in footer social icons.

### Structured Data (Implemented)

> **Status:** ✅ Complete — FAQPage JSON-LD injected in EngineLayout via `buildFaqJsonLd.ts`

```json
// Injected by EngineLayout when operator has ≥3 FAQs
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{faq.question}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{faq.answer}"
      }
    }
  ]
}
```

**Future:** ProfessionalService schema with priceRange, aggregateRating (requires more operator data).

---

## 🌐 Deployment + URL Canonical Rules

### Environment URL Resolution

| Environment | Base URL | Source |
|-------------|----------|--------|
| Development | `http://localhost:4321` | Hardcoded |
| Preview | `https://{branch}.ltp-engine.vercel.app` | Vercel auto |
| Production | `https://ltp-engine.vercel.app` | `SITE_URL` env var |

### Canonical URL Rules

| Rule | Implementation |
|------|----------------|
| **No trailing slash** | Enforced by Astro config |
| **No www** | DNS redirect to apex |
| **Always HTTPS** | Vercel enforced |
| **Language in path** | `/en/...` not `?lang=en` |
| **Canonical self-reference** | Every page links to itself |

### Hreflang Rules

```html
<!-- Auto-generated for every operator page -->
<link rel="alternate" hreflang="en" href="https://ltp-engine.vercel.app/en/v/consultancy/demo" />
<link rel="alternate" hreflang="es" href="https://ltp-engine.vercel.app/es/v/consultancy/demo" />
<link rel="alternate" hreflang="x-default" href="https://ltp-engine.vercel.app/en/v/consultancy/demo" />
```

### Sitemap Behavior

| Content | Included | Priority |
|---------|----------|----------|
| Operator pages | ✅ Yes | 1.0 |
| Language variants | ✅ Yes | 0.9 |
| Index pages | ✅ Yes | 0.8 |
| 404 | ❌ No | — |

### Robots.txt Rules

```txt
User-agent: *
Allow: /

# Block preview/draft operators
Disallow: /*/v/*/draft-*
Disallow: /*/v/*/test-*

Sitemap: https://ltp-engine.vercel.app/sitemap.xml
```

---

## � Deployment Invariants (Don't Break These)

> **Critical rules that prevent deployment failures. Learned the hard way.**

### Astro 5 + Vercel SSR Rules

| Invariant | Value | Why It Matters |
|-----------|-------|----------------|
| **Astro config** | `output: 'static'` | Pages pre-rendered, SSR opt-in only |
| **SSR opt-in** | `export const prerender = false` | Required for any route needing server-side execution |
| **Applies to** | `/api/*`, webhooks, anything using secrets | These MUST have prerender = false |
| **Runtime** | `nodejs20.x` | Node 18 deprecated by Vercel (Dec 2024) |
| **Adapter** | `@astrojs/vercel` (not `/serverless`) | Astro 5 changed import path |

### Build Output Verification

After `npm run build`, verify these exist:

```
.vercel/output/
├── config.json
├── static/                    # Pre-rendered pages
└── functions/
    └── _render.func/          # Serverless function for SSR routes
        └── .vc-config.json    # Must contain "runtime": "nodejs20.x"
```

### Quick Sanity Check

```bash
# After build, check runtime is correct
cat .vercel/output/functions/_render.func/.vc-config.json
# Should show: "runtime": "nodejs20.x"
```

### If Deployment Fails with "invalid runtime"

1. Check `@astrojs/vercel` version (must be v9.x for Astro 5)
2. Check `.vc-config.json` runtime value
3. Delete `node_modules`, reinstall, rebuild
4. Ensure no old adapter cache in `.astro/` or `node_modules/.astro/`

---

## 💳 Stripe Commerce (Current State)

> **Status:** ✅ Checkout + Webhook Fulfillment Live  
> **Pattern:** checkoutUrl-first + /api/checkout + /api/webhook
> **Email:** Brevo (lovethisplace.co DKIM verified)

### Environment Variables (Vercel)

| Variable | Required | Where to Get |
|----------|----------|--------------|
| `STRIPE_SECRET_KEY` | ✅ | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe Dashboard → Webhooks → Signing secret |
| `BREVO_API_KEY` | ✅ | Brevo → SMTP & API → API keys tab |
| `FULFILLMENT_FROM_EMAIL` | ✅ | Verified sender in Brevo (`bookings@lovethisplace.co`) |
| `FULFILLMENT_BCC_EMAIL` | ❌ | Optional internal ledger copy |

> **⚠️ CRITICAL:** Env vars must be enabled for **Production** environment in Vercel, not just Preview!

### Endpoints

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/checkout` | POST | ✅ Live | Creates Stripe Checkout Session |
| `/api/webhook` | POST | ✅ Live | Handles `checkout.session.completed`, sends email via Brevo |

### Webhook Response Codes

| Response | Meaning |
|----------|---------|
| `200 OK` | Event processed successfully |
| `400 Missing Stripe signature` | Request not from Stripe (no `stripe-signature` header) |
| `400 Invalid signature` | Signature verification failed |
| `500 Stripe not configured` | Missing `STRIPE_SECRET_KEY` env var |
| `500 Email send failed` | Brevo API error (triggers Stripe retry) |

**The economic primitive: Engine takes commission first, passes remainder to operator.**

### Commission Model

```
Customer pays $100
    ↓
Stripe fees: ~$3.20 (3.2%)
    ↓
Engine commission: $5.00 (5% of net)
    ↓
Operator receives: $91.80
```

### Object Model Mapping

| Engine Concept | Stripe Object | Notes |
|----------------|---------------|-------|
| `operator.pricing.tiers[].id` | `Product.id` | One-time or recurring |
| `operator.pricing.tiers[].priceUsd` | `Price.unit_amount` | In cents |
| `operator.offers[].id` | `Product.id` + metadata | Bundle = multiple line items |
| Checkout session | `CheckoutSession` | Engine creates, passes to Stripe |

### Per-Vertical Allowed Objects

| Vertical | Products | Subscriptions | Donations |
|----------|----------|---------------|-----------|
| `consultancy` | ✅ | ✅ | ❌ |
| `fitness` | ✅ | ✅ | ❌ |
| `tours` | ✅ | ❌ | ❌ |
| `nightlife` | ✅ | ❌ | ✅ |

### Checkout Flow (Engine-Controlled)

```
1. User clicks CTA → /api/checkout?priceId=xxx&operatorId=xxx
2. Engine validates operator owns this price
3. Engine creates CheckoutSession with:
   - application_fee_amount (engine commission)
   - transfer_data.destination (operator's connected account)
4. Redirect to Stripe Checkout
5. Webhook confirms → Engine logs transaction
```

### Required Operator Stripe Setup

```json
// core.json
{
  "integrations": {
    "stripeConnectedAccountId": "acct_xxx",  // Operator's Stripe account
    "stripeProductIds": {
      "tier-starter": "prod_xxx",
      "tier-professional": "prod_yyy"
    }
  }
}
```

---

## �🚦 Engine-Grade Standards

### ✅ DO

- Use CSS variables for ALL colors: `var(--color-accent)`, `var(--color-text-primary)`
- Read data from `operator` prop, not hardcoded values
- Use the fallback chain: `operator.ui?.* → skin.defaults.* → engine defaults`
- Keep components dumb—logic lives in engine functions
- Split core/lang data properly (images in core, text in lang)
- Engine defaults live in `src/config/engine.ts` (never in components)

### ❌ DON'T

- Hardcode hex colors: ~~`#1e3a5f`~~ → `var(--color-accent)`
- Hardcode text: ~~`"Contact Us"`~~ → `{operator.hero.ctaPrimary}`
- Put business logic in components
- Mix language-specific data into core.json
- Use `text-black` or `text-white` without semantic meaning
- Use component-level hardcoded fallbacks (use engine defaults instead)

### Color Usage Guide

| Context | Use |
|---------|-----|
| Text on light background | `text-[var(--color-text-primary)]` or `text-[var(--color-text-secondary)]` |
| Text on dark background | `text-[var(--color-text-inverse)]` or `text-white` (only on known dark surfaces) |
| Accent/brand color | `text-[var(--color-accent)]` or `bg-[var(--color-accent)]` |
| Backgrounds | `bg-[var(--color-bg-base)]`, `bg-[var(--color-bg-offset)]`, `bg-[var(--color-bg-inverse)]` |
| Borders | `border-[var(--color-border)]` |

### Fallback Chain (Authoritative)

```
┌─────────────────────────────────────────────────────────────┐
│                     FALLBACK CHAIN                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. operator.ui?.labels?.hero         (Operator override)  │
│              ↓ not found?                                   │
│   2. skin.defaults.labels.hero         (Skin default)       │
│              ↓ not found?                                   │
│   3. ENGINE_DEFAULTS.labels.hero       (Engine default)     │
│              ↓ not found?                                   │
│   4. FAIL (missing required field)     (Contract violation) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI Defaults Source of Truth

| Level | Location | Purpose |
|-------|----------|---------|
| **Engine Defaults** | `src/config/engine.ts` | Universal constants (verticals, module IDs) |
| **Skin Defaults** | `src/components/skins/{vertical}/skin.ts` | Vertical-specific labels, CTAs, nomenclature |
| **Operator Overrides** | `operator.ui.*` in JSON | Per-operator customization |

**The canonical editing locations:**
- To change consultancy labels → edit `src/components/skins/consultancy/skin.ts` → `consultancyDefaults`
- To add a new label → add to skin defaults first, then components can consume it
- Future: `src/data/ui/common.{lang}.json` for cross-vertical shared UI strings

**Location of defaults:**
- Engine defaults: `src/config/engine.ts`
- Skin defaults: `src/components/skins/{vertical}/skin.ts`
- Operator overrides: `operator.ui.*` in JSON

---

## � Operator Readiness Levels

> **Quality gates for scaling across hundreds of operators.**

| Level | Name | Requirements | Can Deploy? |
|-------|------|--------------|-------------|
| **L0** | Skeleton | Valid JSON, renders without errors | Dev only |
| **L1** | SEO-Ready | `seo.title`, `seo.description`, `og:image` present | Staging |
| **L2** | Trust-Ready | `proof[]` has ≥1 item, `intel.faq[]` has ≥3 items | Staging |
| **L3** | Commerce-Ready | `products[]` or `offers[]` present, Stripe mapping valid | Production |
| **L4** | Analytics-Ready | GA/GTM IDs configured, conversion events defined | Production |
| **L5** | Authority-Ready | ≥5 FAQs, proof includes hard metrics, internal links complete | Production (Featured) |

### Level Validation (Planned)

```typescript
// Future: loadOperator() returns level
const { operator, level, warnings } = loadOperator(vertical, slug, lang);

if (level < 3 && process.env.NODE_ENV === 'production') {
  throw new Error(`Operator ${slug} not commerce-ready (L${level})`);
}
```

---

## 🎯 Non-Negotiable UX Primitives

> **Every page must satisfy these constraints. No exceptions.**

### Above-the-Fold Requirements

| Element | Required | Constraint |
|---------|----------|------------|
| **Identity** | ✅ | Brand name or logo visible |
| **Credibility** | ✅ | At least ONE of: metric, credential, logo strip |
| **Primary CTA** | ✅ | Visible without scrolling (mobile + desktop) |
| **Value prop** | ✅ | Headline communicates transformation |

### Scroll Position Rules

| Module | Scroll Position | Rationale |
|--------|-----------------|-----------|
| `hero` | 0-15% | Identity + hook |
| `fitFilter` | 15-25% | Qualify before selling |
| `offers/products` | 25-60% | Value presentation |
| `proof` | 60-75% | Trust before commitment |
| `intel` | 75-85% | Answer objections |
| `conversion` | 85-100% | Final CTA in last 15% |
| `footer` | 100% | Legal + nav |

### Proof Module Minimums

At least ONE of:
- Hard metric (number + label, e.g., "127+ systems installed")
- Logo strip (≥3 recognizable logos)
- Testimonial with schema.org markup
- Video testimonial embed

### Intel Module Minimums

- ≥3 FAQs (≥5 for SEO-focused operators)
- Searchable/filterable interface
- Schema.org FAQPage markup (auto-generated)

### Mobile-First Constraints

| Constraint | Value |
|------------|-------|
| Touch target minimum | 44×44px |
| Font size minimum | 16px body, 14px captions |
| CTA button width | ≥80% container on mobile |
| Section spacing | 24px minimum (gap: 1.5rem) |

---

## �🔄 Adding a New Operator

### 1. Create Folder Structure

```
/data/operators/{vertical}/{slug}/
├── core.json
├── en.json
└── es.json
```

### 2. Populate core.json

```json
{
  "id": "my-operator",
  "vertical": "consultancy",
  "contact": { "email": "hello@example.com" },
  "vibe": {
    "vibeId": "consultancy-executive",
    "tokens": { /* color overrides */ }
  },
  "modules": ["hero", "fitFilter", "offers", "products", "proof", "intel", "conversion", "footer"],
  "media": { "heroImage": "/images/..." },
  "pricing": { "currency": "USD", "tiers": [] }
}
```

### 3. Populate en.json / es.json

```json
{
  "lang": "en",
  "brand": { "name": "My Business" },
  "seo": { "title": "My Business | LTP Engine", "description": "..." },
  "hero": { "headline": "Build", "headlineAccent": "Systems That Scale" },
  "products": [],
  "proof": [],
  "intel": { "faqs": [] }
}
```

### 4. Access

```
http://localhost:4321/en/v/consultancy/my-operator
http://localhost:4321/es/v/consultancy/my-operator
```

No code changes required. The engine discovers operators via `import.meta.glob()`.

---

## 🚀 Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

---

## �️ Deploy Gate

> **The single rule: nothing deploys without `npm run gate` passing.**

The gate is a four-stage sequential pipeline that must exit 0 before code is considered deploy-ready. It catches the classes of error that each individual tool misses on its own.

### Pipeline Stages

```
npm run gate
  │
  ├─ 1. validate   — Operator JSON structure (core.json + lang files)
  ├─ 2. canary     — Runtime env vars, portal feature unions, config shapes
  ├─ 3. astro check — TypeScript + Astro component diagnostics (0 errors)
  └─ 4. astro build — Full static build + SSR function bundle
```

### Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `npm run gate` | Full pipeline, permissive canary | Local development — warns on missing env but won't fail |
| `npm run gate:strict` | Full pipeline, strict canary | CI / pre-deploy — fails on missing required env vars |
| `npm run canary` | Canary checks only | Quick env + portal validation |
| `npm run canary:selftest` | Canary regression test | After modifying canary logic |
| `npm run validate` | Operator JSON validation only | After editing operator data |

### Canary Modes

The canary (`scripts/validate-canary.ts`) runs in two modes:

| Mode | Trigger | Missing required env var | Missing optional env var |
|------|---------|--------------------------|--------------------------|
| **Permissive** (default) | Local dev, no flags | ⚠ Warning | ⚠ Warning |
| **Strict** | `CI=true` OR `CANARY_STRICT=1` | ❌ Fatal (exit 1) | ⚠ Warning |

**Strict mode activates when:**
- `process.env.CI === 'true'` (set automatically by most CI providers)
- `process.env.CANARY_STRICT === '1'` (set manually or via `npm run gate:strict`)

### Environment Variable Resolution

The canary checks **two sources** for each variable:
1. **`.env` file** — parsed from disk (the local developer's file)
2. **`process.env`** — the runtime environment (Vercel injects vars here)

A variable is considered "present" if it has a non-empty value in **either** source.

### Required Environment Variables

**Server-side (SSR/API routes):**
| Variable | Purpose |
|----------|---------|
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |

**Client-side (public, baked into static output):**
| Variable | Purpose |
|----------|---------|
| `PUBLIC_FIREBASE_API_KEY` | Firebase Client SDK |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client SDK |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase Client SDK |

**Optional (warn-only in both modes):**
| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook validation |
| `BREVO_API_KEY` | Transactional email |
| `FULFILLMENT_FROM_EMAIL` | Email sender address |

### Portal Feature Validation

The canary validates that every operator's `portal.features[]` array contains only values from the `PortalFeature` union type. This catches typos and stale feature names at gate time instead of at runtime.

### Smoke URLs

After validation, the canary prints a smoke URL list for every portal-enabled operator:

```
📋 Smoke URLs (portal-enabled operators):
   → /portal/fitness-demo/dashboard
   → /portal/tours-jose/dashboard
```

Use these for manual post-deploy verification.

### Vercel Configuration

In your Vercel project settings, ensure:

1. **Environment Variables** — All required vars set for **Production** and **Preview** environments
2. **Build Command** — `npm run gate:strict` (replaces the default `npm run build`)
3. This ensures every Vercel build runs the full gate with strict canary checks

> **⚠️ CRITICAL:** Setting the Vercel build command to `npm run gate:strict` is the enforcement mechanism. Without it, the gate is advisory-only.

### Canary Self-Test

`npm run canary:selftest` is a regression test for the canary itself. It:

1. Runs canary in **permissive** mode → asserts exit 0
2. Runs canary in **strict** mode → asserts exit 0 (current repo has all vars)
3. Masks required env vars + runs **strict** → asserts exit 1 (must fail)
4. Masks required env vars + runs **permissive** → asserts exit 0 (must pass)

Run this after modifying `validate-canary.ts` to ensure you haven't accidentally loosened or broken the checks.

### Baseline

As of the latest gate run:
- `astro check`: **0 errors, 0 warnings** (hints are informational, not gated)
- `astro build`: **Complete** (all static pages + SSR function)
- `validate`: **All operators pass** (5/5)
- `canary`: **All checks pass** in both modes

---

## �🗺️ Roadmap & Next Steps

### ✅ Completed (v1.3.2)
| Task | Description | Status |
|------|-------------|--------|
| Wire Product CTAs | Products components use `resolveProductAction()` | ✅ Done |
| Wire Offer CTAs | Offers components use `resolveOfferAction()` | ✅ Done |
| `/api/checkout` | Stripe Checkout Session endpoint (Vercel serverless) | ✅ Done |
| `/api/webhook` | Stripe webhook handler with Brevo email fulfillment | ✅ Done |
| FAQPage JSON-LD | `buildFaqJsonLd.ts` + EngineLayout injection | ✅ Done |
| checkoutUrl-first | Products/Offers can bypass API with direct checkout URLs | ✅ Done |
| No hardcoded labels | Modal strings from `operator.ui.labels` | ✅ Done |
| Module anchor IDs | All modules have standardized `id` attributes | ✅ Done |
| Astro 5 Migration | Upgraded to Astro 5 + @astrojs/vercel@9.x (nodejs20.x) | ✅ Done |
| Vercel Env Vars | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY configured | ✅ Done |
| Webhook Validation | Production endpoint validates Stripe signatures correctly | ✅ Done |
| FULFILLMENT_FROM_EMAIL | `bookings@lovethisplace.co` configured in Vercel | ✅ Done |

### 🔴 Immediate (Next Steps)
| Task | Description | Priority |
|------|-------------|----------|
| End-to-End Test | Complete checkout → webhook → email flow in production | 🔴 High |
| Stripe Price IDs | Add real `stripe.priceId` to Jose's products in Stripe Dashboard | 🔴 High |
| Fulfillment Email Template | Design proper email HTML with download links | 🟡 Medium |

### 🟡 Short-Term (This Week)
| Task | Description | Priority |
|------|-------------|----------|
| Success/Cancel Pages | Create branded post-checkout pages | 🟡 Medium |
| Operator Email Lookup | Add `getOperatorContactEmail(operatorId)` to webhook | 🟡 Medium |
| More Operators | Create 2-3 more operators to stress-test engine | 🟡 Medium |
| ProfessionalService Schema | Add Organization/ProfessionalService JSON-LD | 🟢 Low |

### 🟢 Future (Backlog)
| Task | Description | Priority |
|------|-------------|----------|
| Stripe Connect | Split payouts to operators (acct_xxx) | 🟢 Low |
| JSON Migration | Move product prices to core.json (compat layer handles for now) | 🟢 Low |
| Firestore | Add if gated downloads/customer portal needed | 🟢 Low |
| Admin Dashboard | Operator management UI | 🟢 Low |

---

## �📐 Route Pattern

```
/{lang}/v/{vertical}/{slug}

Examples:
/en/v/consultancy/demo     → English consultancy demo
/es/v/consultancy/demo     → Spanish consultancy demo
/en/v/fitness/demo         → English fitness demo
/en/v/tours/demo           → English tours demo
```

### Static Path Generation

```typescript
// [slug].astro
export const getStaticPaths = async () => {
  const allPaths = loadAllOperatorPaths();
  // Returns [{ params: { lang, vertical, slug }, props: { operator } }, ...]
};
```

---

## ✅ Engine Compliance Checklist

Before committing any component changes, verify:

- [ ] No hardcoded hex colors (use `var(--color-*)`)
- [ ] No hardcoded text (use operator data or skin defaults)
- [ ] Component reads from `operator` prop
- [ ] Fallback chain: `operator.ui?.* → skin.defaults.* → engine defaults`
- [ ] Engine defaults live in `src/config/engine.ts`, not component literals
- [ ] Images reference URLs from `operator.media` or `operator.founders[].avatar`
- [ ] CSS classes use semantic tokens, not raw Tailwind colors
- [ ] Component works without optional data (graceful degradation)

---

## 🔮 Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ Phase 1 | Consultancy vertical | Complete |
| ✅ Phase 2 | Tours / Nightlife vertical | Complete |
| ✅ Phase 3 | Stripe checkout + webhook + email fulfillment | Complete |
| ✅ Phase 4 | Client Portal v1 (entitlement lobby) | Complete → Superseded by v2 |
| ✅ Phase 5 | Portal v2 — full SaaS (9 pages, 12 APIs) | Complete |
| ✅ Phase 6 | Deploy gate pipeline | Complete |
| ✅ Phase 7 | View transitions + navigation re-init | Complete |
| 🔄 Phase 8 | Fitness vertical skin (dedicated) | Partial — using consultancy fallback |
| 🔄 Phase 9 | Admin / Coach dashboard | Planned |
| 🔄 Phase 10 | Stripe Connect (split payouts) | Planned |
| 🔄 Phase 11 | Subscription billing | Planned |
| 🔄 Phase 12 | Analytics dashboard | Planned |

---

## 📚 Key Files Reference

**Engine Core**

| File | Purpose |
|------|--------|
| `src/lib/engine/index.ts` | Engine exports |
| `src/lib/engine/loadOperator.ts` | JSON loading & merging |
| `src/types/operator.ts` | Core type definitions |
| `src/layouts/EngineLayout.astro` | HTML layout + vibe injection |
| `src/components/engine/ModuleRenderer.astro` | Module rendering |
| `src/styles/global.css` | Base styles + CSS vars |
| `src/config/engine.ts` | Constants (verticals, modules) |
| `src/components/skins/consultancy/skin.ts` | Consultancy skin config |

**Portal v2**

| File | Purpose |
|------|--------|
| `src/layouts/PortalLayout.astro` | Portal chrome — sidebar, tab bar, view transitions |
| `src/styles/portal-system.css` | Shared portal component classes |
| `src/lib/portal/portalAuth.client.ts` | Auth module — magic link, bootstrap, caching |
| `src/lib/portal/guards.ts` | Server-side guard stack (requireAuth, requireActor, requireFeature) |
| `src/lib/portal/resolveActor.ts` | Firebase token → PortalActor resolution |
| `src/lib/portal/dashboardWidgets.ts` | Widget registry for operator-configurable dashboard |
| `src/lib/portal/commandPalette.client.ts` | Cmd+K palette UI |
| `src/lib/portal/messaging.client.ts` | Firestore onSnapshot realtime messaging |
| `src/data/operators/index.ts` | Operator branding + portal config registry |
| `src/types/portal.ts` | PortalBootstrapV2, PortalFeature, PortalActor |

---

## ⚠️ Legacy: Portal v1 (Deprecated)

The original entitlement-based portal (single-page lobby at `/portal` rendering entitlement cards into `#portal-root`) has been fully superseded by Portal v2. Legacy files are retained only for reference:

- `src/lib/portal/portal.client.ts` — v1 client logic (still used by the lobby auth flow, but all post-login rendering is v2)
- `temp_portal.txt` — archived v1 code snapshot (safe to delete)

All new portal work targets the v2 operator-scoped architecture.

---

## 🤝 Contributing

1. **Read this document** before making any changes
2. **Verify engine compliance** using the checklist above
3. **Test across languages** (en + es)
4. **Test with demo operator** before creating new operators
5. **Keep components dumb**—business logic goes in `/lib/engine/`
6. **Portal pages must use `astro:page-load`** — bare module-level boot calls will break view transitions

---

*This document is the source of truth for the LTP Engine architecture. Update it when making architectural changes.*


