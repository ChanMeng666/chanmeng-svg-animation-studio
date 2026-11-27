#!/usr/bin/env node
// The studio's memory of what it made and what the user thought of it, one JSON line
// per piece in docs/history.jsonl. Read it before planning, so the next piece is not
// more of the same; write the user's verdict into it, so taste.md can grow from it.
//
//   node scripts/history.mjs recent [n]
//   node scripts/history.mjs add --slug=orbit-badge --type=badge --signature="the dot draws its own ring, then the ring locks" \
//        [--arc=build] [--primitives=createOrbit,createPulse] [--palette=caldera] [--loop=6] [--qa="PASS; first frame WARN"]
//   node scripts/history.mjs verdict <slug> <keep|tweak|reject> "<why, in the user's words>"
//
// --file=<path> writes somewhere else (tests use it). Exit codes: 0 ok, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TYPES = ["mascot", "logo", "badge", "loader", "cover", "banner", "card", "background", "icon", "other"];
export const VERDICTS = ["keep", "tweak", "reject"];
const DEFAULT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "history.jsonl");

export function read(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

const write = (file, entries) => fs.writeFileSync(file, entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""));

/** A new entry, checked. Throws with a message meant for the agent. */
export function entry(fields, today = new Date().toISOString().slice(0, 10)) {
  const { slug, type, signature } = fields;
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`--slug must be a kebab-case slug, got "${slug ?? ""}"`);
  if (!TYPES.includes(type)) throw new Error(`--type must be one of ${TYPES.join(", ")}, got "${type ?? ""}"`);
  if (!signature || signature.split(/\s+/).length < 4) throw new Error("--signature is the one move this piece is remembered by, in a sentence; a word or two is not one");
  return {
    date: today,
    slug,
    type,
    signature,
    arc: fields.arc ?? "",
    primitives: fields.primitives ? fields.primitives.split(",").map((s) => s.trim()).filter(Boolean) : [],
    palette: fields.palette ?? "",
    loop: fields.loop ? Number(fields.loop) : null,
    qa: fields.qa ?? "",
    verdict: "",
    why: "",
  };
}

/** Write the user's verdict onto the latest entry for a slug. */
export function setVerdict(entries, slug, verdict, why) {
  if (!VERDICTS.includes(verdict)) throw new Error(`verdict must be one of ${VERDICTS.join(", ")}, got "${verdict ?? ""}"`);
  if (!why?.trim()) throw new Error("a verdict needs its reason: that is the part taste.md learns from");
  const i = entries.findLastIndex((e) => e.slug === slug);
  if (i < 0) throw new Error(`no entry for "${slug}"; add it first`);
  const next = [...entries];
  next[i] = { ...next[i], verdict, why: why.trim() };
  return next;
}

export function format(e) {
  const tail = e.verdict ? `  → ${e.verdict.toUpperCase()}: ${e.why}` : "  → no verdict yet";
  return `${e.date}  ${e.slug} (${e.type}${e.arc ? `, ${e.arc}` : ""}${e.loop ? `, ${e.loop}s` : ""})\n    ${e.signature}${e.primitives.length ? `\n    uses ${e.primitives.join(", ")}` : ""}\n  ${tail}`;
}

function main(argv) {
  const flags = Object.fromEntries(argv.filter((a) => a.startsWith("--")).map((a) => { const [k, ...v] = a.slice(2).split("="); return [k, v.join("=")]; }));
  const [command, ...rest] = argv.filter((a) => !a.startsWith("--"));
  const file = flags.file || DEFAULT_FILE;
  try {
    if (command === "recent") {
      const entries = read(file);
      if (!entries.length) return console.log("history is empty: this is the first piece recorded.");
      for (const e of entries.slice(-Number(rest[0] || 8))) console.log(format(e));
      const kinds = entries.slice(-5).map((e) => e.type);
      const top = kinds.find((k) => kinds.filter((x) => x === k).length >= 3);
      if (top) console.log(`\nnote: ${kinds.filter((x) => x === top).length} of the last 5 are ${top}s. If the next one is too, make its signature move differ from theirs.`);
      return;
    }
    if (command === "add") {
      const e = entry(flags);
      fs.appendFileSync(file, JSON.stringify(e) + "\n");
      return console.log(`recorded ${e.slug}. When the user reacts: node scripts/history.mjs verdict ${e.slug} <keep|tweak|reject> "<why>"`);
    }
    if (command === "verdict") {
      const [slug, verdict, ...why] = rest;
      write(file, setVerdict(read(file), slug, verdict, why.join(" ")));
      return console.log(`verdict on ${slug}: ${verdict}. A reject or a reason that generalises belongs in taste.md as well.`);
    }
    console.error("Usage: node scripts/history.mjs recent [n] | add --slug= --type= --signature= [...] | verdict <slug> <keep|tweak|reject> \"<why>\"");
    process.exitCode = 2;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) main(process.argv.slice(2));
