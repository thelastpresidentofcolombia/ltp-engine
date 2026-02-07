/**
 * Command Registry — Engine Single Source of Truth
 *
 * ENGINE CONTRACT:
 * - All palette commands are declared here.
 * - resolveCommands() merges core + feature commands, applies gates,
 *   then overlays operator overrides (pinned / hidden / synonyms).
 * - Result: a final ordered CommandDef[] ready for the palette UI.
 *
 * OPERATOR SELECTION RULE:
 * - Any command with scope:'operator' requires operatorScope !== 'all'.
 * - If operatorScope is 'all', the palette should prompt "Which operator?"
 *   before running the command. This is handled in CommandPalette.client.ts.
 */

import type {
  CommandDef,
  CommandContext,
  CommandKind,
  PortalCommandsConfig,
} from '../../types/commands';
import type { PortalFeature } from '../../types/portal';
import { portalNavigate } from './portalNav';

// ============================================================
// CORE COMMANDS (always available when feature is active)
// ============================================================

/** Navigation commands — one per portal page. */
const NAV_COMMANDS: CommandDef[] = [
  {
    id: 'nav:dashboard',
    title: 'Go to Dashboard',
    subtitle: 'Overview and quick stats',
    icon: 'grid',
    kind: 'nav',
    scope: 'global',
    keywords: ['home', 'overview', 'stats', 'summary'],
    requiresFeatures: ['dashboard'],
    run: () => { portalNavigate('dashboard'); },
  },
  {
    id: 'nav:sessions',
    title: 'Go to Sessions',
    subtitle: 'Book and manage sessions',
    icon: 'calendar',
    kind: 'nav',
    scope: 'global',
    keywords: ['bookings', 'appointments', 'schedule', 'meetings'],
    requiresFeatures: ['sessions'],
    run: () => { portalNavigate('sessions'); },
  },
  {
    id: 'nav:programs',
    title: 'Go to Programs',
    subtitle: 'Your active programs and resources',
    icon: 'package',
    kind: 'nav',
    scope: 'global',
    keywords: ['courses', 'entitlements', 'resources', 'materials'],
    requiresFeatures: ['programs'],
    run: () => { portalNavigate('programs'); },
  },
  {
    id: 'nav:entries',
    title: 'Go to Updates',
    subtitle: 'Log and view check-in entries',
    icon: 'file-text',
    kind: 'nav',
    scope: 'global',
    keywords: ['check-ins', 'log', 'metrics', 'updates', 'entries'],
    requiresFeatures: ['entries'],
    run: () => { portalNavigate('entries'); },
  },
  {
    id: 'nav:timeline',
    title: 'Go to Timeline',
    subtitle: 'Visualize your progress over time',
    icon: 'chart',
    kind: 'nav',
    scope: 'global',
    keywords: ['chart', 'graph', 'progress', 'metrics', 'trends'],
    requiresFeatures: ['timeline'],
    run: () => { portalNavigate('timeline'); },
  },
  {
    id: 'nav:messages',
    title: 'Go to Messages',
    subtitle: 'Conversations with your coach',
    icon: 'message',
    kind: 'nav',
    scope: 'global',
    keywords: ['chat', 'inbox', 'conversations', 'messaging'],
    requiresFeatures: ['messaging'],
    run: () => { portalNavigate('messages'); },
  },
  {
    id: 'nav:goals',
    title: 'Go to Goals',
    subtitle: 'Track and manage your goals',
    icon: 'target',
    kind: 'nav',
    scope: 'global',
    keywords: ['objectives', 'targets', 'milestones', 'habits'],
    requiresFeatures: ['goals'],
    run: () => { portalNavigate('goals'); },
  },
  {
    id: 'nav:reports',
    title: 'Go to Reports',
    subtitle: 'Generate and download reports',
    icon: 'clipboard',
    kind: 'nav',
    scope: 'global',
    keywords: ['pdf', 'export', 'download', 'summary', 'report'],
    requiresFeatures: ['reports'],
    run: () => { portalNavigate('reports'); },
  },
  {
    id: 'nav:profile',
    title: 'Go to Profile',
    subtitle: 'Your account and settings',
    icon: 'user',
    kind: 'nav',
    scope: 'global',
    keywords: ['account', 'settings', 'preferences', 'personal'],
    requiresFeatures: ['profile'],
    run: () => { portalNavigate('profile'); },
  },
];

// ============================================================
// FEATURE COMMANDS (actions gated by portal features)
// ============================================================

/** Action commands — primary things a user "does." */
const FEATURE_COMMANDS: CommandDef[] = [
  {
    id: 'action:book-session',
    title: 'Book a Session',
    subtitle: 'Schedule a new session with your coach',
    icon: 'calendar',
    kind: 'action',
    scope: 'operator',
    keywords: ['schedule', 'appointment', 'booking', 'meeting', 'call'],
    requiresFeatures: ['sessions'],
    run: (ctx) => { portalNavigate('sessions', ctx.operatorScope !== 'all' ? ctx.operatorScope : undefined); },
  },
  {
    id: 'action:log-update',
    title: 'Log an Update',
    subtitle: 'Record a new check-in entry',
    icon: 'file-text',
    kind: 'action',
    scope: 'operator',
    keywords: ['check-in', 'entry', 'metrics', 'weight', 'log', 'record'],
    requiresFeatures: ['entries'],
    run: (ctx) => { portalNavigate('entries', ctx.operatorScope !== 'all' ? ctx.operatorScope : undefined); },
  },
  {
    id: 'action:create-goal',
    title: 'Create Goal',
    subtitle: 'Set a new goal to track',
    icon: 'target',
    kind: 'action',
    scope: 'operator',
    keywords: ['new goal', 'objective', 'target', 'add goal'],
    requiresFeatures: ['goals'],
    run: (ctx) => { portalNavigate('goals#new', ctx.operatorScope !== 'all' ? ctx.operatorScope : undefined); },
  },
  {
    id: 'action:generate-report',
    title: 'Generate Report',
    subtitle: 'Create a progress or summary report',
    icon: 'clipboard',
    kind: 'action',
    scope: 'operator',
    keywords: ['pdf', 'export', 'download', 'print', 'progress report'],
    requiresFeatures: ['reports'],
    run: (ctx) => { portalNavigate('reports', ctx.operatorScope !== 'all' ? ctx.operatorScope : undefined); },
  },
  {
    id: 'action:new-message',
    title: 'New Message',
    subtitle: 'Start a conversation',
    icon: 'send',
    kind: 'action',
    scope: 'operator',
    keywords: ['chat', 'send', 'compose', 'write', 'contact'],
    requiresFeatures: ['messaging'],
    run: (ctx) => { portalNavigate('messages', ctx.operatorScope !== 'all' ? ctx.operatorScope : undefined); },
  },
];

// ============================================================
// UTILITY COMMANDS
// ============================================================

const UTILITY_COMMANDS: CommandDef[] = [
  {
    id: 'util:shortcuts',
    title: 'Keyboard Shortcuts',
    subtitle: '⌘K palette · ↑↓ navigate · ↵ run · Esc close',
    icon: 'command',
    kind: 'utility',
    scope: 'global',
    keywords: ['help', 'keys', 'hotkeys', 'shortcuts', 'keyboard', 'what can I do'],
    run: () => {
      // No-op: the subtitle IS the help content. Selecting it just closes the palette.
    },
  },
  {
    id: 'util:switch-operator',
    title: 'Switch Operator',
    subtitle: 'Navigate to a different operator portal',
    icon: 'users',
    kind: 'utility',
    scope: 'operator',
    keywords: ['operator', 'switch', 'change', 'workspace', 'space', 'context'],
    when: (ctx) => ctx.operatorIds.length > 1,
    run: (ctx) => {
      try {
        // Clear global + all per-command operator memory
        const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('cp:lastOperatorId'));
        keys.forEach((k) => sessionStorage.removeItem(k));
      } catch { /* noop */ }
      // Navigate to the picked operator's dashboard
      portalNavigate('dashboard', ctx.operatorScope !== 'all' ? ctx.operatorScope : undefined);
    },
  },
  {
    id: 'util:sign-out',
    title: 'Sign Out',
    subtitle: 'Log out of the portal',
    icon: 'log-out',
    kind: 'utility',
    scope: 'global',
    keywords: ['logout', 'disconnect', 'exit', 'leave'],
    run: () => {
      document.getElementById('sidebar-logout')?.click();
    },
  },
];

// ============================================================
// ALL COMMANDS (flat registry)
// ============================================================

const ALL_COMMANDS: CommandDef[] = [
  ...NAV_COMMANDS,
  ...FEATURE_COMMANDS,
  ...UTILITY_COMMANDS,
];

// ============================================================
// ROLE HIERARCHY (for minRole gating)
// ============================================================

const ROLE_LEVEL: Record<string, number> = {
  client: 0,
  coach: 1,
  admin: 2,
};

// ============================================================
// RESOLVER
// ============================================================

/**
 * Resolves the final command list based on runtime context + operator config.
 *
 * Pipeline:
 * 1. Start with ALL_COMMANDS
 * 2. Filter by requiresFeatures (must all be in ctx.features)
 * 3. Filter by minRole (actor role must be >= minRole)
 * 4. Filter by when() predicate
 * 5. Remove operator-hidden commands
 * 6. Merge operator synonyms into keywords
 * 7. Apply pin ordering (pinned first, then nav → action → utility)
 * 8. Remove commands for current page (don't show "Go to Dashboard" on dashboard)
 */
export function resolveCommands(
  ctx: CommandContext,
  operatorCfg?: PortalCommandsConfig,
): CommandDef[] {
  const hidden = new Set(operatorCfg?.hidden ?? []);
  const pinned = operatorCfg?.pinned ?? [];
  const synonyms = operatorCfg?.synonyms ?? {};
  const actorLevel = ROLE_LEVEL[ctx.role] ?? 0;

  // Resolve current page's nav ID so we can suppress "Go to X" when already on X
  const currentNavId = pageToNavId(ctx.page);

  const resolved = ALL_COMMANDS
    .filter((cmd) => {
      // Hidden by operator
      if (hidden.has(cmd.id)) return false;
      // Feature gate
      if (cmd.requiresFeatures?.length) {
        if (!cmd.requiresFeatures.every((f) => ctx.features.includes(f))) return false;
      }
      // Role gate
      if (cmd.minRole && (ROLE_LEVEL[cmd.minRole] ?? 0) > actorLevel) return false;
      // Dynamic gate
      if (cmd.when && !cmd.when(ctx)) return false;
      // Suppress current page nav
      if (cmd.kind === 'nav' && cmd.id === `nav:${currentNavId}`) return false;
      return true;
    })
    .map((cmd) => {
      // Merge operator synonyms
      const extra = synonyms[cmd.id];
      if (extra?.length) {
        return { ...cmd, keywords: [...(cmd.keywords ?? []), ...extra] };
      }
      return cmd;
    });

  // Sort: pinned first (in order), then by kind (nav → action → utility)
  const kindOrder: Record<CommandKind, number> = { nav: 0, action: 1, utility: 2 };
  const pinnedSet = new Set(pinned);

  resolved.sort((a, b) => {
    const aPinIdx = pinned.indexOf(a.id);
    const bPinIdx = pinned.indexOf(b.id);
    const aPinned = aPinIdx !== -1;
    const bPinned = bPinIdx !== -1;

    // Pinned items first, in pinned order
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    if (aPinned && bPinned) return aPinIdx - bPinIdx;

    // Then by kind
    return (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9);
  });

  return resolved;
}

/**
 * Extract the nav feature ID from a portal route.
 * e.g. '/portal/dashboard' → 'dashboard', '/portal/messages' → 'messaging'
 */
function pageToNavId(page: string): string {
  // Handle operator-scoped: /portal/{opId}/{page}
  const scopedMatch = page.match(/^\/portal\/[^/]+\/([^/?#]+)/);
  const slug = scopedMatch
    ? scopedMatch[1]
    : page.replace(/^\/portal\/?/, '').replace(/\/.*$/, '') || 'dashboard';
  // Map page slugs that differ from feature IDs
  const slugMap: Record<string, string> = {
    messages: 'messaging',
  };
  return slugMap[slug] ?? slug;
}

// ============================================================
// SECTION HELPERS (for palette UI grouping)
// ============================================================

export interface CommandSection {
  label: string;
  commands: CommandDef[];
}

/**
 * Groups resolved commands into display sections.
 * Order: Recent → Pinned → Navigation → Actions → Utilities.
 * A command in Recent is NOT duplicated in its kind section.
 */
export function groupCommands(
  commands: CommandDef[],
  pinnedIds?: string[],
  recentIds?: string[],
): CommandSection[] {
  const pinnedSet = new Set(pinnedIds ?? []);
  const recentSet = new Set(recentIds ?? []);
  const promotedSet = new Set([...pinnedSet, ...recentSet]);
  const sections: CommandSection[] = [];

  // Recent: commands the user has run before (in recency order)
  const recent = (recentIds ?? [])
    .map((id) => commands.find((c) => c.id === id))
    .filter((c): c is CommandDef => !!c);
  // Pinned: operator-promoted commands (excluding those already in recent)
  const pinned = commands.filter((c) => pinnedSet.has(c.id) && !recentSet.has(c.id));
  // Remaining: grouped by kind, excluding recent + pinned
  const nav = commands.filter((c) => !promotedSet.has(c.id) && c.kind === 'nav');
  const actions = commands.filter((c) => !promotedSet.has(c.id) && c.kind === 'action');
  const utilities = commands.filter((c) => !promotedSet.has(c.id) && c.kind === 'utility');

  if (recent.length) sections.push({ label: 'Recent', commands: recent });
  if (pinned.length) sections.push({ label: 'Pinned', commands: pinned });
  if (nav.length) sections.push({ label: 'Navigation', commands: nav });
  if (actions.length) sections.push({ label: 'Actions', commands: actions });
  if (utilities.length) sections.push({ label: 'Utilities', commands: utilities });

  return sections;
}
