// Lets Node import the TypeScript registry directly, so the validation script,
// the art generator and the test suite all read the same source of truth the app
// reads instead of a duplicated copy.
//
// Node's built-in type stripping handles the types. All this adds is the two
// resolution behaviours TypeScript has and Node does not: extensionless relative
// imports, and the "@/" project alias from tsconfig.json.

import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const EXTS = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];

const isFile = (p) => existsSync(p) && statSync(p).isFile();

function firstExisting(basePath) {
  if (isFile(basePath)) return basePath;
  for (const ext of EXTS) {
    if (isFile(basePath + ext)) return basePath + ext;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  const hasExt = /\.[cm]?[jt]sx?$/.test(specifier);

  if (specifier.startsWith("@/")) {
    const found = firstExisting(resolvePath(ROOT, specifier.slice(2)));
    if (found) return next(pathToFileURL(found).href, context);
  }

  if (specifier.startsWith(".") && !hasExt && context.parentURL) {
    const found = firstExisting(fileURLToPath(new URL(specifier, context.parentURL)));
    if (found) return next(pathToFileURL(found).href, context);
  }

  return next(specifier, context);
}

// Node strips types from .ts but has no JSX transform. The factory QA script
// and its test render the client-site templates, which are .tsx, so those
// files go through TypeScript's transpiler (already a dependency of Next).
export async function load(url, context, next) {
  if (!url.endsWith(".tsx")) return next(url, context);
  const [{ readFile }, ts] = await Promise.all([import("node:fs/promises"), import("typescript")]);
  const source = await readFile(fileURLToPath(url), "utf8");
  const { outputText } = ts.default.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: { jsx: ts.default.JsxEmit.ReactJSX, module: ts.default.ModuleKind.ESNext, target: ts.default.ScriptTarget.ES2022 },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
