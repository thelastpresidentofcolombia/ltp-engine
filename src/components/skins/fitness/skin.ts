/**
 * Fitness/Coaching Vertical Skin
 * 
 * Maps engine modules to fitness-specific component implementations.
 * Based on the fitness-canonical.html design:
 * - Dark, premium glass aesthetic (#050505 base)
 * - Volt/lime accent (#ccff00)
 * - Glassmorphism cards with subtle borders
 * - Grain texture overlay
 * - Glow orbs for ambient lighting
 * - Clash Display (headlines) + General Sans (body)
 * 
 * VISUAL METAPHORS: protocol / system / operating system / diagnostics / evolution
 * These metaphors inform the language and UX patterns unique to fitness coaching.
 */

import HeroFitness from './components/HeroFitness.astro';
import FitFilterFitness from './components/FitFilterFitness.astro';
import OffersFitness from './components/OffersFitness.astro';
import ProductsFitness from './components/ProductsFitness.astro';
import ProofFitness from './components/ProofFitness.astro';
import IntelFitness from './components/IntelFitness.astro';
import ConversionFitness from './components/ConversionFitness.astro';
import FooterFitness from './components/FooterFitness.astro';

/**
 * Skin-level defaults for fitness vertical.
 * Operator can override any of these via operator.ui.*
 * Uses fitness-native nomenclature (protocol/system/evolution).
 */
export const fitnessDefaults = {
  // Navigation defaults (operator.ui.nav overrides)
  nav: [
    { label: 'System', href: '#system' },
    { label: 'Programs', href: '#products' },
    { label: 'Results', href: '#proof' },
    { label: 'Intel', href: '#intel' },
    { label: 'Access', href: '#pricing' },
  ],
  
  // Section labels (operator.ui.labels overrides)
  labels: {
    hero: {
      badge: 'Now Enrolling',
      metrics: 'Performance Metrics',
      primaryCTA: 'Start Assessment',
      secondaryCTA: 'View Programs',
    },
    diagnostic: {
      title: 'Quick Assessment',
      cta: 'Get My Protocol',
      disclaimer: '2-minute assessment • Personalized recommendations',
    },
    system: {
      section: 'Operating System',
      title: 'Complete Operating System',
      subhead: 'Everything you need to execute. Nothing you don\'t.',
    },
    fitFilter: {
      section: 'Fit Assessment',
      compatible: 'Ideal Candidates',
      incompatible: 'Not Right For',
    },
    offers: {
      section: 'Entry Points',
      title: 'Start Here',
      primaryCta: 'Book Now',
      detailsLabel: 'Learn More',
      modalCta: 'Get Started',
      checkoutPending: 'Coming soon!',
    },
    products: {
      section: 'Digital Products',
      kicker: 'Scalable Solutions',
      title: 'Programs & Products',
      subhead: 'Templates, protocols, and full coaching programs built on proven systems.',
      detailsLabel: 'Details',
      modalCta: 'Get Access',
      checkoutPending: 'Coming soon!',
    },
    proof: {
      section: 'Verified Results',
      kicker: 'Real Results',
      title: 'Track Record',
      subhead: 'Transformations and outcomes from our community.',
      tabs: {
        all: 'All',
        metrics: 'Metrics',
        transformations: 'Transformations',
        testimonials: 'Testimonials',
      },
    },
    intel: {
      section: 'Knowledge Base',
      kicker: 'Intel Database',
      title: 'Questions & Resources',
      subhead: 'Everything you need to make an informed decision.',
      searchPlaceholder: 'Search questions...',
      leftColumnTitle: 'Resources',
      leftColumnTag: 'Articles',
      rightColumnTitle: 'FAQ',
      rightColumnTag: 'Database',
      archiveLabel: 'View All Resources',
    },
    pricing: {
      section: 'Membership Access',
      title: 'Choose Your Path',
      subhead: 'Select the tier that matches your goals and commitment level.',
    },
    conversion: {
      section: 'Next Step',
      title: 'Ready to Start?',
      description: 'Take the first step toward your transformation.',
    },
    footer: {
      nav: 'Navigation',
      social: 'Connect',
      legal: 'Legal',
    },
    common: {
      viewDetails: 'Details',
      view: 'View',
      open: 'Open',
      read: 'Read',
    },
    faqTags: {
      all: 'All',
      pricing: 'Pricing',
      process: 'Process',
      equipment: 'Equipment',
      nutrition: 'Nutrition',
    },
  },
  
  // CTA defaults (operator.ui.cta overrides)
  cta: {
    primary: 'Start Assessment',
    secondary: 'View Programs',
    startHere: 'Get Started',
    learnMore: 'Learn More',
    whatsapp: 'WhatsApp',
    bookCall: 'Book Assessment',
    apply: 'Apply Now',
  },
};

export const fitnessSkin = {
  id: 'fitness-performance',
  name: 'Fitness Performance',
  vertical: 'fitness' as const,
  
  // Skin-level defaults for nav/labels/cta
  defaults: fitnessDefaults,
  
  // Theme vars handled by applyThemeVars() from vibe tokens
  // Default tokens for fitness (operator can override)
  themeVars: {
    // These serve as fallbacks if operator doesn't define tokens
    '--color-bg-deep': '#050505',
    '--color-bg-surface': '#080808',
    '--color-glass-surface': 'rgba(255,255,255,0.03)',
    '--color-glass-border': 'rgba(255,255,255,0.08)',
    '--color-text-primary': '#ffffff',
    '--color-text-secondary': '#888888',
    '--color-text-muted': '#6b7280',
    '--color-accent': '#ccff00',
    '--color-accent-2': '#00ff88',
    '--font-body': "'General Sans', sans-serif",
    '--font-display': "'Clash Display', sans-serif",
    '--radius-xl': '16px',
    '--radius-2xl': '24px',
    '--radius-3xl': '32px',
  },
  
  // Component mappings - these override the default engine modules
  // ORDER per SOP: Hero → FitFilter → Offers → Products → Proof → Intel → Conversion → Footer
  components: {
    hero: HeroFitness,
    fitFilter: FitFilterFitness,
    offers: OffersFitness,
    products: ProductsFitness,
    proof: ProofFitness,
    intel: IntelFitness,
    conversion: ConversionFitness,
    footer: FooterFitness,
  },
};

export default fitnessSkin;
