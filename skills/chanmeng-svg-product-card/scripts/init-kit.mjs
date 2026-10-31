#!/usr/bin/env node
// Copy the card kit into a project, so its cards build from code committed beside
// them and not from wherever this skill happens to be installed.
//
//   node <skill-dir>/scripts/init-kit.mjs --dest=scripts/cards [--id=my-product] [--force]
//
//   <dest>/lib/       the kit
//   <dest>/fonts/     the product's fonts go here
//   <dest>/<id>.mjs   a working builder to edit, only when --id is given
//
// It never overwrites a builder. It overwrites a changed kit file only with --force.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const force = process.argv.includes("--force");
const dest = arg("dest");
const id = arg("id");

if (!dest) {
  console.error("Usage: node init-kit.mjs --dest=<dir> [--id=<card-id>] [--force]");
  process.exit(2);
}
if (id && !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error(`--id must be a kebab-case slug, got "${id}"`);
  process.exit(2);
}

const lib = path.join(dest, "lib");
fs.mkdirSync(lib, { recursive: true });
fs.mkdirSync(path.join(dest, "fonts"), { recursive: true });

const refused = [];
let copied = 0;
for (const file of fs.readdirSync(path.join(skill, "kit"))) {
  const from = path.join(skill, "kit", file);
  const to = path.join(lib, file);
  if (fs.existsSync(to)) {
    if (fs.readFileSync(to).equals(fs.readFileSync(from))) continue;
    if (!force) {
      refused.push(file);
      continue;
    }
  }
  fs.copyFileSync(from, to);
  copied++;
}
console.log(`kit: ${copied} file(s) copied to ${lib}`);
if (refused.length) {
  console.error(`kit: left alone because they differ from this version: ${refused.join(", ")}. Read the difference, then pass --force to replace them.`);
}

if (id) {
  const builder = path.join(dest, `${id}.mjs`);
  if (fs.existsSync(builder)) console.log(`builder: ${builder} exists, left as it is`);
  else {
    const template = fs.readFileSync(path.join(skill, "assets", "card-template.mjs"), "utf8");
    fs.writeFileSync(builder, template.replaceAll("__CARD_ID__", id));
    console.log(`builder: wrote ${builder}`);
  }
}

// A name is only found from a parent folder of the kit, so look there.
const found = (name) => {
  for (let dir = path.resolve(lib); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "node_modules", name))) return true;
    if (dir === path.dirname(dir)) return false;
  }
};
const missing = ["opentype.js", "playwright-core"].filter((name) => !found(name));
if (missing.length) console.log(`next: npm i -D ${missing.join(" ")}`);
console.log(`fonts: put the product's static TTF, OTF or WOFF files in ${path.join(dest, "fonts")}`);
process.exit(refused.length ? 1 : 0);
