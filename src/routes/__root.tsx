import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { WEB_AWESOME_HTML_CLASSES } from "@/design-system/font-awsome-web-awesome-171158/webawesome/setup";
import {
  FONT_AWESOME_STYLE_URL,
  WEB_AWESOME_STYLE_URL,
} from "@/design-system/font-awsome-web-awesome-171158/webawesome/cdn";
import themeCss from "@/design-system/font-awsome-web-awesome-171158/webawesome/theme.css?url";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Queerboard" },
      {
        name: "description",
        content:
          "A pride-themed group idea whiteboard for the conference room — everyone adds sticky notes, drags them around, and votes. Nothing is saved.",
      },
      { name: "author", content: "MikeDemo" },
      // Bing Webmaster Tools site verification (account-level code).
      { name: "msvalidate.01", content: "C46BBA52678FF98E0C7403B8F571606E" },
      { property: "og:title", content: "Queerboard" },
      {
        property: "og:description",
        content:
          "A pride-themed group idea whiteboard for the conference room — everyone adds sticky notes, drags them around, and votes. Nothing is saved.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        // Tightest policy that allows every resource the app actually loads:
        // self-hosted bundles, inline TanStack Start bootstrap/hydration
        // scripts, SSR style attributes, jsDelivr (Web Awesome + Font Awesome
        // CSS, webfonts, icon SVGs), the Supabase project API, and the
        // umami-lite private analytics tracker.
        httpEquiv: "Content-Security-Policy",
        content: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://umami-lite.view.fast",
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
          "img-src 'self' data:",
          "font-src 'self' https://cdn.jsdelivr.net",
          "connect-src 'self' https://cdn.jsdelivr.net https://*.supabase.co https://umami-lite.view.fast",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ],
    links: [
      { rel: "stylesheet", href: WEB_AWESOME_STYLE_URL },
      { rel: "stylesheet", href: FONT_AWESOME_STYLE_URL },
      { rel: "stylesheet", href: themeCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={WEB_AWESOME_HTML_CLASSES}>
      <head>
        <HeadContent />
        {/* Private analytics tracker: umami-lite, loads on every page. */}
        <script
          defer
          src="https://umami-lite.view.fast/tracker.js"
          data-website-id="7fa759f7-02f5-41ac-ad7b-7a9424434f2e"
        ></script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Keep this root providers-only: canvas preview routes (/__mockup,
// /__component) render inside it, so any chrome leaks into every frame.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
