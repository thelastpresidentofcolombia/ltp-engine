/**
 * Command Palette Search — Lightweight Fuzzy Scoring
 *
 * No external dependencies. Scoring:
 *   - Prefix match on title:   +5
 *   - Contains on title:       +3
 *   - Prefix match on keyword: +4
 *   - Contains on keyword:     +2
 *   - Recently used:           +2  (last 10 stored in sessionStorage)
 *
 * Normalization: lowercase + strip diacritics.
 */

import type { CommandDef } from '../../types/commands';

// ============================================================
// NORMALIZATION
// ============================================================

/**
 * Normalize a string for search: lowercase + strip diacritics.
 * Uses NFKD decomposition + regex to remove combining marks.
 */
function normalize(str: string): string {
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ============================================================
// RECENTLY USED (sessionStorage)
// ============================================================

const RECENT_KEY = 'ltp_cmd_recent';
const MAX_RECENT = 10;

export function getRecentCommandIds(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecentCommand(commandId: string): void {
  try {
    const recent = getRecentCommandIds().filter((id) => id !== commandId);
    recent.unshift(commandId);
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {}
}

// ============================================================
// SCORING
// ============================================================

export interface ScoredCommand {
  command: CommandDef;
  score: number;
}

/**
 * Score and filter commands against a search query.
 * Returns commands sorted by score descending.
 * Empty query returns all commands (no filtering).
 */
export function searchCommands(
  commands: CommandDef[],
  query: string,
): ScoredCommand[] {
  const q = normalize(query);
  const recent = new Set(getRecentCommandIds());

  // Empty query → return all with recency boost only
  if (!q) {
    return commands.map((command) => ({
      command,
      score: recent.has(command.id) ? 2 : 0,
    }));
  }

  const results: ScoredCommand[] = [];

  for (const command of commands) {
    let score = 0;
    const title = normalize(command.title);

    // Title matches
    if (title.startsWith(q)) {
      score += 5;
    } else if (title.includes(q)) {
      score += 3;
    }

    // Keyword matches
    const keywords = command.keywords ?? [];
    for (const kw of keywords) {
      const nkw = normalize(kw);
      if (nkw.startsWith(q)) {
        score = Math.max(score, 4);
      } else if (nkw.includes(q)) {
        score = Math.max(score, 2);
      }
    }

    // Subtitle match (lower priority)
    if (command.subtitle) {
      const sub = normalize(command.subtitle);
      if (sub.includes(q)) {
        score = Math.max(score, 1);
      }
    }

    // Recency boost
    if (recent.has(command.id)) {
      score += 2;
    }

    if (score > 0) {
      results.push({ command, score });
    }
  }

  // Sort by score descending, then by title alphabetically
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.command.title.localeCompare(b.command.title);
  });

  return results;
}
