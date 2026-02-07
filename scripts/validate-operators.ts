/**
 * Validate all operator folders before build
 * Ensures each operator has core.json + en.json + es.json
 * and that all required fields are present
 * 
 * TOURS/NIGHTLIFE MODULE VALIDATION:
 * When modules array includes tours-specific modules, validates:
 * - trustBar: trust.signals ≥ 3
 * - vibe: gallery ≥ 3
 * - route: route.stops ≥ 3
 * - rules: rules ≥ 4
 */

import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface ValidationError {
  operator: string;
  errors: string[];
}

interface OperatorFolder {
  vertical: string;
  slug: string;
  path: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
const SUPPORTED_VERTICALS = ['consultancy', 'fitness', 'tours', 'nightlife'] as const;

const REQUIRED_CORE_FIELDS = [
  'id',
  'vertical',
  'contact.email',
  'location.city',
  'location.country',
  'vibe.vibeId',
  'modules',
  'media.heroImage',
  'pricing.currency',
  'pricing.tiers',
];

const REQUIRED_LANG_FIELDS = [
  'brand.name',
  'seo.title',
  'seo.description',
  'hero.headline',
  'hero.subhead',
  'offers',
  'products',
  'proof',
  'intel.faq',
  'conversion.headline',
  'conversion.cta',
  'footer',
];

const MIN_DATA_REQUIREMENTS = {
  offers: 2,
  products: 2,
  proof: 2,
  'intel.faq': 3,
};

// =============================================================================
// TOURS/NIGHTLIFE MODULE VALIDATION
// =============================================================================

/**
 * Module-specific validation rules for tours/nightlife vertical
 * When a module ID is in the modules array, its data must exist with minimum counts
 */
const TOURS_MODULE_VALIDATION: Record<string, { dataPath: string; minCount: number; itemValidation?: (item: any) => string | null }> = {
  trustBar: {
    dataPath: 'trust.signals',
    minCount: 3,
    itemValidation: (item: any) => {
      if (!item.icon) return 'missing "icon"';
      if (!item.label) return 'missing "label"';
      return null;
    },
  },
  vibe: {
    dataPath: 'gallery',
    minCount: 3,
    itemValidation: (item: any) => {
      if (!item.src) return 'missing "src"';
      return null;
    },
  },
  route: {
    dataPath: 'route.stops',
    minCount: 3,
    itemValidation: (item: any) => {
      if (!item.name) return 'missing "name"';
      if (!item.description) return 'missing "description"';
      return null;
    },
  },
  rules: {
    dataPath: 'rules',
    minCount: 4,
    itemValidation: (item: any) => {
      if (!item.title) return 'missing "title"';
      if (!item.desc) return 'missing "desc"';
      return null;
    },
  },
  localIntel: {
    dataPath: 'localIntel',
    minCount: 0, // localIntel is optional, just needs to exist if module is present
    itemValidation: undefined,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

async function validateCoreJson(filePath: string): Promise<string[]> {
  const errors: string[] = [];
  
  try {
    const content = await readFile(filePath, 'utf-8');
    const core = JSON.parse(content);
    
    // Check required fields
    for (const field of REQUIRED_CORE_FIELDS) {
      const value = getNestedValue(core, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`core.json: Missing required field "${field}"`);
      }
    }
    
    // Validate vertical
    if (core.vertical && !SUPPORTED_VERTICALS.includes(core.vertical)) {
      errors.push(`core.json: Invalid vertical "${core.vertical}"`);
    }
    
    // Validate modules array
    if (!Array.isArray(core.modules) || core.modules.length === 0) {
      errors.push('core.json: modules must be a non-empty array');
    }
    
    // Validate pricing tiers have required fields
    if (Array.isArray(core.pricing?.tiers)) {
      core.pricing.tiers.forEach((tier: any, i: number) => {
        if (!tier.id) errors.push(`core.json: pricing.tiers[${i}] missing "id"`);
        if (typeof tier.priceUsd !== 'number') {
          errors.push(`core.json: pricing.tiers[${i}] missing or invalid "priceUsd"`);
        }
      });
    }
    
  } catch (e) {
    errors.push(`core.json: Failed to parse - ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
  
  return errors;
}

async function validateLangJson(filePath: string, lang: string, modules: string[] = []): Promise<string[]> {
  const errors: string[] = [];
  const fileName = `${lang}.json`;
  
  try {
    const content = await readFile(filePath, 'utf-8');
    const langData = JSON.parse(content);
    
    // Check required fields
    for (const field of REQUIRED_LANG_FIELDS) {
      const value = getNestedValue(langData, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`${fileName}: Missing required field "${field}"`);
      }
    }
    
    // Check minimum data requirements
    for (const [field, min] of Object.entries(MIN_DATA_REQUIREMENTS)) {
      const value = getNestedValue(langData, field);
      if (Array.isArray(value) && value.length < min) {
        errors.push(`${fileName}: "${field}" should have at least ${min} items (found ${value.length})`);
      }
    }
    
    // ==========================================================================
    // TOURS/NIGHTLIFE MODULE VALIDATION
    // When a module is in the modules array, validate its data exists
    // ==========================================================================
    for (const moduleId of modules) {
      const validation = TOURS_MODULE_VALIDATION[moduleId];
      if (!validation) continue; // Not a tours module
      
      const value = getNestedValue(langData, validation.dataPath);
      
      // Check if data exists
      if (value === undefined || value === null) {
        errors.push(`${fileName}: Module "${moduleId}" requires "${validation.dataPath}" data`);
        continue;
      }
      
      // Check minimum count for arrays
      if (Array.isArray(value)) {
        if (value.length < validation.minCount) {
          errors.push(`${fileName}: "${validation.dataPath}" should have at least ${validation.minCount} items for "${moduleId}" module (found ${value.length})`);
        }
        
        // Validate individual items
        if (validation.itemValidation) {
          value.forEach((item: any, i: number) => {
            const itemError = validation.itemValidation!(item);
            if (itemError) {
              errors.push(`${fileName}: ${validation.dataPath}[${i}] ${itemError}`);
            }
          });
        }
      }
    }
    
    // Validate offers have required fields
    if (Array.isArray(langData.offers)) {
      langData.offers.forEach((offer: any, i: number) => {
        if (!offer.title) errors.push(`${fileName}: offers[${i}] missing "title"`);
        if (!offer.description) errors.push(`${fileName}: offers[${i}] missing "description"`);
      });
    }
    
    // Validate products have required fields
    if (Array.isArray(langData.products)) {
      langData.products.forEach((product: any, i: number) => {
        if (!product.name) errors.push(`${fileName}: products[${i}] missing "name"`);
        if (!product.description) errors.push(`${fileName}: products[${i}] missing "description"`);
      });
    }
    
    // Validate proof items have required fields
    if (Array.isArray(langData.proof)) {
      langData.proof.forEach((item: any, i: number) => {
        if (!item.type) errors.push(`${fileName}: proof[${i}] missing "type"`);
      });
    }
    
  } catch (e) {
    errors.push(`${fileName}: Failed to parse - ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
  
  return errors;
}

async function validateOperatorFolder(folder: OperatorFolder): Promise<string[]> {
  const errors: string[] = [];
  const corePath = join(folder.path, 'core.json');
  
  // Check core.json exists
  if (!await fileExists(corePath)) {
    errors.push('Missing core.json');
    return errors; // Can't continue without core
  }
  
  // Validate core.json
  errors.push(...await validateCoreJson(corePath));
  
  // Read modules from core.json for tours validation
  let modules: string[] = [];
  try {
    const coreContent = await readFile(corePath, 'utf-8');
    const coreData = JSON.parse(coreContent);
    modules = coreData.modules || [];
  } catch {
    // Already reported in validateCoreJson
  }
  
  // Check and validate each language file
  for (const lang of SUPPORTED_LANGUAGES) {
    const langPath = join(folder.path, `${lang}.json`);
    
    if (!await fileExists(langPath)) {
      errors.push(`Missing ${lang}.json`);
    } else {
      errors.push(...await validateLangJson(langPath, lang, modules));
    }
  }
  
  return errors;
}

// =============================================================================
// DISCOVERY
// =============================================================================

async function findOperatorFolders(baseDir: string): Promise<OperatorFolder[]> {
  const folders: OperatorFolder[] = [];
  
  try {
    const verticals = await readdir(baseDir, { withFileTypes: true });
    
    for (const vertical of verticals) {
      if (!vertical.isDirectory()) continue;
      if (!SUPPORTED_VERTICALS.includes(vertical.name as any)) continue;
      
      const verticalPath = join(baseDir, vertical.name);
      const operators = await readdir(verticalPath, { withFileTypes: true });
      
      for (const operator of operators) {
        if (!operator.isDirectory()) continue;
        
        folders.push({
          vertical: vertical.name,
          slug: operator.name,
          path: join(verticalPath, operator.name),
        });
      }
    }
  } catch {
    // Directory doesn't exist yet - that's fine for initial setup
  }
  
  return folders;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('🔍 Validating operator folders...\n');
  console.log(`   Languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  console.log(`   Verticals: ${SUPPORTED_VERTICALS.join(', ')}\n`);

  const operatorsDir = join(process.cwd(), 'src/data/operators');
  const folders = await findOperatorFolders(operatorsDir);
  
  if (folders.length === 0) {
    console.log('⚠️  No operator folders found. Skipping validation.\n');
    console.log('   Expected structure:');
    console.log('   src/data/operators/{vertical}/{slug}/');
    console.log('     ├── core.json');
    console.log('     ├── en.json');
    console.log('     └── es.json\n');
    return;
  }
  
  const validationErrors: ValidationError[] = [];

  for (const folder of folders) {
    const operatorId = `${folder.vertical}/${folder.slug}`;
    const errors = await validateOperatorFolder(folder);
    
    if (errors.length > 0) {
      validationErrors.push({ operator: operatorId, errors });
    } else {
      console.log(`   ✓ ${operatorId}`);
    }
  }

  console.log('');

  if (validationErrors.length > 0) {
    console.error('❌ Validation failed:\n');
    for (const { operator, errors } of validationErrors) {
      console.error(`   ${operator}:`);
      errors.forEach(err => console.error(`     - ${err}`));
      console.error('');
    }
    process.exit(1);
  }

  console.log(`✅ All ${folders.length} operator(s) validated successfully.`);
}

main().catch(console.error);
