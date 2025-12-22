/**
 * Intel/Knowledge Base Type Definitions
 */

// FAQ entry
export interface FAQ {
  q: string;
  a: string;
  tags?: string[];
  tagline?: string;
}

// Intel summary block
export interface IntelEntry {
  label: string;
  text: string;
  icon?: string;
}

// Rules of engagement (tours/nightlife)
export interface RuleOfEngagement {
  title: string;
  desc: string;
  icon?: string;
}

// Intel article (for content collections)
export interface IntelArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  readTime?: number;
  featured?: boolean;
}

// Intel section configuration
export interface IntelSectionConfig {
  title: string;
  kicker?: string;
  subhead?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  filterTags?: string[];
  leftColumnTitle?: string;
  rightColumnTitle?: string;
}

// Search result for intel
export interface IntelSearchResult {
  type: 'faq' | 'article';
  title: string;
  snippet: string;
  href?: string;
  tags?: string[];
  score: number;
}
