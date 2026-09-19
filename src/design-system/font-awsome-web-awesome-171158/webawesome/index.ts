/**
 * Web Awesome Design System — entry point.
 *
 * Components are typed React wrappers around the Web Awesome custom
 * elements (see ./react). Nothing here imports an npm package: Web Awesome
 * and Font Awesome load from a version-pinned CDN via theme.css and
 * WebAwesomeLoader, so consumers need no install step.
 */
// Side-effect import: consumers who import this barrel inherit the full
// theme (tokens, base styles, utilities, Font Awesome) without a separate
// stylesheet link. The preview app links theme.css?url in the root head
// instead and never imports this barrel, so styles are not loaded twice.
import "./theme.css";

export {
  WebAwesomeLoader,
  WEB_AWESOME_HTML_CLASSES,
  WEB_AWESOME_CDN,
  WEB_AWESOME_VERSION,
  FONT_AWESOME_VERSION,
} from "./setup";
export type { WebAwesomeLoaderProps } from "./setup";
// Opt-in CDN delivery. The server-rendering helper is deliberately NOT
// exported here: it needs npm packages at runtime and must stay out of
// browser bundles — import ./ssr/render.server directly from server code.
export {
  loadWebAwesomeFromCdn,
  FONT_AWESOME_ICON_PATH,
  FONT_AWESOME_STYLE_URL,
  WEB_AWESOME_LOADER_URL,
  WEB_AWESOME_SSR_LOADER_URL,
  WEB_AWESOME_STYLE_URL,
} from "./cdn";
export type { CdnLoadOptions } from "./cdn";
export * from "./react";
export * from "./patterns";
// Theme editor (tokens, live-override hook, panel). The save server function
// lives in ./theme-editor.functions and is imported directly where needed.
export * from "./theme-editor";

