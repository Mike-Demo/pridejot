import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import {
  SiteFooter,
  WaButton,
  WaCallout,
  WaCard,
  WaIcon,
  WaInput,
  WaPage,
  WebAwesomeLoader,
} from "@/design-system/font-awsome-web-awesome-171158";
import logoUrl from "@/assets/logo.png";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { createBoard, getBoardByCode, normalizeCode } from "@/lib/board-service";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queerboard — shared pride idea whiteboard" },
      {
        name: "description",
        content:
          "Start a pride-themed idea whiteboard for your meeting room, then let everyone scan a QR code to add sticky notes and hearts from their phones in real time.",
      },
      { property: "og:title", content: "Queerboard — shared pride idea whiteboard" },
      {
        property: "og:description",
        content:
          "Start a shared idea board for the room, invite phones with a QR code, and watch ideas and hearts appear live.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mikedemo.one/" },
      { property: "og:image", content: "https://mikedemo.one/favicon.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://mikedemo.one/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Queerboard",
          url: "https://mikedemo.one/",
          description:
            "A pride-themed idea wall for the conference room. Start a board, put it on the big screen, and everyone in the room can add ideas and hearts from their phones.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          inLanguage: "en",
          author: { "@type": "Person", name: "MikeDemo" },
        }).replace(/</g, "\u003c"),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Queerboard",
          url: "https://mikedemo.one/",
          inLanguage: "en",
          publisher: {
            "@type": "Organization",
            name: "MikeDemo",
            url: "https://mikedemo.dev",
          },
        }).replace(/</g, "\u003c"),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "MikeDemo",
          url: "https://mikedemo.dev",
        }).replace(/</g, "\u003c"),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is Queerboard?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Queerboard is a pride-themed shared idea whiteboard for meeting rooms and events. Start a board, put it on the big screen, and everyone in the room can add sticky notes and vote with hearts from their phones in real time.",
              },
            },
            {
              "@type": "Question",
              name: "Do I need an account to join a board?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Anyone with the room code or QR code can join from their phone browser. There is no sign-up and nothing to install.",
              },
            },
            {
              "@type": "Question",
              name: "Is anything I write on a board saved?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Nothing is saved. Boards close on their own 24 hours after they are created, and no account or personal data is required to take part.",
              },
            },
            {
              "@type": "Question",
              name: "Can I keep or share the results of a board?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. A finished board can be exported as a downloadable image or PDF to share with the room.",
              },
            },
          ],
        }).replace(/</g, "\u003c"),
      },
    ],
  }),
  component: StartScreen,
});

function StartScreen() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const startBoard = async () => {
    setMessage(null);
    setStarting(true);
    try {
      const board = await createBoard();
      await navigate({ to: "/b/$code", params: { code: board.code } });
    } catch {
      setMessage("Couldn't start a new board. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const joinBoard = async (event: FormEvent) => {
    event.preventDefault();
    const wanted = normalizeCode(code);
    if (!wanted) {
      setMessage("Enter the room code shown on the meeting-room screen.");
      return;
    }
    setMessage(null);
    setJoining(true);
    try {
      const board = await getBoardByCode(wanted);
      if (!board) {
        setMessage(`No live board with the code ${wanted}. Check the code and try again.`);
        return;
      }
      await navigate({ to: "/b/$code", params: { code: board.code } });
    } catch {
      setMessage("Couldn't look up that code. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <WaPage className="wa-cloak">
      <WebAwesomeLoader />
      <div className="pride-rainbow-bar" slot="subheader" aria-hidden="true" />

      <main>
      <div className="wa-stack wa-gap-xl wa-align-items-center wa-padding-2xl">
        <h1
          className="wa-heading-2xl wa-cluster wa-gap-s wa-align-items-center"
          style={{ margin: 0 }}
        >
          <img
            src={logoUrl}
            alt=""
            style={{
              width: "var(--wa-space-2xl)",
              height: "var(--wa-space-2xl)",
              borderRadius: "var(--wa-border-radius-m)",
            }}
          />
          Queerboard
        </h1>
        <p className="wa-body-l" style={{ margin: 0 }}>
          A pride-themed idea wall for the conference room. Start a board, put it on the big screen,
          and everyone in the room can add ideas and hearts from their phones.
        </p>

        <div className="wa-grid wa-gap-l">
          <WaCard>
            <div className="wa-stack wa-gap-m">
              <h2 className="wa-heading-m" style={{ margin: 0 }}>
                Start a new board
              </h2>
              <p className="wa-body-m" style={{ margin: 0 }}>
                You'll get a short room code and a QR code for the room to scan. Boards close on
                their own 24 hours later.
              </p>
              <WaButton
                variant="brand"
                size="l"
                loading={starting}
                onClick={() => void startBoard()}
              >
                <WaIcon slot="start" name="plus" aria-hidden="true" />
                Start a new board
              </WaButton>
            </div>
          </WaCard>

          <WaCard>
            <form className="wa-stack wa-gap-m" onSubmit={(event) => void joinBoard(event)}>
              <h2 className="wa-heading-m" style={{ margin: 0 }}>
                Join with a code
              </h2>
              <p className="wa-body-m" style={{ margin: 0 }}>
                Type the room code shown on the meeting-room screen.
              </p>
              <WaInput
                label="Room code"
                placeholder="ABC234"
                autoCapitalize="characters"
                autoComplete="off"
                value={code}
                onInput={(event: FormEvent) => setCode((event.target as HTMLInputElement).value)}
              />
              <WaButton type="submit" appearance="outlined" variant="neutral" size="l" loading={joining}>
                <WaIcon slot="start" name="arrow-right" aria-hidden="true" />
                Join board
              </WaButton>
            </form>
          </WaCard>
        </div>

        {message ? (
          <WaCallout variant="warning">
            <WaIcon slot="icon" name="triangle-exclamation" aria-hidden="true" />
            {message}
          </WaCallout>
        ) : null}

        <section
          className="wa-stack wa-gap-l"
          aria-label="About Queerboard"
          style={{ maxWidth: "42rem", textAlign: "left" }}
        >
          <div>
            <h2 className="wa-heading-l" style={{ margin: 0 }}>
              What is Queerboard?
            </h2>
            <p className="wa-body-m">
              Queerboard is a shared idea whiteboard built for pride events, team meetings,
              and conference rooms. One person starts a board and puts it on the big screen;
              everyone else joins from their phone to add sticky notes, drag them around,
              and vote with hearts. New ideas and votes appear live as people submit them.
            </p>
          </div>
          <div>
            <h2 className="wa-heading-l" style={{ margin: 0 }}>
              Who it's for
            </h2>
            <p className="wa-body-m">
              Meeting facilitators running brainstorms and retrospectives, employee resource
              groups and pride organizers collecting ideas from a crowd, conference speakers
              running a live question wall, and teachers gathering responses from a
              classroom. If you've got a room full of people and a screen, Queerboard gives
              everyone in it a voice.
            </p>
          </div>
          <div>
            <h2 className="wa-heading-l" style={{ margin: 0 }}>
              Key features
            </h2>
            <ul className="wa-body-m" style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
              <li>Real-time sticky notes and heart votes — no refresh needed.</li>
              <li>Join by room code or QR code — no account, no app to install.</li>
              <li>Boards close automatically after 24 hours; nothing is saved.</li>
              <li>Export a finished board as an image or PDF to share with the room.</li>
            </ul>
          </div>
        </section>
      </div>
      </main>

      <div slot="footer" className="wa-stack wa-gap-s wa-align-items-center">
        <PrivacyBadge />
        <SiteFooter />
      </div>
    </WaPage>
  );
}
