#!/usr/bin/env node
/**
 * Compile contract/src/closed-book.compact with the pinned Compact toolchain.
 *
 *   node scripts/compile-contract.mjs            # JS + ZKIR only (--skip-zk)
 *   node scripts/compile-contract.mjs --full     # also generate proving keys
 *
 * Uses `compact` from PATH (or $COMPACT_BIN). On Windows it runs the compiler
 * inside WSL. Fails loudly if no compiler is found — it never skips.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const TOOLCHAIN = "0.31.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");
const out = full ? "contract/build/closed-book" : "contract/src/managed/closed-book";
const args = ["compile", `+${TOOLCHAIN}`, ...(full ? [] : ["--skip-zk"]), "contract/src/closed-book.compact", out];

function run(cmd, cmdArgs) {
  console.log(`$ ${cmd} ${cmdArgs.join(" ")}`);
  return spawnSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", shell: false });
}

// On Windows, `compact` on PATH is usually C:\Windows\System32\compact.exe
// (NTFS compression), not the Midnight CLI. Use WSL unless COMPACT_BIN is set.
const native = process.env.COMPACT_BIN ?? (process.platform === "win32" ? null : "compact");
let result = native ? run(native, args) : { error: new Error("no native compiler on Windows") };
if (result.error && process.platform === "win32") {
  const wslRoot = spawnSync("wsl", ["wslpath", "-a", root.split(path.sep).join("/")], { encoding: "utf8" });
  if (wslRoot.status === 0) {
    const dir = wslRoot.stdout.trim();
    const script = `export PATH="$HOME/.local/bin:$PATH"; cd '${dir}' && compact ${args.join(" ")}`;
    result = run("wsl", ["-e", "bash", "-lc", script]);
  }
}
if (result.error) {
  console.error(
    `\nCompact compiler not found. Install it (Linux/macOS/WSL):\n` +
      `  curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh\n` +
      `  compact update ${TOOLCHAIN}\n`,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);
