// Ambient declarations for the design system's optional SSR helper
// (webawesome/ssr/render.server.ts). Those packages are only installed when a
// project opts into server rendering; declaring the modules here keeps
// typecheck green without editing the vendored design-system files.
declare module "@awesome.me/webawesome/dist/ssr/all.js";
declare module "@awesome.me/webawesome/dist/ssr/render-string.js";
