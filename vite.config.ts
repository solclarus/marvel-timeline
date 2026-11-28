import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { sharePages } from "./src/lib/share-pages";

// Writes each work's link-preview page (see `src/lib/share-pages.ts`).
function sharePagesPlugin(): Plugin {
  return {
    name: "share-pages",
    apply: "build",
    generateBundle() {
      for (const [fileName, source] of sharePages()) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    sharePagesPlugin(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries change far less often than the app and its data, so they
        // ship as separate chunks the browser can keep cached across deploys.
        advancedChunks: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "base-ui", test: /node_modules[\\/]@(base-ui|floating-ui)[\\/]/ },
            { name: "vendor", test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
});
