#!/usr/bin/env node
/**
 * Copies the prerendered static site into `dist/client`, where static hosts
 * (Spacefast) expect it. Idempotent: safe to run repeatedly, and a no-op when
 * the build already produced `dist/client` directly.
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, ".output", "public");
const target = path.join(root, "dist", "client");

async function exists(target_path) {
  try {
    await stat(target_path);
    return true;
  } catch {
    return false;
  }
}

const hasSource = await exists(source);

if (!hasSource) {
  if (await exists(path.join(target, "index.html"))) {
    console.log("[static] dist/client already holds the build output — nothing to copy.");
    process.exit(0);
  }
  console.error("[static] No build output found at .output/public. Run the build first.");
  process.exit(1);
}

if (path.resolve(source) === path.resolve(target)) {
  console.log("[static] Build output already lives in dist/client — nothing to copy.");
  process.exit(0);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`[static] Copied ${path.relative(root, source)} -> ${path.relative(root, target)}`);
