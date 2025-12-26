/**
 * Fitness Demo Resources
 * 
 * Maps resourceId → ResourceDefinition
 * Used by portal to render clickable entitlements
 */

import type { OperatorResourcesMap } from '@/types/resources';

export const resources: OperatorResourcesMap = {
  'product-foundation': {
    id: 'product-foundation',
    label: 'Foundation Protocol',
    description: '12-week transformation program with daily workouts and nutrition.',
    icon: '💪',
    action: { type: 'page' },
    content: {
      title: 'Foundation Protocol',
      hero: {
        headline: 'Your 12-Week Transformation Starts Now',
        subheadline: 'Follow the protocol. Trust the process. Transform your life.',
      },
      sections: [
        {
          id: 'welcome',
          type: 'markdown',
          title: 'Welcome to Foundation',
          content: `
## Congratulations on taking the first step.

The Foundation Protocol is designed to build:
- **Strength** — Progressive overload training
- **Mobility** — Daily movement practice  
- **Nutrition** — Simple, sustainable eating habits
- **Mindset** — Mental frameworks for consistency

### How to Use This Program

1. Watch the orientation video below
2. Download your workout calendar
3. Start Week 1 on Monday
4. Check in weekly via WhatsApp
          `.trim(),
        },
        {
          id: 'orientation',
          type: 'video',
          title: 'Orientation Video',
          content: 'https://player.vimeo.com/video/placeholder', // Replace with real Vimeo
        },
        {
          id: 'week1',
          type: 'markdown',
          title: 'Week 1: Assessment & Baseline',
          content: `
### This Week's Focus
Establish your baseline measurements and learn the movement patterns.

**Daily Schedule:**
- Morning: 10-min mobility flow
- Workout: Assessment protocol (Day 1-3), Foundation lifts (Day 4-5)
- Evening: 5-min stretch

**Nutrition Focus:**
Track everything you eat this week. No changes yet — just awareness.
          `.trim(),
        },
      ],
      downloads: [
        {
          id: 'calendar',
          label: '12-Week Workout Calendar (PDF)',
          fileKey: 'fitness-demo/foundation/workout-calendar.pdf',
        },
        {
          id: 'nutrition',
          label: 'Nutrition Guide (PDF)',
          fileKey: 'fitness-demo/foundation/nutrition-guide.pdf',
        },
      ],
    },
  },
  
  // Add more products as needed
  'product-mastery': {
    id: 'product-mastery',
    label: 'Mastery Program',
    description: 'Advanced training for experienced athletes.',
    icon: '🏆',
    action: { 
      type: 'external', 
      href: 'https://example.com/mastery', // Placeholder
      newTab: true,
    },
  },
};

export default resources;
