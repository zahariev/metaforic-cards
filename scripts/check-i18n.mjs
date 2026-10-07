// Checks that every locale has the same keys as Bulgarian (the source), and
// that literal t("…") keys used in the code exist. Run: node scripts/check-i18n.mjs
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../src/locales/", import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
const flatten = (o, p = "", out = new Map()) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && p !== "answers" && key !== "answers")
      flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
};
const source = flatten(load("bg.json"));
let problems = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "bg.json")) {
  const keys = flatten(load(f));
  for (const k of source.keys())
    if (!keys.has(k)) (problems++, console.log(`${f}: missing ${k}`));
  for (const k of keys.keys())
    if (!source.has(k)) (problems++, console.log(`${f}: not in bg.json ${k}`));
}
const src = new URL("../src/", import.meta.url);
for (const f of readdirSync(src).filter((f) => /\.tsx?$/.test(f))) {
  const code = readFileSync(new URL(f, src), "utf8");
  for (const [, key] of code.matchAll(/\bt(?:List)?\(\s*"([^"]+)"/g)) {
    const known = source.has(key) || source.has(`${key}_one`) || source.has(`${key}_other`) ||
      [...source.keys()].some((k) => k.startsWith(key + "."));
    if (!known) (problems++, console.log(`${f}: unknown key ${key}`));
  }
}
console.log(problems ? `${problems} problem(s)` : "i18n OK");
process.exit(problems ? 1 : 0);
