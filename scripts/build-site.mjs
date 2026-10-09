// Gera a geometria oficial do recinto (lib/site/planta.json) a partir da digitalização da pág. 6 do PDF.
// Coordenadas de entrada em pixels do raster nativo (1006x612). Saída em metros:
// X para a direita do desenho, Z para baixo do desenho, origem no centro do raster.
// Escala: 1 px = 0,78 m (vaga em espinha de 24 px x 4,95 px = 18,7 m x 3,9 m, padrão de carreta).
import fs from "node:fs";
import { PNG } from "pngjs";

const RASTER = "docs/referencias/raster/p6-Image89-1006x612.png";
const png = PNG.sync.read(fs.readFileSync(RASTER));
const { width: W, height: H, data } = png;
const M = 0.78;
const CX = W / 2, CY = H / 2;
const toM = ([x, y]) => [+((x - CX) * M).toFixed(2), +((y - CY) * M).toFixed(2)];
const lum = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return 255; const i = (y * W + x) * 4; return (data[i] + data[i + 1] + data[i + 2]) / 3; };
const stripe = (x, y) => { const v = lum(x, y); return v >= 130 && v <= 222 ? 1 : 0; };

const inf = JSON.parse(fs.readFileSync("data-src/contagem-bruta.json"));
const out = JSON.parse(fs.readFileSync("data-src/contagem-outras.json"));
const camsP6 = JSON.parse(fs.readFileSync("data-src/cameras-p06.json"));

// ---------------------------------------------------------------- vagas em espinha de peixe
// lado: +1 = faixa de vagas em y (ou x) crescente. corredor: coordenada do corredor de acesso (px).
const LINHAS = {
  F1: { setor: "EST", fila: "A", lado: +1, eixo: "h", corredor: 375 },
  "F2-n": { setor: "EST", fila: "B", lado: -1, eixo: "h", corredor: 375 },
  "F2-s": { setor: "EST", fila: "C", lado: +1, eixo: "h", corredor: 439 },
  "F3-n": { setor: "EST", fila: "D", lado: -1, eixo: "h", corredor: 439 },
  "F3-s": { setor: "EST", fila: "E", lado: +1, eixo: "h", corredor: 501 },
  "F4-n": { setor: "EST", fila: "F", lado: -1, eixo: "h", corredor: 501 },
  "F4-s": { setor: "EST", fila: "G", lado: +1, eixo: "h", corredor: 566 },
  F5: { setor: "EST", fila: "H", lado: -1, eixo: "h", corredor: 566 },
  G1: { setor: "EST", fila: "I", lado: +1, eixo: "h", corredor: 268.5 },
  G2: { setor: "EST", fila: "J", lado: -1, eixo: "h", corredor: 268.5 },
  "A1-o": { setor: "PUL", fila: "A", lado: -1, eixo: "v", corredor: 51 },
  "A1-l": { setor: "PUL", fila: "B", lado: +1, eixo: "v", corredor: 120.5 },
  "A2-o": { setor: "PUL", fila: "C", lado: -1, eixo: "v", corredor: 120.5 },
  "A2-l": { setor: "PUL", fila: "D", lado: +1, eixo: "v", corredor: 186 },
  A3: { setor: "PUL", fila: "E", lado: -1, eixo: "v", corredor: 186 },
};
const extent = (x, y, dx, dy) => { let last = 0; for (let t = 2; t <= 40; t += 0.5) { let hit = 0; for (const o of [-2.8, -2.4, -2, 2, 2.4, 2.8]) hit = Math.max(hit, stripe(x + dx * t - dy * o, y + dy * t + dx * o)); if (hit) last = t; else if (t - last > 3) break; } return last; };

// Falsos positivos confirmados na sobreposição: pontas que avançam sobre a ilha além do poste do eixo
// (F2-s em x=728 e F4-s em x=730; o lado oposto termina em x=720).
const DESCARTES = [["F2-s", 728], ["F4-s", 730]];
for (const [id, x] of DESCARTES) for (const seg of inf.find((l) => l.id === id).segmentos) seg.pontos = seg.pontos.filter((p) => Math.abs(p[0] - x) > 1);

const vagas = [];
const linhas = [];
const largEsp = 7 * Math.SQRT1_2; // 4,95 px
for (const L of [...inf, ...out]) {
  const cfg = LINHAS[L.id]; if (!cfg) continue;
  const pts = L.segmentos.flatMap((s) => s.pontos);
  const s = Math.SQRT1_2;
  const cand = cfg.eixo === "h" ? [[-s, cfg.lado * s], [s, cfg.lado * s]] : [[cfg.lado * s, -s], [cfg.lado * s, s]];
  const votos = cand.map(([dx, dy]) => pts.reduce((a, [x, y]) => { let c = 0; for (let t = 4; t <= 12; t++) for (const o of [-0.7, 0, 0.7]) c += stripe(x + dx * t - dy * o, y + dy * t + dx * o); return a + c; }, 0));
  // o interior da vaga é branco entre as duas bordas: o eixo é a direção que cruza MENOS listras
  const [dx, dy] = cand[votos[0] <= votos[1] ? 0 : 1];
  const exts = pts.map(([x, y]) => extent(x, y, dx, dy)).sort((a, b) => a - b);
  const comp = exts[exts.length >> 1];
  linhas.push({ id: L.id, setor: cfg.setor, fila: cfg.fila, eixo: [dx, dy], comprimentoM: +((comp + 3) * M).toFixed(2), vagas: pts.length });
  const ord = [...pts].sort((a, b) => (cfg.eixo === "h" ? a[0] - b[0] : a[1] - b[1]));
  ord.forEach(([gx, gy], i) => {
    const t0 = -3, t1 = comp; // retângulo da vaga ao longo do eixo, a partir do batente
    const c = [gx + dx * (t0 + t1) / 2, gy + dy * (t0 + t1) / 2];
    const boca = [gx + dx * t1, gy + dy * t1]; // extremidade voltada para o corredor
    // ponto do corredor de onde o caminhão inicia a entrada (recuado ao longo do eixo da vaga)
    const k = cfg.eixo === "h" ? (cfg.corredor - boca[1]) / dy : (cfg.corredor - boca[0]) / dx;
    const acesso = [boca[0] + dx * k, boca[1] + dy * k];
    vagas.push({
      id: `${cfg.setor}-${cfg.fila}${String(i + 1).padStart(2, "0")}`, setor: cfg.setor, fila: cfg.fila, numero: i + 1, tipo: "espinha",
      centro: toM(c), eixo: [dx, dy], comprimento: +((t1 - t0) * M).toFixed(2), largura: +(largEsp * M).toFixed(2),
      batente: toM([gx, gy]), boca: toM(boca), acesso: toM(acesso), corredor: { eixo: cfg.eixo, valor: cfg.corredor },
    });
  });
}

// colunas de vagas longitudinais do Pulmão (junto ao Apoio Motoristas e às pistas 5 e 6 dos Gates), medidas no raster
const colunas = [
  { x: 227.5, tops: [78, 104, 131, 157, 184, 210, 237], len: 24, corredor: 241 },
  { x: 233.5, tops: [78, 104, 131, 157, 184, 210, 237], len: 24, corredor: 241 },
  { x: 348, tops: [164, 190, 217, 243, 270], len: 23, corredor: 362 },
  { x: 354, tops: [164, 190, 217, 243, 270], len: 23, corredor: 362 },
];
let filaLetra = "F".charCodeAt(0);
for (const col of colunas) {
  const fila = String.fromCharCode(filaLetra++);
  col.tops.forEach((t, i) => {
    vagas.push({
      id: `PUL-${fila}${String(i + 1).padStart(2, "0")}`, setor: "PUL", fila, numero: i + 1, tipo: "longitudinal",
      centro: toM([col.x, t + col.len / 2]), eixo: [0, 1], comprimento: +(col.len * M).toFixed(2), largura: +(4.6 * M).toFixed(2),
      batente: toM([col.x, t]), boca: toM([col.x, t + col.len]), acesso: toM([col.corredor, t + col.len + 2]), corredor: { eixo: "v", valor: col.corredor }, saidaPeloTopo: toM([col.x, col.tops[0] - 8]),
    });
  });
}

// Cargas Perigosas: 24 + 24 vagas perpendiculares (bordas medidas em y=238 e y=295, passo 6,6 px)
for (const [fila, y0, y1, sentido] of [["A", 229, 253, -1], ["B", 282, 306, 1]]) {
  for (let i = 0; i < 24; i++) {
    const x = 576.5 + i * 6.6;
    const batente = sentido < 0 ? y0 + 1 : y1 - 1, boca = sentido < 0 ? y1 : y0;
    vagas.push({
      id: `CPG-${fila}${String(i + 1).padStart(2, "0")}`, setor: "CPG", fila, numero: i + 1, tipo: "perpendicular",
      centro: toM([x, (y0 + y1) / 2]), eixo: [0, -sentido], comprimento: +((y1 - y0) * M).toFixed(2), largura: +(5.4 * M).toFixed(2),
      batente: toM([x, batente]), boca: toM([x, boca]), acesso: toM([x, 268]), corredor: { eixo: "h", valor: 268 },
    });
  }
}

// Docas do Armazém: 16 portas (pág. 10). 6 no lado norte e 6 no lado sul visíveis na pág. 6,
// mais 4 no lado sul posicionadas pela proporção da pág. 10.
const docasNorte = [662, 670, 690, 698, 717, 724];
const docasSul = [603.5, 611, 625.5, 633, 662, 670, 690, 698, 717, 724];
docasNorte.forEach((x, i) => vagas.push({
  id: `DOC-N${String(i + 1).padStart(2, "0")}`, setor: "DOC", fila: "N", numero: i + 1, tipo: "doca",
  centro: toM([x, 93.5]), eixo: [0, -1], comprimento: +(21 * M).toFixed(2), largura: +(4 * M).toFixed(2),
  batente: toM([x, 104]), boca: toM([x, 83]), acesso: toM([x, 72]), corredor: { eixo: "h", valor: 72 },
}));
docasSul.forEach((x, i) => vagas.push({
  id: `DOC-S${String(i + 1).padStart(2, "0")}`, setor: "DOC", fila: "S", numero: i + 1, tipo: "doca",
  centro: toM([x, 183.5]), eixo: [0, 1], comprimento: +(21 * M).toFixed(2), largura: +(4 * M).toFixed(2),
  batente: toM([x, 173.4]), boca: toM([x, 194]), acesso: toM([x, 208]), corredor: { eixo: "h", valor: 208 },
}));

// ---------------------------------------------------------------- canteiros centrais dos blocos de vagas
// Pares de fileiras compartilham o eixo (meio entre as linhas de batentes); fileiras simples têm o eixo do lado
// oposto às vagas, na linha dos postes. Extremidades ganham ilhas arredondadas.
const canteiros = [];
{
  const linhasTodas = [...inf, ...out];
  const pegar = (id) => linhasTodas.find((l) => l.id === id);
  const eixoH = (l) => l.segmentos[0]?.pontos[0][1];
  const eixoV = (l) => l.segmentos[0]?.pontos[0][0];
  const pares = [["F2-n", "F2-s", "h"], ["F3-n", "F3-s", "h"], ["F4-n", "F4-s", "h"], ["A1-o", "A1-l", "v"], ["A2-o", "A2-l", "v"]];
  const simples = [["F1", "h", -5], ["F5", "h", 4.5], ["G1", "h", -5], ["G2", "h", 4.5], ["A3", "v", 6]];
  const segsDe = (l, eixo) => l.segmentos.map((s) => { const xs = s.pontos.map((p) => (eixo === "h" ? p[0] : p[1])); return [Math.min(...xs), Math.max(...xs)]; });
  for (const [a, b, eixo] of pares) {
    const A = pegar(a), B = pegar(b);
    const c = eixo === "h" ? (eixoH(A) + eixoH(B)) / 2 : (eixoV(A) + eixoV(B)) / 2;
    const largura = Math.abs(eixo === "h" ? eixoH(B) - eixoH(A) : eixoV(B) - eixoV(A)) - 4;
    const sa = segsDe(A, eixo), sb = segsDe(B, eixo);
    for (const [i0, i1] of sa) {
      const o = sb.find(([j0, j1]) => j1 > i0 - 10 && j0 < i1 + 10) ?? [i0, i1];
      const ini = Math.min(i0, o[0]) - 4, fim = Math.max(i1, o[1]) + 4;
      const p0 = eixo === "h" ? [ini, c] : [c, ini], p1 = eixo === "h" ? [fim, c] : [c, fim];
      canteiros.push({ a: toM(p0), b: toM(p1), largura: +(largura * M).toFixed(2) });
    }
  }
  for (const [id, eixo, off] of simples) {
    const L = pegar(id);
    const c = (eixo === "h" ? eixoH(L) : eixoV(L)) + off;
    for (const [i0, i1] of segsDe(L, eixo)) {
      const p0 = eixo === "h" ? [i0 - 4, c] : [c, i0 - 4], p1 = eixo === "h" ? [i1 + 4, c] : [c, i1 + 4];
      canteiros.push({ a: toM(p0), b: toM(p1), largura: +(3 * M).toFixed(2) });
    }
  }
}

// ---------------------------------------------------------------- prédios e áreas (px)
const poly = (pts) => pts.map(toM);
const predios = [
  { id: "armazem", nome: "Armazém de Conferência", tipo: "armazem", altura: 13, paginas: [10],
    contorno: poly([[533, 102.4], [568.6, 102.4], [568.6, 115.4], [660.6, 115.4], [660.6, 104], [728, 104], [728, 115.4], [746.6, 115.4], [746.6, 173.4], [661.4, 173.4], [661.4, 195.4], [533, 195.4]]) },
  { id: "administracao", nome: "Administração e Apoio", tipo: "administracao", altura: 12, paginas: [7, 8, 9],
    contorno: poly([[453.75, 121.25], [497, 128.75], [497.5, 162], [488.75, 225.5], [431.25, 217.5], [442.5, 152.5], [448, 150]]) },
  { id: "gates", nome: "Gates e Balanças", tipo: "cobertura", altura: 8, paginas: [11],
    contorno: poly([[298, 98], [361, 98], [361, 147.5], [298, 147.5]]) },
  { id: "scanner", nome: "Scanner", tipo: "scanner", altura: 7, paginas: [12],
    contorno: poly([[312.5, 196], [321.5, 196], [321.5, 286], [312.5, 286]]) },
  { id: "apoio-motoristas", nome: "Apoio Motoristas", tipo: "apoio", altura: 6, paginas: [13], confianca: "media",
    contorno: poly([[247.5, 164.5], [276.75, 164.5], [276.75, 276.25], [247.5, 276.25]]) },
  { id: "apoio-motoristas-sala", nome: "Apoio Motoristas · sala", tipo: "apoio", altura: 5, paginas: [13], confianca: "media",
    contorno: poly([[253.75, 140], [276.75, 140], [276.75, 157.5], [253.75, 157.5]]) },
  { id: "edificio-norte", nome: "Edifício a identificar", tipo: "apoio", altura: 6, confianca: "baixa",
    contorno: poly([[247.5, 73.75], [286, 73.75], [286, 105], [247.5, 105]]) },
  { id: "subestacao", nome: "Subestação", tipo: "tecnico", altura: 4, paginas: [15], confianca: "media",
    contorno: poly([[373.75, 295], [400, 295], [400, 307.5], [373.75, 307.5]]) },
  { id: "casa-bombas", nome: "Casa de Bombas", tipo: "tecnico", altura: 4, paginas: [15],
    contorno: poly([[440, 296], [467.5, 296], [467.5, 310], [440, 310]]) },
];
const reservatorio = { id: "reservatorio", nome: "Reservatório", centro: toM([413.75, 302.5]), raio: +(7.5 * M).toFixed(2), altura: 12, paginas: [15] };
const coberturasLeves = [poly([[402.5, 252.5], [490, 252.5], [490, 260], [402.5, 260]]), poly([[382.5, 267.5], [490, 267.5], [490, 275], [382.5, 275]])];
const scannerPlataforma = poly([[300, 192], [334, 192], [342, 205], [342, 275], [334, 288], [300, 288], [296, 275], [296, 205]]);

// Cargas Perigosas (contorno), Pátio Container (blocos da grade do PDF)
const areaCPG = poly([[566, 222], [742, 222], [749, 232], [749, 300], [742, 309], [566, 309], [556, 300], [556, 232]]);
const blocosContainer = [];
for (const [y0, y1] of [[67, 75.5], [98, 115.5], [138, 155], [178, 194], [217.5, 226]]) for (const [x0, x1] of [[767.5, 846], [849.5, 928.75]]) blocosContainer.push(poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]));
const canteirosContainer = [[805, 87], [887.5, 87], [805, 126.75], [887.5, 126.75], [805, 166.5], [887.5, 166.5], [805, 206], [887.5, 206]].map(toM);

// estacionamento de veículos leves ao redor da Administração (px)
const vagasLeves = [];
const fileiraLeve = (x0, x1, y) => { for (let x = x0; x <= x1; x += 3.3) vagasLeves.push({ centro: toM([x, y]), giro: 0 }); };
for (const y of [57, 63, 79, 85]) { fileiraLeve(393, 438, y); fileiraLeve(453, 513, y); }
const colunaLeve = (y0, y1, x) => { for (let y = y0; y <= y1; y += 3.3) vagasLeves.push({ centro: toM([x, y]), giro: 1 }); };
colunaLeve(116, 225, 397); colunaLeve(116, 225, 404); colunaLeve(116, 233, 418);

// cerca do recinto (px), pela linha das câmeras de perímetro
const cerca = poly([[37, 22], [525, 22], [525, 61], [993, 61], [905, 597], [165, 597], [37, 490]]);

// postes de iluminação: blobs pretos redondos no raster, longe dos símbolos de câmera
const postes = [];
{
  const dark = (x, y) => lum(x, y) < 70;
  const seen = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (seen[i] || !dark(x, y)) continue;
    const st = [i], px = []; seen[i] = 1;
    while (st.length) { const p = st.pop(); px.push(p); const a = p % W, b = (p / W) | 0; for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = a + u, ny = b + v; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (!seen[k] && dark(nx, ny)) { seen[k] = 1; st.push(k); } } }
    let mnx = 1e9, mxx = 0, mny = 1e9, mxy = 0; for (const p of px) { const a = p % W, b = (p / W) | 0; mnx = Math.min(mnx, a); mxx = Math.max(mxx, a); mny = Math.min(mny, b); mxy = Math.max(mxy, b); }
    const bw = mxx - mnx + 1, bh = mxy - mny + 1;
    if (bw >= 3 && bw <= 6 && bh >= 3 && bh <= 6 && px.length >= 6 && px.length <= 26) {
      const c = [(mnx + mxx) / 2, (mny + mxy) / 2];
      if (camsP6.every((k) => Math.hypot(k.x - c[0], k.y - c[1]) > 7)) postes.push(toM(c));
    }
  }
}

// ---------------------------------------------------------------- grafo de vias (px). Arestas com sentido.
const nos = {};
const no = (id, x, y) => (nos[id] = toM([x, y]));
const arestas = [];
const via = (ids, mao = "dupla") => { for (let i = 0; i < ids.length - 1; i++) { arestas.push([ids[i], ids[i + 1]]); if (mao === "dupla") arestas.push([ids[i + 1], ids[i]]); } };
// rodovia ao norte e acessos
// rodovia ao norte, fora da cerca (y=22): eixo em y=-27 px (cerca de 38 m da cerca), pistas não invadem o pátio
no("rod-o", -80, -27); no("rod-gate", 318, -27); no("rod-saida", 352, -27); no("rod-l", 1090, -27);
via(["rod-o", "rod-gate", "rod-saida", "rod-l"]);
// pistas dos Gates (pág. 11): 1 a 3 entrada, 4 reversível, 5 e 6 saída
const pistas = [302.5, 313.75, 324.5, 335, 345.5, 355.75];
pistas.forEach((x, i) => { no(`gate${i + 1}-n`, x, 26); no(`gate${i + 1}-bal`, x, 122); no(`gate${i + 1}-s`, x, 162); });
for (const i of [1, 2, 3, 4]) { arestas.push(["rod-gate", `gate${i}-n`]); via([`gate${i}-n`, `gate${i}-bal`, `gate${i}-s`], "unica"); }
for (const i of [4, 5, 6]) { via([`gate${i}-s`, `gate${i}-bal`, `gate${i}-n`], "unica"); arestas.push([`gate${i}-n`, "rod-saida"]); }
// entrada: gate -> scanner -> via principal
no("scan-n", 317, 190); no("scan-s", 317, 292);
for (const i of [1, 2, 3, 4]) arestas.push([`gate${i}-s`, "scan-n"]);
// via principal leste-oeste (y=318)
no("w318", 50, 318); no("n325", 325, 318); no("n362", 362, 318); no("n540", 540, 318); no("n768", 768, 318);
const xLeste = (y) => 905 + (597 - y) * 0.1645 - 15;
for (const y of [75, 200, 268, 318, 375, 439, 501, 566]) no(`e${y}`, xLeste(y), y);
via(["scan-n", "scan-s", "n325"], "unica");
via(["w318", "n325", "n362", "n540", "n768", "e318"]);
// saída: via principal -> fila das pistas 5 e 6 -> gate -> rodovia
no("saida-s", 362, 300); no("saida-n", 362, 168);
via(["n362", "saida-s"]); via(["saida-s", "saida-n"], "unica");
for (const i of [4, 5, 6]) arestas.push(["saida-n", `gate${i}-s`]);
// perimetrais
no("w375", 50, 375); no("w439", 50, 439); no("w490", 50, 490); no("w501", 65, 501); no("sw566", 150, 566);
via(["w318", "w375", "w439", "w490", "w501", "sw566"]);
via(["e566", "e501", "e439", "e375", "e318", "e268", "e200", "e75"]);
// corredores do Estacionamento: mão única para leste
for (const y of [375, 439, 501, 566]) {
  const ids = [y === 501 ? "w501" : y === 566 ? "sw566" : `w${y}`];
  for (const x of [325, 540, 768]) { no(`c${x}-${y}`, x, y); ids.push(`c${x}-${y}`); }
  ids.push(`e${y}`);
  via(ids, "unica");
}
// transversais norte-sul (mão dupla)
for (const x of [325, 540, 768]) via([`n${x}`, `c${x}-375`, `c${x}-439`, `c${x}-501`, `c${x}-566`]);
// área norte: Cargas Perigosas, faixa G, Armazém
no("n522-318", 522, 318); no("n540-268", 522, 268); no("n540-208", 522, 208); no("n528-72", 522, 72);
via(["n540", "n522-318", "n540-268", "n540-208", "n528-72"]);
via(["n362", "n522-318"]);
no("cpg-o", 556, 268); no("cpg-l", 749, 268); no("g-o", 757, 268);
via(["n540-268", "cpg-o", "cpg-l", "g-o"]); via(["n768", "g-o"]);
via(["e268", "g-o"], "unica"); // corredor da faixa G: mão única para oeste
no("doc-s-o", 595, 208); no("doc-s-l", 752, 208);
via(["n540-208", "doc-s-o", "doc-s-l", "e200"]);
no("doc-n-o", 595, 72); no("doc-n-l", 752, 72);
via(["n528-72", "doc-n-o", "doc-n-l"]); // termina antes do Pátio Container
// Pulmão: contorno e corredores verticais (oeste para o sul, internos para o norte)
no("p-nw", 51, 45); no("p-n120", 120.5, 45); no("p-n186", 186, 45); no("p-ne", 241, 45);
no("p-sw", 51, 282); no("p-s120", 120.5, 282); no("p-s186", 186, 282); no("p-se", 241, 282); no("p-e305", 241, 305);
via(["p-nw", "p-n120", "p-n186", "p-ne"]); via(["p-sw", "p-s120", "p-s186", "p-se"]);
via(["p-nw", "p-sw"], "unica"); via(["p-s120", "p-n120"], "unica"); via(["p-s186", "p-n186"], "unica");
via(["p-ne", "p-se", "p-e305"]); via(["p-e305", "w318"]); via(["p-e305", "n325"]);
via(["p-sw", "w318"]);

const planta = {
  meta: {
    fonte: "Implantação Nova Foz CFTV Ver. 03, pág. 6 (raster nativo 1006x612) e págs. 10 a 15",
    metrosPorPx: M, origemPx: [CX, CY], dimensoes: [+(W * M).toFixed(1), +(H * M).toFixed(1)],
    orientacao: "rodovia e Gates ao norte do desenho (-Z)",
  },
  setores: [
    { id: "EST", nome: "Pátio Estacionamento" }, { id: "PUL", nome: "Pátio Pulmão" },
    { id: "CPG", nome: "Cargas Perigosas" }, { id: "DOC", nome: "Docas do Armazém" }, { id: "CTN", nome: "Pátio Container" },
  ],
  linhas, vagas, canteiros, predios, reservatorio, coberturasLeves, scannerPlataforma, areaCPG, blocosContainer, canteirosContainer, vagasLeves, cerca, postes,
  pistasGate: pistas.map((x, i) => ({ id: `gate${i + 1}`, numero: i + 1, sentido: i < 3 ? "entrada" : i === 3 ? "reversivel" : "saida", x: toM([x, 0])[0], zNorte: toM([0, 26])[1], zBalanca: toM([0, 122])[1], zSul: toM([0, 162])[1] })),
  vias: { nos, arestas },
  camerasExternas: camsP6.map((c) => ({ numero: c.n, cor: c.cor, posicao: toM([c.x, c.y]), eixoGraus: c.eixo })),
};
fs.mkdirSync("lib/site", { recursive: true });
fs.writeFileSync("lib/site/planta.json", JSON.stringify(planta));
const por = {}; for (const v of vagas) por[v.setor] = (por[v.setor] || 0) + 1;
console.log("vagas por setor", por, "total", vagas.length);
console.log("postes", postes.length, "vagas leves", vagasLeves.length, "nós", Object.keys(nos).length, "arestas", arestas.length);
console.log("dimensões (m)", planta.meta.dimensoes);
