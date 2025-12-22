# LTP Engine — Multi-Vertical Static Business Factory

> **Version:** 1.1.0  
> **Last Updated:** December 22, 2025  
> **Status:** Engine-First Architecture ✓ VERIFIED | Products Architecture ✓ IMPLEMENTED

---

## 📋 Changelog

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

---

## 📍 Purpose Statement

The **LTP Engine** is a **multi-vertical static site factory** that generates high-converting, single-page operator businesses from JSON configuration files. Each site is fully localized, SEO-optimized, and deployed to edge infrastructure.

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
| **Static-First** | Static output (SSG) deployed globally via Vercel's CDN; edge runtime used only for dynamic endpoints (checkout, webhooks). |

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

| Layer | Mechanism | When |
|-------|-----------|------|
| **Compile-time** | TypeScript interfaces | `npm run type-check` |
| **Load-time** | Zod validation (TODO) | `loadOperator()` fails fast |
| **Runtime** | Graceful degradation | Components handle missing optional data |

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

## 🧩 Module System

### The 8 Mandatory Modules

| # | Module | Purpose | Required |
|---|--------|---------|----------|
| 1 | `hero` | Above-the-fold identity + primary CTA | ✅ Yes |
| 2 | `fitFilter` | Qualify/disqualify visitors | No |
| 3 | `offers` | Packages, bundles, promotions | No |
| 4 | `products` | Individual products/services | No |
| 5 | `proof` | Testimonials, metrics, logos | No |
| 6 | `intel` | FAQ, knowledge base | No |
| 7 | `conversion` | Final CTA zone | ✅ Yes |
| 8 | `footer` | Legal, links, contact | ✅ Yes |

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

// 2. Register in skin.ts
export const mySkin: SkinContractV1 = {
  id: 'consultancy-minimal',
  name: 'Minimal',
  vertical: 'consultancy',
  components: { ... },
  defaults: { ... },
};

// 3. Register with engine
import { registerSkin } from '@/lib/engine';
registerSkin(mySkin);
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

### Structured Data (Auto-Generated)

```json
// Injected by EngineLayout when operator has required fields
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",      // or vertical-specific type
  "name": "{operator.brand.name}",
  "description": "{operator.seo.description}",
  "url": "{canonical}",
  "image": "{og:image}",
  "priceRange": "{derived from pricing}",
  "faq": [/* from intel.faq */]
}
```

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

## 💳 Stripe Economics (Engine-Enforced)

> **The economic primitive: Engine takes commission first, passes remainder to operator.**

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

## � Roadmap & Next Steps

### Immediate (Next Session)
| Task | Description | Priority |
|------|-------------|----------|
| Wire Product CTAs | Update Products components to use `resolveProductAction()` | 🔴 High |
| `/api/checkout` | Create Stripe checkout endpoint | 🔴 High |
| Stripe Price IDs | Add real `stripe.priceId` to Jose's products | 🟡 Medium |

### Short-Term (This Week)
| Task | Description | Priority |
|------|-------------|----------|
| Webhook Handler | `/api/webhook` for Stripe checkout.session.completed | 🟡 Medium |
| Email Fulfillment | Send download links via Resend/SendGrid | 🟡 Medium |
| More Operators | Create 2-3 more operators to stress-test engine | 🟡 Medium |

### Future (Backlog)
| Task | Description | Priority |
|------|-------------|----------|
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
