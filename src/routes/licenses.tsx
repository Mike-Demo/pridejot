import { createFileRoute } from "@tanstack/react-router";

import {
  LicensesPage,
  WebAwesomeLoader,
} from "@/design-system/font-awsome-web-awesome-171158";
import {
  baseCredits,
  type LicenseEntry,
} from "@/design-system/font-awsome-web-awesome-171158/webawesome/patterns/licenses";

export const Route = createFileRoute("/licenses")({
  head: () => ({
    meta: [
      { title: "Open Source Licenses — Queerboard" },
      {
        name: "description",
        content: "Open-source software and asset credits for Queerboard.",
      },
      { property: "og:title", content: "Open Source Licenses — Queerboard" },
      {
        property: "og:description",
        content: "Open-source software and asset credits for Queerboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://mikedemo.one/licenses" }],
  }),
  component: Licenses,
});

const extraCredits: readonly LicenseEntry[] = [
  {
    name: "Supabase",
    author: "Supabase, Inc.",
    license: "MIT (client libraries)",
    url: "https://github.com/supabase/supabase-js/blob/master/LICENSE",
    note: "Board storage.",
  },
  {
    name: "html2canvas-pro",
    author: "yorickshan",
    license: "MIT",
    url: "https://github.com/yorickshan/html2canvas-pro",
    note: "Renders boards to downloadable images.",
  },
  {
    name: "jsPDF",
    author: "parallax",
    license: "MIT",
    url: "https://github.com/parallax/jsPDF",
    note: "Generates downloadable board PDFs.",
  },
  {
    name: "Recharts",
    author: "recharts contributors",
    license: "MIT",
    url: "https://github.com/recharts/recharts",
  },
];

function Licenses() {
  return (
    <>
      <WebAwesomeLoader />
      <main>
        <LicensesPage
        groups={[
          {
            title: "Open source libraries",
            entries: [...baseCredits, ...extraCredits],
          },
        ]}
        />
        <section className="wa-licenses wa-licenses-group" aria-label="Source code">
          <h2>Open source</h2>
          <p className="wa-licenses-lede">
            This site&apos;s source code is on GitHub:{" "}
            <a
              className="wa-licenses-entry-link"
              href="https://github.com/Mike-Demo/pridejot"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mike-Demo/pridejot
            </a>
          </p>
        </section>
      </main>
    </>
  );
}
