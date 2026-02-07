/**
 * Dashboard Widget Registry — Engine Contract
 *
 * ENGINE CONTRACT:
 * - Defines every renderable dashboard widget.
 * - Operators configure which widgets to show via portal.dashboard.widgets[].
 * - Engine defaults provide a safe starting set.
 * - Staff/admin get extra widgets automatically.
 *
 * WIDGET LIFECYCLE:
 *   1. Bootstrap loads → resolved portal config available
 *   2. Dashboard reads portal.dashboard.widgets (or ENGINE_DEFAULT_WIDGETS)
 *   3. For each widget ID, call WIDGET_REGISTRY[id].render(container, data, ctx)
 *   4. Widget renders into its container element
 */

import type { PortalBootstrapV2, PortalRole } from '../../types/portal';
import type { ResolvedPortalConfig } from '../engine/resolvePortalFeatures';
import { getIcon, emptyStateHtml } from '../ui/icons';
import { portalHref } from './portalNav';

// ============================================================
// WIDGET ID UNION
// ============================================================

export type WidgetId =
  | 'welcome'
  | 'upcoming'
  | 'quick-actions'
  | 'activity-feed'
  | 'metrics-snapshot'
  | 'goals-progress'
  | 'streak'
  | 'announcements'
  | 'media-recent'
  | 'member-summary'
  | 'operator-stats';

// ============================================================
// WIDGET CONTEXT
// ============================================================

export interface WidgetContext {
  bootstrap: PortalBootstrapV2;
  portal: ResolvedPortalConfig | null;
  operatorId: string | null;
  operatorName: string;
  accentColor: string;
  role: PortalRole;
  greeting: string;
  /** Operator vertical — drives polymorphic hero selection */
  vertical: string;
}

// ============================================================
// ENGINE DEFAULTS
// ============================================================

export const ENGINE_DEFAULT_WIDGETS: WidgetId[] = [
  'welcome',
  'upcoming',
  'quick-actions',
  'activity-feed',
];

/** Extra widgets automatically added for staff/admin roles. */
export const STAFF_WIDGETS: WidgetId[] = ['member-summary'];
export const ADMIN_WIDGETS: WidgetId[] = ['member-summary', 'operator-stats'];

// ============================================================
// WIDGET SIZE HINTS (for bento grid)
// ============================================================

export type WidgetSize = 'full' | 'half' | 'third';

const WIDGET_SIZES: Record<WidgetId, WidgetSize> = {
  'welcome':          'full',
  'upcoming':         'half',
  'quick-actions':    'half',
  'activity-feed':    'half',
  'metrics-snapshot': 'half',
  'goals-progress':   'half',
  'streak':           'third',
  'announcements':    'full',
  'media-recent':     'half',
  'member-summary':   'full',
  'operator-stats':   'full',
};

// ============================================================
// HELPERS
// ============================================================

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  if (days === 0) {
    if (hours <= 0) return 'today';
    return `in ${hours}h`;
  }
  if (days === 1) return 'tomorrow';
  if (days < 7) return `in ${days} days`;
  return formatDate(iso);
}

// ============================================================
// WIDGET RENDERERS
// ============================================================

type WidgetRenderer = (container: HTMLElement, ctx: WidgetContext) => void;

// ============================================================
// VERTICAL HERO RENDERERS (Phase 2 — Polymorphic Hero)
// ============================================================

/**
 * Fitness Hero — "Am I on track?"
 * Shows behavioral status ring, next session countdown, and clickable metric cards.
 * Ring represents actual user behavior (sessions booked, entries logged, goals set)
 * NOT feature configuration. 3-state: Strong / Building / Get Started.
 * Reads ONLY from bootstrap.summary — no new API calls.
 */
const renderHeroFitness: WidgetRenderer = (el, ctx) => {
  const { greeting, operatorName, role, accentColor, bootstrap } = ctx;
  const { summary } = bootstrap;
  const features = bootstrap.features;
  const roleBadge = role !== 'client'
    ? `<span class="portal-badge portal-badge-accent">${esc(role)}</span>` : '';

  // Next session
  const hasNext = summary.nextSessionAt && summary.upcomingSessions > 0;
  const nextLabel = hasNext ? formatRelative(summary.nextSessionAt!) : null;

  // Behavioral engagement — count actual user activity signals, not config
  // Each signal = real user action within the enabled feature set
  const signals = { possible: 0, active: 0 };
  if (features.includes('sessions')) { signals.possible++; if (summary.upcomingSessions > 0) signals.active++; }
  if (features.includes('entries'))  { signals.possible++; if (summary.recentEntries > 0) signals.active++; }
  if (features.includes('goals'))    { signals.possible++; if ((summary as any).activeGoals > 0) signals.active++; }

  // 3-state behavioral classification
  type EngageState = { label: string; color: string; ring: number };
  const state: EngageState = signals.active >= 2
    ? { label: 'Strong',      color: '#10b981', ring: 100 }  // 2+ signals = genuinely engaged
    : signals.active === 1
    ? { label: 'Building',    color: '#f59e0b', ring: 55 }   // 1 signal = getting started
    : { label: 'Get Started', color: '#64748b', ring: 12 };  // 0 = needs first action

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (state.ring / 100) * circumference;

  // Metric cards
  const metrics: string[] = [];
  if (features.includes('sessions')) {
    metrics.push(`
      <a href="${portalHref('sessions')}" class="hero-metric">
        <div class="hero-metric-icon">${getIcon('calendar')}</div>
        <div class="hero-metric-val">${summary.upcomingSessions}</div>
        <div class="hero-metric-label">Sessions</div>
      </a>`);
  }
  if (features.includes('entries')) {
    metrics.push(`
      <a href="${portalHref('entries')}" class="hero-metric" title="Updates logged in the last 7 days">
        <div class="hero-metric-icon">${getIcon('clipboard')}</div>
        <div class="hero-metric-val">${summary.recentEntries}</div>
        <div class="hero-metric-label">Recent Entries</div>
      </a>`);
  }
  if (features.includes('goals')) {
    metrics.push(`
      <a href="${portalHref('goals')}" class="hero-metric">
        <div class="hero-metric-icon">${getIcon('target')}</div>
        <div class="hero-metric-val">${(summary as any).activeGoals ?? 0}</div>
        <div class="hero-metric-label">Goals</div>
      </a>`);
  }

  el.innerHTML = `
    <div class="w-welcome hero-fitness" style="--w-accent: ${accentColor}">
      <div class="hero-top">
        <div class="hero-intro">
          <h2 class="w-welcome-greeting">Welcome back, ${esc(greeting)}</h2>
          <p class="w-welcome-sub">${esc(operatorName)} ${roleBadge}</p>
          ${hasNext
            ? `<div class="hero-next"><span class="hero-next-icon">${getIcon('clock')}</span> Next session ${nextLabel}</div>`
            : ''}
        </div>
        <div class="hero-ring-wrap">
          <svg class="hero-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle class="hero-ring-fg" cx="60" cy="60" r="54" fill="none"
              stroke="${state.color}" stroke-width="8"
              stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
              stroke-linecap="round" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="hero-ring-label">
            <span class="hero-ring-val hero-ring-state" style="font-size:1rem">${state.label}</span>
            <span class="hero-ring-sub">${signals.active}/${signals.possible} Active</span>
          </div>
        </div>
      </div>
      ${metrics.length > 0 ? `<div class="hero-metrics">${metrics.join('')}</div>` : ''}
    </div>
  `;
};

/**
 * Consultancy Hero — "What's my engagement status?"
 * Shows project status badge, next meeting, and clickable stat cards.
 * Reads ONLY from bootstrap.summary — no new API calls.
 */
const renderHeroConsultancy: WidgetRenderer = (el, ctx) => {
  const { greeting, operatorName, role, accentColor, bootstrap } = ctx;
  const { summary } = bootstrap;
  const features = bootstrap.features;
  const roleBadge = role !== 'client'
    ? `<span class="portal-badge portal-badge-accent">${esc(role)}</span>` : '';

  // Next meeting
  const hasNext = summary.nextSessionAt && summary.upcomingSessions > 0;
  const nextLabel = hasNext ? formatRelative(summary.nextSessionAt!) : null;

  // Engagement status
  const isActive = summary.activePrograms > 0 || summary.upcomingSessions > 0;
  const statusLabel = isActive ? 'Active Engagement' : 'No Active Projects';
  const statusClass = isActive ? 'hero-status-active' : 'hero-status-idle';

  // Stat cards
  const stats: string[] = [];
  if (features.includes('programs')) {
    stats.push(`
      <a href="${portalHref('programs')}" class="hero-stat-card">
        <div class="hero-stat-head">
          <span class="hero-stat-icon">${getIcon('briefcase')}</span>
          <span class="hero-stat-val">${summary.activePrograms}</span>
        </div>
        <span class="hero-stat-label">Active Projects</span>
      </a>`);
  }
  if (features.includes('sessions')) {
    stats.push(`
      <a href="${portalHref('sessions')}" class="hero-stat-card">
        <div class="hero-stat-head">
          <span class="hero-stat-icon">${getIcon('calendar')}</span>
          <span class="hero-stat-val">${summary.upcomingSessions}</span>
        </div>
        <span class="hero-stat-label">Meetings</span>
      </a>`);
  }
  if (features.includes('messaging')) {
    stats.push(`
      <a href="${portalHref('messages')}" class="hero-stat-card">
        <div class="hero-stat-head">
          <span class="hero-stat-icon">${getIcon('message')}</span>
          <span class="hero-stat-val">${summary.unreadMessages}</span>
        </div>
        <span class="hero-stat-label">Messages</span>
      </a>`);
  }

  el.innerHTML = `
    <div class="w-welcome hero-consultancy" style="--w-accent: ${accentColor}">
      <div class="hero-top">
        <div class="hero-intro">
          <h2 class="w-welcome-greeting">Welcome back, ${esc(greeting)}</h2>
          <p class="w-welcome-sub">${esc(operatorName)} ${roleBadge}</p>
        </div>
        <div class="hero-status ${statusClass}">
          <span class="hero-status-dot"></span>
          <span class="hero-status-text">${statusLabel}</span>
        </div>
      </div>
      ${hasNext
        ? `<div class="hero-next"><span class="hero-next-icon">${getIcon('clock')}</span> Next meeting ${nextLabel}</div>`
        : ''}
      ${stats.length > 0 ? `<div class="hero-stat-grid">${stats.join('')}</div>` : ''}
    </div>
  `;
};

const renderWelcome: WidgetRenderer = (el, ctx) => {
  const { greeting, operatorName, role, accentColor, bootstrap } = ctx;
  const { summary } = bootstrap;
  const initials = bootstrap.actor.email.split('@')[0].substring(0, 2).toUpperCase();
  const roleBadge = role !== 'client'
    ? `<span class="portal-badge portal-badge-accent">${esc(role)}</span>` : '';

  // Detect zero-state: brand new user with no activity
  const totalActivity = summary.upcomingSessions + summary.unreadMessages
    + summary.activePrograms + summary.recentEntries + ((summary as any).activeGoals ?? 0);
  const isZeroState = totalActivity === 0;

  if (isZeroState) {
    // Onboarding welcome — warm, guiding, purposeful
    const features = bootstrap.features;
    const steps: string[] = [];
    if (features.includes('programs')) {
      steps.push(`<a href="${portalHref('programs')}" class="w-onboard-step"><span class="w-onboard-num">1</span><span class="w-onboard-text"><strong>Explore your programs</strong><span class="w-onboard-hint">See what's available to you</span></span><span class="w-onboard-arrow">${getIcon('arrow-right')}</span></a>`);
    }
    if (features.includes('sessions')) {
      steps.push(`<a href="${portalHref('sessions')}" class="w-onboard-step"><span class="w-onboard-num">${steps.length + 1}</span><span class="w-onboard-text"><strong>Book your first session</strong><span class="w-onboard-hint">Connect with your coach</span></span><span class="w-onboard-arrow">${getIcon('arrow-right')}</span></a>`);
    }
    if (features.includes('goals')) {
      steps.push(`<a href="${portalHref('goals')}" class="w-onboard-step"><span class="w-onboard-num">${steps.length + 1}</span><span class="w-onboard-text"><strong>Set a goal</strong><span class="w-onboard-hint">Define what success looks like</span></span><span class="w-onboard-arrow">${getIcon('arrow-right')}</span></a>`);
    }
    if (features.includes('entries')) {
      steps.push(`<a href="${portalHref('entries')}" class="w-onboard-step"><span class="w-onboard-num">${steps.length + 1}</span><span class="w-onboard-text"><strong>Log your first update</strong><span class="w-onboard-hint">Start tracking your progress</span></span><span class="w-onboard-arrow">${getIcon('arrow-right')}</span></a>`);
    }
    // Fallback if only profile is active
    if (steps.length === 0) {
      steps.push(`<a href="${portalHref('profile')}" class="w-onboard-step"><span class="w-onboard-num">1</span><span class="w-onboard-text"><strong>Complete your profile</strong><span class="w-onboard-hint">Add your name and preferences</span></span><span class="w-onboard-arrow">${getIcon('arrow-right')}</span></a>`);
    }

    el.innerHTML = `
      <div class="w-welcome w-welcome-onboard" style="--w-accent: ${accentColor}">
        <div class="w-onboard-header">
          <div class="w-welcome-avatar">${initials}</div>
          <div>
            <h2 class="w-welcome-greeting">Welcome, ${esc(greeting)}</h2>
            <p class="w-welcome-sub">${esc(operatorName)} ${roleBadge}</p>
          </div>
        </div>
        <div class="w-onboard-body">
          <p class="w-onboard-lead">Let's get you started. Here's what to do first:</p>
          <div class="w-onboard-steps">${steps.join('')}</div>
        </div>
      </div>
    `;
    return;
  }

  // Active state — dispatch to vertical-specific hero
  if (ctx.vertical === 'fitness') { renderHeroFitness(el, ctx); return; }
  if (ctx.vertical === 'consultancy') { renderHeroConsultancy(el, ctx); return; }

  // Fallback: generic hero (tours, nightlife, unknown)
  const statPills: string[] = [];
  if (summary.upcomingSessions > 0) {
    statPills.push(`<div class="w-mini-stat"><span class="w-mini-val">${summary.upcomingSessions}</span><span class="w-mini-label">Upcoming</span></div>`);
  }
  if (summary.unreadMessages > 0) {
    statPills.push(`<div class="w-mini-stat"><span class="w-mini-val">${summary.unreadMessages}</span><span class="w-mini-label">Unread</span></div>`);
  }
  if (summary.activePrograms > 0) {
    statPills.push(`<div class="w-mini-stat"><span class="w-mini-val">${summary.activePrograms}</span><span class="w-mini-label">Programs</span></div>`);
  }
  if (summary.recentEntries > 0) {
    statPills.push(`<div class="w-mini-stat" title="Updates logged in the last 7 days"><span class="w-mini-val">${summary.recentEntries}</span><span class="w-mini-label">Recent Updates</span></div>`);
  }
  if ((summary as any).activeGoals > 0) {
    statPills.push(`<div class="w-mini-stat"><span class="w-mini-val">${(summary as any).activeGoals}</span><span class="w-mini-label">Goals</span></div>`);
  }

  el.innerHTML = `
    <div class="w-welcome" style="--w-accent: ${accentColor}">
      <div class="w-welcome-left">
        <div class="w-welcome-avatar">${initials}</div>
        <div class="w-welcome-text">
          <h2 class="w-welcome-greeting">Welcome back, ${esc(greeting)}</h2>
          <p class="w-welcome-sub">${esc(operatorName)} ${roleBadge}</p>
        </div>
      </div>
      ${statPills.length > 0 ? `<div class="w-welcome-stats">${statPills.join('')}</div>` : ''}
    </div>
  `;
};

const renderUpcoming: WidgetRenderer = (el, ctx) => {
  const { summary } = ctx.bootstrap;
  const features = ctx.bootstrap.features;

  if (!features.includes('sessions')) {
    // Don't show an empty card — hide entirely
    el.style.display = 'none';
    return;
  }

  const hasNext = summary.nextSessionAt && summary.upcomingSessions > 0;
  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('calendar')}</div>
        <div class="w-card-title">Next Session</div>
      </div>
      ${hasNext ? `
        <div class="w-upcoming-time">${formatRelative(summary.nextSessionAt!)}</div>
        <div class="w-upcoming-full">${formatDate(summary.nextSessionAt)}</div>
        <div class="w-upcoming-count">${summary.upcomingSessions} total upcoming</div>
        <a href="${portalHref('sessions')}" class="w-card-link">View sessions →</a>
      ` : `
        <div style="text-align:center;padding:12px 0;">
          <div style="font-size:0.9rem;font-weight:600;color:var(--portal-text);">No upcoming sessions</div>
          <p style="font-size:0.8rem;color:var(--portal-text-secondary);margin:4px 0 12px;">Book your next session to stay on track.</p>
          <a href="${portalHref('sessions')}" style="display:inline-block;background:var(--portal-accent);color:#fff;padding:8px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;text-decoration:none;">Book Now</a>
        </div>
      `}
    </div>
  `;
};

const renderQuickActions: WidgetRenderer = (el, ctx) => {
  const features = ctx.bootstrap.features;
  const actions: string[] = [];

  if (features.includes('entries')) {
    actions.push(`<a href="${portalHref('entries')}" class="w-action"><span class="w-action-icon">${getIcon('clipboard')}</span><span>Log Update</span></a>`);
  }
  if (features.includes('sessions')) {
    actions.push(`<a href="${portalHref('sessions')}" class="w-action"><span class="w-action-icon">${getIcon('calendar')}</span><span>Book Session</span></a>`);
  }
  if (features.includes('messaging')) {
    actions.push(`<a href="${portalHref('messages')}" class="w-action"><span class="w-action-icon">${getIcon('message')}</span><span>Send Message</span></a>`);
  }
  if (features.includes('programs')) {
    actions.push(`<a href="${portalHref('programs')}" class="w-action"><span class="w-action-icon">${getIcon('package')}</span><span>My Programs</span></a>`);
  }
  if (features.includes('timeline')) {
    actions.push(`<a href="${portalHref('timeline')}" class="w-action"><span class="w-action-icon">${getIcon('chart')}</span><span>View Timeline</span></a>`);
  }
  if (features.includes('goals')) {
    actions.push(`<a href="${portalHref('goals')}" class="w-action"><span class="w-action-icon">${getIcon('target')}</span><span>My Goals</span></a>`);
  }

  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('zap')}</div>
        <div class="w-card-title">Quick Actions</div>
      </div>
      <div class="w-actions-grid">${actions.join('')}</div>
    </div>
  `;
};

const renderActivityFeed: WidgetRenderer = (el, ctx) => {
  const { summary } = ctx.bootstrap;
  const features = ctx.bootstrap.features;

  // Build activity items from available summary data
  const items: string[] = [];

  // ── Contextual nudges (intelligence layer) ──
  // Session prep nudge: if next session is within 24 hours
  if (summary.nextSessionAt) {
    const hoursUntil = (new Date(summary.nextSessionAt).getTime() - Date.now()) / 3600000;
    if (hoursUntil > 0 && hoursUntil <= 24) {
      items.push(`
        <div class="w-feed-item w-feed-nudge">
          <div class="w-feed-dot" style="background:var(--portal-accent)"></div>
          <div class="w-feed-content">
            <div class="w-feed-text"><strong>Session prep:</strong> Your next session is ${hoursUntil < 2 ? 'very soon' : `in ${Math.round(hoursUntil)}h`}. Review your recent progress before you meet.</div>
            <div class="w-feed-time"><a href="${portalHref('timeline')}" style="color:var(--portal-accent);text-decoration:none;">Review timeline →</a></div>
          </div>
        </div>
      `);
    }
  }

  // Logging reminder: if entries feature is active but no recent entries
  if (features.includes('entries') && summary.recentEntries === 0) {
    items.push(`
      <div class="w-feed-item w-feed-nudge">
        <div class="w-feed-dot" style="background:var(--portal-warning)"></div>
        <div class="w-feed-content">
          <div class="w-feed-text"><strong>Stay consistent:</strong> You haven't logged an update recently. Even a quick check-in keeps your data useful.</div>
          <div class="w-feed-time"><a href="${portalHref('entries')}" style="color:var(--portal-accent);text-decoration:none;">Log now →</a></div>
        </div>
      </div>
    `);
  }

  // ── Standard activity items ──
  if (summary.nextSessionAt) {
    items.push(`
      <div class="w-feed-item">
        <div class="w-feed-dot" style="background:#6366f1"></div>
        <div class="w-feed-content">
          <div class="w-feed-text">Session scheduled</div>
          <div class="w-feed-time">${formatDate(summary.nextSessionAt)}</div>
        </div>
      </div>
    `);
  }

  if (summary.recentEntries > 0) {
    items.push(`
      <div class="w-feed-item">
        <div class="w-feed-dot" style="background:#10b981"></div>
        <div class="w-feed-content">
          <div class="w-feed-text" title="Updates logged in the last 7 days">${summary.recentEntries} recent ${summary.recentEntries === 1 ? 'update' : 'updates'} logged</div>
          <div class="w-feed-time">This period</div>
        </div>
      </div>
    `);
  }

  if (summary.unreadMessages > 0) {
    items.push(`
      <div class="w-feed-item">
        <div class="w-feed-dot" style="background:#f59e0b"></div>
        <div class="w-feed-content">
          <div class="w-feed-text">${summary.unreadMessages} unread ${summary.unreadMessages === 1 ? 'message' : 'messages'}</div>
          <div class="w-feed-time"><a href="${portalHref('messages')}" style="color:var(--portal-accent);text-decoration:none;">View →</a></div>
        </div>
      </div>
    `);
  }

  if (summary.activePrograms > 0) {
    items.push(`
      <div class="w-feed-item">
        <div class="w-feed-dot" style="background:#8b5cf6"></div>
        <div class="w-feed-content">
          <div class="w-feed-text">${summary.activePrograms} active ${summary.activePrograms === 1 ? 'program' : 'programs'}</div>
          <div class="w-feed-time"><a href="${portalHref('programs')}" style="color:var(--portal-accent);text-decoration:none;">View →</a></div>
        </div>
      </div>
    `);
  }

  if (items.length === 0) {
    items.push(`
      <div style="text-align:center;padding:12px 0;">
        <div style="font-size:0.9rem;font-weight:600;color:var(--portal-text);">No recent activity</div>
        <p style="font-size:0.8rem;color:var(--portal-text-secondary);margin:4px 0 12px;">Start by logging your progress today.</p>
        <a href="${portalHref('entries')}" style="display:inline-block;background:rgba(255,255,255,0.08);color:var(--portal-text);padding:8px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;text-decoration:none;">Log Update</a>
      </div>
    `);
  }

  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('bell')}</div>
        <div class="w-card-title">Recent Activity</div>
      </div>
      <div class="w-feed">${items.join('')}</div>
    </div>
  `;
};

const renderMetricsSnapshot: WidgetRenderer = (el, ctx) => {
  const portal = ctx.portal;
  const metrics = portal?.entries?.metrics;

  if (!metrics || metrics.length === 0) {
    el.innerHTML = `
      <div class="w-card-inner">
        <div class="w-card-header">
          <div class="w-card-icon">${getIcon('chart')}</div>
          <div class="w-card-title">Metrics</div>
        </div>
        <div class="w-card-empty" style="margin-top:12px;">No metrics configured for this operator.</div>
      </div>
    `;
    return;
  }

  // Show metric cards with placeholder values (real sparklines would require timeline API data)
  const metricCards = metrics.slice(0, 4).map((m: any) => `
    <div class="w-metric-card">
      <div class="w-metric-label">${esc(m.label)}</div>
      <div class="w-metric-value">—<span class="w-metric-unit">${esc(m.unit)}</span></div>
      <div class="w-metric-sparkline" data-key="${m.key}" data-color="${m.chartColor || '#6366f1'}">
        <canvas width="120" height="32" style="width:100%;height:32px;"></canvas>
      </div>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('chart')}</div>
        <div class="w-card-title">Metrics Snapshot</div>
        <a href="${portalHref('timeline')}" class="w-card-link" style="margin-left:auto;">View timeline →</a>
      </div>
      <div class="w-metrics-grid">${metricCards}</div>
    </div>
  `;

  // Load actual metric data via timeline API
  loadMetricsData(el, ctx);
};

async function loadMetricsData(el: HTMLElement, ctx: WidgetContext) {
  try {
    // Dynamic import to avoid circular dependency
    const { getAuthed } = await import('./portalAuth.client');
    const resp = await getAuthed('/api/portal/timeline?range=30d');
    if (!resp.ok) return;
    const data = await resp.json();

    if (!data.series || !data.stats) return;

    // Update metric values from stats
    const metrics = ctx.portal?.entries?.metrics || [];
    for (const m of metrics) {
      const stat = data.stats.find((s: any) => s.key === (m as any).key);
      if (!stat || stat.current == null) continue;

      const valueEl = el.querySelector(`.w-metric-card .w-metric-label`)?.parentElement;
      // Find the specific metric card
      const cards = el.querySelectorAll('.w-metric-card');
      for (const card of cards) {
        const label = card.querySelector('.w-metric-label');
        if (label && label.textContent === (m as any).label) {
          const valEl = card.querySelector('.w-metric-value');
          if (valEl) {
            // Trend arrow + change value
            const arrow = stat.change > 0 ? getIcon('trending-up', 'w-trend-icon') : stat.change < 0 ? getIcon('trending-down', 'w-trend-icon') : '';
            const changeClass = stat.change != null
              ? (stat.change > 0 ? 'w-change-up' : stat.change < 0 ? 'w-change-down' : '')
              : '';
            const pctStr = stat.changePercent != null && stat.changePercent !== 0
              ? ` <span class="w-metric-pct">${Math.abs(stat.changePercent).toFixed(0)}%</span>`
              : '';
            const changeStr = stat.change != null && stat.change !== 0
              ? `<span class="w-metric-change ${changeClass}">${arrow}${stat.change > 0 ? '+' : ''}${stat.change}${pctStr}</span>`
              : '';
            valEl.innerHTML = `${stat.current}<span class="w-metric-unit">${esc((m as any).unit)}</span>${changeStr}`;
          }
        }
      }

      // Draw sparkline for this metric
      const series = data.series.find((s: any) => s.key === (m as any).key);
      if (series && series.points.length >= 2) {
        const sparkEl = el.querySelector(`[data-key="${(m as any).key}"] canvas`) as HTMLCanvasElement;
        if (sparkEl) drawSparkline(sparkEl, series.points.map((p: any) => p.value), series.color || '#6366f1');
      }
    }
  } catch {
    // Non-fatal — metrics just show placeholder
  }
}

function drawSparkline(canvas: HTMLCanvasElement, values: number[], color: string) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;

  const pad = 4;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  const toX = (i: number) => pad + (i / (values.length - 1)) * plotW;
  const toY = (v: number) => pad + plotH - ((v - min) / range) * plotH;

  // Area fill
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  for (let i = 1; i < values.length; i++) ctx.lineTo(toX(i), toY(values[i]));
  ctx.lineTo(toX(values.length - 1), h);
  ctx.lineTo(toX(0), h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, hexToRgba(color, 0.35));
  grad.addColorStop(1, hexToRgba(color, 0.0));
  ctx.fillStyle = grad;
  ctx.fill();

  // Line Glow
  ctx.shadowColor = hexToRgba(color, 0.5);
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  for (let i = 1; i < values.length; i++) ctx.lineTo(toX(i), toY(values[i]));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Reset shadow for dot
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // End dot
  const lastX = toX(values.length - 1);
  const lastY = toY(values[values.length - 1]);
  
  // Outer glow dot
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(color, 0.3);
  ctx.fill();

  // Inner solid dot
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; // White center for pop
  ctx.fill();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const renderGoalsProgress: WidgetRenderer = (el, ctx) => {
  const features = ctx.bootstrap.features;
  const { summary } = ctx.bootstrap;

  if (!features.includes('goals')) {
    el.innerHTML = `
      <div class="w-card-inner w-card-compact">
        <div class="w-card-header">
          <div class="w-card-icon">${getIcon('target')}</div>
          <div class="w-card-title">Goals</div>
        </div>
        ${emptyStateHtml({ icon: 'target', title: 'Goals Not Enabled', desc: 'Contact your coach to unlock goal tracking.' })}
      </div>
    `;
    return;
  }

  // Start with summary count, then load full goals
  const activeCount = (summary as any).activeGoals ?? 0;

  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('target')}</div>
        <div class="w-card-title">Goals</div>
        <a href="${portalHref('goals')}" class="w-card-link" style="margin-left:auto;">Manage →</a>
      </div>
      <div class="w-goals-content" id="w-goals-inner">
        ${activeCount > 0
          ? `<div class="w-goals-loading"><div style="color:var(--portal-text-muted);font-size:0.85rem;">Loading ${activeCount} active goal${activeCount !== 1 ? 's' : ''}…</div></div>`
          : `<div class="w-goals-empty">
              <svg width="56" height="56" viewBox="0 0 64 64" style="opacity:0.4;">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
                <circle cx="32" cy="32" r="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
                <circle cx="32" cy="32" r="6" fill="rgba(255,255,255,0.12)"/>
              </svg>
              <div style="margin-top:12px;font-size:0.85rem;color:var(--portal-text-muted);">No active goals yet</div>
              <a href="${portalHref('goals')}" class="w-goals-cta">Set your first goal →</a>
            </div>`
        }
      </div>
    </div>
  `;

  // Load goals data if there are active goals
  if (activeCount > 0) {
    loadGoalsWidget(el, ctx);
  }
};

async function loadGoalsWidget(el: HTMLElement, ctx: WidgetContext) {
  try {
    const { getAuthed } = await import('./portalAuth.client');
    const opId = ctx.operatorId;
    const url = opId
      ? `/api/portal/goals?operatorId=${encodeURIComponent(opId)}&status=active`
      : '/api/portal/goals?status=active';
    const resp = await getAuthed(url);
    if (!resp.ok) return;
    const data = await resp.json();

    const container = el.querySelector('#w-goals-inner');
    if (!container || !data.goals || data.goals.length === 0) return;

    const goalCards = data.goals.slice(0, 4).map((g: any) => {
      const pct = Math.max(0, Math.min(100, g.progressPct));
      const color = g.color || 'var(--portal-accent)';
      const circumference = 2 * Math.PI * 20;
      const dashOffset = circumference - (pct / 100) * circumference;

      return `
        <div class="w-goal-card">
          <div class="w-goal-ring">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
              <circle cx="26" cy="26" r="20" fill="none" stroke="${color}" stroke-width="4"
                      stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                      stroke-linecap="round" transform="rotate(-90 26 26)"
                      style="transition: stroke-dashoffset 0.6s ease;"/>
            </svg>
            <span class="w-goal-pct">${pct}%</span>
          </div>
          <div class="w-goal-info">
            <div class="w-goal-title">${esc(g.title)}</div>
            <div class="w-goal-meta">${g.currentValue}${g.unit ? ' ' + esc(g.unit) : ''} / ${g.targetValue}${g.unit ? ' ' + esc(g.unit) : ''}</div>
          </div>
        </div>
      `;
    }).join('');

    const moreCount = data.goals.length > 4 ? data.goals.length - 4 : 0;
    const moreLink = moreCount > 0
      ? `<a href="${portalHref('goals')}" style="display:block;text-align:center;font-size:0.8rem;color:var(--portal-accent);text-decoration:none;margin-top:8px;">+${moreCount} more →</a>`
      : '';

    container.innerHTML = `<div class="w-goals-list">${goalCards}</div>${moreLink}`;
  } catch {
    // Non-fatal
  }
}

const renderStreak: WidgetRenderer = (el, ctx) => {
  const features = ctx.bootstrap.features;

  if (!features.includes('entries')) {
    el.innerHTML = `
      <div class="w-card-inner w-card-compact">
        <div class="w-card-header">
          <div class="w-card-icon">${getIcon('flame')}</div>
          <div class="w-card-title">Streak</div>
        </div>
        ${emptyStateHtml({ icon: 'flame', title: 'Streak Unavailable', desc: 'Enable entries to track your streak.' })}
      </div>
    `;
    return;
  }

  // Start with a loading state, then compute real streak
  el.innerHTML = `
    <div class="w-card-inner w-card-compact">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('flame')}</div>
        <div class="w-card-title">Streak</div>
      </div>
      <div class="w-streak-value">…</div>
      <div class="w-streak-label">calculating</div>
    </div>
  `;

  loadStreak(el, ctx);
};

/** Compute consecutive-day streak from recent entries. No new endpoints — uses existing entries API. */
async function loadStreak(el: HTMLElement, ctx: WidgetContext) {
  try {
    const { getAuthed } = await import('./portalAuth.client');
    const opParam = ctx.operatorId ? `&operatorId=${encodeURIComponent(ctx.operatorId)}` : '';
    const resp = await getAuthed(`/api/portal/entries?limit=60${opParam}`);
    if (!resp.ok) return;
    const data = await resp.json();

    if (!data.entries || data.entries.length === 0) {
      setStreakUI(el, 0);
      return;
    }

    // Build set of unique dates (YYYY-MM-DD) the user logged entries
    const dates = new Set<string>();
    for (const entry of data.entries) {
      const d = entry.date || entry.createdAt;
      if (d) dates.add(new Date(d).toISOString().slice(0, 10));
    }

    // Count consecutive days backwards from today
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const check = new Date(now);
      check.setDate(check.getDate() - i);
      const key = check.toISOString().slice(0, 10);
      if (dates.has(key)) {
        streak++;
      } else if (i === 0) {
        // Allow today to be missing (user hasn't logged yet today)
        continue;
      } else {
        break;
      }
    }

    setStreakUI(el, streak);
  } catch {
    setStreakUI(el, 0);
  }
}

function setStreakUI(el: HTMLElement, streak: number) {
  const valEl = el.querySelector('.w-streak-value');
  const labelEl = el.querySelector('.w-streak-label');
  if (valEl) {
    valEl.textContent = String(streak);
    if (streak >= 7) valEl.classList.add('w-streak-fire');
    if (streak >= 3) valEl.classList.add('w-streak-warm');
  }
  if (labelEl) {
    labelEl.textContent = streak === 1 ? 'day streak' : streak === 0 ? 'no streak yet' : 'day streak';
  }
}

const renderMemberSummary: WidgetRenderer = (el, ctx) => {
  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('users')}</div>
        <div class="w-card-title">Team Overview</div>
      </div>
      <div class="w-card-empty" style="margin-top:12px;">Member management coming in Phase C.</div>
    </div>
  `;
};

const renderOperatorStats: WidgetRenderer = (el, ctx) => {
  el.innerHTML = `
    <div class="w-card-inner">
      <div class="w-card-header">
        <div class="w-card-icon">${getIcon('chart')}</div>
        <div class="w-card-title">Operator Dashboard</div>
      </div>
      <div class="w-card-empty" style="margin-top:12px;">Operator analytics coming in Phase C.</div>
    </div>
  `;
};

// ============================================================
// WIDGET REGISTRY
// ============================================================

export const WIDGET_REGISTRY: Record<WidgetId, WidgetRenderer> = {
  'welcome':          renderWelcome,
  'upcoming':         renderUpcoming,
  'quick-actions':    renderQuickActions,
  'activity-feed':    renderActivityFeed,
  'metrics-snapshot': renderMetricsSnapshot,
  'goals-progress':   renderGoalsProgress,
  'streak':           renderStreak,
  'announcements':    (_el, _ctx) => { /* Phase B */ },
  'media-recent':     (_el, _ctx) => { /* Phase B */ },
  'member-summary':   renderMemberSummary,
  'operator-stats':   renderOperatorStats,
};

// ============================================================
// RESOLVE WIDGETS
// ============================================================

/**
 * Determine which widgets to render based on config + role.
 * Returns ordered WidgetId array.
 */
export function resolveWidgets(
  portal: ResolvedPortalConfig | null,
  role: PortalRole,
  features: string[],
): WidgetId[] {
  // Start from operator config or engine defaults
  let widgets: WidgetId[] = (portal as any)?.dashboard?.widgets
    ? [...(portal as any).dashboard.widgets]
    : [...ENGINE_DEFAULT_WIDGETS];

  // Add metrics-snapshot if entries/timeline are active and not already present
  if (features.includes('entries') && features.includes('timeline') && !widgets.includes('metrics-snapshot')) {
    widgets.push('metrics-snapshot');
  }

  // Add goals-progress if goals feature is active and not already present
  if (features.includes('goals') && !widgets.includes('goals-progress')) {
    widgets.push('goals-progress');
  }

  // Auto-add role-based widgets
  if (role === 'coach' || role === 'admin') {
    for (const w of STAFF_WIDGETS) {
      if (!widgets.includes(w)) widgets.push(w);
    }
  }
  if (role === 'admin') {
    for (const w of ADMIN_WIDGETS) {
      if (!widgets.includes(w)) widgets.push(w);
    }
  }

  return widgets;
}

/**
 * Get CSS class for widget grid size.
 */
export function getWidgetSizeClass(id: WidgetId): string {
  const size = WIDGET_SIZES[id] || 'half';
  return `bento-${size}`;
}
