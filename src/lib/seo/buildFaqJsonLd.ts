/**
 * FAQPage JSON-LD Builder
 * 
 * ENGINE CONTRACT:
 * - Builds valid FAQPage schema for Google rich results
 * - Only emits if operator has sufficient FAQs
 * - Handles both q/a and question/answer field formats
 * - Strips HTML tags from answers (plain text required)
 * 
 * SPEC: https://schema.org/FAQPage
 * GOOGLE: https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */

export interface FaqItem {
  // Support both field naming conventions
  q?: string;
  question?: string;
  a?: string;
  answer?: string;
  tags?: string[];
  category?: string;
}

export interface FaqJsonLdOptions {
  faqs: FaqItem[];
  minFaqCount?: number; // Default: 3
}

export interface FaqPageJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

/**
 * Strip HTML tags from text (answers must be plain text)
 */
function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&')  // Replace &amp;
    .replace(/&lt;/g, '<')   // Replace &lt;
    .replace(/&gt;/g, '>')   // Replace &gt;
    .replace(/&quot;/g, '"') // Replace &quot;
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Normalize FAQ item to consistent q/a format
 */
function normalizeFaq(item: FaqItem): { q: string; a: string } | null {
  const question = item.q ?? item.question ?? '';
  const answer = item.a ?? item.answer ?? '';
  
  // Both must be non-empty
  if (!question.trim() || !answer.trim()) {
    return null;
  }
  
  return {
    q: question.trim(),
    a: stripHtmlTags(answer),
  };
}

/**
 * Build FAQPage JSON-LD object
 * 
 * Returns null if:
 * - No FAQs provided
 * - Less than minFaqCount valid FAQs
 * - All FAQs have empty q or a
 */
export function buildFaqJsonLd(options: FaqJsonLdOptions): FaqPageJsonLd | null {
  const { faqs, minFaqCount = 3 } = options;
  
  if (!faqs || !Array.isArray(faqs)) {
    return null;
  }
  
  // Normalize and filter valid FAQs
  const validFaqs = faqs
    .map(normalizeFaq)
    .filter((item): item is { q: string; a: string } => item !== null);
  
  // Must meet minimum count
  if (validFaqs.length < minFaqCount) {
    return null;
  }
  
  // Build JSON-LD structure
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

/**
 * Serialize JSON-LD to safe string for injection
 * Escapes </script> to prevent XSS
 */
export function serializeJsonLd(jsonLd: object): string {
  return JSON.stringify(jsonLd)
    .replace(/<\/script/gi, '<\\/script'); // Escape closing script tags
}
