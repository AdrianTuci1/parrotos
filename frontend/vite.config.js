import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The Rill React port reuses framework-agnostic modules from web-common that
    // still reference a few Svelte components (only the chart-type icon metadata
    // in the chart config). This host is a React-only app, so we shim those
    // `.svelte` imports with a no-op component rather than pulling in a Svelte
    // compiler. The chart widgets never render the icon, so it is safe.
    {
      name: 'svelte-icon-shim',
      enforce: 'pre',
      resolveId(source) {
        if (source.endsWith('.svelte')) {
          return '\0svelte-shim'
        }
      },
      load(id) {
        if (id === '\0svelte-shim') {
          return 'export default function SvelteShim(){ return null }'
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fixture the Rill source packages into the standalone React app so the BI
      // query path can reuse the framework-agnostic runtime-client verbatim.
      '@rilldata/web-admin': path.resolve(__dirname, '../web-admin/src'),
      // SvelteKit virtual modules imported by web-common helpers; shimmed for the
      // browser-only React host so the Rill code compiles without a Kit app.
      '$app/environment': path.resolve(__dirname, './src/shims/sveltekit-environment.js'),
      '$app/stores': path.resolve(__dirname, './src/shims/sveltekit-stores.js'),
      '$app/navigation': path.resolve(__dirname, './src/shims/sveltekit-navigation.js'),
      // Rill's Paraglide message bundle is generated at build time and absent in
      // this host; point it at a React-safe label shim instead. Must precede the
      // broad `@rilldata/web-common` prefix so the more specific path wins.
      '@rilldata/web-common/lib/i18n/gen/messages': path.resolve(__dirname, './src/shims/rill-i18n-messages.js'),
      '@rilldata/web-common': path.resolve(__dirname, '../web-common/src'),
    }
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
})
