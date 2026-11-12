import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { HOTEL } from './src/config/hotel';

/**
 * Injects brand values into index.html at dev/build time so no brand string
 * is hard-coded in the HTML template. Renaming the hotel only requires
 * editing src/config/hotel.ts.
 */
function brandHtml(): Plugin {
  const replacements: Array<[RegExp, string]> = [
    [/__HOTEL_NAME__/g, HOTEL.name],
    [/__HOTEL_MONOGRAM__/g, HOTEL.monogram],
    [/__HOTEL_LOCATION__/g, `${HOTEL.location.town}, ${HOTEL.location.county}`],
    [
      /__HOTEL_DESCRIPTION__/g,
      `${HOTEL.name} in ${HOTEL.location.town}, ${HOTEL.location.county}. Warm, independent rooms, farm-to-table dining, conference facilities and a fitness studio. Book direct for the best rate.`,
    ],
  ];

  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      return replacements.reduce(
        (output, [pattern, value]) => output.replace(pattern, value),
        html,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), brandHtml()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
