# Add a "No analytics / no tracking" badge

Show visitors that Queerboard collects nothing about them with a small, quiet badge on both pages.

## What you'll see

- On the start screen, just above the footer: a small pill reading "No analytics, no tracking" with a shield icon.
- On the board page, same pill in the footer area (hidden in presentation mode so conference screens stay clean).
- Neutral styling — it informs, it doesn't shout.

## How it's built

- A single shared `PrivacyBadge` component (in `src/components/`) using the design system's `WaTag` (neutral variant) with a `WaIcon` shield icon — no custom colors or sizes.
- Rendered once in the start screen footer area (`src/routes/index.tsx`) and once in the board's footer slot (`src/components/Whiteboard.tsx`), next to the existing site footer.
- No backend or data changes. I verified the app has zero analytics/tracking code, so the claim is accurate.

## Verification

- Typecheck and build pass; screenshot of both pages showing the badge.
