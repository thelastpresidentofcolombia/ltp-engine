/**
 * Consultancy Vertical Skin
 * 
 * Maps engine modules to consultancy-specific component implementations.
 * Based on the approved canonical consultancy guide design:
 * - Swiss/minimal aesthetic
 * - Strong typography hierarchy
 * - Grid-based layouts
 * - Professional, systems-oriented positioning
 * 
 * VISUAL METAPHORS: systems / architecture / grid / protocols / diagnostics
 * These metaphors inform the language and UX patterns unique to consultancy.
 */

import HeroConsultancy from './components/HeroConsultancy.astro';
import FitFilterConsultancy from './components/FitFilterConsultancy.astro';
import OffersConsultancy from './components/OffersConsultancy.astro';
import ProductsConsultancy from './components/ProductsConsultancy.astro';
import ProofConsultancy from './components/ProofConsultancy.astro';
import IntelConsultancy from './components/IntelConsultancy.astro';
import ConversionConsultancy from './components/ConversionConsultancy.astro';
import FooterConsultancy from './components/FooterConsultancy.astro';

/**
 * Skin-level defaults for consultancy vertical.
 * Operator can override any of these via operator.ui.*
 * These use consultancy-native nomenclature (systems/protocols/diagnostics).
 */
export const consultancyDefaults = {
  // Navigation defaults (operator.ui.nav overrides)
  nav: [
    { label: 'Systems', href: '#offers' },
    { label: 'Products', href: '#products' },
    { label: 'Diagnostics', href: '#tools' },
    { label: 'Intel', href: '#intel' },
  ],
  
  // Section labels (operator.ui.labels overrides)
  labels: {
    hero: {
      metrics: 'Operator Metrics',
    },
    fitFilter: {
      section: 'Operator Fit Assessment',
      compatible: '[01] Compatible Operators',
      incompatible: '[00] Not a Fit',
    },
    offers: {
      section: 'Entry Points',
      title: 'Systems & Engagements',
    },
    products: {
      section: 'Digital Infrastructure',
      title: 'Installable Systems',
      tools: 'Free Diagnostics',
      toolsSection: 'Zero-Risk Entry Points',
      // Modal labels (engine contract: no hardcoded strings)
      detailsLabel: 'Details',
      modalCta: 'Get Now',
      checkoutPending: 'Checkout is not live yet. Coming soon!',
    },
    proof: {
      section: 'Verified Results',
      title: 'Track Record',
      logos: 'Featured In',
    },
    intel: {
      section: 'Knowledge Base',
      title: 'Intel',
      searchPlaceholder: 'Search questions...',
    },
    conversion: {
      section: 'Next Step',
      title: 'Start With Clarity',
    },
    footer: {
      nav: 'Navigation',
      social: 'Connect',
      legal: 'Legal',
    },
  },
  
  // CTA defaults (operator.ui.cta overrides)
  cta: {
    primary: 'View Systems',
    secondary: 'Free Diagnostic',
    startHere: 'Start Here',
    learnMore: 'Learn More',
    bookCall: 'Book Your Diagnostic',
    apply: 'Apply Now',
  },
};

export const consultancySkin = {
  id: 'consultancy-canonical',
  name: 'Canonical Consultancy',
  vertical: 'consultancy' as const,
  
  // Skin-level defaults for nav/labels/cta
  defaults: consultancyDefaults,
  
  // Theme vars handled by applyThemeVars() from vibe tokens
  // Keeping minimal here - let vibe tokens control the visual identity
  themeVars: {},
  
  // Component mappings - these override the default engine modules
  components: {
    hero: HeroConsultancy,
    fitFilter: FitFilterConsultancy,
    offers: OffersConsultancy,
    products: ProductsConsultancy,
    proof: ProofConsultancy,
    intel: IntelConsultancy,
    conversion: ConversionConsultancy,
    footer: FooterConsultancy,
  },
};

export default consultancySkin;
