// Conta vagas no raster nativo da planta por dois métodos independentes:
//  A) batentes: perfil de intensidade dos anéis cinza ao longo da linha dos batentes, com corte de picos
//     de ponta fracos (< 0,6 x mediana do segmento) ou fora do passo (desvio > 0,8 px).
//  B) listras: extensão das listras diagonais numa linha paralela deslocada para dentro da faixa de vagas
//     (pixels diferentes do método A), convertida em vagas por (vão / passo) + 1.
// Uso: node scripts/count-stalls.mjs <raster.png> <linhas.json> <saida.json>
// linhas.json: [{ "id", "a": [x,y], "b": [x,y], "faixa": deslocamento perpendicular (px, sinal = lado) }]
import fs from "node:fs";
import { PNG } from "pngjs";
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const lines = JSON.parse(fs.readFileSync(process.argv[3]));
const { width: W, height: H, data } = png;
const px = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return [255, 255, 255]; const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const grayIn = (x, y, lo, hi) => { const [r, g, b] = px(x, y), v = (r + g + b) / 3; return Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && v >= lo && v <= hi ? (hi - v) / (hi - lo) + 0.2 : 0; };
const STEP = 0.5;
const peaksOf = (sig, thr, minSep) => {
  const peaks = [];
  for (let i = 1; i < sig.length - 1; i++) if (sig[i] >= thr && sig[i] >= sig[i - 1] && sig[i] > sig[i + 1]) {
    if (peaks.length && i - peaks.at(-1) < minSep) { if (sig[i] > sig[peaks.at(-1)]) peaks[peaks.length - 1] = i; } else peaks.push(i);
  }
  return peaks;
};
const profile = (L, off, lo, hi, half) => {
  const [ax, ay] = L.a, [bx, by] = L.b, len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
  const raw = [];
  for (let t = 0; t <= len; t += STEP) { let s = 0; for (let o = -half; o <= half; o += 0.5) s += grayIn(ax + ux * t + nx * (off + o), ay + uy * t + ny * (off + o), lo, hi); raw.push(s); }
  const sm = raw.map((_, i) => { let s = 0, n = 0; for (let k = -2; k <= 2; k++) if (raw[i + k] !== undefined) { s += raw[i + k]; n++; } return s / n; });
  return { sm, at: (k) => [ax + ux * k * STEP + nx * off, ay + uy * k * STEP + ny * off] };
};
const split = (pk, maxGap) => { const segs = []; let cur = []; for (const k of pk) { if (cur.length && k - cur.at(-1) > maxGap) { segs.push(cur); cur = []; } cur.push(k); } if (cur.length) segs.push(cur); return segs; };
const result = [];
for (const L of lines) {
  // A) batentes
  const A = profile(L, 0, 95, 175, 2);
  let pk = peaksOf(A.sm, Math.max(...A.sm) * 0.3, 10);
  // rejeita picos que são linhas retas (bordas de ilha, postes): a linha continua além de ±4 px na perpendicular
  {
    const [ax, ay] = L.a, [bx, by] = L.b, len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
    const linear = (k) => {
      let hit = 0, tot = 0;
      for (const o of [4, 5, 6, 7, -4, -5, -6, -7]) {
        let best = 0;
        for (const d of [-0.5, 0, 0.5]) { const t = k * STEP + d; best = Math.max(best, grayIn(ax + ux * t + nx * o, ay + uy * t + ny * o, 60, 160) > 0 ? 1 : 0); }
        hit += best; tot++;
      }
      return hit / tot >= 0.5;
    };
    globalThis.__linear = linear;
  }
  const gapsA = pk.slice(1).map((k, i) => (k - pk[i]) * STEP);
  const pitch = [...gapsA].sort((a, b) => a - b)[gapsA.length >> 1];
  let segs = split(pk, pitch * 1.6 / STEP).filter((s) => s.length >= 4);
  segs = segs.map((s) => {
    const med = [...s.map((k) => A.sm[k])].sort((a, b) => a - b)[s.length >> 1];
    const bad = (k, nb) => A.sm[k] < med * 0.6 || Math.abs(Math.abs(k - nb) * STEP - pitch) > 0.8;
    while (s.length > 4 && globalThis.__linear(s[0])) s = s.slice(1);
    while (s.length > 4 && globalThis.__linear(s.at(-1))) s = s.slice(0, -1);
    if (process.env.TRIM !== "0") while (s.length > 4 && bad(s[0], s[1])) s = s.slice(1);
    if (process.env.TRIM !== "0") while (s.length > 4 && bad(s.at(-1), s.at(-2))) s = s.slice(0, -1);
    return s;
  });
  // B) listras diagonais na borda interna da faixa de vagas
  const B = profile(L, L.faixa, 150, 228, 1);
  const pkB = peaksOf(B.sm, Math.max(...B.sm) * 0.25, 6);
  const segsB = split(pkB, pitch * 1.6 / STEP).filter((s) => s.length >= 4);
  const segOut = segs.map((s) => {
    const de = A.at(s[0]), ate = A.at(s.at(-1));
    // segmento B que mais se sobrepõe em x
    const ov = segsB.map((b) => { const bx0 = B.at(b[0])[0], bx1 = B.at(b.at(-1))[0]; return { b, o: Math.min(ate[0], bx1) - Math.max(de[0], bx0), bx0, bx1 }; }).sort((p, q) => q.o - p.o)[0];
    const nB = ov && ov.o > 0 ? Math.round(Math.hypot(ov.bx1 - ov.bx0, 0) / pitch) + 1 : null;
    return { n: s.length, listras: nB, de: de.map((v) => +v.toFixed(1)), ate: ate.map((v) => +v.toFixed(1)), pontos: s.map((k) => A.at(k).map((v) => +v.toFixed(1))) };
  });
  const total = segOut.reduce((a, s) => a + s.n, 0);
  result.push({ id: L.id, passo: pitch, total, segmentos: segOut });
  console.log(L.id.padEnd(8), "passo", pitch.toFixed(2), "total", String(total).padStart(4), "|", segOut.map((s) => `${s.n}${s.listras !== s.n ? "/" + s.listras : ""}[${s.de[0]}..${s.ate[0]}]`).join(" "));
}
fs.writeFileSync(process.argv[4], JSON.stringify(result, null, 1));
