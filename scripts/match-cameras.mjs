// Casa rótulos (OCR + leitura manual) com símbolos detectados na pág. 6.
import fs from "node:fs";
const ocr = JSON.parse(fs.readFileSync("data-src/ocr-p06.json"));
const sym = JSON.parse(fs.readFileSync("data-src/symbols-p06.json"));
// raster nativo posicionado na página: x 12.222 + 744.05, y(topo) 42.985 + 452.64 (pontos)
const HI = 5; // p06_hi = pontos * 5
const toRaster = (hx, hy) => [((hx / HI) - 12.222) * 1006 / 744.05, ((hy / HI) - 42.985) * 612 / 452.64];
const DISP = 2000 / 960; // p06.png exibido em 2000 px de largura
const fromDisp = (dx, dy) => toRaster(dx / DISP * HI, dy / DISP * HI);
const labels = new Map();
for (const t of ocr) {
  const n = +t.text;
  if (!(n >= 1 && n <= 69) || t.full.includes("câmeras") || t.full.includes("CAM")) continue;
  if (!labels.has(n)) labels.set(n, []);
  labels.get(n).push(toRaster(t.x, t.y));
}
// leitura manual dos rótulos que o OCR perdeu (coordenadas na imagem de 2000 px)
const manual = { 5: [517, 740], 6: [517, 940], 20: [373, 512], 24: [718, 384], 34: [1450, 1012], 42: [57, 737], 49: [470, 392], 57: [878, 417] };
for (const [n, [x, y]] of Object.entries(manual)) labels.set(+n, [fromDisp(x, y)]);
const out = [];
for (let n = 1; n <= 69; n++) {
  const cands = labels.get(n) || [];
  out.push({ n, labels: cands.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]) });
}
fs.writeFileSync("data-src/labels-p06-raster.json", JSON.stringify(out, null, 1));
for (const o of out) {
  const [lx, ly] = o.labels[0] || [NaN, NaN];
  const near = sym.map((s) => ({ ...s, d: Math.hypot(s.x - lx, s.y - ly) })).sort((a, b) => a.d - b.d).slice(0, 2);
  console.log(String(o.n).padStart(2), o.labels.map((l) => l.join(",")).join(" | ").padEnd(28), near.map((s) => `${s.cor}@${s.x},${s.y} d${s.d.toFixed(0)} e${s.eixo}`).join("  "));
}
