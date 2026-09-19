# Fix the Spacefast build failure

## What went wrong

The Spacefast build never reached your code. Its build pack scanned the repository, found the Cloudflare Worker setup that Lovable's own preview uses (`wrangler.jsonc`, which names a worker entry file), and stopped with "Cloudflare Worker entrypoints are not converted". Your static build never touches that worker — it exists only for Lovable's preview — but Spacefast decides from the files it sees, not from what the build actually does.

## The fix

1. **Hide the worker config from Spacefast's scanner.** Rename `wrangler.jsonc` to `wrangler.dev.jsonc` and tell the Cloudflare plugin where to find it (`configPath: "wrangler.dev.jsonc"` in `vite.config.ts`, on the Lovable-preview build path only). Spacefast looks for a `wrangler.*` file at the root; with no standard-named file present, there is no worker entrypoint to flag. Lovable's preview keeps working exactly as before because the plugin is pointed at the renamed file explicitly.

2. **Verify locally.** Typecheck, run the Lovable-side build (`build:dev`, the one that still uses the worker) to confirm the renamed config is picked up, and run the static build to confirm `dist/client` is still produced unchanged.

3. **Update `SPACEFAST.md`.** Add a short "Troubleshooting" note: if the build still reports unsupported Cloudflare features, enable the "allow unsupported platform features" option in the Spacefast project's build settings — that flag tells Spacefast to ignore the worker it can't convert and ship the static output, which is all your site needs.

## If Spacefast still complains after step 1

Its scanner may also key off the `@cloudflare/vite-plugin` entry in `package.json`, which must stay installed for Lovable preview builds. In that case the remedy is on the Spacefast side: switch the project's build setting to allow unsupported platform features (the equivalent of the `--allow-unsupported-platform-features` flag in the error message). The worker is simply skipped; the static site in `dist/client` ships complete. That setting is in your Spacefast dashboard, so it stays with you — I can't change it from here.

## Technical notes

- `vite.config.ts`: `cloudflare({ viteEnvironment: { name: "ssr" }, configPath: "wrangler.dev.jsonc" })` — the plugin supports `configPath`; everything else in the config is untouched.
- No dependencies are added or removed; the security-pinned overrides stay as they are.
- No changes to pages, the board, or the database — this is build plumbing only.

## Out of scope

GitHub pushes and Spacefast dashboard settings — after I make the change, you push (or let Lovable sync) and re-run the Spacefast build.
