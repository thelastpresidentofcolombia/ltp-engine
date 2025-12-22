import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  // Hybrid allows SSR for future geo-logic while keeping most pages static
  // v1 will be static-only, but this keeps options open
  output: 'hybrid',
  adapter: vercel({
    // Node.js 18 is deprecated on Vercel - use 20.x
    // See: https://vercel.com/docs/functions/runtimes
    maxDuration: 10,
  }),
  
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
