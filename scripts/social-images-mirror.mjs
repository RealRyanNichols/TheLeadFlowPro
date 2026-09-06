#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validateLibrary } from "./social-images.mjs";

const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) {
  throw new Error("Usage: node scripts/social-images-mirror.mjs /absolute/library/folder");
}
const source = path.resolve("public/social");
const library = await validateLibrary(source);
await fs.mkdir(destination, { recursive: true });
for (const day of library.days) {
  const target = path.join(destination, day.date);
  const present = await fs.stat(target).then(() => true, error => {
    if (error.code === "ENOENT") return false;
    throw error;
  });
  if (present) {
    for (const name of [...day.manifest.images.map(image => image.file), "manifest.json", "qa.json"]) {
      const [original, copy] = await Promise.all([fs.readFile(path.join(source, day.date, name)), fs.readFile(path.join(target, name))]);
      if (!original.equals(copy)) throw new Error(`Mirror differs at ${day.date}/${name}; preserve and investigate before replacing`);
    }
  } else {
    const temporary = path.join(destination, `.social-${day.date}-${randomUUID()}.tmp`);
    try {
      await fs.cp(path.join(source, day.date), temporary, { recursive: true, force: false, errorOnExist: true });
      await fs.rename(temporary, target);
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }
}
async function writeAtomic(name, content) {
  const temporary = path.join(destination, `.${name}-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, content, { flag: "wx" });
    await fs.rename(temporary, path.join(destination, name));
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
await writeAtomic("index.json", await fs.readFile(path.join(source, "index.json")));
const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const times = ["7:00 AM", "9:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];
const days = [...library.days].reverse().map(day => `<section id="${day.date}"><h2>${day.date}</h2><div class="grid">${day.manifest.images.map((image, i) => `<article><a href="${day.date}/${image.file}"><img loading="lazy" src="${day.date}/${image.file}" width="1200" height="630" alt="${esc(image.alt_text)}"></a><div class="copy"><small>${times[i]} Central · ${esc(image.angle)}${image.trade !== "general" ? ` · ${esc(image.trade)}` : ""}</small><h3>${esc(image.headline)}</h3><p>${esc(image.suggested_caption)}</p><a href="${esc(image.url)}">Open public PNG</a> · <a href="${day.date}/manifest.json">Manifest</a></div></article>`).join("")}</div></section>`).join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LeadFlow Social Image Library</title><style>*{box-sizing:border-box}body{margin:0;background:#f7f5f2;color:#0a1220;font:16px/1.55 system-ui,sans-serif}header,main{max-width:1400px;margin:auto;padding:32px}header{padding-bottom:0}h1{font-size:clamp(32px,5vw,64px);line-height:1.05;letter-spacing:-.04em}h2{margin-top:56px}h3{margin:12px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px}article{background:white;border:1px solid #ded8d0;overflow:hidden;border-radius:16px}img{display:block;width:100%;height:auto}.copy{padding:20px}small{color:#4e5866}p{white-space:pre-line}a{color:#1240e8}nav{display:flex;flex-wrap:wrap;gap:12px}</style><header><h1>Five fresh images.<br>A clearer next move.</h1><p>${library.image_count} checked images across ${library.days.length} days. Captions below preserve their paragraph breaks. Times are suggested Facebook slots in America/Chicago.</p><nav>${[...library.days].reverse().map(day => `<a href="#${day.date}">${day.date}</a>`).join("")}</nav><p><a href="https://www.theleadflowpro.com/social/index.json">Live library index</a></p></header><main>${days}</main></html>`;
await writeAtomic("gallery.html", html);
console.log(JSON.stringify({ destination, dates: library.days.length, images: library.image_count, gallery: path.join(destination, "gallery.html") }, null, 2));
