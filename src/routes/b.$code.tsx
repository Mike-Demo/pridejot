import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  SiteFooter,
  WaButton,
  WaIcon,
  WaPage,
  WaSpinner,
  WebAwesomeLoader,
} from "@/design-system/font-awsome-web-awesome-171158";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Whiteboard } from "@/components/Whiteboard";
import type { Board } from "@/lib/board-service";
import { getBoardByCode, normalizeCode } from "@/lib/board-service";

export const Route = createFileRoute("/b/$code")({
  head: ({ params }) => {
    const code = params.code.toUpperCase();
    return {
      meta: [
        { title: `Queerboard room ${code} — shared pride idea wall` },
        {
          name: "description",
          content:
            "Join this Queerboard room from your phone and add ideas to the conference-room whiteboard live. Drop sticky notes, drag them around and vote with hearts.",
        },
        { property: "og:title", content: `Queerboard room ${code}` },
        {
          property: "og:description",
          content:
            "Join this shared pride idea wall from your phone — ideas and hearts appear on the room screen instantly.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BoardRoute,
});

function BoardRoute() {
  const { code } = Route.useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getBoardByCode(code)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setState("missing");
          return;
        }
        setBoard(found);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <WaPage className="wa-cloak">
      <WebAwesomeLoader />
      {state === "ready" && board ? (
        <Whiteboard board={board} />
      ) : (
        <div className="wa-stack wa-gap-m wa-align-items-center wa-padding-2xl">
          {state === "loading" ? (
            <>
              <WaSpinner style={{ fontSize: "var(--wa-font-size-2xl)" }} />
              <p className="wa-body-l">Opening room {normalizeCode(code)}…</p>
            </>
          ) : (
            <>
              <WaIcon
                name={state === "missing" ? "circle-xmark" : "triangle-exclamation"}
                style={{ fontSize: "var(--wa-font-size-3xl)" }}
                aria-hidden="true"
              />
              <h1 className="wa-heading-l" style={{ margin: 0 }}>
                {state === "missing" ? "This board has ended" : "Something went wrong"}
              </h1>
              <p className="wa-body-l">
                {state === "missing"
                  ? "Boards close 24 hours after they start, so this room code is no longer live."
                  : "We couldn't reach this board. Check your connection and try again."}
              </p>
              <Link to="/">
                <WaButton variant="brand" size="l">
                  <WaIcon slot="start" name="plus" aria-hidden="true" />
                  Start a new board
                </WaButton>
              </Link>
            </>
          )}
        </div>
      )}
      <div slot="footer" className="wa-stack wa-gap-s wa-align-items-center">
        <PrivacyBadge />
        <SiteFooter />
      </div>
    </WaPage>
  );
}
