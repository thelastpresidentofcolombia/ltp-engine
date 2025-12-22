/**
 * Proof System Type Definitions
 */

export type ProofType = 'testimonial' | 'metric' | 'screenshot' | 'caseStudy' | 'logo' | 'press';

// Base proof item
export interface ProofItemBase {
  type: ProofType;
  id?: string;
  featured?: boolean;
}

// Testimonial proof
export interface TestimonialProof extends ProofItemBase {
  type: 'testimonial';
  quote: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  rating?: number;
  beforeLabel?: string;
  beforeValue?: string;
  afterLabel?: string;
  afterValue?: string;
}

// Metric proof
export interface MetricProof extends ProofItemBase {
  type: 'metric';
  kicker?: string;
  title: string;
  desc?: string;
  metrics: Array<{
    value: string;
    label: string;
  }>;
}

// Screenshot proof
export interface ScreenshotProof extends ProofItemBase {
  type: 'screenshot';
  kicker?: string;
  title: string;
  desc?: string;
  imageUrl: string;
  imageAlt?: string;
  caption?: string;
  ctaHref?: string;
}

// Case study proof
export interface CaseStudyProof extends ProofItemBase {
  type: 'caseStudy';
  kicker?: string;
  title: string;
  desc?: string;
  problem: string;
  intervention: string;
  outcome: string;
  wins?: string[];
  readMoreHref?: string;
}

// Logo proof (press/clients)
export interface LogoProof extends ProofItemBase {
  type: 'logo';
  name: string;
  logoUrl: string;
  href?: string;
}

// Press mention proof
export interface PressProof extends ProofItemBase {
  type: 'press';
  outlet: string;
  headline: string;
  date?: string;
  href?: string;
  logoUrl?: string;
}

// Union type for all proof items
export type ProofItem =
  | TestimonialProof
  | MetricProof
  | ScreenshotProof
  | CaseStudyProof
  | LogoProof
  | PressProof;

// Proof section configuration
export interface ProofSectionConfig {
  title: string;
  kicker?: string;
  subhead?: string;
  showFilters?: boolean;
  filterTypes?: ProofType[];
}
