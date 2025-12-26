/**
 * Resources Registry — Static Imports
 * 
 * ENGINE CONTRACT:
 * - All operator resources registered here via static imports
 * - No dynamic imports (breaks Astro static build)
 * - Used by server-side code only (pages, API routes)
 * 
 * TO ADD A NEW OPERATOR:
 * 1. Create src/data/resources/{operatorId}/index.ts
 * 2. Import and add to REGISTRY below
 */

import type { ResourceDefinition, OperatorResourcesMap } from "@/types/resources";

// ============================================================
// OPERATOR IMPORTS — Add new operators here
// ============================================================

import { resources as fitnessDemoResources } from "./fitness-demo";

// ============================================================
// REGISTRY
// ============================================================

const REGISTRY: Record<string, OperatorResourcesMap> = {
  "fitness-demo": fitnessDemoResources,
  // Add more operators:
  // "jose-espinosa": joseEspinosaResources,
  // "medellin-pub-crawl": medellinPubCrawlResources,
};

// ============================================================
// ACCESSOR FUNCTIONS
// ============================================================

/**
 * Get a specific resource definition.
 * Returns null if operator or resource not found.
 */
export function getResourceDefinition(
  operatorId: string, 
  resourceId: string
): ResourceDefinition | null {
  const operatorResources = REGISTRY[operatorId];
  if (!operatorResources) return null;
  return operatorResources[resourceId] ?? null;
}

/**
 * List all resources for an operator.
 * Returns empty array if operator not found.
 */
export function listResourcesForOperator(operatorId: string): ResourceDefinition[] {
  const operatorResources = REGISTRY[operatorId];
  if (!operatorResources) return [];
  return Object.values(operatorResources);
}

/**
 * Get all registered operator IDs.
 */
export function getRegisteredOperatorIds(): string[] {
  return Object.keys(REGISTRY);
}

/**
 * Get all resource paths for static generation.
 * Returns array of { operatorId, resourceId } objects.
 */
export function getAllResourcePaths(): Array<{ operatorId: string; resourceId: string }> {
  const paths: Array<{ operatorId: string; resourceId: string }> = [];
  
  for (const [operatorId, resources] of Object.entries(REGISTRY)) {
    for (const resourceId of Object.keys(resources)) {
      paths.push({ operatorId, resourceId });
    }
  }
  
  return paths;
}
