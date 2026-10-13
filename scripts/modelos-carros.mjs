// Gera public/modelos/carros.glb a partir dos carros do KayKit City Builder Bits (CC0, Kay Lousberg).
//
// O que faz com cada carro:
// - aplica as transformações dos nós e junta carroceria + rodas;
// - troca as rodas (144 triângulos cada) por cilindros de 10 lados com as cores do pneu e do aro (40 tri);
// - troca a textura atlas por cores de vértice (sem textura, sem UV): 0 amostragens de textura por pixel;
// - separa em duas malhas, no mesmo contrato de geometrias/caminhao.ts:
//     <variante>_corpo  → pintura da carroceria em cinza (fator de sombreamento do gradiente), tingida pela cor da instância
//     <variante>_neutro → pneus, frisos, vidros, faróis e lanternas com as cores originais;
// - referencial do projeto: X para a frente, Y para cima, origem no centro com as rodas em y = 0, escala em metros.
//
// Uso (fora do projeto, para não sujar o package.json):
//   npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions pngjs
//   node modelos-carros.mjs <pasta com os .gltf/.bin/citybits_texture.png do KayKit> <saida.glb>
// Fonte: github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (addons/kaykit_city_builder_bits/Assets/gltf)
import { readFileSync } from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { quantize, weld } from "@gltf-transform/functions";
import { PNG } from "pngjs";

const [, , dir, saida] = process.argv;
if (!dir || !saida) { console.error("uso: node modelos-carros.mjs <pasta-kaykit> <saida.glb>"); process.exit(1); }

const VARIANTES = [
  { id: "hatch", arquivo: "car_hatchback" },
  { id: "sedan", arquivo: "car_sedan" },
  { id: "perua", arquivo: "car_stationwagon" },
];
const ESCALA = 4.5; // sedã do KayKit: 0,94 → 4,2 m de comprimento, 1,9 m de largura (vagas leves têm 2,57 m)
const VIDRO = [0x2c, 0x3a, 0x4d]; // mesmo VIDRO de geometrias/caminhao.ts
// células do atlas 8×4 (128 px) que nunca são pintura: pretos, cinzas, brancos (faróis), vidro
const CELULAS_NEUTRAS = new Set(["0,0", "1,0", "2,0", "3,0", "4,0", "0,3", "1,3"]);
const CELULAS_VIDRO = new Set(["0,3", "1,3"]);

const png = PNG.sync.read(readFileSync(`${dir}/citybits_texture.png`));
const amostra = (u, v) => {
  const x = Math.min(png.width - 1, Math.max(0, Math.floor(u * png.width)));
  const y = Math.min(png.height - 1, Math.max(0, Math.floor(v * png.height)));
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
};
const celula = (u, v) => `${Math.floor(u * 8)},${Math.floor(v * 4)}`;
const linear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

const mul = (m, [x, y, z], w = 1) => [
  m[0] * x + m[4] * y + m[8] * z + m[12] * w,
  m[1] * x + m[5] * y + m[9] * z + m[13] * w,
  m[2] * x + m[6] * y + m[10] * z + m[14] * w,
];
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };


/** roda do KayKit (144 tri) → cilindro de SEG lados no eixo X: banda de rodagem com a cor do pneu e faces com a do aro.
 *  Fica quase toda sob a carroceria; vista da altura das câmeras a diferença não aparece. */
const SEG = 10;
function rodaSimples(mesh, m) {
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const soma = {}, p = [], t = [];
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute("POSITION"), T = prim.getAttribute("TEXCOORD_0");
    for (let i = 0; i < P.getCount(); i++) {
      const w = mul(m, P.getElement(i, p));
      min = min.map((c, k) => Math.min(c, w[k])); max = max.map((c, k) => Math.max(c, w[k]));
      T.getElement(i, t);
      const cel = celula(t[0], t[1]), s = amostra(t[0], t[1]);
      const a = (soma[cel] ??= [0, 0, 0, 0]);
      a[0] += linear(s[0]); a[1] += linear(s[1]); a[2] += linear(s[2]); a[3]++;
    }
  }
  const media = (cel, padrao) => (soma[cel] ? soma[cel].slice(0, 3).map((c) => c / soma[cel][3]) : padrao);
  const pneu = media("4,0", [0.02, 0.02, 0.025]), aro = media("2,0", [0.3, 0.32, 0.35]);
  const c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const r = Math.max(max[1] - min[1], max[2] - min[2]) / 2, x0 = min[0], x1 = max[0];
  const ponto = (x, a, rr = r) => [x, c[1] + Math.sin(a) * rr, c[2] + Math.cos(a) * rr];
  const radial = (a) => [0, Math.sin(a), Math.cos(a)];
  const out = [];
  const tri = (vs, cor) => out.push({ vs: vs.map((v) => ({ p: [...v.p], n: [...v.n] })), roda: true, cel: "roda", cor });
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    // banda (normais radiais suaves)
    const A = { p: ponto(x0, a0), n: radial(a0) }, B = { p: ponto(x1, a0), n: radial(a0) };
    const C = { p: ponto(x1, a1), n: radial(a1) }, D = { p: ponto(x0, a1), n: radial(a1) };
    tri([A, C, B], pneu); tri([A, D, C], pneu);
    // faces laterais (aro): leque a partir do centro
    for (const [x, nx] of [[x1, 1], [x0, -1]]) {
      const ctr = { p: [x, c[1], c[2]], n: [nx, 0, 0] };
      const e0 = { p: ponto(x, a0), n: [nx, 0, 0] }, e1 = { p: ponto(x, a1), n: [nx, 0, 0] };
      tri(nx > 0 ? [ctr, e0, e1] : [ctr, e1, e0], aro);
    }
  }
  return out;
}

const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const out = new Document();
const buf = out.createBuffer();
const cena = out.createScene("carros");

for (const variante of VARIANTES) {
  const doc = await io.read(`${dir}/${variante.arquivo}.gltf`);
  // rodas: solda e simplificação só nas malhas das rodas (preserva UV para a amostragem de cor)

  // 1) triângulos em espaço do mundo, com cor amostrada por vértice
  const tris = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const roda = /wheel/.test(node.getName());
    const m = node.getWorldMatrix();
    if (roda) { tris.push(...rodaSimples(mesh, m)); continue; }
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute("POSITION"), N = prim.getAttribute("NORMAL"), T = prim.getAttribute("TEXCOORD_0"), I = prim.getIndices();
      const p = [], n = [], t = [];
      for (let i = 0; i < I.getCount(); i += 3) {
        const vs = [I.getScalar(i), I.getScalar(i + 1), I.getScalar(i + 2)].map((k) => {
          P.getElement(k, p); N.getElement(k, n); T.getElement(k, t);
          return { p: mul(m, p), n: norm(mul(m, n, 0)), uv: [t[0], t[1]] };
        });
        const uc = (vs[0].uv[0] + vs[1].uv[0] + vs[2].uv[0]) / 3, vc = (vs[0].uv[1] + vs[1].uv[1] + vs[2].uv[1]) / 3;
        tris.push({ vs, roda, cel: celula(uc, vc) });
      }
    }
  }
  // 2) pintura = célula de maior área na carroceria fora das neutras
  const areas = {};
  for (const tr of tris) {
    if (tr.roda || CELULAS_NEUTRAS.has(tr.cel)) continue;
    const [a, b, c] = tr.vs.map((v) => v.p);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    areas[tr.cel] = (areas[tr.cel] ?? 0) + Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
  }
  const pintura = Object.entries(areas).sort((x, y) => y[1] - x[1])[0][0];
  const [cx, cy] = pintura.split(",").map(Number);
  const lumTopo = lum(amostra((cx + 0.5) / 8, (cy * 128 + 3) / 1024));

  // 3) referencial: +Z do KayKit (frente) → +X; escala; rodas no chão; centro em XZ
  const giro = (q) => [q[2], q[1], -q[0]]; // rotação de +90° em Y: (x, y, z) → (z, y, -x)
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const tr of tris) for (const v of tr.vs) {
    v.p = giro(v.p).map((c) => c * ESCALA); v.n = giro(v.n);
    min = min.map((c, k) => Math.min(c, v.p[k])); max = max.map((c, k) => Math.max(c, v.p[k]));
  }
  const desloc = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2];

  // 4) duas malhas com POSITION, NORMAL, COLOR_0 (linear)
  const partes = { corpo: { p: [], n: [], c: [] }, neutro: { p: [], n: [], c: [] } };
  for (const tr of tris) {
    const ehCorpo = !tr.roda && tr.cel === pintura;
    const alvo = partes[ehCorpo ? "corpo" : "neutro"];
    for (const v of tr.vs) {
      alvo.p.push(v.p[0] + desloc[0], v.p[1] + desloc[1], v.p[2] + desloc[2]);
      alvo.n.push(...v.n);
      if (tr.cor) { alvo.c.push(...tr.cor); continue; }
      const s = amostra(v.uv[0], v.uv[1]);
      if (ehCorpo) {
        // gradiente da pintura vira fator de sombreamento (1 no topo da célula), atenuado
        const f = Math.min(1, 0.58 + 0.42 * Math.min(1, lum(s) / lumTopo));
        alvo.c.push(f, f, f);
      } else if (CELULAS_VIDRO.has(tr.cel)) {
        // vidro: cor do projeto, mantendo os reflexos diagonais do atlas como variação de brilho
        const f = 0.75 + 0.5 * Math.min(1, lum(s) / 0.25);
        alvo.c.push(...VIDRO.map((c) => Math.min(1, linear(c) * f)));
      } else {
        alvo.c.push(...s.map(linear));
      }
    }
  }
  for (const [nome, d] of Object.entries(partes)) {
    const acc = (tipo, arr) => out.createAccessor().setType(tipo).setArray(new Float32Array(arr)).setBuffer(buf);
    const prim = out.createPrimitive()
      .setAttribute("POSITION", acc("VEC3", d.p))
      .setAttribute("NORMAL", acc("VEC3", d.n))
      .setAttribute("COLOR_0", acc("VEC3", d.c));
    const mesh = out.createMesh(`${variante.id}_${nome}`).addPrimitive(prim);
    cena.addChild(out.createNode(`${variante.id}_${nome}`).setMesh(mesh));
  }
  const tc = partes.corpo.p.length / 9, tn = partes.neutro.p.length / 9;
  console.log(`${variante.id}: pintura célula ${pintura}, corpo ${tc} tri, neutro ${tn} tri, total ${tc + tn}; ` +
    `dimensões ${(max[0] - min[0]).toFixed(2)} × ${(max[2] - min[2]).toFixed(2)} × ${(max[1] - min[1]).toFixed(2)} m (C × L × A)`);
}

// quantização só de normais e cores (KHR_mesh_quantization, nativa no GLTFLoader): posições seguem float, então
// as malhas não ganham transformação de nó e a geometria pode ir direto para o InstancedMesh
await out.transform(weld(), quantize({ pattern: /^(NORMAL|COLOR_0)$/, quantizeNormal: 10, quantizeColor: 8 }));
out.createExtension(KHRMeshQuantization).setRequired(true); // normais SHORT e cores UBYTE normalizadas
out.getRoot().getAsset().copyright = "KayKit City Builder Bits by Kay Lousberg (kaylousberg.com), CC0 1.0";
await io.write(saida, out);
console.log("gravado", saida);
