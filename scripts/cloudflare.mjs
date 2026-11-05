// Cloudflare for the order app (moving from Vercel, 2026-11-05; same account as the ERP).
//
//   npm run cf -- whoami        which Cloudflare account this script uses
//   npm run cf -- deploy-test   build against the ERP's dev database (.env.test.local) and
//                               publish the test copy, mehmed-order-test
//   npm run cf -- deploy-live --yes-live   build from .env.local (the live database) and
//                               publish mehmed-order, the address staff use
//
// Mehmed's Cloudflare sign-in is the ERP's: kept in its own folder
// (%APPDATA%\mehmed-erp-cloudflare), never the developer's own login. Sign in once from the
// ERP repo with `npm run cf -- login`.
//
// Next.js and OpenNext read .env files when building, and .env.local holds the LIVE project.
// So a test build sets .env.local aside for its duration and builds from .env.test.local
// alone; it refuses to build if the result would point at the live project.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const LIVE_REF = "rwiniskoapgdazevxckc"; // the live Supabase project
const TEST_WORKER = "mehmed-order-test";
const LIVE_WORKER = "mehmed-order";

const configHome = path.join(process.env.APPDATA ?? path.join(os.homedir(), ".config"), "mehmed-erp-cloudflare");
mkdirSync(configHome, { recursive: true });
const env = { ...process.env, XDG_CONFIG_HOME: configHome };
delete env.CLOUDFLARE_API_TOKEN; // never borrow a token meant for another account
for (const k of Object.keys(env)) if (k.startsWith("NEXT_PUBLIC_") || k.startsWith("SUPABASE_") || k.includes("VAPID")) delete env[k];

const wranglerJs = path.resolve("node_modules/wrangler/bin/wrangler.js");

function wrangler(args) {
  const r = spawnSync(process.execPath, [wranglerJs, ...args], { env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// One fixed command line, run through the shell so npx.cmd is found on Windows.
function run(commandLine) {
  const r = spawnSync(commandLine, { env, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`"${commandLine}" failed.`);
}

const supabaseUrlIn = (file) =>
  /^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m.exec(existsSync(file) ? readFileSync(file, "utf8") : "")?.[1]?.trim() ?? "";

if (existsSync(path.join(os.homedir(), ".wrangler"))) {
  console.error("A ~/.wrangler folder exists, so Wrangler would use it instead of Mehmed's own folder. Stopping.");
  process.exit(1);
}

// A test build interrupted before it put .env.local back: put it back now.
if (existsSync(".env.local.set-aside") && !existsSync(".env.local")) renameSync(".env.local.set-aside", ".env.local");

const command = process.argv[2];

if (command === "whoami") {
  wrangler(["whoami"]);
} else if (command === "deploy-test") {
  const url = supabaseUrlIn(".env.test.local");
  if (!url || url.includes(LIVE_REF)) {
    console.error(".env.test.local must point at the ERP's dev database, never the live one. Stopping.");
    process.exit(1);
  }
  const hadLocal = existsSync(".env.local");
  if (hadLocal) renameSync(".env.local", ".env.local.set-aside");
  copyFileSync(".env.test.local", ".env.production.local");
  try {
    run("npx opennextjs-cloudflare build");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    rmSync(".env.production.local", { force: true });
    if (hadLocal) renameSync(".env.local.set-aside", ".env.local");
  }
  if (process.exitCode) process.exit(1);
  // The built worker must not carry the live project's address anywhere.
  const built = spawnSync(`git grep --no-index -l ${LIVE_REF} -- .open-next`, { shell: true, encoding: "utf8" });
  if (built.stdout.trim()) {
    console.error("The test build mentions the live project. Not publishing.\n" + built.stdout);
    process.exit(1);
  }
  wrangler(["deploy", "--name", TEST_WORKER]);
} else if (command === "deploy-live") {
  if (process.argv[3] !== "--yes-live") {
    console.error("This publishes the order app staff use. If that is meant, run: npm run cf -- deploy-live --yes-live");
    process.exit(1);
  }
  if (!supabaseUrlIn(".env.local").includes(LIVE_REF)) {
    console.error(".env.local must hold the live project. Stopping.");
    process.exit(1);
  }
  run("npx opennextjs-cloudflare build");
  wrangler(["deploy", "--name", LIVE_WORKER]);
} else {
  console.log("Use: npm run cf -- whoami | deploy-test | deploy-live --yes-live");
  process.exit(command ? 1 : 0);
}
