import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const braces = require("../vendor/braces-guard");
const direct = ["compile", "expand", "stringify"].map((method) => require(`../vendor/braces-guard/lib/${method}`));
const methods = [braces.compile, braces.expand, braces.stringify, ...direct];
const rejects = (run: () => unknown, code: string) => assert.throws(run, (error: unknown) => {
  assert.ok(error instanceof RangeError);
  assert.equal((error as RangeError & { code: string }).code, code);
  assert.ok(!error.message.includes("Maximum call stack"), "the guard must reject before stack exhaustion");
  return true;
});

type Ast = { type: string; nodes?: Ast[]; value?: string; parent?: Ast; prev?: Ast };
const deepAst = (depth: number): Ast => {
  const root: Ast = { type: "root", nodes: [] };
  let cursor = root;
  for (let i = 0; i < depth; i++) {
    const child: Ast = { type: "root", nodes: [], parent: cursor };
    cursor.nodes!.push(child);
    cursor = child;
  }
  cursor.nodes!.push({ type: "text", value: "a", parent: cursor });
  return root;
};

test("ordinary brace compile and expansion preserve the upstream CommonJS API", () => {
  const fixtures = [
    { input: "{a,b}/*.js", options: {}, compile: "(a|b)/*.js", expand: ["a/*.js", "b/*.js"] },
    { input: "{1..5..2}", options: {}, compile: "(1|3|5)", expand: ["1", "3", "5"] },
    { input: "a{b,c{d,e}}f", options: {}, compile: "a(b|c(d|e))f", expand: ["abf", "acdf", "acef"] },
    { input: "\\{a,b}", options: {}, compile: "{a,b}", expand: ["{a,b}"] },
    { input: '"{a,b}"', options: {}, compile: "{a,b}", expand: ["{a,b}"] },
    { input: "x{a,b", options: {}, compile: "x{a,b", expand: ["x{a,b"] },
    { input: "[ab]{c,d}", options: {}, compile: "[ab](c|d)", expand: ["[ab]c", "[ab]d"] },
    { input: "@(a|b){c,d}", options: {}, compile: "@(a|b)(c|d)", expand: ["@(a|b)c", "@(a|b)d"] },
    { input: "{a,a,b}", options: { nodupes: true }, compile: "(a|a|b)", expand: ["a", "b"] },
    { input: "{,a,}", options: { noempty: true }, compile: "(|a|)", expand: ["a"] },
  ];
  assert.equal(typeof braces, "function");
  for (const method of ["parse", "stringify", "compile", "expand", "create"]) assert.equal(typeof braces[method], "function");
  for (const fixture of fixtures) {
    assert.deepEqual(braces(fixture.input, fixture.options), [fixture.compile], fixture.input);
    assert.equal(braces.compile(fixture.input, fixture.options), fixture.compile, fixture.input);
    assert.deepEqual(braces.expand(fixture.input, fixture.options), fixture.expand, fixture.input);
    assert.deepEqual(braces(fixture.input, { ...fixture.options, expand: true }), fixture.expand, fixture.input);
  }
  assert.deepEqual(braces(["{a,b}", "{c,d}"], { expand: true }), ["a", "b", "c", "d"]);
  assert.deepEqual(braces(["{a,b}", "{b,c}"], { expand: true, nodupes: true }), ["a", "b", "c"]);
  assert.deepEqual(braces.create(""), [""]);
  assert.deepEqual(braces.create("ab"), ["ab"]);
});

test("parsed ASTs retain normal parent/prev references and direct module compatibility", () => {
  const input = "src/{app,lib}/file-{01..03}.ts";
  const ast = braces.parse(input);
  assert.equal(braces.stringify(ast), input);
  assert.equal(braces.compile(ast), "src/(app|lib)/file-(0[1-3]).ts");
  assert.deepEqual(braces.expand(braces.parse(input)), ["src/app/file-01.ts", "src/app/file-02.ts", "src/app/file-03.ts", "src/lib/file-01.ts", "src/lib/file-02.ts", "src/lib/file-03.ts"]);
  assert.equal(direct[0](braces.parse("{a,b}")), "(a|b)");
  assert.deepEqual(direct[1](braces.parse("{a,b}")), ["a", "b"]);
  assert.equal(direct[2](braces.parse("{a,b}")), "{a,b}");
  const subtree = braces.parse("a/{b,c}/d").nodes.find((node: Ast) => node.type === "brace");
  assert.equal(braces.stringify(subtree), "{b,c}");
});

test("deep string braces and parentheses reject before every recursive entry point", () => {
  for (const [open, close] of [["{", "}"], ["(", ")"]]) {
    const input = open.repeat(3500) + "a,b" + close.repeat(3500);
    for (const run of [braces, braces.parse, braces.compile, braces.expand, braces.stringify, braces.create]) {
      rejects(() => run(input, { maxDepth: Infinity, maxLength: Infinity, rangeLimit: false }), "ERR_BRACES_DEPTH");
    }
  }
});

test("quoted, escaped and character-class braces are literals rather than structural depth", () => {
  const bracesLiteral = "{".repeat(1000) + "a" + "}".repeat(1000);
  assert.equal(braces.compile(`"${bracesLiteral}"`), bracesLiteral);
  assert.equal(braces.compile(bracesLiteral.replace(/[{}]/g, (value: string) => `\\${value}`)), bracesLiteral);
  assert.equal(braces.compile(`[${bracesLiteral}]`), `[${bracesLiteral}]`);
  assert.equal(braces.compile('"{a,b}"', { keepQuotes: true }), '"{a,b}"');
  assert.equal(braces.compile("\\{a,b}", { keepEscaping: true }), "\\{a,b}");
});

test("hard input length cannot be raised or bypassed with NaN or Infinity", () => {
  const input = "a".repeat(10001);
  for (const maxLength of [NaN, Infinity, 100000, undefined]) {
    for (const run of [braces.parse, braces.compile, braces.expand, braces.stringify, braces.create]) {
      assert.throws(() => run(input, { maxLength }), SyntaxError);
    }
  }
  assert.equal(braces.compile("a".repeat(10000), { maxLength: NaN }).length, 10000);
  assert.throws(() => braces.parse("abc", { maxLength: 2 }), SyntaxError);
});

test("direct deep ASTs cannot bypass the guard by avoiding the parser", () => {
  for (const run of methods) rejects(() => run(deepAst(3500)), "ERR_BRACES_DEPTH");
  assert.equal(braces.compile(deepAst(20)), "a");
});

test("direct AST child cycles reject without recursive traversal", () => {
  for (const run of methods) {
    const root: Ast = { type: "root", nodes: [] };
    root.nodes!.push(root);
    rejects(() => run(root), "ERR_BRACES_CYCLE");
  }
});

test("direct AST parent cycles and excessively long parent chains reject", () => {
  for (const run of methods) {
    const root: Ast = { type: "root", nodes: [] };
    root.parent = root;
    rejects(() => run(root), "ERR_BRACES_CYCLE");
    let parent: Ast = { type: "root", nodes: [] };
    const leaf = parent;
    for (let i = 0; i < 3500; i++) parent = parent.parent = { type: "root", nodes: [] };
    rejects(() => run(leaf), "ERR_BRACES_DEPTH");
  }
});

test("broad ASTs are bounded by width and total visits including repeated shared subtrees", () => {
  for (const run of methods) {
    const leaf: Ast = { type: "text", value: "a" };
    rejects(() => run({ type: "root", nodes: Array(20000).fill(leaf) }), "ERR_BRACES_VISITS");
    const distinct = Array.from({ length: 9000 }, () => ({ type: "text", value: "a" }));
    rejects(() => run({ type: "root", nodes: distinct }), "ERR_BRACES_VISITS");
    let dag: Ast = leaf;
    for (let i = 0; i < 20; i++) dag = { type: "root", nodes: [dag, dag] };
    rejects(() => run(dag), "ERR_BRACES_VISITS");
  }
});

test("AST text budgets and malformed data reject before the upstream walker", () => {
  for (const run of methods) {
    rejects(() => run({ type: "root", nodes: [{ type: "text", value: "a".repeat(10001) }] }), "ERR_BRACES_TEXT");
    rejects(() => run({ type: "root", nodes: Array.from({ length: 200 }, () => ({ type: "text", value: "a".repeat(7000) })) }), "ERR_BRACES_TEXT");
    assert.throws(() => run({ type: "root", nodes: [{ type: "text", value: ["a"] }] }), TypeError);
    assert.throws(() => run({ type: "root", nodes: "invalid" }), TypeError);
  }
});

test("Cartesian expansion rejects exponential count and total text before large allocation", () => {
  const explosion = "{a,b}".repeat(30);
  for (const run of [braces.expand, (input: string) => braces(input, { expand: true }), (input: string) => direct[1](braces.parse(input))]) {
    rejects(() => run(explosion), "ERR_BRACES_OUTPUT");
    rejects(() => run("x".repeat(9000) + "{a,b}".repeat(7)), "ERR_BRACES_OUTPUT");
  }
  assert.equal(braces.expand("{a,b}".repeat(10)).length, 1024);
  assert.equal(braces.compile(explosion), "(a|b)".repeat(30));
});

test("rangeLimit retains its default restriction but cannot disable the hard output budget", () => {
  assert.throws(() => braces.expand("{1..1001}"), /range limit/);
  assert.deepEqual(braces.expand("{1..1001}", { rangeLimit: false }).slice(-2), ["1000", "1001"]);
  for (const input of ["{1..1000000000}", "{1000000000..1}", "{1..1000000000..2}"]) {
    rejects(() => braces.expand(input, { rangeLimit: false }), "ERR_BRACES_OUTPUT");
  }
  rejects(() => braces.expand(`{${"0".repeat(1999)}1..${"0".repeat(1997)}999}`, { rangeLimit: false }), "ERR_BRACES_OUTPUT");
});

test("range preflight matches fill-range fallback steps and rejects non-progressing unsafe numbers", () => {
  for (const step of [0, "0", "-0", "0.0", null, false, NaN, [], {}]) {
    assert.throws(() => braces.expand("{1..10001}", { rangeLimit: false, step }), (error: unknown) => {
      assert.ok(error instanceof RangeError);
      assert.equal(error.message, "braces guard: range expansion exceeds the bounded output budget");
      return true;
    });
    assert.deepEqual(braces.expand("{1..3}", { step, rangeLimit: false }).map(Number), [1, 2, 3]);
  }
  for (const run of [braces.compile, braces.expand]) {
    rejects(() => run("{9007199254740992..9007199254740992}", { rangeLimit: false }), "ERR_BRACES_OUTPUT");
    rejects(() => run("{1..1000000000..2}", { rangeLimit: false }), "ERR_BRACES_OUTPUT");
  }
  assert.ok(braces.compile("{1..1000000000}").length < 200);
  assert.deepEqual(braces.expand("{3..1..0}"), ["3", "2", "1"]);
});

test("object-valued range steps cannot discard compile regex options and bypass allocation limits", () => {
  for (const step of [{}, { toRegex: false }, { step: 2 }]) {
    for (const run of [braces.compile, (input: string, options: object) => direct[0](braces.parse(input), options)]) {
      for (const input of ["{1..10001}", "{1..1000000000}"]) {
        rejects(() => run(input, { step, rangeLimit: false }), "ERR_BRACES_OUTPUT");
      }
      assert.equal(run("{1..3}", { step }), "(1,2,3)");
    }
  }
  assert.ok(braces.compile("{1..1000000000}", { step: { toRegex: true } }).length < 200);
});

test("several individually bounded stepped ranges cannot exceed the compiled byte budget", () => {
  const range = `{${"0".repeat(100)}1..${"0".repeat(96)}10001..2}`;
  assert.ok(Buffer.byteLength(braces.compile(range), "utf8") < 1048576);
  for (const run of [braces.compile, (input: string) => direct[0](braces.parse(input))]) {
    rejects(() => run(range.repeat(3)), "ERR_BRACES_OUTPUT");
  }
  for (const run of [braces.compile, direct[0]]) {
    const ast = braces.parse(range.repeat(30));
    rejects(() => run(ast), "ERR_BRACES_OUTPUT");
  }
});

test("sibling alternatives are bounded as queues retain each range, before final flatten", () => {
  const range = `{${"0".repeat(100)}1..${"0".repeat(96)}10001..2}`;
  for (const run of [braces.expand, direct[1]]) {
    const ast = braces.parse(`{${Array(30).fill(range).join(",")}}`);
    rejects(() => run(ast, { rangeLimit: false }), "ERR_BRACES_OUTPUT");
    const outer = ast.nodes.find((node: Ast) => node.type === "brace");
    const queue = outer.queue.flat(Infinity);
    assert.ok(queue.length <= 10000);
    assert.ok(queue.reduce((sum: number, value: string) => sum + Buffer.byteLength(String(value), "utf8"), 0) <= 1048576);
  }
  assert.deepEqual(braces.expand("{x{1..3},y{4..6}}"), ["x1", "x2", "x3", "y4", "y5", "y6"]);
  assert.equal(braces.expand("{a,b}".repeat(13)).length, 8192);
});

test("text budgets account for multibyte text rather than only character counts", () => {
  rejects(() => braces.expand("東".repeat(3000) + "{a,b}".repeat(7)), "ERR_BRACES_OUTPUT");
  for (const run of methods) {
    rejects(() => run({ type: "root", nodes: Array.from({ length: 100 }, () => ({ type: "text", value: "東".repeat(4000) })) }), "ERR_BRACES_TEXT");
  }
});

test("pattern list count and cumulative expanded output are bounded", () => {
  rejects(() => braces(Array(20000).fill("a")), "ERR_BRACES_VISITS");
  rejects(() => braces(Array(6000).fill("{a,b}"), { expand: true }), "ERR_BRACES_OUTPUT");
  rejects(() => braces(Array(200).fill("x".repeat(7000))), "ERR_BRACES_OUTPUT");
});

test("installed transitive glob consumers resolve the explicit local fork", () => {
  for (const consumer of ["chokidar", "micromatch"]) {
    const consumerRequire = createRequire(require.resolve(`${consumer}/package.json`));
    const pkg = consumerRequire("braces/package.json");
    assert.equal(pkg.name, "@leadflow/braces-guard");
    assert.equal(pkg.version, "0.1.0");
    rejects(() => consumerRequire("braces").compile("{".repeat(3500) + "a,b" + "}".repeat(3500)), "ERR_BRACES_DEPTH");
  }
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  for (const [path, value] of Object.entries(lock.packages) as [string, { resolved?: string; version?: string }][]) {
    assert.ok(!(path.endsWith("/braces") && value.version === "3.0.3"), path);
    assert.ok(!value.resolved?.includes("braces-3.0.3.tgz"), path);
  }
});

test("micromatch and fast-glob keep ordinary nested range and extension behavior", () => {
  const micromatch = require("micromatch");
  const files = ["src/app/a.ts", "src/lib/a.js", "src/other/a.ts", "src/app/a.css"];
  assert.deepEqual(micromatch(files, "src/{app,lib}/*.{ts,js}"), files.slice(0, 2));
  assert.deepEqual(micromatch.braceExpand("file-{01..03}.{ts,js}"), ["file-01.ts", "file-01.js", "file-02.ts", "file-02.js", "file-03.ts", "file-03.js"]);
  const dir = mkdtempSync(join(tmpdir(), "leadflow-glob-guard-"));
  try {
    for (const file of ["file-01.ts", "file-02.js", "file-03.css", "other.ts"]) writeFileSync(join(dir, file), "fixture");
    assert.deepEqual(require("fast-glob").sync("file-{01..03}.{ts,js}", { cwd: dir }).sort(), ["file-01.ts", "file-02.js"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("chokidar watches a normal brace-expanded pattern and closes cleanly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "leadflow-watch-guard-"));
  for (const file of ["a.txt", "b.txt", "other.txt"]) writeFileSync(join(dir, file), "fixture");
  const watcher = require("chokidar").watch(join(dir, "{a,b}.txt"), { persistent: false, ignoreInitial: false });
  const found: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("watcher did not become ready")), 5000);
      watcher.on("add", (path: string) => found.push(path));
      watcher.once("error", reject);
      watcher.once("ready", resolve);
    });
    assert.deepEqual(found.sort(), [join(dir, "a.txt"), join(dir, "b.txt")]);
  } finally {
    clearTimeout(timer);
    await watcher.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
