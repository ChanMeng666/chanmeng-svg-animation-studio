#!/usr/bin/env node
// Check that this kit can build and verify a card here, before the first build.
//
//   node doctor.mjs [--fix]
//
// Found is not enough for the browser: it is started once, because an agent sandbox
// can block a browser that is installed. --fix installs only what the kit uses
// (opentype.js and playwright-core as dev dependencies of the project in the current
// folder, and Playwright's Chromium when no browser starts). ffmpeg is a system tool:
// only the command is shown, and only film-stills.mjs needs it.
// Exit codes: 0 ready, 3 something required is missing.
import { execSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const fix = process.argv.includes("--fix");
const require = createRequire(import.meta.url);
const rows = [];
let missing = 0;
const ok = (what, text) => rows.push(["ok  ", what, text]);
const miss = (what, text) => {
  rows.push(["MISS", what, text]);
  missing++;
};
const optional = (what, text) => rows.push(["opt ", what, text]);
const resolves = (name) => {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
};

const major = Number(process.versions.node.split(".")[0]);
major >= 18 ? ok("node", process.versions.node) : miss("node", `${process.versions.node}; the kit needs 18 or later`);

const packages = ["opentype.js", "playwright-core"];
let absent = packages.filter((name) => !resolves(name));
if (absent.length && fix) {
  console.log(`installing ${absent.join(" ")} into ${process.cwd()} ...`);
  execSync(`npm i -D ${absent.join(" ")}`, { stdio: "inherit" });
  absent = packages.filter((name) => {
    try {
      createRequire(`${process.cwd()}/package.json`).resolve(name);
      return false;
    } catch {
      return !resolves(name);
    }
  });
}
for (const name of packages) {
  absent.includes(name) ? miss(name, `not found from this folder -> npm i -D ${name}  (or node doctor.mjs --fix)`) : ok(name, "found");
}

async function startBrowser() {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    return null;
  }
  for (const channel of ["chrome", "msedge", undefined]) {
    try {
      const browser = await chromium.launch(channel ? { channel } : {});
      const version = browser.version();
      await browser.close();
      return `${channel ?? "playwright chromium"} ${version}`;
    } catch {
      // try the next one
    }
  }
  return "";
}

if (!absent.includes("playwright-core")) {
  let browser = await startBrowser();
  if (!browser && fix) {
    console.log("installing Playwright's Chromium ...");
    execSync("npx playwright-core install chromium", { stdio: "inherit" });
    browser = await startBrowser();
  }
  browser
    ? ok("browser", `${browser} starts`)
    : miss("browser", "none starts. Install Chrome or Edge, or run node doctor.mjs --fix. If one is installed, an agent sandbox may be blocking it: run outside the sandbox");
} else {
  miss("browser", "not checked until playwright-core is installed");
}

const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
ffmpeg.status === 0
  ? ok("ffmpeg", ffmpeg.stdout.split("\n")[0].replace(/^ffmpeg version /, ""))
  : optional("ffmpeg", `only for film-stills.mjs -> ${{ win32: "winget install Gyan.FFmpeg", darwin: "brew install ffmpeg" }[process.platform] ?? "sudo apt install ffmpeg"}`);

for (const [flag, what, text] of rows) console.log(`${flag} ${what.padEnd(16)} ${text}`);
console.log(missing ? `\n${missing} missing. ${fix ? "Install the rest by hand." : "Run again with --fix to install what the kit uses."}` : "\nready: build, check-card, capture-frames and qa-loop can run here.");
process.exit(missing ? 3 : 0);
