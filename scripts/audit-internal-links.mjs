import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const srcDir = path.join(root, "src");

function walk(dir, predicate, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(target, predicate, output);
    } else if (predicate(target)) {
      output.push(target);
    }
  }
  return output;
}

function routeFromFile(file) {
  const relativeDir = path.relative(appDir, path.dirname(file));
  if (!relativeDir) return "/";
  return `/${relativeDir.split(path.sep).join("/")}`;
}

function normalizeHref(href) {
  return href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
}

function routeMatches(target, route) {
  const targetParts = target.split("/").filter(Boolean);
  const routeParts = route.split("/").filter(Boolean);
  if (targetParts.length !== routeParts.length) return false;

  return routeParts.every((routePart, index) => {
    return /^\[[^\]]+\]$/.test(routePart) || routePart === targetParts[index];
  });
}

const routes = [
  ...new Set(
    walk(appDir, (file) => /\/(page|route)\.tsx?$/.test(file)).map(routeFromFile),
  ),
].sort();

const sourceFiles = walk(srcDir, (file) => /\.(tsx|ts)$/.test(file));
const hrefs = [];
const staticHrefPatterns = [
  /href\s*=\s*['"](\/[^'"`{}\s]*)['"]/g,
  /href\s*=\s*\{\s*['"](\/[^'"`{}\s]*)['"]\s*\}/g,
  /router\.push\(\s*['"](\/[^'"`{}\s]*)['"]\s*\)/g,
];

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of staticHrefPatterns) {
    let match;
    while ((match = pattern.exec(text))) {
      hrefs.push({
        raw: match[1],
        clean: normalizeHref(match[1]),
        file: path.relative(root, file),
      });
    }
  }
}

const missing = hrefs.filter((href) => !routes.some((route) => routeMatches(href.clean, route)));
const grouped = new Map();

for (const href of missing) {
  if (!grouped.has(href.clean)) grouped.set(href.clean, new Set());
  grouped.get(href.clean).add(href.file);
}

console.log(`Static internal hrefs checked: ${hrefs.length}`);
console.log(`App/API targets available: ${routes.length}`);

if (grouped.size === 0) {
  console.log("Missing static targets: 0");
  process.exit(0);
}

console.error(`Missing static targets: ${grouped.size}`);
for (const [target, files] of [...grouped.entries()].sort()) {
  console.error(`\n${target}`);
  for (const file of [...files].slice(0, 10)) console.error(`  ${file}`);
}

process.exit(1);
