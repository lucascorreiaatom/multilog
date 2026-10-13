// Gera public/modelos/arvores.glb a partir dos pinheiros do KayKit Medieval Hexagon Pack (CC0, Kay Lousberg).
//
// - troca a textura atlas por cores de vértice (sem textura);
// - separa cada árvore em <id>_copa (folhagem em cinza com o gradiente do atlas como sombreado, tingida pela cor da
//   instância, ou seja, pela paleta p.copa da cena) e <id>_tronco (também em cinza, tingido por p.tronco);
// - normaliza: base no chão (y = 0), centro em XZ, altura 1 (a cena escala por instância).
//
// Uso (fora do projeto): npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions pngjs
//   node modelos-arvores.mjs <pasta com tree_single_A/B.gltf+.bin e hexagons_medieval.png> <saida.glb>
// Fonte: github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
//        (addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature)
import { readFileSync } from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { quantize, weld } from "@gltf-transform/functions";
import { PNG } from "pngjs";

const [, , dir, saida] = process.argv;
if (!dir || !saida) { console.error("uso: node modelos-arvores.mjs <pasta-kaykit> <saida.glb>"); process.exit(1); }
const VARIANTES = [{ id: "pinheiro_a", arquivo: "tree_single_A" }, { id: "pinheiro_b", arquivo: "tree_single_B" }];

const png = PNG.sync.read(readFileSync(`${dir}/hexagons_medieval.png`));
const amostra = (u, v) => {
  const x = Math.min(png.width - 1, Math.max(0, Math.floor(u * png.width))), y = Math.min(png.height - 1, Math.max(0, Math.floor(v * png.height)));
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
};
const linear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const mul = (m, [x, y, z], w = 1) => [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w, m[2] * x + m[6] * y + m[10] * z + m[14] * w];
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };

const io = new NodeIO();
const out = new Document();
const buf = out.createBuffer();
const cena = out.createScene("arvores");
for (const variante of VARIANTES) {
  const doc = await io.read(`${dir}/${variante.arquivo}.gltf`);
  const tris = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute("POSITION"), N = prim.getAttribute("NORMAL"), T = prim.getAttribute("TEXCOORD_0"), I = prim.getIndices();
      const p = [], n = [], t = [];
      for (let i = 0; i < I.getCount(); i += 3) {
        const vs = [0, 1, 2].map((j) => { const k = I.getScalar(i + j); P.getElement(k, p); N.getElement(k, n); T.getElement(k, t); return { p: mul(m, p), n: norm(mul(m, n, 0)), cor: amostra(t[0], t[1]) }; });
        const media = [0, 1, 2].map((c) => (vs[0].cor[c] + vs[1].cor[c] + vs[2].cor[c]) / 3);
        tris.push({ vs, folha: media[1] > media[0] * 1.05 }); // verde domina: folhagem; marrom: tronco
      }
    }
  }
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const tr of tris) for (const v of tr.vs) { min = min.map((c, k) => Math.min(c, v.p[k])); max = max.map((c, k) => Math.max(c, v.p[k])); }
  const alt = max[1] - min[1], cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2;
  const lumMax = Math.max(...tris.filter((t) => t.folha).flatMap((t) => t.vs.map((v) => lum(v.cor))));
  const lumMaxTronco = Math.max(...tris.filter((t) => !t.folha).flatMap((t) => t.vs.map((v) => lum(v.cor))));
  const partes = { copa: { p: [], n: [], c: [] }, tronco: { p: [], n: [], c: [] } };
  for (const tr of tris) {
    const d = partes[tr.folha ? "copa" : "tronco"];
    for (const v of tr.vs) {
      d.p.push((v.p[0] - cx) / alt, (v.p[1] - min[1]) / alt, (v.p[2] - cz) / alt);
      d.n.push(...v.n);
      if (tr.folha) { const f = Math.min(1, 0.55 + 0.6 * (lum(v.cor) / lumMax)); d.c.push(f, f, f); }
      else { const f = Math.min(1, 0.6 + 0.4 * (lum(v.cor) / lumMaxTronco)); d.c.push(f, f, f); }
    }
  }
  for (const [nome, d] of Object.entries(partes)) {
    const acc = (tipo, arr) => out.createAccessor().setType(tipo).setArray(new Float32Array(arr)).setBuffer(buf);
    const prim = out.createPrimitive().setAttribute("POSITION", acc("VEC3", d.p)).setAttribute("NORMAL", acc("VEC3", d.n)).setAttribute("COLOR_0", acc("VEC3", d.c));
    cena.addChild(out.createNode(`${variante.id}_${nome}`).setMesh(out.createMesh(`${variante.id}_${nome}`).addPrimitive(prim)));
  }
  console.log(`${variante.id}: copa ${partes.copa.p.length / 9} tri, tronco ${partes.tronco.p.length / 9} tri, largura/altura ${((max[0] - min[0]) / alt).toFixed(2)}`);
}
await out.transform(weld(), quantize({ pattern: /^(NORMAL|COLOR_0)$/, quantizeNormal: 10, quantizeColor: 8 }));
out.createExtension(KHRMeshQuantization).setRequired(true);
out.getRoot().getAsset().copyright = "KayKit Medieval Hexagon Pack by Kay Lousberg (kaylousberg.com), CC0 1.0";
await new NodeIO().registerExtensions([KHRMeshQuantization]).write(saida, out);
console.log("gravado", saida);
