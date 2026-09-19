import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import {
  SiteFooter,
  WaButton,
  WaIcon,
  WaPage,
  WebAwesomeLoader,
} from "@/design-system/font-awsome-web-awesome-171158";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queerboard — Pride idea whiteboard" },
      {
        name: "description",
        content:
          "A pride-themed group idea whiteboard for the conference room. Double-click anywhere to drop a sticky note, drag ideas around, and vote with hearts. Nothing is saved — the board resets when you leave.",
      },
      { property: "og:title", content: "Queerboard — Pride idea whiteboard" },
      {
        property: "og:description",
        content:
          "A pride-themed group idea whiteboard for the conference room. Double-click anywhere to drop a sticky note, drag ideas around, and vote with hearts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Whiteboard,
});

/* Pride palette — explicit brand colors requested for this board. */
interface NoteColor {
  readonly name: string;
  readonly bg: string;
  readonly ink: string;
}

const NOTE_COLORS: readonly NoteColor[] = [
  { name: "Red", bg: "#f6a9a2", ink: "#571311" },
  { name: "Orange", bg: "#f9cfa0", ink: "#5c3511" },
  { name: "Yellow", bg: "#f9e9a0", ink: "#57490e" },
  { name: "Green", bg: "#b3e3b1", ink: "#17491d" },
  { name: "Blue", bg: "#a9c9f0", ink: "#173c6b" },
  { name: "Purple", bg: "#d5b9ea", ink: "#3f2260" },
  { name: "Trans pink", bg: "#f4c3d6", ink: "#6b2140" },
  { name: "Trans blue", bg: "#b7e2f2", ink: "#124c63" },
  { name: "Brown", bg: "#d9bda6", ink: "#4b2e1b" },
  { name: "Black stripe", bg: "#c9ccd4", ink: "#20222a" },
];

interface Note {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly color: NoteColor;
  readonly text: string;
  readonly hearts: number;
}

let nextId = 100;

const NOTE_WIDTH = 240;
const NOTE_HALF = NOTE_WIDTH / 2;

/** Presentation mode enlarges notes so a conference-room screen stays readable. */
const PRESENT_SCALE = 1.6;

const seedNotes: Note[] = [
  {
    id: 1,
    x: 60,
    y: 90,
    rotation: -3,
    color: NOTE_COLORS[6]!,
    text: "Welcome to Queerboard! Double-click anywhere to add an idea.",
    hearts: 3,
  },
  {
    id: 2,
    x: 360,
    y: 140,
    rotation: 2,
    color: NOTE_COLORS[2]!,
    text: "Drag notes around to cluster ideas with your team.",
    hearts: 1,
  },
  {
    id: 3,
    x: 660,
    y: 80,
    rotation: -1.5,
    color: NOTE_COLORS[4]!,
    text: "Tap the heart on a note to vote it up. Nothing is saved.",
    hearts: 5,
  },
];

function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [selectedColor, setSelectedColor] = useState<NoteColor>(NOTE_COLORS[6]!);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [presenting, setPresenting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  const addNoteAt = (clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const note: Note = {
      id: nextId++,
      x: Math.max(0, clientX - rect.left - NOTE_HALF),
      y: Math.max(0, clientY - rect.top - 40),
      rotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
      color: selectedColor,
      text: "",
      hearts: 0,
    };
    setNotes((prev) => [...prev, note]);
    setEditingId(note.id);
  };

  const addNoteFromButton = () => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    addNoteAt(
      rect.left + rect.width / 2 + (Math.random() * 160 - 80),
      rect.top + rect.height / 2 + (Math.random() * 160 - 80),
    );
  };

  const onBoardDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".pride-note")) return;
    addNoteAt(event.clientX, event.clientY);
  };

  const onNotePointerDown = (event: ReactPointerEvent<HTMLDivElement>, note: Note) => {
    if (editingId === note.id) return;
    if ((event.target as HTMLElement).closest("button, textarea")) return;
    dragRef.current = {
      id: note.id,
      offsetX: event.clientX - note.x,
      offsetY: event.clientY - note.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onNotePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.moved = true;
    const board = boardRef.current;
    const rect = board?.getBoundingClientRect();
    const maxX = rect ? rect.width - NOTE_WIDTH : Number.POSITIVE_INFINITY;
    const maxY = rect ? rect.height - 60 : Number.POSITIVE_INFINITY;
    const x = Math.min(Math.max(0, event.clientX - drag.offsetX), Math.max(0, maxX));
    const y = Math.min(Math.max(0, event.clientY - drag.offsetY), Math.max(0, maxY));
    setNotes((prev) =>
      prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)),
    );
  };

  const onNotePointerUp = () => {
    dragRef.current = null;
  };

  const addHeart = (id: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, hearts: n.hearts + 1 } : n)),
    );
  };

  const removeNote = (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setEditingId((current) => (current === id ? null : current));
  };

  const updateText = (id: number, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const clearBoard = () => {
    setNotes([]);
    setEditingId(null);
  };

  const exitPresent = () => {
    setPresenting(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  const enterPresent = () => {
    setEditingId(null);
    setPresenting(true);
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  useEffect(() => {
    if (!presenting) return;
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitPresent();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [presenting]);

  const draggingId = dragRef.current?.id ?? null;

  return (
    <WaPage className="wa-cloak">
      <WebAwesomeLoader />
      <div className="pride-rainbow-bar" slot="subheader" aria-hidden="true" />

      <div slot="header" className="wa-stack wa-gap-s wa-padding-m">
        <div className="wa-split wa-gap-m wa-align-items-center">
          <div className="wa-cluster wa-gap-m wa-align-items-center">
            <h1
              className="wa-heading-l"
              style={{ margin: 0, display: "flex", alignItems: "center", gap: "var(--wa-space-s)" }}
            >
              <img
                src={logoUrl}
                alt=""
                width="40"
                height="40"
                style={{ borderRadius: "var(--wa-border-radius-m)" }}
              />
              Queerboard
            </h1>
            <span className="wa-body-s" style={{ color: "var(--wa-color-neutral-on-quiet)" }}>
              One shared wall of ideas for the whole room — nothing is saved.
            </span>
          </div>
          <div className="wa-cluster wa-gap-s wa-align-items-center">
            <WaButton variant="brand" size="l" onClick={addNoteFromButton}>
              <WaIcon slot="start" name="note-sticky" aria-hidden="true" />
              Add idea
            </WaButton>
            <WaButton appearance="outlined" variant="neutral" size="l" onClick={enterPresent}>
              <WaIcon slot="start" name="display" aria-hidden="true" />
              Present
            </WaButton>
            <WaButton appearance="outlined" variant="danger" size="l" onClick={clearBoard}>
              <WaIcon slot="start" name="eraser" aria-hidden="true" />
              Clear board
            </WaButton>
          </div>
        </div>
        <div className="wa-cluster wa-gap-s wa-align-items-center">
          <span className="wa-body-s" style={{ color: "var(--wa-color-neutral-on-quiet)" }}>
            Note color:
          </span>
          <div className="wa-cluster wa-gap-2xs" role="group" aria-label="Note color">
            {NOTE_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                className="pride-swatch"
                style={{ backgroundColor: color.bg }}
                title={`${color.name} notes`}
                aria-label={`Use ${color.name} notes`}
                aria-pressed={selectedColor.name === color.name}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        ref={boardRef}
        className="pride-board"
        onDoubleClick={onBoardDoubleClick}
        aria-label="Idea board"
      >
        {notes.length === 0 ? (
          <div className="pride-empty">
            <div className="wa-stack wa-gap-s">
              <WaIcon name="hand-pointer" style={{ fontSize: "var(--wa-font-size-3xl)" }} aria-hidden="true" />
              <p className="wa-body-l">The board is empty — double-click anywhere to drop the first idea.</p>
            </div>
          </div>
        ) : null}

        {notes.map((note) => (
          <div
            key={note.id}
            className="pride-note"
            data-dragging={draggingId === note.id}
            style={{
              left: note.x,
              top: note.y,
              transform: `rotate(${note.rotation}deg)`,
              backgroundColor: note.color.bg,
              color: note.color.ink,
            }}
            onPointerDown={(event) => onNotePointerDown(event, note)}
            onPointerMove={onNotePointerMove}
            onPointerUp={onNotePointerUp}
            onDoubleClick={() => setEditingId(note.id)}
            role="article"
            aria-label={note.text ? `Idea: ${note.text}` : "Empty idea note"}
          >
            {editingId === note.id ? (
              <textarea
                className="pride-note-textarea"
                autoFocus
                placeholder="Type your idea…"
                value={note.text}
                onChange={(event) => updateText(note.id, event.target.value)}
                onBlur={() => setEditingId(null)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setEditingId(null);
                }}
                aria-label="Edit idea"
              />
            ) : (
              <div className="pride-note-text">
                {note.text || (
                  <span style={{ opacity: 0.6 }}>Double-click to write…</span>
                )}
              </div>
            )}

            <div className="pride-note-actions">
              <button
                type="button"
                className="pride-note-icon-btn"
                onClick={() => addHeart(note.id)}
                aria-label={`Vote for this idea (${note.hearts} votes)`}
              >
                <WaIcon name="heart" aria-hidden="true" />
                {note.hearts}
              </button>
              <button
                type="button"
                className="pride-note-icon-btn"
                onClick={() => removeNote(note.id)}
                aria-label="Remove this idea"
              >
                <WaIcon name="trash" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div slot="footer">
        <SiteFooter />
      </div>

      {presenting ? (
        <div
          className="pride-present"
          role="dialog"
          aria-modal="true"
          aria-label="Presentation mode"
        >
          <div className="pride-rainbow-bar pride-present-bar" aria-hidden="true" />
          <div className="pride-present-board">
            {notes.map((note) => (
              <div
                key={note.id}
                className="pride-note pride-present-note"
                style={{
                  left: note.x * PRESENT_SCALE,
                  top: note.y * PRESENT_SCALE,
                  transform: `rotate(${note.rotation}deg) scale(${PRESENT_SCALE})`,
                  backgroundColor: note.color.bg,
                  color: note.color.ink,
                }}
                role="article"
                aria-label={note.text ? `Idea: ${note.text}` : "Empty idea note"}
              >
                <div className="pride-note-text">{note.text}</div>
                {note.hearts > 0 ? (
                  <div className="pride-present-hearts">
                    <WaIcon name="heart" aria-hidden="true" />
                    {note.hearts}
                  </div>
                ) : null}
              </div>
            ))}
            {notes.length === 0 ? (
              <div className="pride-empty">
                <p className="wa-body-l">The board is empty.</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="pride-present-exit"
            onClick={exitPresent}
            aria-label="Exit presentation mode"
          >
            <WaIcon name="compress" aria-hidden="true" />
            Exit
          </button>
        </div>
      ) : null}
    </WaPage>
  );
}
