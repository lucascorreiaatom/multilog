// Faixas ampliadas por linha de contagem, com marcadores sobre a linha dos batentes e índice a cada 5.
// Uso: node scripts/strips.mjs <raster> <contagem.json> <x0> <x1> <escala> <saida.png>
import fs from "node:fs";
import { PNG } from "pngjs";
const [, , rp, cp, xa, xb, ks, out] = process.argv;
const src = PNG.sync.read(fs.readFileSync(rp));
const cont = JSON.parse(fs.readFileSync(cp));
const X0 = +xa, X1 = +xb, K = +ks, HALF = 9;
const w = (X1 - X0) * K, h = (HALF * 2 + 1) * K, gap = 10;
const dst = new PNG({ width: w, height: cont.length * (h + gap) });
dst.data.fill(255);
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= dst.height) return; const i = (y * w + x) * 4; dst.data[i] = c[0]; dst.data[i + 1] = c[1]; dst.data[i + 2] = c[2]; dst.data[i + 3] = 255; };
cont.forEach((L, li) => {
  const yLine = L.segmentos[0].de[1], y0 = Math.round(yLine) - HALF, oy = li * (h + gap);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = X0 + Math.floor(x / K), sy = y0 + Math.floor(y / K), si = (sy * src.width + sx) * 4;
    put(x, oy + y, [src.data[si], src.data[si + 1], src.data[si + 2]]);
  }
  for (const s of L.segmentos) s.pontos.forEach((p, i) => {
    const cx = Math.round((p[0] - X0) * K), cy = oy + Math.round((p[1] - y0 + 0.5) * K);
    const c = i === 0 || i === s.pontos.length - 1 ? [0, 170, 0] : (i % 5 === 4 ? [0, 90, 255] : [255, 0, 0]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(cx + dx, cy + dy, c);
  });
});
fs.writeFileSync(out, PNG.sync.write(dst));
