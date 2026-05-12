#!/usr/bin/env node
/**
 * Generates favicons and PWA icons (16, 32, 192, 512) using headless Chrome.
 * Design: burgundy rounded-square with a white serif "D".
 *
 * Usage: node scripts/render-icons.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tmpDir = path.join(root, "icons");

const CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CHROME_LINUX = "/usr/bin/google-chrome";

function findChrome() {
  if (process.platform === "darwin" && fs.existsSync(CHROME_MAC)) return CHROME_MAC;
  if (fs.existsSync(CHROME_LINUX)) return CHROME_LINUX;
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  return null;
}

const chrome = findChrome();
if (!chrome) {
  console.error("Chrome not found. Set CHROME_PATH or install Chrome.");
  process.exit(1);
}

function buildHtml(size) {
  const radius = Math.round(size * 0.22);
  // Letter is ~60% of icon size, slight optical adjustment for "D"
  const letterSize = Math.round(size * 0.62);
  // Serif "D" sits with a slight optical correction (lifts ~3% to feel centered)
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  html, body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
  .icon {
    width: ${size}px;
    height: ${size}px;
    background: #8B1A4A;
    border-radius: ${radius}px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }
  .letter {
    font-family: Georgia, "Playfair Display", "Iowan Old Style", serif;
    font-size: ${letterSize}px;
    font-weight: 500;
    color: #ffffff;
    line-height: 1;
    margin-top: -${Math.round(size * 0.03)}px;
    letter-spacing: -0.02em;
  }
</style>
</head>
<body>
<div class="icon"><span class="letter">D</span></div>
</body></html>`;
}

const sizes = [
  { size: 16, out: "favicon-16.png" },
  { size: 32, out: "favicon-32.png" },
  { size: 192, out: "icon-192.png" },
  { size: 512, out: "icon-512.png" },
];

for (const { size, out } of sizes) {
  const htmlPath = path.join(root, `icon-tmp-${size}.html`);
  fs.writeFileSync(htmlPath, buildHtml(size), "utf8");
  const outPath = path.join(tmpDir, out);
  const fileUrl = "file://" + htmlPath;
  try {
    execFileSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        `--window-size=${size},${size}`,
        "--default-background-color=00000000",
        "--virtual-time-budget=4000",
        `--screenshot=${outPath}`,
        fileUrl,
      ],
      { stdio: "inherit" }
    );
    console.log(`Wrote ${outPath}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    fs.unlinkSync(htmlPath);
  }
}
