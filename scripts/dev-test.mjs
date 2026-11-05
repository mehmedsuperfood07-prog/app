// Runs the order app on this computer against the ERP's DEV database (.env.test.local), for
// testing the ERP link without touching the live project. Its settings go in as real
// environment variables, which Next.js puts above every .env file, so .env.local (the live
// project) can't leak in. Refuses to start if they point at the live project.
//
//   node scripts/dev-test.mjs [port]     (default 3100)

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LIVE_REF = "rwiniskoapgdazevxckc";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vars = Object.fromEntries(
  readFileSync(path.join(root, ".env.test.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!vars.NEXT_PUBLIC_SUPABASE_URL || vars.NEXT_PUBLIC_SUPABASE_URL.includes(LIVE_REF)) {
  console.error(".env.test.local must point at the ERP's dev database. Stopping.");
  process.exit(1);
}
const port = process.argv[2] ?? "3100";
const child = spawn(`npx next dev -p ${port}`, { cwd: root, env: { ...process.env, ...vars }, stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
