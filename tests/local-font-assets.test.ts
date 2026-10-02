import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const css = readFileSync(new URL("app/fonts.css", root), "utf8");
const provenance = JSON.parse(
  readFileSync(new URL("public/fonts/leadflow/provenance.json", root), "utf8"),
);

test("bundled fonts match the verified live source without changing the font binaries", () => {
  assert.equal(
    provenance.sourceCommit,
    "ddeb3727f7e8e1f3d9ee9d0fa1df62aec2f475f4",
  );
  for (const file of provenance.files) {
    const bytes = readFileSync(
      new URL(`public/fonts/leadflow/${file.name}`, root),
    );
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
  }
});

test("every CSS font source is a bundled asset and both families retain redistribution notices", () => {
  const fonts = new Set(
    provenance.files.map(
      (file: { name: string }) => `/fonts/leadflow/${file.name}`,
    ),
  );
  for (const match of css.matchAll(/url\(([^)]+)\)/g))
    assert.ok(fonts.has(match[1]), match[1]);
  assert.ok(
    !/https?:\/\//.test(css),
    "Font CSS must not load a remote provider",
  );
  for (const family of ["Archivo", "Inter"]) {
    const license = readFileSync(
      new URL(`public/fonts/leadflow/${family}-OFL.txt`, root),
      "utf8",
    );
    assert.match(license, /Copyright/);
    assert.match(license, /SIL OPEN FONT LICENSE Version 1.1/);
  }
});
