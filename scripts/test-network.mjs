#!/usr/bin/env node
// Runs the opt-in LIVE Midnight network tests (tests/network.live.test.ts).
import { spawnSync } from "node:child_process";
const r = spawnSync("npx", ["vitest", "run", "tests/network.live.test.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, CLOSEDBOOK_LIVE_NETWORK: "1" },
});
process.exit(r.status ?? 1);
