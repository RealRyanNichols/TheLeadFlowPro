import { readFileSync } from "node:fs";
import { join } from "node:path";

const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
const blockedPublicPatterns = [
  /NEXT_PUBLIC_.*SERVICE/i,
  /NEXT_PUBLIC_.*SECRET/i,
  /NEXT_PUBLIC_.*TOKEN/i,
  /NEXT_PUBLIC_.*PASSWORD/i,
  /NEXT_PUBLIC_.*PRIVATE/i,
  /NEXT_PUBLIC_.*AUTH/i,
  /NEXT_PUBLIC_.*BUS/i,
];

const findings = [];

for (const line of envExample.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key] = trimmed.split("=", 1);
  if (!key?.startsWith("NEXT_PUBLIC_")) continue;
  if (blockedPublicPatterns.some((pattern) => pattern.test(key))) {
    findings.push(`${key}: public env var name suggests a secret or private token.`);
  }
}

if (findings.length > 0) {
  console.error("Public environment audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Public environment audit passed.");
