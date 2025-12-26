/**
 * Resource Contract v1 — Entitlement → Action Mapping
 * 
 * ENGINE CONTRACT:
 * - Defines what an entitlement DELIVERS (not just what was bought)
 * - Each resourceId maps to a ResourceAction
 * - Portal uses this to render clickable entitlements
 * 
 * RESOURCE TYPES:
 * - page: Gated content page rendered by engine (/portal/r/{operatorId}/{resourceId})
 * - download: File download (PDF, ZIP, etc.)
 * - external: Redirect to external URL (Notion, Teachable, etc.)
 * - embed: Embedded content (Vimeo, YouTube, etc.)
 * 
 * MULTI-VERTICAL SAFE:
 * - resourceId is scoped to operatorId
 * - Same resourceId can exist in different operators with different content
 */

// ============================================================
// RESOURCE TYPES
// ============================================================

export type ResourceType = 'page' | 'download' | 'external' | 'embed';

// ============================================================
// RESOURCE ACTION (what happens when user clicks)
// ============================================================

export interface ResourceActionPage {
  type: 'page';
  // Renders /portal/r/{operatorId}/{resourceId}
  // Content defined in src/data/resources/{operatorId}/{resourceId}.json
}

export interface ResourceActionDownload {
  type: 'download';
  fileKey: string;        // Storage path or signed URL key
  filename?: string;      // Download filename (optional, defaults to fileKey)
  mimeType?: string;      // Content-Type header
}

export interface ResourceActionExternal {
  type: 'external';
  href: string;           // External URL (Notion, Teachable, etc.)
  newTab?: boolean;       // Open in new tab (default: true)
}

export interface ResourceActionEmbed {
  type: 'embed';
  embedUrl: string;       // Vimeo, YouTube, etc.
  provider?: 'vimeo' | 'youtube' | 'loom' | 'other';
}

export type ResourceAction = 
  | ResourceActionPage 
  | ResourceActionDownload 
  | ResourceActionExternal 
  | ResourceActionEmbed;

// ============================================================
// RESOURCE DEFINITION (stored per operator)
// ============================================================

export interface ResourceDefinition {
  id: string;                 // Matches entitlement.resourceId
  label: string;              // Display name in portal
  description?: string;       // Brief description
  icon?: string;              // Icon name or URL
  action: ResourceAction;     // What happens on click
  
  // For 'page' type: content sections
  content?: ResourcePageContent;
}

// ============================================================
// PAGE CONTENT (for type: 'page')
// ============================================================

export interface ResourcePageContent {
  title: string;
  hero?: {
    headline: string;
    subheadline?: string;
    image?: string;
  };
  sections: ResourceSection[];
  downloads?: ResourceDownload[];
}

export interface ResourceSection {
  id: string;
  type: 'markdown' | 'video' | 'checklist' | 'callout';
  title?: string;
  content: string;          // Markdown for 'markdown', URL for 'video', JSON for others
}

export interface ResourceDownload {
  id: string;
  label: string;
  fileKey: string;
  mimeType?: string;
}

// ============================================================
// OPERATOR RESOURCES MAP
// ============================================================

/**
 * Each operator defines their resources in:
 * src/data/resources/{operatorId}/index.ts
 * 
 * Example:
 * ```typescript
 * export const resources: Record<string, ResourceDefinition> = {
 *   'product-foundation': {
 *     id: 'product-foundation',
 *     label: 'Foundation Protocol',
 *     action: { type: 'page' },
 *     content: { ... }
 *   },
 *   'product-mastery': {
 *     id: 'product-mastery', 
 *     label: 'Mastery Program',
 *     action: { type: 'external', href: 'https://...' }
 *   }
 * };
 * ```
 */
export type OperatorResourcesMap = Record<string, ResourceDefinition>;

// ============================================================
// ENHANCED ENTITLEMENT (with resolved action)
// ============================================================

export interface EntitlementWithAction {
  id: string;
  operatorId: string;
  resourceId: string;
  type: string;
  status: string;
  
  // Resolved from ResourceDefinition
  label: string;
  description?: string;
  icon?: string;
  action: ResourceAction;
}

// ============================================================
// RESOLVER FUNCTION
// ============================================================

/**
 * Resolves an entitlement to its action.
 * Used by portal to make entitlements clickable.
 * 
 * @param entitlement - Raw entitlement from Firestore
 * @param resourcesMap - Operator's resource definitions
 * @returns Entitlement with resolved action, or null if resource not found
 */
export function resolveEntitlementAction(
  entitlement: { id: string; operatorId: string; resourceId: string; type: string; status: string },
  resourcesMap: OperatorResourcesMap
): EntitlementWithAction | null {
  const resource = resourcesMap[entitlement.resourceId];
  
  if (!resource) {
    console.warn(`[Resource] No resource definition for ${entitlement.operatorId}/${entitlement.resourceId}`);
    return null;
  }
  
  return {
    id: entitlement.id,
    operatorId: entitlement.operatorId,
    resourceId: entitlement.resourceId,
    type: entitlement.type,
    status: entitlement.status,
    label: resource.label,
    description: resource.description,
    icon: resource.icon,
    action: resource.action,
  };
}
