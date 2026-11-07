import { defineConfig } from 'vite';

const page = (name: string): string => `${name}.html`;

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: page('index'),
        rooms: page('rooms'),
        booking: page('booking'),
        facilities: page('facilities'),
        dining: page('dining'),
        conference: page('conference'),
        gym: page('gym'),
        dashboard: page('dashboard'),
        offers: page('offers'),
        contact: page('contact'),
      },
    },
  },
});
