// Sobrepõe lib/site/planta.json ao raster da pág. 6 (validação de fidelidade).
import fs from "node:fs";
const P = JSON.parse(fs.readFileSync("lib/site/planta.json"));
const M = P.meta.metrosPorPx, [CX, CY] = P.meta.origemPx;
const px = ([x, z]) => [x / M + CX, z / M + CY];
const it = [];
const COR = { EST: "#2f80ed55", PUL: "#9b51e055", CPG: "#eb575755", DOC: "#27ae6055" };
for (const v of P.vagas) {
  const [cx, cy] = px(v.centro), [ux, uy] = v.eixo, L = v.comprimento / M / 2, w = v.largura / M / 2;
  const q = (t, o) => [cx + ux * t - uy * o, cy + uy * t + ux * o];
  it.push({ t: "line", pts: [q(-L, -w), q(L, -w), q(L, w), q(-L, w)], close: true, c: "#00000040", w: 0.6, fill: COR[v.setor] });
}
for (const b of P.predios) it.push({ t: "line", pts: b.contorno.map(px), close: true, c: "#ff6a00", w: 2.5, fill: "#ff6a0022" });
it.push({ t: "line", pts: P.cerca.map(px), close: true, c: "#00a000", w: 2.5 });
for (const p of P.postes) it.push({ t: "pt", x: px(p)[0], y: px(p)[1], c: "#ffcc00", r: 2.5 });
for (const [a, b] of P.vias.arestas) { const A = px(P.vias.nos[a]), B = px(P.vias.nos[b]); it.push({ t: "line", pts: [A, B], c: "#e000e0aa", w: 1.6 }); }
for (const [k, n] of Object.entries(P.vias.nos)) it.push({ t: "pt", x: px(n)[0], y: px(n)[1], c: "#e000e0", r: 3 });
for (const b of P.blocosContainer) it.push({ t: "line", pts: b.map(px), close: true, c: "#f2994a", w: 1.5, fill: "#f2994a33" });
fs.writeFileSync(process.argv[2], JSON.stringify(it));
