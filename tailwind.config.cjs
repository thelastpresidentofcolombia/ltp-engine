/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // === ENGINE SEMANTIC COLORS ===
        // These map to CSS variables, allowing vibe tokens to override
        'engine': {
          'bg': 'var(--color-bg-base)',
          'bg-offset': 'var(--color-bg-offset)',
          'bg-surface': 'var(--color-bg-surface)',
          'bg-inverse': 'var(--color-bg-inverse)',
          'text': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted': 'var(--color-text-muted)',
          'text-inverse': 'var(--color-text-inverse)',
          'border': 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
          'accent': 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'hover': 'var(--color-hover-bg)',
          'active': 'var(--color-active-bg)',
          'success': 'var(--color-success)',
          'error': 'var(--color-error)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        engine: 'var(--radius)',
      },
      spacing: {
        'section': 'var(--space-section)',
        'module': 'var(--space-module)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'base': 'var(--transition-base)',
        'slow': 'var(--transition-slow)',
      },
      boxShadow: {
        'engine-sm': 'var(--shadow-sm)',
        'engine': 'var(--shadow-base)',
        'engine-md': 'var(--shadow-md)',
        'engine-lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
