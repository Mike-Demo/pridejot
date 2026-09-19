# QR code for quick phone access to Queerboard

## Goal
Participants in the room can scan a QR code to open the shared whiteboard on their phones — no typing a URL.

## What we'll build

1. **"Invite" button in the editor header** (next to Add idea / Present)
   - Opens a dialog with a large, centered QR code
   - Shows the board's URL below the code so it can also be read aloud or typed
   - Uses the design system's `WaQrCode` component and `WaDialog`

2. **QR code in presentation mode**
   - A small QR code sits in a corner of the fullscreen present view (opposite the Exit pill)
   - Large enough to scan from across the room; visible the whole time the board is presented
   - Participants joining land on the same live board page

3. **The QR encodes the app's current web address** (`window.location.href` at render time)
   - Works on the preview, the published site, and the custom domain with no hardcoding
   - Since the board keeps everything in memory, everyone who opens the link shares the same room experience on the big screen; notes remain on the shared display

## Technical details
- `src/routes/index.tsx`: add `WaQrCode` + `WaDialog` imports, an `inviteOpen` state, the header button, the dialog, and a QR block inside the present-mode overlay
- QR value: `window.location.href` read during render of the dialog/overlay (client-side only at that point, SSR-safe since both are rendered after user interaction)
- QR sizing via design-system spacing tokens; dialog and button styling stay on `WaDialog`/`WaButton` defaults
- No backend, persistence, or new dependencies — `WaQrCode` ships with the attached design system

## Verification
- Build check, then Playwright: open Invite dialog (QR visible, scannable content matches page URL), enter Present mode (QR visible in corner), exit, no console errors.
