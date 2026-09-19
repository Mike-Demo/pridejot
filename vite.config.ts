import path from "path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

export default defineConfig(({ command, mode }) => {
  // Production build = static site for Spacefast: prerender the public routes
  // and skip the Cloudflare Workers output (its bundle layout breaks the
  // prerender preview server, and a static host has no worker to run).
  const isStaticBuild = command === "build" && mode !== "development";

  // Cloudflare Workers plugin only on the Lovable development build (produces
  // the worker output); the workerd runtime isn't available for the dev server.
  const useCloudflare = command === "build" && !isStaticBuild;


  return {
    server: {
      host: "::",
      port: 8080,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      mockupPreviewPlugin(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...(useCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
      tanstackStart({
        // Public, non-parameterized routes that ship as static HTML.
        // Board pages (/b/$code) stay client-rendered via the SPA fallback.
        pages: [{ path: "/" }, { path: "/licenses" }],
        prerender: { enabled: isStaticBuild, autoStaticPathsDiscovery: false },
      }),
      viteReact(),
      ...(mode === "development" ? [componentTagger()] : []),
    ],
  };
});
