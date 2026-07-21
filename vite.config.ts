import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],

        // ── Manifest ─────────────────────────────────────────────────────────
        manifest: {
          name: 'Master Aptitude',
          short_name: 'MasterApt',
          description: 'Mock tests, practice sets & current affairs by Suman Sir',
          start_url: '/dashboard',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#0f0c29',
          theme_color: '#6366f1',
          categories: ['education'],
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },

        // ── Workbox caching strategy ─────────────────────────────────────────
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // allow up to 4 MB
          // Pre-cache the entire built app shell
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

          // Runtime caching
          runtimeCaching: [
            {
              // Firebase API calls — network only, never cache
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Firebase Auth — network only
              urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Our Express API — GET reads: network first, 10s timeout, fallback to cache
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                request.method === 'GET' && url.pathname.startsWith('/api/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
            {
              // Admin write operations (POST/PUT/DELETE) — always go to network, never cache
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                request.method !== 'GET' && url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
            },
            {
              // Google Fonts — stale while revalidate
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheets' },
            },
            {
              // Firebase Storage images (question images, carousel)
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-images',
                expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              },
            },
          ],
        },

        devOptions: {
          // Enable in dev so you can test the SW locally
          enabled: false,
        },
      }),
    ],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        'firebase/firestore': path.resolve(__dirname, 'src/lib/mockFirestore.ts'),
        'firebase/auth': path.resolve(__dirname, 'src/lib/mockAuth.ts'),
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
