import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { OPERATOR_ACADEMY_COURSES } from "../lib/operatorAcademyCatalog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "public/images/academy");
mkdirSync(directory, { recursive: true });
const palettes = [
  ["#071b2f", "#0b63ce", "#20d5c7"], ["#171226", "#7c3aed", "#f0abfc"],
  ["#102416", "#178a52", "#c6f36a"], ["#231b0d", "#bc6f18", "#ffd66b"],
  ["#20121d", "#c23b75", "#ffb4d2"], ["#071f24", "#087e8b", "#5ce1e6"],
  ["#13172b", "#445ee2", "#a9b8ff"], ["#25140f", "#d04b24", "#ffc2a8"],
  ["#121d28", "#0e88c7", "#8ad9ff"], ["#111827", "#334155", "#fbbf24"],
];

for (const [index, course] of OPERATOR_ACADEMY_COURSES.entries()) {
  const [dark, mid, accent] = palettes[index % palettes.length];
  const lessonCount = course.lessons.length || 12;
  const nodes = Array.from({ length: 8 }, (_, node) => {
    const x = 130 + (node % 4) * 250;
    const y = 390 + Math.floor(node / 4) * 230;
    return `<g><rect x="${x}" y="${y}" width="190" height="120" rx="22" fill="${node < lessonCount ? "#ffffff" : "#d9e1ea"}" opacity="${node < lessonCount ? ".96" : ".55"}"/><text x="${x + 95}" y="${y + 58}" text-anchor="middle" fill="${dark}" font-size="30" font-weight="900">${String(node + 1).padStart(2, "0")}</text><text x="${x + 95}" y="${y + 88}" text-anchor="middle" fill="${mid}" font-size="15" font-weight="800">PRACTICE</text></g>`;
  }).join("");
  const connectors = [0,1,2,4,5,6].map((node) => {
    const x = 320 + (node % 4) * 250;
    const y = 450 + Math.floor(node / 4) * 230;
    return `<path d="M ${x} ${y} H ${x + 60}" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`;
  }).join("");
  const title = course.shortTitle.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc"><title id="title">${title} course map</title><desc id="desc">Eight connected practice steps moving toward a reviewed capstone.</desc><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${mid}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-opacity=".22"/></filter></defs><rect width="1200" height="900" rx="50" fill="url(#bg)"/><circle cx="1050" cy="110" r="210" fill="${accent}" opacity=".18"/><text x="90" y="110" fill="${accent}" font-size="24" font-weight="900" letter-spacing="4">${course.code} · OPERATOR ACADEMY</text><text x="90" y="190" fill="#fff" font-size="58" font-weight="900">${title}</text><text x="90" y="250" fill="#dbeafe" font-size="24">LEARN · PRACTICE · CHECK · BUILD · REVIEW</text><g filter="url(#s)">${connectors}${nodes}</g><rect x="370" y="785" width="460" height="70" rx="35" fill="${accent}"/><text x="600" y="829" text-anchor="middle" fill="${dark}" font-size="24" font-weight="950">REVIEWED CAPSTONE</text></svg>`;
  writeFileSync(path.join(directory, `${course.slug}.svg`), svg);
}
console.log(`Wrote ${OPERATOR_ACADEMY_COURSES.length} academy SVG course maps.`);
