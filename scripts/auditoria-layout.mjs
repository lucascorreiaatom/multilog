// Auditoria de layout: elementos fora do painel, texto cortado sem reticências e painéis sobrepostos/fora da tela.
// Uso: node scripts/auditoria-layout.mjs <baseUrl>
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3200";
const TELAS = [[768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
const ESTADOS = ["base", "ampliada", "detalhe", "busca"];
const b = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext();
const p0 = await ctx.newPage();
await p0.goto(`${base}/login`);
await Promise.all([p0.waitForURL(/conceito-1/), p0.click('button[type="submit"]')]);
await p0.close();
let total = 0;
for (const [w, h] of TELAS) for (const estado of ESTADOS) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  await p.goto(`${base}/conceito-1?fixture=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  if (estado === "ampliada") await p.click('button[aria-label="Ampliar imagem"]');
  if (estado === "detalhe") { await p.keyboard.press("/"); await p.keyboard.type("EST-B2"); await p.waitForTimeout(300); await p.keyboard.press("Enter"); }
  if (estado === "busca") { await p.keyboard.press("/"); await p.keyboard.type("CAM"); }
  await p.waitForTimeout(800);
  const problemas = await p.evaluate(() => {
    const out = [];
    const vw = innerWidth, vh = innerHeight;
    const nome = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
    const paineis = [...document.querySelectorAll('[aria-label]')].filter((el) => getComputedStyle(el).boxShadow !== "none" && el.className.toString().includes("rounded-[24px]") || el.getAttribute("role") === "dialog");
    for (const pn of paineis) {
      const r = pn.getBoundingClientRect();
      if (r.width === 0 || getComputedStyle(pn).visibility === "hidden") continue;
      const tx = new DOMMatrix(getComputedStyle(pn).transform);
      if (tx.m41 < -100) continue; // painel recolhido fora da tela de propósito
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`painel fora da tela: ${nome(pn)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
      for (const el of pn.querySelectorAll("*")) {
        const er = el.getBoundingClientRect();
        if (er.width === 0 || er.height === 0) continue;
        let a = el.parentElement, clip = r;
        while (a && a !== pn) { const cs = getComputedStyle(a); if (cs.overflowY === "auto" || cs.overflowY === "scroll") { clip = a.getBoundingClientRect(); break; } a = a.parentElement; }
        const dentroScroll = clip !== r;
        if (er.left < clip.left - 1 || er.right > clip.right + 1 || (!dentroScroll && (er.top < r.top - 1 || er.bottom > r.bottom + 1))) {
          out.push(`fora do painel "${nome(pn)}": ${el.tagName.toLowerCase()} "${nome(el)}"`);
        }
        const cs = getComputedStyle(el);
        if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== "ellipsis" && cs.overflow !== "visible") out.push(`texto cortado: "${nome(el)}" em "${nome(pn)}"`);
        if (el.children.length === 0 && el.textContent.trim() && cs.whiteSpace !== "nowrap" && el.tagName === "BUTTON" && er.height > 52) out.push(`botão quebrando linha: "${nome(el)}"`);
      }
    }
    // sobreposição entre painéis visíveis
    const vis = paineis.filter((pn) => { const r = pn.getBoundingClientRect(); return r.width > 0 && new DOMMatrix(getComputedStyle(pn).transform).m41 > -100 && getComputedStyle(pn).visibility !== "hidden"; });
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i].getBoundingClientRect(), c = vis[j].getBoundingClientRect();
      const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (ix > 2 && iy > 2 && !vis[i].contains(vis[j]) && !vis[j].contains(vis[i]) && vis[i].getAttribute("role") !== "dialog" && vis[j].getAttribute("role") !== "dialog") out.push(`painéis sobrepostos: "${nome(vis[i])}" x "${nome(vis[j])}"`);
    }
    // botões com texto quebrado (altura maior que uma linha)
    for (const bt of document.querySelectorAll("button")) {
      const r = bt.getBoundingClientRect(); const cs = getComputedStyle(bt);
      const lh = parseFloat(cs.lineHeight) || 20;
      if (r.width && bt.innerText.trim() && !bt.innerText.includes("\n") && bt.scrollHeight > Math.max(r.height, lh * 1.6) + 2) out.push(`botão transbordando: "${nome(bt)}"`);
    }
    return [...new Set(out)];
  });
  total += problemas.length;
  console.log(`\n## ${w}x${h} · ${estado}: ${problemas.length} problema(s)`);
  for (const pr of problemas.slice(0, 25)) console.log("  - " + pr);
  await p.close();
}
console.log(`\nTOTAL: ${total}`);
await b.close();
