# Export the board as an image or a printable page

Add two export controls to the header so a group can walk away with a record of the board exactly as it looks on screen — same pride colors, same note positions.

## What you get

- An **Export** button in the header, next to Invite and Present, with two choices:
  - **Save as image (PNG)** — a crisp, high-resolution snapshot of the board.
  - **Save as PDF** — the same snapshot placed on a landscape page, sized to fit with a clean margin, ready to print.
- Both files are named with the date, e.g. `queerboard-2026-09-19.png`.
- Exports capture the board area only: notes, their colors, their positions, and the rainbow backdrop. Buttons, delete icons, and the color picker are left out, so the result looks finished rather than like a screenshot of an app.
- While a file is being prepared the button shows a short busy state, and a small message appears if something goes wrong.
- Exports work in presentation mode too, from the same controls that already sit in that view.

## Notes

- Nothing about how the board works changes: no saving, no accounts, notes still live only in the current session.
- Empty board still exports (you get the backdrop), so nobody hits a dead end.

## Technical approach

- Add `html2canvas-pro` (renders modern CSS colors correctly) and `jspdf` as dependencies.
- New `src/lib/board-export.ts` service holding the logic: take the board element, render at `scale: 2` with a transparent-free background, return a canvas; then either download a PNG blob or embed the image in a `jsPDF` landscape document sized from the canvas aspect ratio with a fixed margin. UI components only call these functions.
- Reuse the existing `boardRef`; add an `data-export-hide` attribute (or a small `pride-no-export` class) on control-only elements and pass an `ignoreElements` predicate so they are excluded from capture.
- Export menu built from the design system: `WaDropdown` + `WaDropdownItem` with `WaIcon`, matching the existing header buttons. Busy state via the button's `loading` attribute; failures surfaced with a `WaCallout`.
- All styling for the new pieces uses `--wa-*` tokens and `wa-*` utility classes; PDF page geometry uses millimetres inside the export module, which is document math rather than CSS styling.
