/**
 * Command Palette Type Definitions — Engine Contract
 *
 * ENGINE CONTRACT:
 * - Defines the command palette as a vertical-agnostic interaction surface.
 * - Commands are registered declaratively via CommandDef.
 * - Availability is derived from CommandContext (actor, features, operator scope).
 * - Operators can override via PortalCommandsConfig (pin, hide, add synonyms).
 *
 * ARCHITECTURE:
 *   CommandDef   → static declaration (what it is)
 *   CommandContext → runtime context  (who's using it, what's available)
 *   resolveCommands() → final ordered list (engine + operator overrides)
 */

import type { PortalFeature, PortalRole } from './portal';
import type { Vertical } from './operator';

// ============================================================
// CORE PRIMITIVES
// ============================================================

/** Unique command identifier (e.g. 'nav:dashboard', 'action:book-session'). */
export type CommandId = string;

/**
 * Where a command lives in the hierarchy.
 * - global: always available (nav, sign out)
 * - operator: requires an operator scope (book session, log entry)
 * - page: only on specific routes (future: page-specific actions)
 */
export type CommandScope = 'global' | 'operator' | 'page';

/**
 * What kind of thing the command does.
 * Drives section headers in the palette UI.
 */
export type CommandKind = 'nav' | 'action' | 'utility';

// ============================================================
// COMMAND CONTEXT (runtime state)
// ============================================================

/**
 * Everything the palette needs to decide which commands are visible
 * and how to execute them. Built from bootstrap data on each open.
 */
export interface CommandContext {
  /** Current user's role. */
  role: PortalRole;
  /** Current user's UID. */
  uid: string;
  /** Selected operator ID, or 'all' if multi-operator / none selected. */
  operatorScope: string;
  /** All operator IDs the actor has access to. */
  operatorIds: string[];
  /** Resolved portal features for the primary operator. */
  features: PortalFeature[];
  /** Primary operator's vertical. */
  vertical: Vertical | 'multi';
  /** Current page route (e.g. '/portal/dashboard'). */
  page: string;
}

// ============================================================
// COMMAND DEFINITION
// ============================================================

/**
 * A single command in the palette registry.
 * Pure declaration — no framework coupling.
 */
export interface CommandDef {
  /**
   * Unique identifier. Convention: 'kind:slug' (e.g. 'nav:dashboard').
   * Also serves as the stable analytics key for tracking command usage.
   * Do NOT rename existing IDs without a migration plan.
   */
  id: CommandId;
  /** Display title in the palette (e.g. "Go to Dashboard"). */
  title: string;
  /** Optional subtitle / description shown below the title. */
  subtitle?: string;
  /** Icon key from EngineIcons registry. */
  icon: string;
  /** Command classification — drives section grouping. */
  kind: CommandKind;
  /** Palette scope — determines operator-scope gating. */
  scope: CommandScope;
  /** Extra search terms that match this command (operator synonyms merged in). */
  keywords?: string[];
  /** Minimum role required to see this command. */
  minRole?: PortalRole;
  /** Portal features that must be active for this command to appear. */
  requiresFeatures?: PortalFeature[];
  /**
   * Dynamic visibility predicate. Called with runtime context.
   * Return false to hide this command even if other gates pass.
   */
  when?: (ctx: CommandContext) => boolean;
  /**
   * Execute the command. Receives runtime context.
   * For navigation: set window.location or use navigate().
   * For actions: trigger the relevant page function.
   */
  run: (ctx: CommandContext) => void | Promise<void>;
}

// ============================================================
// OPERATOR CONFIG (white-label overrides)
// ============================================================

/**
 * Operator-level command palette configuration.
 * Lives in core.json → portal.commands.
 */
export interface PortalCommandsConfig {
  /** Master switch — defaults to true. */
  enabled?: boolean;
  /** Command IDs to pin at the top of results (shown first, in order). */
  pinned?: CommandId[];
  /** Command IDs to remove from the palette entirely. */
  hidden?: CommandId[];
  /** Extra search keywords per command ID (operator-specific terminology). */
  synonyms?: Record<CommandId, string[]>;
}
