import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import type { ReactElement, ReactNode } from "react";
import sharp from "sharp";
import ts from "typescript";
import { PRICES, usd } from "../lib/site/prices.ts";

const require = createRequire(import.meta.url);
const { ImageResponse }: typeof import("next/og") = require("next/og");

test("SellerProof metadata refreshes its native share URL without changing the page canonical", async () => {
  const source = await readFile("app/sellerproof/page.tsx", "utf8");
  const file = ts.createSourceFile("sellerproof.tsx", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  // Evaluate the page's real metadata declarations without rendering its UI
  // or importing the private packet implementation.
  const printer = ts.createPrinter();
  const declarations = file.statements.filter((statement) =>
    ts.isVariableStatement(statement) && statement.declarationList.declarations.every((declaration) =>
      ts.isIdentifier(declaration.name) && ["title", "description", "shareImage", "metadata"].includes(declaration.name.text),
    ),
  );
  const compiled = ts.transpileModule(declarations.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, file)).join("\n"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result = {} as { metadata: import("next").Metadata };
  new Function("exports", "PRICES", "usd", compiled)(result, PRICES, usd);
  assert.equal(result.metadata.alternates?.canonical, "/sellerproof");
  const images = result.metadata.openGraph?.images as { url: string; width: number; height: number }[];
  assert.equal(images[0].width, 1200);
  assert.equal(images[0].height, 630);
  const imageUrl = new URL(images[0].url, "https://www.theleadflowpro.com");
  assert.equal(imageUrl.pathname, "/sellerproof/opengraph-image");
  assert.equal(imageUrl.search, "?v=violet-20261003");
  assert.deepEqual(result.metadata.twitter?.images, [images[0].url]);
});

function visibleText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(visibleText).join(" ");
  if (node && typeof node === "object" && "props" in node)
    return visibleText((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

test("SellerProof share image renders luminous artwork with its actual packet price and outcome limits", async () => {
  const source = await readFile("app/sellerproof/opengraph-image.tsx", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  let text = "";
  class ObservedImageResponse extends ImageResponse {
    constructor(...args: ConstructorParameters<typeof ImageResponse>) {
      text = visibleText(args[0]).replace(/\s+/g, " ").trim();
      super(...args);
    }
  }
  const imageModule = {} as { default: () => Promise<Response>; alt: string };
  const localRequire = (name: string) => {
    if (name === "next/og") return { ImageResponse: ObservedImageResponse };
    if (name === "@/lib/site/prices") return { PRICES, usd };
    return require(name);
  };
  new Function("require", "exports", compiled)(localRequire, imageModule);
  const response = await imageModule.default();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type") ?? "", /image\/png/);
  assert.ok(text.includes(`Free preview · ${usd(PRICES.sellerProofPacket)} per packet · No subscription`));
  assert.ok(text.includes("Not legal advice. No outcome guarantees."));
  assert.ok(text.includes("Organized evidence. A clearer response."));
  assert.ok(imageModule.alt.includes(`${usd(PRICES.sellerProofPacket)} per packet`));

  const bytes = Buffer.from(await response.arrayBuffer());
  const dimensions = await sharp(bytes).metadata();
  assert.equal(dimensions.width, 1200);
  assert.equal(dimensions.height, 630);
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let luminous = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
    if (brightness > 180) luminous += 1;
  }
  assert.ok(luminous / (info.width * info.height) > 0.75, "Share art retains a light canvas rather than the retired navy background");
});
