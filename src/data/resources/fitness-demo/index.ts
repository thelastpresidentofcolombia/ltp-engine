/**
 * Fitness Demo Resources
 * 
 * Maps resourceId → ResourceDefinition
 * Used by portal to render clickable entitlements
 * 
 * IMPORTANT: resourceId must match what's stored in entitlements
 * (e.g., "product-foundation" from checkout metadata)
 */

import type { OperatorResourcesMap } from "@/types/resources";

export const resources: OperatorResourcesMap = {
  "product-foundation": {
    id: "product-foundation",
    label: "Foundation Protocol",
    description: "12-week transformation program with daily workouts and nutrition guidance.",
    icon: "💪",
    action: { type: "page" },
    content: {
      title: "Foundation Protocol",
      hero: {
        headline: "Your 12-Week Transformation Starts Now",
        subheadline: "Follow the protocol. Trust the process. Transform your life.",
      },
      sections: [
        {
          id: "welcome",
          type: "markdown",
          title: "Welcome to Foundation",
          content: `Congratulations on taking the first step.

The Foundation Protocol is designed to build:

• Strength — Progressive overload training
• Mobility — Daily movement practice
• Nutrition — Simple, sustainable eating habits
• Mindset — Mental frameworks for consistency

How to Use This Program:

1. Watch the orientation video below
2. Download your workout calendar
3. Start Week 1 on Monday
4. Check in weekly via WhatsApp`,
        },
        {
          id: "orientation",
          type: "video",
          title: "Orientation Video",
          content: "https://player.vimeo.com/video/placeholder", // Replace with real Vimeo URL
        },
        {
          id: "week1",
          type: "markdown",
          title: "Week 1: Assessment & Baseline",
          content: `This Week's Focus:
Establish your baseline measurements and learn the movement patterns.

Daily Schedule:
• Morning: 10-min mobility flow
• Workout: Assessment protocol (Day 1-3), Foundation lifts (Day 4-5)
• Evening: 5-min stretch

Nutrition Focus:
Track everything you eat this week. No changes yet — just awareness.`,
        },
        {
          id: "important",
          type: "callout",
          content: "Remember: Consistency beats intensity. Show up every day, even if it's just for 10 minutes.",
        },
      ],
      downloads: [
        {
          id: "calendar",
          label: "12-Week Workout Calendar (PDF)",
          fileKey: "fitness-demo/foundation/workout-calendar.pdf",
        },
        {
          id: "nutrition",
          label: "Nutrition Guide (PDF)",
          fileKey: "fitness-demo/foundation/nutrition-guide.pdf",
        },
        {
          id: "tracking",
          label: "Progress Tracking Sheet (PDF)",
          fileKey: "fitness-demo/foundation/tracking-sheet.pdf",
        },
      ],
    },
  },

  // Additional products can be added here
  "product-mastery": {
    id: "product-mastery",
    label: "Mastery Program",
    description: "Advanced 16-week training for experienced athletes.",
    icon: "🏆",
    action: {
      type: "external",
      href: "https://example.com/mastery", // Replace with real URL
      newTab: true,
    },
  },

  "product-nutrition": {
    id: "product-nutrition",
    label: "Nutrition Masterclass",
    description: "Complete video course on performance nutrition.",
    icon: "🥗",
    action: {
      type: "embed",
      embedUrl: "https://player.vimeo.com/video/placeholder", // Replace with real Vimeo URL
      provider: "vimeo",
    },
  },
};

export default resources;
