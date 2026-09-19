import { createFileRoute } from "@tanstack/react-router";

import {
  LicensesPage,
  WebAwesomeLoader,
} from "@/design-system/font-awsome-web-awesome-171158";

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
  }),
  component: Licenses,
});

function Licenses() {
  return (
    <>
      <WebAwesomeLoader />
      <LicensesPage />
    </>
  );
}
