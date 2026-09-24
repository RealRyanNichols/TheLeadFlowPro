import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import test from "node:test";
import ts from "typescript";

// Cross-cutting rules for every Post Creator source file, checked by reading
// the source. The copy rules keep the public promise honest (no long dashes,
// no promise words, "no meter" wording only where it is true); the import
// rules keep the paid machinery on the server and the free idea machine off
// the network.
//
// Scope: every .ts/.tsx file under lib/postCreator, app/post-creator,
// app/api/post-creator, and components/postCreator, plus the Post Creator card
// on the tools page (between its post-creator:start and post-creator:end
// markers; the rest of that page is other products' copy) and the Post Creator
// paragraph on the privacy page.

const ROOT = process.cwd();
const SCOPES = ["lib/postCreator", "app/post-creator", "app/api/post-creator", "components/postCreator"];
const CODE_FILE = /\.(?:tsx?|jsx?|mjs|cjs)$/;
const PRODUCT = "lib/postCreator/product.ts";
const PROMPT = "lib/postCreator/ai/prompt.ts";
const ANTHROPIC = "lib/postCreator/ai/anthropic.ts";

/** Modules a client component must never pull into the browser bundle, directly or through another import. */
const SERVER_MODULES = new Set([
  "lib/postCreator/accessServer",
  "lib/postCreator/server",
  "lib/postCreator/db",
  "lib/postCreator/access",
  "lib/postCreator/session",
  "lib/postCreator/subscription",
  "lib/postCreator/emails",
  "lib/postCreator/ai/anthropic",
  "lib/postCreator/ai/writer",
]);

/** The free idea machine: its promise is that nothing typed into it is sent anywhere. */
const FREE_MACHINE_COMPONENTS = [
  "IdeaMachine",
  "PlanMonth",
  "SetupFields",
  "ShuffleProvider",
  "SavedList",
  "IdeaCardView",
  "DraftTabs",
  "CopyButton",
  "BlankText",
].map((name) => `components/postCreator/${name}.tsx`);

const LIMIT_WORDS = /\b(?:unlimited|unending|endless|infinite|never\s+run\s+out|no\s+limit)\b/gi;
const NETWORK = /\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b|\bnew\s+WebSocket\b|\bnew\s+EventSource\b/g;
const PLAIN_INTERNAL_LINK = /<a\b[^>]*?\bhref\s*=\s*\{?\s*["'`]\//g;

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const rel = posix.join(dir, entry);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (CODE_FILE.test(entry) && !entry.endsWith(".d.ts")) out.push(rel);
  }
  return out;
}

/** A piece of source to scan. `firstLine` maps a slice back to its line in the file. */
type Unit = { file: string; text: string; firstLine: number };

function sliceBetween(file: string, start: string, end: string): Unit {
  const text = read(file);
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + 1);
  assert.ok(from >= 0 && to > from, `${file} has ${start} before ${end}`);
  assert.equal(text.split(start).length, 2, `${file} has one ${start}`);
  return { file, text: text.slice(from, to), firstLine: text.slice(0, from).split("\n").length };
}

const SCOPED_FILES = SCOPES.flatMap((dir) => walk(dir)).sort();
const UNITS: Unit[] = [
  ...SCOPED_FILES.map((file) => ({ file, text: read(file), firstLine: 1 })),
  sliceBetween("app/tools/page.tsx", "{/* post-creator:start */}", "{/* post-creator:end */}"),
  sliceBetween("app/privacy/page.tsx", "<h2>Post Creator</h2>", "<h2>Retention and security</h2>"),
];

/** Every match of `re` in a unit, as "file:line: match". */
function hits(unit: Unit, re: RegExp): string[] {
  const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return [...unit.text.matchAll(global)].map((m) => {
    const line = unit.firstLine + unit.text.slice(0, m.index).split("\n").length - 1;
    return `${unit.file}:${line}: ${m[0]}`;
  });
}

/** The product file with its honesty block blanked out, keeping line numbers. */
function honestyParts(): { outside: string; inside: string } {
  const text = read(PRODUCT);
  const start = text.match(/^\/\/ honesty:start$/gm) ?? [];
  const end = text.match(/^\/\/ honesty:end$/gm) ?? [];
  assert.equal(start.length, 1, "product.ts has one // honesty:start line");
  assert.equal(end.length, 1, "product.ts has one // honesty:end line");
  const from = text.indexOf("// honesty:start");
  const to = text.indexOf("// honesty:end") + "// honesty:end".length;
  assert.ok(from < to);
  const inside = text.slice(from, to);
  return { outside: text.slice(0, from) + inside.replace(/[^\n]/g, " ") + text.slice(to), inside };
}

// ---- Imports, read with the TypeScript parser so multi-line and type-only imports are exact.

type ImportRef = { spec: string; typeOnly: boolean; line: number };
const parsed = new Map<string, { imports: ImportRef[]; directives: string[] }>();

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".ts")) return ts.ScriptKind.TS;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function parse(file: string): { imports: ImportRef[]; directives: string[] } {
  const cached = parsed.get(file);
  if (cached) return cached;
  const result = parseSource(file, read(file));
  parsed.set(file, result);
  return result;
}

function parseSource(file: string, text: string): { imports: ImportRef[]; directives: string[] } {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, scriptKind(file));
  const imports: ImportRef[] = [];
  const add = (node: ts.Node, spec: string, typeOnly: boolean) =>
    imports.push({ spec, typeOnly, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const named = clause?.namedBindings;
      // `import type { A }` and `import { type A, type B }` are erased; anything else can run.
      const typeOnly =
        !!clause &&
        (clause.isTypeOnly ||
          (!clause.name && !!named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)));
      add(node, node.moduleSpecifier.text, typeOnly);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const named = node.exportClause;
      const typeOnly =
        node.isTypeOnly || (!!named && ts.isNamedExports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly));
      add(node, node.moduleSpecifier.text, typeOnly);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      add(node, node.moduleReference.expression.text, node.isTypeOnly);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      add(node, node.arguments[0].text, false);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const directives: string[] = [];
  for (const statement of sf.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    directives.push(statement.expression.text);
  }
  return { imports, directives };
}

/** The repo path an import points at (extension and /index dropped), or null for a package. */
function target(from: string, spec: string): string | null {
  let path: string;
  if (spec.startsWith("@/")) path = posix.normalize(spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) path = posix.normalize(posix.join(posix.dirname(from), spec));
  else return null;
  return path.replace(/\.(?:tsx?|jsx?|mjs|cjs)$/, "").replace(/\/index$/, "");
}

function resolveFile(path: string): string | null {
  for (const candidate of [path, ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].flatMap((ext) => [`${path}${ext}`, `${path}/index${ext}`])]) {
    const abs = join(ROOT, candidate);
    if (CODE_FILE.test(candidate) && existsSync(abs) && statSync(abs).isFile()) return candidate;
  }
  return null;
}

const isSdk = (spec: string) => spec === "@anthropic-ai/sdk" || spec.startsWith("@anthropic-ai/sdk/");
const isClient = (file: string) => parse(file).directives.includes("use client");

// The whole-repo list is read once; only files that could matter are parsed.
const REPO_FILES = ["app", "lib", "components"].flatMap((dir) => walk(dir));

test("the scan covers the whole product", () => {
  assert.ok(SCOPED_FILES.length >= 40, `only ${SCOPED_FILES.length} Post Creator files found`);
  for (const file of [PRODUCT, PROMPT, ANTHROPIC, "lib/postCreator/copyRules.ts", "app/post-creator/page.tsx"]) {
    assert.ok(SCOPED_FILES.includes(file), `${file} exists`);
  }
});

/** Every long dash look-alike (LONG_DASH_CHARS in lib/postCreator/copyRules.ts), as raw characters. */
const LONG_DASHES = /[\u2012-\u2015\u2212\u2E3A\u2E3B\uFE31\uFE32\uFE58]/;

test("1. no long dashes anywhere in Post Creator source", () => {
  assert.deepEqual(UNITS.flatMap((u) => hits(u, LONG_DASHES)), []);
});

test("2. no promise words, except the AI prompt telling the model never to use them", () => {
  const found = UNITS.filter((u) => u.file !== PROMPT).flatMap((u) => hits(u, /guarant/i));
  assert.deepEqual(found, []);
});

test("3. the no-meter words live only in the honesty block of product.ts", () => {
  const { outside, inside } = honestyParts();
  assert.ok(hits({ file: PRODUCT, text: inside, firstLine: 1 }, LIMIT_WORDS).length > 0, "the honesty block is where the words are");
  const found = UNITS.flatMap((u) => hits(u.file === PRODUCT ? { ...u, text: outside } : u, LIMIT_WORDS));
  assert.deepEqual(found, []);
  // Word boundaries treat "_" as a word character, so identifiers never count.
  assert.equal("UNLIMITED_HERO STILL_UNLIMITED".match(LIMIT_WORDS), null);
});

test("4. nothing ever calls AI writing, writes, or drafts unlimited", () => {
  const found = UNITS.flatMap((u) => hits(u, /unlimited\s+(?:ai|writ|draft)/i));
  assert.deepEqual(found, []);
});

test("5. no typed prices outside lib/ (pages read PRICES, usd(), and the product labels)", () => {
  const found = UNITS.filter((u) => !u.file.startsWith("lib/")).flatMap((u) => hits(u, /\$\d/));
  assert.deepEqual(found, []);
});

test("6. only lib/postCreator/ai/anthropic.ts loads the Anthropic SDK at runtime, and it is server-only", () => {
  const runtime = REPO_FILES.filter((file) => read(file).includes("@anthropic-ai/sdk")).flatMap((file) =>
    parse(file)
      .imports.filter((i) => isSdk(i.spec) && !i.typeOnly)
      .map((i) => `${file}:${i.line}: ${i.spec}`),
  );
  assert.ok(runtime.length > 0, "the SDK is loaded somewhere");
  assert.deepEqual(
    runtime.filter((hit) => !hit.startsWith(`${ANTHROPIC}:`)),
    [],
  );
  assert.ok(parse(ANTHROPIC).imports.some((i) => i.spec === "server-only" && !i.typeOnly), `${ANTHROPIC} imports "server-only"`);
  assert.ok(!isClient(ANTHROPIC));
});

test("7. no client component imports a Post Creator server module", () => {
  const clients = REPO_FILES.filter((file) => read(file).includes("use client") && isClient(file));
  const direct = clients.flatMap((file) =>
    parse(file)
      .imports.filter((i) => !i.typeOnly && SERVER_MODULES.has(target(file, i.spec) ?? ""))
      .map((i) => `${file}:${i.line}: ${i.spec}`),
  );
  assert.deepEqual(direct, []);

  // And not through another module either: a server module in a client
  // bundle breaks the build or ships server code to the browser.
  const scopedClients = clients.filter((file) => SCOPES.some((dir) => file.startsWith(`${dir}/`)));
  assert.ok(scopedClients.length > 0, "the idea machine and the buyer app have client components");
  const reached: string[] = [];
  const visited = new Set<string>();
  for (const start of scopedClients) {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const file = stack.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      visited.add(file);
      // A server action module runs on the server; its imports stay there.
      if (file !== start && parse(file).directives.includes("use server")) continue;
      for (const i of parse(file).imports) {
        if (i.typeOnly) continue;
        const where = `${start} via ${file}:${i.line}: ${i.spec}`;
        if (i.spec === "server-only" || i.spec === "next/headers" || isSdk(i.spec)) {
          reached.push(where);
          continue;
        }
        const path = target(file, i.spec);
        if (!path) continue;
        if (SERVER_MODULES.has(path)) {
          reached.push(where);
          continue;
        }
        const next = resolveFile(path);
        if (next) stack.push(next);
      }
    }
  }
  assert.deepEqual(reached, []);
  // The walk really follows imports into the shared modules.
  for (const file of [PRODUCT, "lib/postCreator/options.ts", "lib/postCreator/ideas/engine.ts"]) {
    assert.ok(visited.has(file), `the client walk reaches ${file}`);
  }
});

test("8. the free idea machine makes no network calls", () => {
  const files = [...walk("lib/postCreator/ideas"), ...FREE_MACHINE_COMPONENTS, "components/postCreator/storage.ts"];
  for (const file of files) assert.ok(existsSync(join(ROOT, file)), `${file} exists`);
  const found = files.flatMap((file) => hits({ file, text: read(file), firstLine: 1 }, NETWORK));
  assert.deepEqual(found, []);
});

test("9. no content engine, no Time Back link, and nothing from lib/social", () => {
  assert.deepEqual(UNITS.flatMap((u) => hits(u, /content engine/i)), []);
  assert.deepEqual(UNITS.flatMap((u) => hits(u, /\/go\/time-back/)), []);
  const social = SCOPED_FILES.flatMap((file) =>
    parse(file)
      .imports.filter((i) => /^lib\/social(?:[-/.]|$)/.test(target(file, i.spec) ?? ""))
      .map((i) => `${file}:${i.line}: ${i.spec}`),
  );
  assert.deepEqual(social, []);
});

test("10. internal links use next/link, never a plain <a href=\"/...\">", () => {
  const found = UNITS.flatMap((u) => hits(u, PLAIN_INTERNAL_LINK));
  assert.deepEqual(found, []);
});

test("the guards catch what they are meant to catch", () => {
  const unit = (text: string): Unit => ({ file: "sample.tsx", text, firstLine: 10 });
  assert.deepEqual(hits(unit("a\nb \u2014 c"), LONG_DASHES), ["sample.tsx:11: \u2014"]);
  for (const dash of ["\u2012", "\u2013", "\u2015", "\u2212", "\u2E3A", "\u2E3B", "\uFE31", "\uFE32", "\uFE58"]) {
    assert.equal(hits(unit(`a${dash}b`), LONG_DASHES).length, 1, `U+${dash.codePointAt(0)?.toString(16)}`);
  }
  assert.equal(hits(unit("a well-known fix"), LONG_DASHES).length, 0);
  assert.equal(hits(unit("Posts with no\n  limit"), LIMIT_WORDS).length, 1);
  assert.equal(hits(unit("const x = UNLIMITED_ROW;"), LIMIT_WORDS).length, 0);
  assert.equal(hits(unit('<a className="x" href="/tools">'), PLAIN_INTERNAL_LINK).length, 1);
  assert.equal(hits(unit('<a href={"/tools"}>'), PLAIN_INTERNAL_LINK).length, 1);
  assert.equal(hits(unit("<a href={`mailto:${BUSINESS.email.hello}`}>"), PLAIN_INTERNAL_LINK).length, 0);
  assert.equal(hits(unit("const t = await fetch (url);"), NETWORK).length, 1);
  assert.equal(hits(unit("navigator.sendBeacon(u, body);"), NETWORK).length, 1);

  const sample = parseSource(
    "sample.tsx",
    [
      "// A comment before the directive.",
      '"use client";',
      "import Anthropic from \"@anthropic-ai/sdk\";",
      "import type { BetaMessage } from \"@anthropic-ai/sdk/resources/beta/messages/messages\";",
      "import { type A, type B } from \"./types\";",
      "import { type C, d } from \"./mixed\";",
      "import {",
      "  getEntitlement,",
      "} from \"@/lib/postCreator/accessServer\";",
      "export { e } from \"../db\";",
      "export type { F } from \"../session\";",
      "const lazy = () => import(\"./lazy\");",
      "const old = require(\"./old\");",
    ].join("\n"),
  );
  assert.deepEqual(sample.directives, ["use client"]);
  assert.deepEqual(
    sample.imports.map((i) => `${i.line} ${i.spec} ${i.typeOnly ? "type" : "runtime"}`),
    [
      "3 @anthropic-ai/sdk runtime",
      "4 @anthropic-ai/sdk/resources/beta/messages/messages type",
      "5 ./types type",
      "6 ./mixed runtime",
      "7 @/lib/postCreator/accessServer runtime",
      "10 ../db runtime",
      "11 ../session type",
      "12 ./lazy runtime",
      "13 ./old runtime",
    ],
  );
  assert.deepEqual(parseSource("server.ts", '"use server";\nimport "server-only";').directives, ["use server"]);
  assert.deepEqual(parseSource("plain.ts", 'const x = 1;\n"use client";').directives, []);

  assert.equal(target("components/postCreator/X.tsx", "@/lib/postCreator/db"), "lib/postCreator/db");
  assert.equal(target("lib/postCreator/ai/writer.ts", "../session.ts"), "lib/postCreator/session");
  assert.equal(target("lib/postCreator/ideas/engine.ts", "../../social"), "lib/social");
  assert.equal(target("app/x.tsx", "react"), null);
  assert.equal(resolveFile("lib/postCreator/product"), PRODUCT);
});
