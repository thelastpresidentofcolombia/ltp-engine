/**
 * Command Palette — Client-Side UI Component
 *
 * ENGINE CONTRACT:
 * - Pure DOM — no framework dependency.
 * - Mounted once in the persisted shell (survives view transitions).
 * - Opens via Cmd+K / Ctrl+K, closes via Esc or backdrop click.
 * - Arrow keys navigate, Enter runs selected command.
 * - Focus trap: Tab/Shift+Tab stay inside the palette.
 * - Sections: Pinned / Navigation / Actions / Utilities.
 *
 * OPERATOR SELECTION RULE:
 * - Commands with scope:'operator' require operatorScope !== 'all'.
 * - If multi-operator, the palette shows an operator picker first.
 *   (v1: we auto-scope to the first operator — multi-op picker is future.)
 */

import type { CommandContext, CommandDef, PortalCommandsConfig } from '../../types/commands';
import type { PortalBootstrapV2 } from '../../types/portal';
import { resolveCommands, groupCommands } from './commandRegistry';
import { searchCommands, pushRecentCommand, getRecentCommandIds } from './commandSearch';
import { getIcon } from '../ui/icons';
import { getActiveOperatorId } from './portalNav';

// ============================================================
// STATE
// ============================================================

let paletteEl: HTMLElement | null = null;
let inputEl: HTMLInputElement | null = null;
let listEl: HTMLElement | null = null;
let mounted = false;
let isOpen = false;
let activeIndex = 0;
let currentCommands: CommandDef[] = [];
let resolvedCommands: CommandDef[] = [];
let ctx: CommandContext | null = null;
let operatorCfg: PortalCommandsConfig | undefined;
let bootstrapRef: PortalBootstrapV2 | null = null;
let priorFocusEl: HTMLElement | null = null;
let isMac = false;

/** When non-null, the palette shows an operator picker before running this command. */
let pendingOperatorCmd: CommandDef | null = null;

/** Commands mapped to ⌘1–⌘9 shortcuts (Recent + Pinned items, max 9). */
let shortcutCommands: CommandDef[] = [];

// ============================================================
// MOUNT (one-time DOM creation)
// ============================================================

function ensureMount(): void {
  if (mounted) return;
  mounted = true;

  // Create palette root
  const root = document.createElement('div');
  root.id = 'command-palette';
  root.className = 'cp-overlay';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Command palette');
  root.style.display = 'none';

  root.innerHTML = `
    <div class="cp-backdrop"></div>
    <div class="cp-modal">
      <div class="cp-input-wrap">
        <span class="cp-input-icon">${getIcon('search')}</span>
        <input
          id="cp-input"
          class="cp-input"
          type="text"
          placeholder="Type a command…"
          autocomplete="off"
          spellcheck="false"
          aria-controls="cp-results"
          aria-activedescendant=""
        />
        <kbd class="cp-kbd">esc</kbd>
      </div>
      <div id="cp-results" class="cp-list" role="listbox" aria-label="Commands"></div>
      <div class="cp-footer">
        <span class="cp-footer-hint"><kbd>↑↓</kbd> navigate</span>
        <span class="cp-footer-hint"><kbd>↵</kbd> run</span>
        <span class="cp-footer-hint"><kbd>esc</kbd> close</span>
      </div>
    </div>
  `;

  // Insert into persisted shell (inside #portal-shell so it survives transitions)
  const shell = document.getElementById('portal-shell');
  if (shell) {
    shell.appendChild(root);
  } else {
    document.body.appendChild(root);
  }

  paletteEl = root;
  inputEl = root.querySelector('.cp-input') as HTMLInputElement;
  listEl = root.querySelector('.cp-list') as HTMLElement;

  // ── Event listeners ──

  // Backdrop click closes
  root.querySelector('.cp-backdrop')?.addEventListener('click', close);

  // Input drives search
  inputEl?.addEventListener('input', () => {
    const query = inputEl?.value ?? '';
    renderResults(query);
  });

  // Keyboard nav inside palette
  root.addEventListener('keydown', handlePaletteKeydown);
}

// ============================================================
// OPEN / CLOSE
// ============================================================

function open(): void {
  if (isOpen || !paletteEl || !inputEl) return;
  isOpen = true;
  pendingOperatorCmd = null;

  // Save current focus for restoration on close
  priorFocusEl = document.activeElement as HTMLElement | null;

  // Resolve commands fresh each open (context may have changed)
  if (ctx) {
    resolvedCommands = resolveCommands(ctx, operatorCfg);
  }

  paletteEl.style.display = '';
  inputEl.value = '';
  inputEl.placeholder = 'Type a command…';
  activeIndex = 0;
  renderResults('');

  // Focus input on next frame (after display:none is cleared)
  requestAnimationFrame(() => {
    inputEl?.focus();
  });
}

function close(): void {
  if (!isOpen || !paletteEl || !inputEl) return;
  isOpen = false;
  pendingOperatorCmd = null;
  paletteEl.style.display = 'none';
  inputEl.value = '';

  // Restore focus to the element that was focused before palette opened
  if (priorFocusEl && typeof priorFocusEl.focus === 'function') {
    priorFocusEl.focus();
    priorFocusEl = null;
  }
}

function toggle(): void {
  isOpen ? close() : open();
}

// ============================================================
// RENDERING
// ============================================================

function renderResults(query: string): void {
  if (!listEl) return;

  // ── Operator picker mode ──
  if (pendingOperatorCmd && bootstrapRef) {
    renderOperatorPicker();
    return;
  }

  const scored = searchCommands(resolvedCommands, query);
  currentCommands = scored.map((s) => s.command);

  if (currentCommands.length === 0) {
    listEl.innerHTML = `
      <div class="cp-empty">
        <span class="cp-empty-icon">${getIcon('search')}</span>
        <span>No commands found</span>
      </div>
    `;
    updateAriaActiveDescendant(null);
    return;
  }

  // Group into sections (only when no search query — search shows flat list)
  if (!query.trim()) {
    const recentIds = getRecentCommandIds();
    const sections = groupCommands(currentCommands, operatorCfg?.pinned, recentIds);
    let globalIdx = 0;
    let shortcutIdx = 1;
    shortcutCommands = [];
    let html = '';

    for (const section of sections) {
      const isShortcutable = section.label === 'Recent' || section.label === 'Pinned';
      html += `<div class="cp-section-label">${section.label}</div>`;
      for (const cmd of section.commands) {
        const scIdx = isShortcutable && shortcutIdx <= 9 ? shortcutIdx++ : undefined;
        if (scIdx !== undefined) shortcutCommands.push(cmd);
        html += renderItem(cmd, globalIdx, scIdx);
        globalIdx++;
      }
    }

    listEl.innerHTML = html;
  } else {
    // Flat list for search results
    shortcutCommands = [];
    listEl.innerHTML = currentCommands
      .map((cmd, i) => renderItem(cmd, i))
      .join('');
  }

  // Reset active index
  activeIndex = 0;
  updateActiveHighlight();

  // Wire click + hover handlers
  listEl.querySelectorAll('.cp-item').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-index') ?? '0', 10);
      runCommand(idx);
    });
    el.addEventListener('mouseenter', () => {
      activeIndex = parseInt(el.getAttribute('data-index') ?? '0', 10);
      updateActiveHighlight();
    });
  });
}

/**
 * Operator Picker — inline step within the palette.
 * Shows when a user selects an operator-scoped command while in multi-op mode.
 * Each operator row shows brand name + accent dot. Picking one runs the
 * pending command with a scoped context.
 */
function renderOperatorPicker(): void {
  if (!listEl || !pendingOperatorCmd || !bootstrapRef || !ctx) return;

  // Pre-sort: move last-used operator to top for easy re-selection
  let operatorIds = [...ctx.operatorIds];
  try {
    const lastOpId = sessionStorage.getItem('cp:lastOperatorId');
    if (lastOpId && operatorIds.includes(lastOpId)) {
      operatorIds = [lastOpId, ...operatorIds.filter((id) => id !== lastOpId)];
    }
  } catch { /* private mode */ }

  shortcutCommands = [];
  let html = `<div class="cp-section-label">Choose operator for "${pendingOperatorCmd.title}"</div>`;

  operatorIds.forEach((opId, i) => {
    const op = bootstrapRef!.operators[opId];
    const name = op?.brandName ?? opId;
    const accent = op?.accentColor ?? 'var(--portal-accent)';
    const itemId = `cp-op-${i}`;
    html += `
      <div id="${itemId}" class="cp-item cp-operator-pick" data-index="${i}" data-op-id="${opId}" role="option" aria-selected="false" tabindex="-1">
        <span class="cp-op-dot" style="background:${accent}"></span>
        <div class="cp-item-text">
          <span class="cp-item-title">${name}</span>
          <span class="cp-item-subtitle">${opId}</span>
        </div>
        <span class="cp-item-hint">Select</span>
      </div>
    `;
  });

  listEl.innerHTML = html;

  // Build a virtual "currentCommands" so keyboard nav + runCommand still works
  // We stash operator IDs in a temporary array and intercept in a click handler
  currentCommands = []; // clear — operator rows aren't commands
  activeIndex = 0;
  updateActiveHighlight();

  // Wire click + hover
  listEl.querySelectorAll('.cp-operator-pick').forEach((el) => {
    el.addEventListener('click', () => {
      const opId = el.getAttribute('data-op-id');
      if (opId) runWithOperator(opId);
    });
    el.addEventListener('mouseenter', () => {
      activeIndex = parseInt(el.getAttribute('data-index') ?? '0', 10);
      updateActiveHighlight();
    });
  });

  // Override Enter to pick the active operator
  const originalKeydown = handlePaletteKeydown;
  const opKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const activeEl = listEl?.querySelector('.cp-item--active');
      const opId = activeEl?.getAttribute('data-op-id');
      if (opId) runWithOperator(opId);
    } else if (e.key === 'Escape') {
      // Escape goes back to main palette (not close entirely)
      e.preventDefault();
      e.stopPropagation();
      pendingOperatorCmd = null;
      if (inputEl) inputEl.placeholder = 'Type a command…';
      activeIndex = 0;
      renderResults('');
    } else {
      originalKeydown(e);
    }
  };

  // Temporarily swap the keydown handler
  paletteEl?.removeEventListener('keydown', handlePaletteKeydown);
  paletteEl?.addEventListener('keydown', opKeydown);

  // Store cleanup so we can restore original handler
  (listEl as any).__opCleanup = () => {
    paletteEl?.removeEventListener('keydown', opKeydown);
    paletteEl?.addEventListener('keydown', handlePaletteKeydown);
  };
}

/** Run a command scoped to a specific operator. Persists choice for future auto-use. */
function runWithOperator(operatorId: string, explicitCmd?: CommandDef): void {
  const cmd = explicitCmd ?? pendingOperatorCmd;
  if (!cmd || !ctx) return;

  pendingOperatorCmd = null;

  // Cleanup operator-picker keyboard override (if picker was shown)
  if ((listEl as any).__opCleanup) {
    (listEl as any).__opCleanup();
    delete (listEl as any).__opCleanup;
  }

  // Persist operator choice — per-command (granular) + global (fallback)
  try {
    sessionStorage.setItem('cp:lastOperatorId', operatorId);
    if (cmd.id) sessionStorage.setItem(`cp:lastOperatorId:${cmd.id}`, operatorId);
  } catch { /* storage full / private mode */ }

  // Create a scoped context for this specific operator
  const scopedCtx: CommandContext = {
    ...ctx,
    operatorScope: operatorId,
  };

  pushRecentCommand(cmd.id);
  close();

  try {
    cmd.run(scopedCtx);
  } catch (err) {
    console.error(`[CommandPalette] Failed to run "${cmd.id}" for operator "${operatorId}":`, err);
  }
}

function renderItem(cmd: CommandDef, index: number, shortcutIndex?: number): string {
  const iconHtml = getIcon(cmd.icon as any) || '';
  const subtitleHtml = cmd.subtitle
    ? `<span class="cp-item-subtitle">${cmd.subtitle}</span>`
    : '';

  // Shortcut badge (⌘1–⌘9) for Recent/Pinned items; otherwise generic hint
  let hintHtml: string;
  if (shortcutIndex !== undefined && shortcutIndex >= 1 && shortcutIndex <= 9) {
    const mod = isMac ? '⌘' : '⌃';
    hintHtml = `<kbd class="cp-shortcut-kbd">${mod}${shortcutIndex}</kbd>`;
  } else {
    const hint = cmd.kind === 'nav' ? 'Open' : cmd.kind === 'action' ? 'Run' : '';
    hintHtml = hint ? `<span class="cp-item-hint">${hint}</span>` : '';
  }

  const itemId = `cp-item-${index}`;

  return `
    <div id="${itemId}" class="cp-item" data-index="${index}" data-id="${cmd.id}" role="option" aria-selected="false" tabindex="-1">
      <span class="cp-item-icon">${iconHtml}</span>
      <div class="cp-item-text">
        <span class="cp-item-title">${cmd.title}</span>
        ${subtitleHtml}
      </div>
      ${hintHtml}
    </div>
  `;
}

function updateActiveHighlight(): void {
  if (!listEl) return;
  const items = listEl.querySelectorAll('.cp-item');
  let activeItemId: string | null = null;
  items.forEach((el, i) => {
    const isActive = i === activeIndex;
    el.classList.toggle('cp-item--active', isActive);
    el.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) {
      activeItemId = el.id;
      el.scrollIntoView({ block: 'nearest' });
    }
  });
  updateAriaActiveDescendant(activeItemId);
}

/** Keep aria-activedescendant in sync with the highlighted item. */
function updateAriaActiveDescendant(itemId: string | null): void {
  if (inputEl) {
    if (itemId) {
      inputEl.setAttribute('aria-activedescendant', itemId);
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
  }
}

// ============================================================
// KEYBOARD HANDLING
// ============================================================

function handlePaletteKeydown(e: KeyboardEvent): void {
  // ⌘1–⌘9 / Ctrl+1–9 → run shortcutted command (only when input is empty)
  const inputEmpty = !inputEl?.value;
  if (inputEmpty && (e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
    const idx = parseInt(e.key, 10) - 1;
    if (idx < shortcutCommands.length) {
      e.preventDefault();
      const cmdIdx = currentCommands.indexOf(shortcutCommands[idx]);
      if (cmdIdx !== -1) runCommand(cmdIdx);
    }
    return;
  }

  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      close();
      break;

    case 'ArrowDown':
      e.preventDefault();
      if (currentCommands.length > 0) {
        activeIndex = (activeIndex + 1) % currentCommands.length;
        updateActiveHighlight();
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (currentCommands.length > 0) {
        activeIndex = (activeIndex - 1 + currentCommands.length) % currentCommands.length;
        updateActiveHighlight();
      }
      break;

    case 'Enter':
      e.preventDefault();
      runCommand(activeIndex);
      break;

    case 'Tab':
      // Focus trap: keep Tab inside the palette
      e.preventDefault();
      inputEl?.focus();
      break;
  }
}

/**
 * Global keyboard listener. Registered once, survives view transitions.
 */
function handleGlobalKeydown(e: KeyboardEvent): void {
  // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }
}

// ============================================================
// COMMAND EXECUTION
// ============================================================

function runCommand(index: number): void {
  const cmd = currentCommands[index];
  if (!cmd || !ctx) return;

  // ── Operator selection gate ──
  // Commands with scope:'operator' need an operatorId.
  // switch-operator always forces the picker (user explicitly wants to choose).
  // Other operator-scoped commands auto-use remembered operator when available.
  const isSwitchOp = cmd.id === 'util:switch-operator';
  const needsPicker = cmd.scope === 'operator' && ctx.operatorIds.length > 1 && !pendingOperatorCmd;

  if (needsPicker) {
    // For switch-operator: always show picker, even if already scoped
    if (isSwitchOp) {
      pendingOperatorCmd = cmd;
      activeIndex = 0;
      if (inputEl) {
        inputEl.value = '';
        inputEl.placeholder = 'Switch to operator…';
      }
      renderResults('');
      return;
    }

    // For other operator-scoped commands: only gate if not already scoped
    if (ctx.operatorScope === 'all') {
      try {
        // Per-command memory takes priority, then global fallback
        const perCmdKey = `cp:lastOperatorId:${cmd.id}`;
        const lastOpId = sessionStorage.getItem(perCmdKey)
          ?? sessionStorage.getItem('cp:lastOperatorId');
        if (lastOpId && ctx.operatorIds.includes(lastOpId)) {
          runWithOperator(lastOpId, cmd);
          return;
        }
      } catch { /* private mode */ }

      pendingOperatorCmd = cmd;
      activeIndex = 0;
      if (inputEl) {
        inputEl.value = '';
        inputEl.placeholder = 'Choose operator…';
      }
      renderResults('');
      return;
    }
  }

  // Track recently used
  pushRecentCommand(cmd.id);

  // Close palette first
  close();

  // Execute
  try {
    cmd.run(ctx);
  } catch (err) {
    console.error(`[CommandPalette] Failed to run "${cmd.id}":`, err);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Initialize the command palette. Called once from PortalLayout.
 * Idempotent — safe to call on view transitions.
 *
 * @param bootstrap - Current bootstrap data (actor, features, operators)
 * @param cmdConfig - Operator-level command overrides (optional)
 */
export function initCommandPalette(
  bootstrap: PortalBootstrapV2,
  cmdConfig?: PortalCommandsConfig,
): void {
  // Build context from bootstrap
  const operatorIds = Object.keys(bootstrap.operators);
  const primaryOp = operatorIds.length > 0 ? bootstrap.operators[operatorIds[0]] : null;

  ctx = {
    role: bootstrap.actor.role,
    uid: bootstrap.actor.uid,
    operatorScope: getActiveOperatorId() || (operatorIds.length === 1 ? operatorIds[0] : 'all'),
    operatorIds,
    features: bootstrap.features,
    vertical: primaryOp?.vertical ?? 'multi',
    page: window.location.pathname,
  };

  operatorCfg = cmdConfig;
  bootstrapRef = bootstrap;
  isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

  // Mount DOM (once)
  ensureMount();

  // Register global keyboard listener (once — removeEventListener is safe if already removed)
  document.removeEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('keydown', handleGlobalKeydown);
}

/**
 * Toggle the palette open/closed. Used by sidebar hint button.
 */
export function togglePalette(): void {
  toggle();
}

/**
 * Update palette context (e.g., after navigation changes the current page).
 */
export function updatePaletteContext(page: string): void {
  if (ctx) {
    ctx.page = page;
  }
}
