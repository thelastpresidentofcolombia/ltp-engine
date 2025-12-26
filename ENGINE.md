# LTP Engine — Multi-Vertical Static Business Factory

> **Version:** 1.6.0  
> **Last Updated:** December 26, 2025  
> **Status:** Engine-First Architecture ✅ | Astro 5 ✅ | Stripe Checkout ✅ | Webhook ✅ | Firebase Auth ✅ | Client Portal ✅ | Entitlements ✅ | Production Ready 🚀

---

## 📋 Changelog

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

#### 🌐 Client Portal (`/portal`)

| Feature | Status | Notes |
|---------|--------|-------|
| Login UI | ✅ Working | Clean card-based design |
| Email Link Flow | ✅ Working | "Check your email" → click → signed in |
| Entitlements Dashboard | ✅ Working | Shows operator, resource, status |
| Empty State | ✅ Working | "No active programs" message |
| Error Handling | ✅ Working | Displays API errors gracefully |

#### 🔧 Technical: Astro + Firebase Client Bundling

**Problem Solved:** Browsers cannot resolve bare module specifiers like `"firebase/auth"`. Astro's `<script>` tag bundling is required.

**Solution:**
```
src/lib/firebase/client.client.ts  → Firebase SDK + auth functions (bundled)
src/lib/portal/portal.client.ts    → Portal logic (bundled)
src/pages/portal.astro             → <script>import "../lib/portal/portal.client"</script>
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

| Gap | Status | Notes |
|-----|--------|-------|
| **Client Portal** | ✅ Complete | `/portal` with Firebase Auth + entitlements dashboard |
| **Firebase Auth** | ✅ Complete | Magic link sign-in, session persistence, authorized domains |
| **Entitlements System** | ✅ Complete | Pending → claim → user flow, multi-operator support |
| **Payment Pipeline** | ✅ Complete | Stripe → webhook → entitlement → email → portal |
| **Token-driven backgrounds** | ✅ Complete | All skins use `bg-engine-*` classes, no hardcoded colors |
| **Offers engine-first** | ✅ Complete | `resolveOfferAction()` + OffersConsultancy.astro wired |
| **Schema.org FAQPage** | ✅ Complete | `buildFaqJsonLd.ts` + EngineLayout injection |
| **Tours TypeScript contracts** | ✅ Complete | `src/types/tours.ts` + validation enforcement |
| **WhatsApp floating button** | ✅ Complete | Engine-wide, accent-color matched |
| **Stripe Connect** | 🔄 Planned | Current: direct checkout; Target: split payouts |
| **Zod runtime validation** | 🔄 Planned | Build-time validation exists via scripts |
| **Fitness skin components** | 🔄 Partial | Uses consultancy skin as fallback |
| **Portal UI polish** | 🔄 Planned | Basic functional, needs design refinement |
| **Admin/Coach dashboard** | 🔄 Planned | Manual Firestore edits for now |

---

## 🚀 Business Viability Status

### What's Live and Working (Production)

| Capability | Status | Evidence |
|------------|--------|----------|
| Landing pages | ✅ Live | `ltp-engine.vercel.app/en/v/fitness/demo` |
| Stripe checkout | ✅ Live | Real test purchases completed |
| Payment webhooks | ✅ Live | 200 OK responses, entitlements created |
| Email fulfillment | ✅ Live | Brevo sends "Your access is ready" |
| Client portal | ✅ Live | `ltp-engine.vercel.app/portal` |
| Firebase auth | ✅ Live | Magic link sign-in working |
| Entitlements | ✅ Live | Claims work, dashboard shows access |

### Revenue-Ready Checklist

| Requirement | Status |
|-------------|--------|
| Accept payments | ✅ Stripe Checkout |
| Deliver access | ✅ Entitlements + Portal |
| Customer authentication | ✅ Firebase Magic Link |
| Fulfillment notification | ✅ Brevo Email |
| Multi-operator support | ✅ Data-driven |
| Multi-language | ✅ en/es |

**Bottom Line:** You can charge money and deliver digital access TODAY.

### 🎯 Next Steps (Product Decisions)

These are no longer debugging tasks — they're business/product choices:

#### Immediate (Polish)

| Task | Priority | Effort |
|------|----------|--------|
| Portal UI design | Medium | 2-4 hrs |
| Email branding (custom domain) | Medium | 1 hr |
| Error state improvements | Low | 1 hr |
| Loading skeletons | Low | 1 hr |

#### Short-Term (Features)

| Task | Priority | Effort |
|------|----------|--------|
| Entitlement → action mapping | High | 2-4 hrs |
| *What happens when user clicks a program? Link to content, embed, redirect?* |
| Operator-specific portal routes | Medium | 2-3 hrs |
| *`/portal/fitness-demo` instead of generic `/portal`* |
| Subscription support | Medium | 4-8 hrs |
| *Stripe subscriptions + recurring entitlements* |
| Content delivery | High | Varies |
| *Where does the actual program content live?* |

#### Medium-Term (Scale)

| Task | Priority | Effort |
|------|----------|--------|
| Admin/coach dashboard | High | 8-16 hrs |
| *Grant entitlements, view customers, manage access* |
| Stripe Connect | Medium | 8-16 hrs |
| *Multi-operator payouts (platform fee model)* |
| Rate limiting | Medium | 2-4 hrs |
| *Protect API endpoints* |
| Analytics | Low | 2-4 hrs |
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

## 🗺️ Roadmap & Next Steps

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

## 🔮 Future Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ Phase 1 | Consultancy vertical | Complete |
| 🔄 Phase 2 | Fitness vertical skin | Pending |
| 🔄 Phase 3 | Tours vertical skin | Pending |
| 🔄 Phase 4 | Nightlife vertical skin | Pending |
| 🔄 Phase 5 | Admin dashboard | Planned |
| 🔄 Phase 6 | Stripe checkout integration | Planned |
| 🔄 Phase 7 | Analytics dashboard | Planned |

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/engine/index.ts` | Engine exports |
| `src/lib/engine/loadOperator.ts` | JSON loading & merging |
| `src/types/operator.ts` | Core type definitions |
| `src/layouts/EngineLayout.astro` | HTML layout + vibe injection |
| `src/components/engine/ModuleRenderer.astro` | Module rendering |
| `src/styles/global.css` | Base styles + CSS vars |
| `src/config/engine.ts` | Constants (verticals, modules) |
| `src/components/skins/consultancy/skin.ts` | Consultancy skin config |

---

## 🤝 Contributing

1. **Read this document** before making any changes
2. **Verify engine compliance** using the checklist above
3. **Test across languages** (en + es)
4. **Test with demo operator** before creating new operators
5. **Keep components dumb**—business logic goes in `/lib/engine/`

---

*This document is the source of truth for the LTP Engine architecture. Update it when making architectural changes.*


