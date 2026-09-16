import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const puppeteerConfig = path.join(root, "scripts", "puppeteer-config.json");

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return walk(full);
    }
    return full.endsWith(".mmd") ? [full] : [];
  });
}

const files = walk(docsDir);

if (files.length === 0) {
  console.log("No Mermaid files found.");
  process.exit(0);
}

for (const input of files) {
  const output = input.replace(/\.mmd$/, ".svg");
  mkdirSync(path.dirname(output), { recursive: true });
  const args = ["mmdc", "-i", input, "-o", output, "-b", "transparent", "-p", puppeteerConfig];
  execFileSync("pnpm", ["exec", ...args], { stdio: "inherit" });
}

console.log(`Rendered ${files.length} Mermaid diagram(s).`);
