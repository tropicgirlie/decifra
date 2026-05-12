#!/usr/bin/env node
/**
 * Renders og.png (1200x630) using a hybrid HTML+canvas page captured with
 * headless Chrome. Canvas handles the cream BG + dot texture + illustration
 * (with white-pixel removal). HTML/CSS handles all text for reliable font
 * fallback and rendering.
 *
 * Usage: node scripts/render-og.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const illustrationPath = path.join(root, "illustrations", "snapshot-hero.png");
const htmlPath = path.join(root, "og-temp-render.html");
const outPng = path.join(root, "og.png");

const CHROME_MAC =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CHROME_LINUX = "/usr/bin/google-chrome";

function findChrome() {
  if (process.platform === "darwin" && fs.existsSync(CHROME_MAC)) return CHROME_MAC;
  if (fs.existsSync(CHROME_LINUX)) return CHROME_LINUX;
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  return null;
}

if (!fs.existsSync(illustrationPath)) {
  console.error("Missing illustration:", illustrationPath);
  process.exit(1);
}

const b64 = fs.readFileSync(illustrationPath).toString("base64");
const dataUrl = `data:image/png;base64,${b64}`;

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  html, body {
    margin: 0; padding: 0;
    width: 1200px; height: 630px;
    overflow: hidden;
    background: #FAF7F4;
    font-family: Georgia, serif;
  }
  .stage { position: relative; width: 1200px; height: 630px; }
  canvas { position: absolute; top: 0; left: 0; }
  .text {
    position: absolute;
    left: 80px;
    z-index: 10;
  }
  .eyebrow {
    top: 110px;
    font-family: "JetBrains Mono", "Courier New", monospace;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.16em;
    color: #B0552B;
    text-transform: uppercase;
  }
  .h1 {
    top: 160px;
    font-family: Georgia, "Playfair Display", serif;
    font-size: 76px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #1E1E24;
    margin: 0;
  }
  .h1 em {
    font-style: italic;
    color: #8B1A4A;
    font-weight: 500;
  }
  .sub {
    top: 410px;
    font-family: -apple-system, "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 22px;
    line-height: 1.5;
    color: #4A4A55;
    margin: 0;
  }
</style>
</head>
<body>
<div class="stage">
  <canvas id="og" width="1200" height="630"></canvas>
  <div class="text eyebrow">INTELIGÊNCIA CLÍNICA  ·  EXAMES FEMININOS</div>
  <div class="text h1">Seus exames,<br/><em>decifrados</em> para ela.</div>
  <div class="text sub">Contexto clínico feminino em cada marcador.<br/>Extração rigorosa. Nada armazenado.</div>
</div>
<script>
const canvas = document.getElementById("og");
const ctx = canvas.getContext("2d");
const W = 1200, H = 630;

// Cream background
ctx.fillStyle = "#FAF7F4";
ctx.fillRect(0, 0, W, H);

// Subtle dot grid
ctx.fillStyle = "rgba(139,26,74,0.05)";
for (let x = 0; x < W; x += 28) {
  for (let y = 0; y < H; y += 28) {
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Burgundy left accent stripe
ctx.fillStyle = "#8B1A4A";
ctx.fillRect(0, 0, 6, H);

const illustration = new Image();
illustration.onload = () => {
  // Use a temporary canvas to convert near-white pixels to transparent
  const tmp = document.createElement("canvas");
  tmp.width = illustration.naturalWidth;
  tmp.height = illustration.naturalHeight;
  const tctx = tmp.getContext("2d");
  tctx.drawImage(illustration, 0, 0);
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const lightness = (r + g + b) / 3;
    if (lightness > 240) {
      px[i + 3] = 0;
    } else if (lightness > 210) {
      px[i + 3] = Math.round(((255 - lightness) / 45) * 255);
    }
  }
  tctx.putImageData(data, 0, 0);

  const targetW = 480;
  const ratio = illustration.naturalHeight / illustration.naturalWidth;
  const targetH = targetW * ratio;
  const x = W - targetW - 70;
  const y = (H - targetH) / 2;
  ctx.drawImage(tmp, x, y, targetW, targetH);

  document.title = "og-ready";
};
illustration.onerror = () => {
  document.title = "og-ready";
};
illustration.src = ${JSON.stringify(dataUrl)};
</script>
</body></html>`;

fs.writeFileSync(htmlPath, html, "utf8");

const chrome = findChrome();
if (!chrome) {
  console.error("Chrome not found. Set CHROME_PATH or install Chrome, then re-run.");
  process.exit(1);
}

const fileUrl = "file://" + htmlPath;
try {
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=1200,630",
      "--virtual-time-budget=8000",
      `--screenshot=${outPng}`,
      fileUrl,
    ],
    { stdio: "inherit" }
  );
} catch (e) {
  console.error(e);
  process.exit(1);
}

fs.unlinkSync(htmlPath);
console.log("Wrote", outPng);
