import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  // Hybrid output - static pages + API routes
  // Pages are pre-rendered, API routes run as serverless functions
  output: 'hybrid',
  adapter: vercel({
    // Vercel dropped nodejs18.x support - use Node 20
    runtime: 'nodejs20.x',
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
