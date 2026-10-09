// Detecta símbolos coloridos de câmera no raster nativo da pág. 6 (componentes conexos por classe de cor).
import fs from "node:fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const classify = (r, g, b) => {
  if (b > 140 && r < 90 && g < 130 && b - r > 80) return "azul";
  if (r > 170 && g < 100 && b < 100) return "vermelho";
  if (r > 190 && g > 170 && b < 110) return "amarelo";
  if (g > 140 && r < 140 && b < 110 && g - r > 50) return "verde";
  return null;
};
const cls = new Array(W * H).fill(null);
for (let i = 0; i < W * H; i++) cls[i] = classify(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
const seen = new Uint8Array(W * H);
const comps = [];
for (let i = 0; i < W * H; i++) {
  if (!cls[i] || seen[i]) continue;
  const c = cls[i], stack = [i], px = [];
  seen[i] = 1;
  while (stack.length) {
    const p = stack.pop(); px.push(p);
    const x = p % W, y = (p / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (!seen[q] && cls[q] === c) { seen[q] = 1; stack.push(q); }
    }
  }
  if (px.length < 4) continue;
  let sx = 0, sy = 0;
  for (const p of px) { sx += p % W; sy += (p / W) | 0; }
  const cx = sx / px.length, cy = sy / px.length;
  let xx = 0, yy = 0, xy = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
  for (const p of px) {
    const x = p % W - cx, y = ((p / W) | 0) - cy;
    xx += x * x; yy += y * y; xy += x * y;
    minx = Math.min(minx, x + cx); maxx = Math.max(maxx, x + cx); miny = Math.min(miny, y + cy); maxy = Math.max(maxy, y + cy);
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy) * 180 / Math.PI; // eixo principal, graus (y para baixo)
  comps.push({ cor: c, x: +cx.toFixed(1), y: +cy.toFixed(1), n: px.length, bw: maxx - minx + 1, bh: maxy - miny + 1, eixo: +angle.toFixed(0) });
}
fs.writeFileSync(process.argv[3], JSON.stringify(comps, null, 1));
const by = {};
comps.forEach((c) => (by[c.cor] = (by[c.cor] || 0) + 1));
console.log(by);
for (const c of comps) console.log(c.cor.padEnd(9), c.x, c.y, "n" + c.n, c.bw + "x" + c.bh, "eixo", c.eixo);
