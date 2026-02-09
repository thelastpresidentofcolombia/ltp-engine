import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Astro 5: static output now supports on-demand rendering per-page
  // API routes and pages with export const prerender = false will be serverless
  output: 'static',
  adapter: vercel(),
  
  // i18n configuration for multilingual support
  // routing: 'manual' disables Astro's built-in i18n middleware.
  // Without this, prefixDefaultLocale: true makes Astro return 404 for
  // any route missing a locale prefix (e.g. /portal/*).
  // Our [lang] params + middleware handle locale routing explicitly.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: 'manual',
  },
  
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@utils': '/src/utils',
        '@data': '/src/data',
        '@types': '/src/types',
        '@config': '/src/config',
        '@styles': '/src/styles',
      },
    },
  },
  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false,
  },
  site: process.env.SITE_URL || 'https://ltp-engine.vercel.app',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
