/**
 * Tours (Nightlife) Vertical Skin
 * 
 * Maps engine modules to tours-specific component implementations.
 * Based on the approved night-bare-bones-v1.html design:
 * - Dark, neon-accent aesthetic
 * - "Cyber ops" / "Circuit" nomenclature
 * - Full-screen hero with parallax
 * - Timeline-based route display
 * 
 * VISUAL METAPHORS: circuit / operation / mission / intel / access
 * These metaphors inform the language and UX patterns unique to nightlife tours.
 */

import HeroTours from './components/HeroTours.astro';
import TrustBarTours from './components/TrustBarTours.astro';
import VibeTours from './components/VibeTours.astro';
import FitFilterTours from './components/FitFilterTours.astro';
import OffersTours from './components/OffersTours.astro';
import ProductsTours from './components/ProductsTours.astro';
import RouteTours from './components/RouteTours.astro';
import LocalIntelTours from './components/LocalIntelTours.astro';
import RulesTours from './components/RulesTours.astro';
import ProofTours from './components/ProofTours.astro';
import IntelTours from './components/IntelTours.astro';
import ConversionTours from './components/ConversionTours.astro';
import FooterTours from './components/FooterTours.astro';

/**
 * Skin-level defaults for tours vertical.
 * Operator can override any of these via operator.ui.*
 * Uses nightlife-native nomenclature (circuit/mission/intel/access).
 */
export const toursDefaults = {
  // Navigation defaults (operator.ui.nav overrides)
  nav: [
    { label: 'The Vibe', href: '#fit' },
    { label: 'The Circuit', href: '#route' },
    { label: 'Intel', href: '#intel' },
    { label: 'Book', href: '#offers' },
  ],
  
  // Section labels (operator.ui.labels overrides)
  labels: {
    hero: {
      metrics: 'Mission Profile',
      liveStatus: 'Live Status',
    },
    trustBar: {
      summary: 'Local guides. Partner venues. Coordinated route. Built for travelers who want nightlife without the chaos.',
    },
    fitFilter: {
      section: 'Vibe Check',
      compatible: "You'll Love This If",
      incompatible: 'Not For You If',
    },
    route: {
      section: 'The Circuit',
      title: 'Tonight\'s Route',
      description: 'One Night. Four Venues. Zero Worries.',
    },
    localIntel: {
      section: 'Local Intel',
      title: 'Sector Intel',
    },
    rules: {
      section: 'Rules of Engagement',
      title: 'Rules of Engagement',
    },
    offers: {
      section: 'Get Access',
      title: 'Book Your Spot',
      primaryCta: 'Reserve Now',
      detailsLabel: 'See Details',
      modalCta: 'Book Now',
      checkoutPending: 'Booking opens soon!',
    },
    products: {
      section: 'Experience Tiers',
      title: 'Choose Your Mission',
      tools: 'Free Intel',
      toolsSection: 'Zero-Risk Entry Points',
      detailsLabel: 'Details',
      modalCta: 'Get Access',
      checkoutPending: 'Booking opens soon!',
    },
    proof: {
      section: 'Field Notes',
      title: 'What They Said',
      logos: 'Featured In',
    },
    intel: {
      section: 'Intel Database',
      title: 'Local Intel',
      searchPlaceholder: 'Search intel...',
    },
    conversion: {
      section: 'Lock In Your Spot',
      title: 'Ready?',
    },
    footer: {
      nav: 'Navigation',
      social: 'Connect',
      legal: 'Legal',
    },
  },
  
  // CTA defaults (operator.ui.cta overrides)
  cta: {
    primary: 'Get Access',
    secondary: 'See The Route',
    startHere: 'Book Now',
    learnMore: 'Learn More',
    whatsapp: 'WhatsApp',
  },
};

export const toursSkin = {
  id: 'tours-nightlife',
  name: 'Nightlife Tours',
  vertical: 'tours' as const,
  
  // Skin-level defaults for nav/labels/cta
  defaults: toursDefaults,
  
  // Theme vars handled by applyThemeVars() from vibe tokens
  themeVars: {},
  
  // Component mappings - these override the default engine modules
  // SKELETON ORDER per SOP: Hero → Trust → Vibe → Proof → Route → Local Intel → Rules → FAQ → Pricing → Footer
  components: {
    hero: HeroTours,
    trustBar: TrustBarTours,
    vibe: VibeTours,
    fitFilter: FitFilterTours,
    route: RouteTours,
    localIntel: LocalIntelTours,
    rules: RulesTours,
    offers: OffersTours,
    products: ProductsTours,
    proof: ProofTours,
    intel: IntelTours,
    conversion: ConversionTours,
    footer: FooterTours,
  },
};

export default toursSkin;
