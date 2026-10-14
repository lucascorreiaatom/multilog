// Medição de desempenho da cena: tempo de quadro (p50/p95/p99), quadros longos e long tasks,
// com a câmera parada e durante arrasto simulado. Saída em JSON para comparar antes e depois.
// Uso: node scripts/perf.mjs <url> <rotulo> [cpu=1] [largura=1440] [altura=900] [segundos=12]
// Ex.:  node scripts/perf.mjs "http://localhost:3000/mapa?sem=ao" sem-ao 4
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const [, , url, rotulo = "base", cpu = "1", w = "1440", h = "900", seg = "12"] = process.argv;
if (!url) { console.error("uso: node scripts/perf.mjs <url> <rotulo> [cpu] [largura] [altura] [segundos]"); process.exit(1); }

const browser = await chromium.launch({ channel: process.env.CANAL || undefined, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
// TEMA=escuro: sem localStorage.tema, o layout segue o prefers-color-scheme
if (process.env.TEMA === "escuro") await page.emulateMedia({ colorScheme: "dark" });
const erros = [];
page.on("pageerror", (e) => erros.push(e.message));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
if (page.url().includes("/login")) {
  await Promise.all([page.waitForURL(/\/mapa/, { timeout: 120000 }), page.click('button[type="submit"]')]);
  if (new URL(url).search) await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
}
// SELETOR: o que indica a cena pronta (padrão: canvas do 3D; no Conceito 2 use [data-testid="mapa-2d"])
await page.waitForSelector(process.env.SELETOR || '[data-testid="cena-3d"] canvas', { timeout: 120000 });
await page.waitForTimeout(8000);

const cdp = await page.context().newCDPSession(page);
if (+cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: +cpu });

// coletor no navegador: um tempo por quadro e as long tasks
await page.evaluate(() => {
  const g = (window.__perf = { quadros: [], longas: [], ativo: false });
  new PerformanceObserver((l) => { if (g.ativo) for (const e of l.getEntries()) g.longas.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false });
  let t0 = performance.now();
  const f = (t) => { if (g.ativo) g.quadros.push(t - t0); t0 = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});

const coletar = async (acao) => {
  await page.evaluate(() => { window.__perf.quadros = []; window.__perf.longas = []; window.__perf.ativo = true; });
  await acao();
  const r = await page.evaluate(() => { window.__perf.ativo = false; return { quadros: window.__perf.quadros, longas: window.__perf.longas }; });
  const q = [...r.quadros].sort((a, b) => a - b);
  const p = (x) => +(q[Math.min(q.length - 1, Math.floor(q.length * x))] ?? 0).toFixed(1);
  const total = r.quadros.reduce((s, x) => s + x, 0);
  return {
    qps: +((r.quadros.length * 1000) / total).toFixed(1),
    p50: p(0.5), p95: p(0.95), p99: p(0.99), max: +(q.at(-1) ?? 0).toFixed(1),
    acima50: r.quadros.filter((x) => x > 50).length,
    acima100: r.quadros.filter((x) => x > 100).length,
    longTasks: r.longas.length,
    longTaskMax: Math.max(0, ...r.longas),
  };
};

const cx = +w / 2, cy = +h / 2;
const parada = await coletar(() => page.waitForTimeout(+seg * 1000));
const arrasto = await coletar(async () => {
  const fim = Date.now() + +seg * 1000;
  let i = 0;
  while (Date.now() < fim) {
    // gira arrastando, depois aproxima e afasta com a roda
    await page.mouse.move(cx - 200, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy + 40, { steps: 60 });
    await page.mouse.up();
    // movimento de ponteiro sem arrasto (hover), como o usuário passando o mouse pela cena
    await page.mouse.move(cx - 300, cy - 100, { steps: 40 });
    await page.mouse.wheel(0, i % 2 ? 400 : -400);
    await page.waitForTimeout(250);
    i++;
  }
});

const info = await page.evaluate(() => window.__cenaInfo ?? null);
const resultado = { rotulo, url, cpu: +cpu, viewport: `${w}x${h}`, data: new Date().toISOString(), parada, arrasto, info, erros: erros.slice(0, 5) };
mkdirSync("scratch/perf", { recursive: true });
writeFileSync(`scratch/perf/${rotulo}.json`, JSON.stringify(resultado, null, 2));
console.log(JSON.stringify({ rotulo, cpu: +cpu, parada, arrasto, info }));
await browser.close();
