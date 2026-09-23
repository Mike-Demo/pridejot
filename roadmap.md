# Roadmap

Consolidated from the archived plans in `.lovable/plan/`. Completed milestones are
checked; open items are things still worth doing.

## Completed

- [x] Pride-themed whiteboard: draggable sticky notes, double-click to create and
      edit, heart voting, delete, clear board, colour swatches.
- [x] Custom rainbow-heart mark used as both favicon and header logo.
- [x] Presentation mode: true fullscreen, enlarged notes, editing chrome hidden,
      Escape to exit, state synced with browser fullscreen.
- [x] Join by QR: Invite dialog with a large QR code and the board address, plus a
      "Scan to join" QR card in presentation mode.
- [x] Export the board as a polished PNG and a printable A4-landscape PDF, pride
      header band included.
- [x] Live shared board: room codes at `/b/CODE`, start/join screen, Postgres +
      realtime backend, 24-hour expiry with an hourly cleanup job, "Live"
      indicator.
- [x] Tightened the board-creation policy so new rows must carry a valid code and
      a ~24-hour lifetime.
- [x] "No analytics, no tracking" badge above the footer on the start screen and
      board pages, hidden in presentation mode.
- [x] Fixed all known dependency vulnerabilities (direct upgrades plus pinned
      overrides for three transitive packages); scan reports clean.
- [x] Static hosting setup: prerendered `/` and `/licenses`, `dist/client` output,
      post-build copy script, `sitemap.xml`, `robots.txt`, `_redirects`.
- [x] Fixed the static-host build failure caused by Cloudflare Worker detection
      (renamed wrangler config, worker plugin limited to the preview build).
- [x] Repository hand-off documentation: README, `docs/`, `.env.example`, this
      roadmap.

## Open

- [ ] Confirm the hourly `delete-expired-queerboards` job actually runs (it is
      scheduled but its execution has never been observed). Check that expired
      boards disappear.
- [ ] The shield icon on the privacy badge does not visibly render in captured
      screenshots; the text is fine. Worth a look.
- [ ] Verify the published site with a real phone once the domain is live —
      scan-to-join across networks, not just two browser tabs.

## Ideas, not scheduled

- [ ] Presence: show how many people are on the board, or simple avatars.
- [ ] Show the join code much larger on the room screen (a dedicated "invite"
      view for projectors).
- [ ] Optional longer board lifetime than 24 hours, chosen when starting a board.
- [ ] Per-person attribution or colours, and something better than
      last-write-wins if groups get large.
- [ ] Undo for accidental deletes / clear board.
