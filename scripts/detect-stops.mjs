// Detecta os batentes (círculos cinza) de cada vaga no raster nativo da pág. 6.
import fs from "node:fs";
import { PNG } from "pngjs";
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const lo = +(process.argv[4] || 95), hi = +(process.argv[5] || 175);
const m = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const v = (r + g + b) / 3;
  if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && v >= lo && v <= hi) m[i] = 1;
}
const seen = new Uint8Array(W * H), out = [];
for (let i = 0; i < W * H; i++) {
  if (!m[i] || seen[i]) continue;
  const st = [i], px = []; seen[i] = 1;
  while (st.length) {
    const p = st.pop(); px.push(p);
    const x = p % W, y = (p / W) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx; if (m[q] && !seen[q]) { seen[q] = 1; st.push(q); }
    }
  }
  let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1, sx = 0, sy = 0;
  for (const p of px) { const x = p % W, y = (p / W) | 0; sx += x; sy += y; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const bw = maxx - minx + 1, bh = maxy - miny + 1;
  out.push({ x: +(sx / px.length).toFixed(1), y: +(sy / px.length).toFixed(1), n: px.length, bw, bh });
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
const hist = {};
for (const o of out) { const k = `${o.bw}x${o.bh}`; hist[k] = (hist[k] || 0) + 1; }
console.log("componentes", out.length);
console.log(Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 25).map(e => e.join(":")).join("  "));
