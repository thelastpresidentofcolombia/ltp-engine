import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // Static output - all pages are pre-rendered at build time
  // No serverless functions needed = no Node runtime issues
  output: 'static',
  
  // i18n configuration for multilingual support
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: true, // /en/... and /es/...
    },
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
  site: process.env.SITE_URL || 'https://ltp-engine.vercel.app',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
