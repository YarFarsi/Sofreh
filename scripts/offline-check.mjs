import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const banned = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "googleapis.com",
  "google-analytics.com",
  "firebase",
  "supabase.co",
  "auth0.com",
];

const skip = new Set(["node_modules", ".next", "dist", ".git"]);
let failed = false;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|css|md|html)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      for (const b of banned) {
        if (text.includes(b) && !p.endsWith("offline-check.mjs") && !p.includes("README")) {
          console.error(`Blocked external reference ${b} in ${p}`);
          failed = true;
        }
      }
    }
  }
}

walk(join(ROOT, "src"));
const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
if (layout.includes("next/font/google")) {
  console.error("Google font loader found in layout");
  failed = true;
}
if (failed) process.exit(1);
console.log("offline-check: no banned external asset URLs in src/");
