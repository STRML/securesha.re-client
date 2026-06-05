// ┌───────────────────────────────────────────────────────────────────────────┐
// │ Build output goes to ./app  (NOT ./dist).                                   │
// │ ./app is GENERATED — do not hand-edit it. Source lives in ./src.            │
// │                                                                             │
// │ We target app/ (instead of Vite's default dist/) so the Express server      │
// │ serves this variant with ZERO app.js changes: configureStatics() serves     │
// │ <framework>/app and GET / serves <framework>/app/index.html for any         │
// │ non-jquery framework. `node app -f svelte` then just works.                 │
// │                                                                             │
// │ NOTE: in the other variants (polymer/angular/ember) app/ is *source* and    │
// │ dist/ is the build output. This variant inverts that. emptyOutDir wipes     │
// │ app/ on every build — never put source there.                              │
// └───────────────────────────────────────────────────────────────────────────┘
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Static assets copied verbatim into app/ on build (incl. the do-not-edit marker).
  publicDir: 'static',
  build: {
    outDir: 'app',
    emptyOutDir: true,
  },
  server: {
    // Dev: Vite serves the SPA and proxies the API to the Express app (port 3080).
    proxy: {
      '/putfile': 'http://localhost:3080',
      '/get': 'http://localhost:3080',
    },
  },
});
