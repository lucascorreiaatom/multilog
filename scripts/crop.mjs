// Recorta e amplia (vizinho mais próximo) uma região de um PNG, com grade opcional a cada N px de origem.
// Uso: node scripts/crop.mjs <in.png> <x> <y> <w> <h> <escala> <out.png> [grade]
import fs from "node:fs";
import { PNG } from "pngjs";
const [, , inp, x0, y0, w, h, k, out, grid] = process.argv;
const src = PNG.sync.read(fs.readFileSync(inp));
const X = +x0, Y = +y0, Wd = +w, Ht = +h, K = +k, G = grid ? +grid : 0;
const dst = new PNG({ width: Wd * K, height: Ht * K });
for (let y = 0; y < Ht * K; y++) for (let x = 0; x < Wd * K; x++) {
  const sx = X + Math.floor(x / K), sy = Y + Math.floor(y / K);
  const si = (sy * src.width + sx) * 4, di = (y * Wd * K + x) * 4;
  let r = src.data[si], g = src.data[si + 1], b = src.data[si + 2];
  if (G && ((x % (G * K) === 0) || (y % (G * K) === 0))) { r = 255; g = 0; b = 255; }
  if (G && (((sx % (G * 5)) === 0 && x % K === 0) || ((sy % (G * 5)) === 0 && y % K === 0))) { r = 0; g = 160; b = 255; }
  dst.data[di] = r; dst.data[di + 1] = g; dst.data[di + 2] = b; dst.data[di + 3] = 255;
}
fs.writeFileSync(out, PNG.sync.write(dst));
