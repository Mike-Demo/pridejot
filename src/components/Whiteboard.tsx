import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import {
  WaButton,
  WaCallout,
  WaDialog,
  WaDropdown,
  WaDropdownItem,
  WaIcon,
  WaQrCode,
} from "@/design-system/font-awsome-web-awesome-171158";
import logoUrl from "@/assets/logo.png";
import { exportBoardAsPdf, exportBoardAsPng } from "@/lib/board-export";
import { colorAt, DEFAULT_COLOR_INDEX, NOTE_COLORS } from "@/lib/note-colors";
import type { Board, BoardNote } from "@/lib/board-service";
import {
  clearBoardNotes,
  deleteNote,
  insertNote,
  listNotes,
  patchNote,
} from "@/lib/board-service";
import { supabase } from "@/integrations/supabase/client";

const NOTE_WIDTH = 240;
const NOTE_HALF = NOTE_WIDTH / 2;

/** Presentation mode enlarges notes so a conference-room screen stays readable. */
const PRESENT_SCALE = 1.6;

/** While dragging, other screens get a position update at most this often. */
const DRAG_SYNC_MS = 120;

interface WhiteboardProps {
  readonly board: Board;
}

export function Whiteboard({ board }: WhiteboardProps) {
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [colorIndex, setColorIndex] = useState(DEFAULT_COLOR_INDEX);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [boardUrl, setBoardUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const inviteDialogRef = useRef<HTMLElement>(null);
  const editingIdRef = useRef<string | null>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
    lastSync: number;
  } | null>(null);

  editingIdRef.current = editingId;

  const failed = useCallback(() => {
    setErrorMessage("That change didn't reach the board. Please try again.");
  }, []);

  /* Initial load. */
  useEffect(() => {
    let cancelled = false;
    listNotes(board.id)
      .then((rows) => {
        if (!cancelled) setNotes(rows);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage("Couldn't load this board's ideas. Please refresh.");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [board.id]);

  /* Live updates from every other phone and screen on this board. */
  useEffect(() => {
    const channel = supabase
      .channel(`board-${board.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `board_id=eq.${board.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = payload.old as { id?: string };
            if (!removed.id) return;
            setNotes((prev) => prev.filter((n) => n.id !== removed.id));
            setEditingId((current) => (current === removed.id ? null : current));
            return;
          }
          const row = payload.new as BoardNote;
          setNotes((prev) => {
            const exists = prev.some((n) => n.id === row.id);
            if (!exists) return [...prev, row];
            return prev.map((n) => {
              if (n.id !== row.id) return n;
              /* Keep what this person is typing or dragging right now. */
              const mine = editingIdRef.current === row.id || dragRef.current?.id === row.id;
              return mine ? { ...row, x: n.x, y: n.y, text: n.text } : row;
            });
          });
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [board.id]);

  const addNoteAt = (clientX: number, clientY: number) => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const draft = {
      board_id: board.id,
      x: Math.round(Math.max(0, clientX - rect.left - NOTE_HALF)),
      y: Math.round(Math.max(0, clientY - rect.top - 40)),
      rotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
      color_index: colorIndex,
      text: "",
      hearts: 0,
    };
    insertNote(draft)
      .then((note) => {
        setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
        setEditingId(note.id);
      })
      .catch(failed);
  };

  const addNoteFromButton = () => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    addNoteAt(
      rect.left + rect.width / 2 + (Math.random() * 160 - 80),
      rect.top + rect.height / 2 + (Math.random() * 160 - 80),
    );
  };

  const onBoardDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".pride-note")) return;
    addNoteAt(event.clientX, event.clientY);
  };

  const onNotePointerDown = (event: ReactPointerEvent<HTMLDivElement>, note: BoardNote) => {
    if (editingId === note.id) return;
    if ((event.target as HTMLElement).closest("button, textarea")) return;
    dragRef.current = {
      id: note.id,
      offsetX: event.clientX - note.x,
      offsetY: event.clientY - note.y,
      moved: false,
      lastSync: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onNotePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.moved = true;
    const boardEl = boardRef.current;
    const rect = boardEl?.getBoundingClientRect();
    const maxX = rect ? rect.width - NOTE_WIDTH : Number.POSITIVE_INFINITY;
    const maxY = rect ? rect.height - 60 : Number.POSITIVE_INFINITY;
    const x = Math.round(Math.min(Math.max(0, event.clientX - drag.offsetX), Math.max(0, maxX)));
    const y = Math.round(Math.min(Math.max(0, event.clientY - drag.offsetY), Math.max(0, maxY)));
    setNotes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)));
    const now = Date.now();
    if (now - drag.lastSync > DRAG_SYNC_MS) {
      drag.lastSync = now;
      void patchNote(drag.id, { x, y }).catch(() => undefined);
    }
  };

  const onNotePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    const note = notes.find((n) => n.id === drag.id);
    if (!note) return;
    void patchNote(note.id, { x: note.x, y: note.y }).catch(failed);
  };

  const addHeart = (note: BoardNote) => {
    const hearts = note.hearts + 1;
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, hearts } : n)));
    void patchNote(note.id, { hearts }).catch(failed);
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setEditingId((current) => (current === id ? null : current));
    void deleteNote(id).catch(failed);
  };

  const updateText = (id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const commitText = (id: string) => {
    const note = notes.find((n) => n.id === id);
    setEditingId(null);
    if (!note) return;
    void patchNote(id, { text: note.text }).catch(failed);
  };

  const clearBoard = () => {
    setNotes([]);
    setEditingId(null);
    void clearBoardNotes(board.id).catch(failed);
  };

  const runExport = async (format: "png" | "pdf") => {
    /* Always capture the editor board: the presentation board is scaled and
       clipped to the screen, which would cut notes off in the export. */
    const boardEl = boardRef.current;
    if (!boardEl) return;
    setErrorMessage(null);
    setExporting(true);
    setEditingId(null);
    try {
      if (format === "png") {
        await exportBoardAsPng(boardEl);
      } else {
        await exportBoardAsPdf(boardEl);
      }
    } catch {
      setErrorMessage("Sorry, that export didn't work. Please try again.");
    } finally {
      setExporting(false);
    }
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
    setBoardUrl(window.location.origin + window.location.pathname);
  }, []);

  useEffect(() => {
    const dialog = inviteDialogRef.current;
    if (!dialog) return;
    const onHide = () => setInviteOpen(false);
    dialog.addEventListener("wa-hide", onHide);
    return () => dialog.removeEventListener("wa-hide", onHide);
  }, []);

  /* The wa-dialog `open` boolean must be set as a property — React sets the
     wrapper's emitted empty-string attribute back to falsy on the element. */
  useEffect(() => {
    const dialog = inviteDialogRef.current as (HTMLElement & { open: boolean }) | null;
    if (dialog) dialog.open = inviteOpen;
  }, [inviteOpen]);

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
  const selectedColor = colorAt(colorIndex);

  return (
    <>
      <div className="pride-rainbow-bar" slot="subheader" aria-hidden="true" />

      <div slot="header" className="wa-stack wa-gap-s wa-padding-m">
        <div className="wa-split wa-gap-m wa-align-items-center">
          <div className="wa-cluster wa-gap-m wa-align-items-center">
            <h1
              className="wa-heading-l wa-cluster wa-gap-s wa-align-items-center"
              style={{ margin: 0 }}
            >
              <img
                src={logoUrl}
                alt=""
                style={{
                  width: "var(--wa-space-xl)",
                  height: "var(--wa-space-xl)",
                  borderRadius: "var(--wa-border-radius-m)",
                }}
              />
              Queerboard
            </h1>
            <span className="wa-body-s" style={{ color: "var(--wa-color-neutral-on-quiet)" }}>
              Room code <strong>{board.code}</strong> — everyone who joins sees the same wall of
              ideas.
            </span>
            <span
              className="wa-cluster wa-gap-2xs wa-align-items-center wa-body-s"
              style={{
                color: live
                  ? "var(--wa-color-success-on-quiet)"
                  : "var(--wa-color-neutral-on-quiet)",
              }}
            >
              <WaIcon name={live ? "circle-dot" : "circle-notch"} aria-hidden="true" />
              {live ? "Live" : "Connecting…"}
            </span>
          </div>
          <div className="wa-cluster wa-gap-s wa-align-items-center">
            <WaButton variant="brand" size="l" onClick={addNoteFromButton}>
              <WaIcon slot="start" name="note-sticky" aria-hidden="true" />
              Add idea
            </WaButton>
            <WaButton
              appearance="outlined"
              variant="neutral"
              size="l"
              onClick={() => setInviteOpen(true)}
            >
              <WaIcon slot="start" name="qrcode" aria-hidden="true" />
              Invite
            </WaButton>
            <WaDropdown>
              <WaButton
                slot="trigger"
                appearance="outlined"
                variant="neutral"
                size="l"
                with-caret
                loading={exporting}
              >
                <WaIcon slot="start" name="download" aria-hidden="true" />
                Export
              </WaButton>
              <WaDropdownItem onClick={() => void runExport("png")}>
                <WaIcon slot="icon" name="image" aria-hidden="true" />
                Save as image (PNG)
              </WaDropdownItem>
              <WaDropdownItem onClick={() => void runExport("pdf")}>
                <WaIcon slot="icon" name="file-pdf" aria-hidden="true" />
                Save as PDF
              </WaDropdownItem>
            </WaDropdown>
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
            {NOTE_COLORS.map((color, index) => (
              <button
                key={color.name}
                type="button"
                className="pride-swatch"
                style={{ backgroundColor: color.bg }}
                title={`${color.name} notes`}
                aria-label={`Use ${color.name} notes`}
                aria-pressed={selectedColor.name === color.name}
                onClick={() => setColorIndex(index)}
              />
            ))}
          </div>
        </div>
        {errorMessage ? (
          <WaCallout variant="danger">
            <WaIcon slot="icon" name="triangle-exclamation" aria-hidden="true" />
            {errorMessage}
          </WaCallout>
        ) : null}
      </div>

      <div
        ref={boardRef}
        className="pride-board"
        onDoubleClick={onBoardDoubleClick}
        aria-label="Idea board"
      >
        {loaded && notes.length === 0 ? (
          <div className="pride-empty">
            <div className="wa-stack wa-gap-s">
              <WaIcon
                name="hand-pointer"
                style={{ fontSize: "var(--wa-font-size-3xl)" }}
                aria-hidden="true"
              />
              <p className="wa-body-l">
                The board is empty — double-click anywhere to drop the first idea.
              </p>
            </div>
          </div>
        ) : null}

        {notes.map((note) => {
          const color = colorAt(note.color_index);
          return (
            <div
              key={note.id}
              className="pride-note"
              data-dragging={draggingId === note.id}
              style={{
                left: note.x,
                top: note.y,
                transform: `rotate(${note.rotation}deg)`,
                backgroundColor: color.bg,
                color: color.ink,
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
                  onBlur={() => commitText(note.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") commitText(note.id);
                  }}
                  aria-label="Edit idea"
                />
              ) : (
                <div className="pride-note-text">
                  {note.text || <span style={{ opacity: 0.6 }}>Double-click to write…</span>}
                </div>
              )}

              <div className="pride-note-actions">
                <button
                  type="button"
                  className="pride-note-icon-btn"
                  onClick={() => addHeart(note)}
                  aria-label={`Vote for this idea (${note.hearts} votes)`}
                >
                  <WaIcon name="heart" aria-hidden="true" />
                  {note.hearts}
                </button>
                <button
                  type="button"
                  className="pride-note-icon-btn"
                  data-export-hide
                  onClick={() => removeNote(note.id)}
                  aria-label="Remove this idea"
                >
                  <WaIcon name="trash" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
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
            {notes.map((note) => {
              const color = colorAt(note.color_index);
              return (
                <div
                  key={note.id}
                  className="pride-note pride-present-note"
                  style={{
                    left: note.x * PRESENT_SCALE,
                    top: note.y * PRESENT_SCALE,
                    transform: `rotate(${note.rotation}deg) scale(${PRESENT_SCALE})`,
                    backgroundColor: color.bg,
                    color: color.ink,
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
              );
            })}
            {notes.length === 0 ? (
              <div className="pride-empty">
                <p className="wa-body-l">The board is empty.</p>
              </div>
            ) : null}
          </div>
          <div
            className="pride-present-controls wa-cluster wa-gap-xs wa-align-items-center"
            data-export-hide
          >
            <button
              type="button"
              className="pride-present-exit"
              onClick={() => void runExport("png")}
              aria-label="Save this board as an image"
            >
              <WaIcon name="image" aria-hidden="true" />
              Image
            </button>
            <button
              type="button"
              className="pride-present-exit"
              onClick={() => void runExport("pdf")}
              aria-label="Save this board as a printable PDF"
            >
              <WaIcon name="file-pdf" aria-hidden="true" />
              PDF
            </button>
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
          <div className="pride-present-qr wa-stack wa-gap-xs wa-align-items-center">
            <WaQrCode value={boardUrl || "https://pridejot.lovable.app"} size={140} label="QR code linking to this whiteboard" />
            <span className="wa-body-s">Scan to join {board.code}</span>
          </div>
        </div>
      ) : null}

      <WaDialog ref={inviteDialogRef} label="Invite the room" light-dismiss>
        <div className="wa-stack wa-gap-m wa-align-items-center">
          <WaQrCode value={boardUrl || "https://pridejot.lovable.app"} size={220} label="QR code linking to this whiteboard" />
          <p className="wa-body-m" style={{ margin: 0 }}>
            Scan to join room <strong>{board.code}</strong>: {boardUrl}
          </p>
        </div>
      </WaDialog>
    </>
  );
}
