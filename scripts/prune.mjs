#!/usr/bin/env node
/**
 * Deletes files that no longer belong to the project.
 *
 * Why this exists: this project is delivered as a tarball extracted *over* the
 * previous copy, and `tar x` only adds and overwrites — it never removes. So
 * every file ever deleted upstream lingers on disk forever. That is not a
 * cosmetic problem: a stale `src/app/weather/page.tsx`, left behind when that
 * route was renamed to `/sky`, still referenced a component whose props had
 * changed, and Next typechecks every file under `src/` whether or not anything
 * imports it. The build failed on Vercel and passed everywhere else, for weeks,
 * with an error pointing at a file that does not exist in the source.
 *
 * MANIFEST.txt is generated at package time and lists every file the release
 * actually contains. Anything under the managed trees that is not in it is a
 * leftover and gets removed.
 *
 * Deliberately narrow: it only ever touches `src/` and `public/`. It will not
 * go near `.env.local`, `.vercel`, `node_modules`, or anything you created.
 */
import { readFileSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const MANAGED = ["src", "public"];

const manifestPath = join(root, "MANIFEST.txt");
if (!existsSync(manifestPath)) {
  console.log("No MANIFEST.txt — nothing to compare against. Skipping.");
  process.exit(0);
}

const keep = new Set(
  readFileSync(manifestPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Written with forward slashes; normalise for Windows just in case.
    .map((l) => l.split("/").join(sep))
);

const found = [];
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else found.push(relative(root, full));
  }
};
for (const d of MANAGED) walk(join(root, d));

const stale = found.filter((f) => !keep.has(f));

if (!stale.length) {
  console.log(`Clean — ${found.length} files, nothing left over.`);
  process.exit(0);
}

console.log(`Removing ${stale.length} file(s) left over from an earlier version:\n`);
for (const f of stale) {
  console.log(`  ${f.split(sep).join("/")}`);
  rmSync(join(root, f), { force: true });
}

// Sweep up directories the deletions emptied, so a removed route doesn't leave
// a bare folder behind.
const pruneEmpty = (dir) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pruneEmpty(full);
  }
  if (readdirSync(dir).length === 0 && dir !== root) rmSync(dir, { recursive: true, force: true });
};
for (const d of MANAGED) pruneEmpty(join(root, d));

console.log(`\nDone. Run \`npm run build\` to confirm.`);
