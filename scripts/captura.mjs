// Captura de tela de uma rota com GPU (ANGLE/Metal), para validação visual da cena.
// Uso: node scripts/captura.mjs <url> <saida.png> [largura] [altura] [esperaMs]
import { chromium } from "@playwright/test";
const [, , url, out, w = "1440", h = "900", espera = "9000"] = process.argv;
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
if (page.url().includes("/login")) {
  await Promise.all([page.waitForURL(/conceito-1/, { timeout: 120000 }), page.click('button[type="submit"]')]);
  if (new URL(url).search) await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
}
await page.waitForTimeout(+espera);
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round((n * 1000) / (performance.now() - t0))); }; requestAnimationFrame(f); }));
await page.screenshot({ path: out });
console.log("fps", fps);
console.log(logs.slice(0, 20).join("\n"));
await browser.close();
