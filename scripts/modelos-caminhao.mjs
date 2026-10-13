// Gera public/modelos/caminhao.glb a partir de dois modelos do Sketchfab (CC-BY 4.0):
//   cavalo:  "scania" de animara777  (sketchfab.com/3d-models/scania-667b102d84534c50868b784398629408)
//   carreta: "Refrigerated Trailer (Custom Model)" de matthew13482
//            (sketchfab.com/3d-models/refrigerated-trailer-custom-model-1d23f8e7bbef4655a62ead4f92398de2)
//
// O que faz:
// - cavalo: 30 materiais e 18 texturas viram 1 material com 1 atlas (as texturas pequenas do modelo, sem perda de detalhe);
//   a pintura magenta e amarela da cabine é repintada de branco (frota padronizada) mantendo sombreado, vidros, grade e faróis;
// - carreta: a textura de blocos de cor sólida vira cor de vértice (sem textura nenhuma);
// - cada veículo sai em duas malhas, no contrato de geometrias/caminhao.ts:
//     *_corpo  (pintura, tingida pela cor da instância)  e  *_neutro (rodas, chassi, vidros, unidade frigorífica);
// - referencial da cena: X para a frente, Y para cima, metros.
//     cavalo: origem no eixo traseiro;  carreta: origem no pino-rei, traseira em x = -13 (lib/patio/rotas.ts).
//
// Uso (fora do projeto): npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions sharp three
//   node modelos-caminhao.mjs <scania.glb> <trailer.glb> <saida.glb>
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMeshQuantization } from "@gltf-transform/extensions";
import { quantize, weld } from "@gltf-transform/functions";
import sharp from "sharp";
import * as THREE from "three";

const [, , arqCavalo, arqCarreta, saida] = process.argv;
if (!saida) { console.error("uso: node modelos-caminhao.mjs <scania.glb> <trailer.glb> <saida.glb>"); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ---------- utilidades ----------
const decodificar = async (bytes) => {
  const { data, info } = await sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
};
/** cada triângulo do mundo: posições, normais, uv e material */
function triangulos(doc, mapa) {
  const out = [];
  const nm = new THREE.Matrix3(), m4 = new THREE.Matrix4(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    m4.fromArray(node.getWorldMatrix());
    nm.getNormalMatrix(m4);
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute("POSITION"), N = prim.getAttribute("NORMAL"), T = prim.getAttribute("TEXCOORD_0"), I = prim.getIndices();
      const mat = prim.getMaterial();
      const cont = I ? I.getCount() : P.getCount();
      const a = [], b = [], c = [];
      for (let i = 0; i < cont; i += 3) {
        const ks = [0, 1, 2].map((j) => (I ? I.getScalar(i + j) : i + j));
        const vs = ks.map((k) => {
          v.fromArray(P.getElement(k, a)).applyMatrix4(m4);
          if (N) n.fromArray(N.getElement(k, b)).applyMatrix3(nm).normalize(); else n.set(0, 1, 0);
          const p = mapa([v.x, v.y, v.z]);
          const nn = mapa([n.x, n.y, n.z], true);
          return { p, n: nn, uv: T ? T.getElement(k, c).slice() : [0, 0] };
        });
        out.push({ vs, mat, no: node.getName() });
      }
    }
  }
  return out;
}

// ---------- cavalo (Scania) ----------
const PINTURA = new Set(["cabintop2", "cabinfront2", "cabinback2", "cabinside2", "cabineside1", "cabinfrontkrilo2", "krepl"]);
const EIXO_TRASEIRO_Z = 2.015; // centro das rodas traseiras no referencial do modelo (m)
// frente do modelo é -Z: (x, y, z) -> (-z, y, x), origem no eixo traseiro
const mapaCavalo = ([x, y, z], vetor = false) => (vetor ? [-z, y, x] : [-(z - EIXO_TRASEIRO_Z), y, x]);

const docC = await io.read(arqCavalo);
const trisC = triangulos(docC, mapaCavalo);

// texturas únicas (por conteúdo) e repintura da cabine
const celulas = new Map(); // chave -> {img, w, h, x, y}
const celulaDoMaterial = new Map();
for (const mat of docC.getRoot().listMaterials()) {
  const tex = mat.getBaseColorTexture();
  if (!tex) continue;
  const bytes = tex.getImage();
  const chave = Buffer.from(bytes).toString("base64").slice(0, 4000) + bytes.byteLength + (PINTURA.has(mat.getName()) ? "p" : "");
  if (!celulas.has(chave)) {
    const img = await decodificar(bytes);
    if (PINTURA.has(mat.getName())) {
      for (let i = 0; i < img.data.length; i += 4) {
        const [h, s, l] = hsl(img.data[i], img.data[i + 1], img.data[i + 2]);
        // magenta da pintura (270 a 345 graus) e faixas amarelas/laranja (18 a 65): viram branco com o mesmo sombreado
        // inclui as bordas escuras e avermelhadas das faixas; preserva o vermelho vivo das lanternas
        const lanterna = mat.getName() === "cabinfrontkrilo2" && (h < 14 || h > 352) && s > 0.6 && l > 0.3;
        const matiz = (h >= 255 && h <= 360) || h <= 70;
        if (!lanterna && matiz && s > 0.3 && l > 0.18) {
          const val = Math.round(255 * Math.min(1, 0.62 + 0.62 * l));
          img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
        } else if (!lanterna && matiz && s > 0.55 && l > 0.07) {
          // borda escura das faixas: vira cinza de vinco, sem pontilhado
          const val = Math.round(255 * (0.3 + 1.2 * l));
          img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
        }
      }
    }
    celulas.set(chave, { img });
  }
  celulaDoMaterial.set(mat, celulas.get(chave));
}
// empacotamento em prateleiras, com 4 px de borda replicada (evita sangrar no mipmap)
const PAD = 4, LARGURA = 512;
const lista = [...celulas.values()].sort((a, b) => b.img.h - a.img.h);
let cx = 0, cy = 0, alturaLinha = 0;
for (const c of lista) {
  const w = c.img.w + PAD * 2, h = c.img.h + PAD * 2;
  if (cx + w > LARGURA) { cx = 0; cy += alturaLinha; alturaLinha = 0; }
  c.x = cx + PAD; c.y = cy + PAD; cx += w; alturaLinha = Math.max(alturaLinha, h);
}
const ALTURA = 2 ** Math.ceil(Math.log2(cy + alturaLinha));
const atlas = Buffer.alloc(LARGURA * ALTURA * 4, 0);
for (const c of lista) {
  for (let y = -PAD; y < c.img.h + PAD; y++) for (let x = -PAD; x < c.img.w + PAD; x++) {
    const sx = Math.min(c.img.w - 1, Math.max(0, x)), sy = Math.min(c.img.h - 1, Math.max(0, y));
    const si = (sy * c.img.w + sx) * 4, di = ((c.y + y) * LARGURA + (c.x + x)) * 4;
    c.img.data.copy(atlas, di, si, si + 4);
    atlas[di + 3] = 255;
  }
}
const atlasJpg = await sharp(atlas, { raw: { width: LARGURA, height: ALTURA, channels: 4 } }).removeAlpha().jpeg({ quality: 88, mozjpeg: true }).toBuffer();

// ---------- carreta (baú frigorífico) ----------
const ESC_CARRETA = [1.5, 1.45, 1.634]; // largura 2,5 m, altura 4,1 m, comprimento 14,2 m (do pino à traseira: 13,0 m)
const FRENTE_Z = -0.375, PINO_Z = FRENTE_Z + 1.2 / ESC_CARRETA[2]; // pino-rei 1,2 m atrás da frente do baú
const mapaCarreta = ([x, y, z], vetor = false) => (vetor
  ? new THREE.Vector3(-z / ESC_CARRETA[2], y / ESC_CARRETA[1], x / ESC_CARRETA[0]).normalize().toArray()
  : [-(z - PINO_Z) * ESC_CARRETA[2], y * ESC_CARRETA[1], x * ESC_CARRETA[0]]);
const docT = await io.read(arqCarreta);
const trisT = triangulos(docT, mapaCarreta);
const texT = await decodificar(docT.getRoot().listTextures()[0].getImage());
const linear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const corFace = (tr) => {
  const u = (tr.vs[0].uv[0] + tr.vs[1].uv[0] + tr.vs[2].uv[0]) / 3, v = (tr.vs[0].uv[1] + tr.vs[1].uv[1] + tr.vs[2].uv[1]) / 3;
  const x = Math.min(texT.w - 1, Math.max(0, Math.floor(u * texT.w))), y = Math.min(texT.h - 1, Math.max(0, Math.floor(v * texT.h)));
  const i = (y * texT.w + x) * 4;
  return [texT.data[i], texT.data[i + 1], texT.data[i + 2]];
};

// ---------- saída ----------
const out = new Document();
const buf = out.createBuffer();
const cena = out.createScene("caminhao");
const acc = (tipo, arr) => out.createAccessor().setType(tipo).setArray(new Float32Array(arr)).setBuffer(buf);
const texOut = out.createTexture("cavalo_atlas").setImage(new Uint8Array(atlasJpg)).setMimeType("image/jpeg");
const matCavalo = out.createMaterial("cavalo").setBaseColorTexture(texOut).setRoughnessFactor(0.6).setMetallicFactor(0.05);
const matCarreta = out.createMaterial("carreta").setRoughnessFactor(0.6).setMetallicFactor(0.05);
const malha = (nome, d, mat) => {
  const prim = out.createPrimitive().setAttribute("POSITION", acc("VEC3", d.p)).setAttribute("NORMAL", acc("VEC3", d.n)).setMaterial(mat);
  if (d.uv.length) prim.setAttribute("TEXCOORD_0", acc("VEC2", d.uv));
  if (d.c.length) prim.setAttribute("COLOR_0", acc("VEC3", d.c));
  cena.addChild(out.createNode(nome).setMesh(out.createMesh(nome).addPrimitive(prim)));
  return d.p.length / 9;
};
const vazio = () => ({ p: [], n: [], uv: [], c: [] });

const pc = { corpo: vazio(), neutro: vazio() };
for (const tr of trisC) {
  const cel = celulaDoMaterial.get(tr.mat);
  const alvo = pc[PINTURA.has(tr.mat?.getName()) ? "corpo" : "neutro"];
  // UV fora de 0..1 (chassi repetido 35 vezes): usa a cor média, ponto central da célula
  const repete = tr.vs.some((v) => v.uv[0] < -0.05 || v.uv[0] > 1.15 || v.uv[1] < -0.05 || v.uv[1] > 1.15);
  for (const v of tr.vs) {
    alvo.p.push(...v.p); alvo.n.push(...v.n);
    const u = repete ? 0.5 : Math.min(1, Math.max(0, v.uv[0])), w = repete ? 0.5 : Math.min(1, Math.max(0, v.uv[1]));
    alvo.uv.push((cel.x + u * cel.img.w) / LARGURA, (cel.y + w * cel.img.h) / ALTURA);
  }
}
const pt = { corpo: vazio(), neutro: vazio() };
// painéis do baú (laterais, frente, traseira e teto): pintura da frota; as faces de borda vêm do Blockbench com cores
// de marcação (verde, rosa, azul claro) e também viram pintura
// rodas da carreta: no original são cubos; viram cilindros de 8 lados (pneu escuro, face do aro cinza), 32 triângulos cada
const RODAS = new Set(["Object_15", "Object_17", "Object_19", "Object_63"]);
const rodasCarreta = [];
{
  const grupos = new Map();
  for (const tr of trisT) if (RODAS.has(tr.no)) {
    const g = grupos.get(tr.no) ?? { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
    for (const v of tr.vs) for (let k = 0; k < 3; k++) { g.min[k] = Math.min(g.min[k], v.p[k]); g.max[k] = Math.max(g.max[k], v.p[k]); }
    grupos.set(tr.no, g);
  }
  const SEG = 8, R = 0.5, pneu = [0x2a, 0x2c, 0x30], aro = [0x8a, 0x8f, 0x96];
  for (const g of grupos.values()) {
    const cx = (g.min[0] + g.max[0]) / 2, z0 = g.min[2], z1 = g.max[2];
    const pto = (z, a, r = R) => [cx + Math.cos(a) * r, R + Math.sin(a) * r, z];
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      const n0 = [Math.cos(a0), Math.sin(a0), 0], n1 = [Math.cos(a1), Math.sin(a1), 0];
      rodasCarreta.push({ cor: pneu, vs: [{ p: pto(z0, a0), n: n0 }, { p: pto(z1, a1), n: n1 }, { p: pto(z1, a0), n: n0 }] });
      rodasCarreta.push({ cor: pneu, vs: [{ p: pto(z0, a0), n: n0 }, { p: pto(z0, a1), n: n1 }, { p: pto(z1, a1), n: n1 }] });
      for (const [z, nz] of [[z1, 1], [z0, -1]]) {
        // face lateral: um leque só (aro cinza); ficam quase escondidas sob o baú
        const c = { p: [cx, R, z], n: [0, 0, nz] }, f0 = { p: pto(z, a0), n: [0, 0, nz] }, f1 = { p: pto(z, a1), n: [0, 0, nz] };
        rodasCarreta.push({ cor: aro, vs: nz > 0 ? [c, f0, f1] : [c, f1, f0] });
      }
    }
  }
}
const PAINEIS = new Set(["Object_7", "Object_9", "Object_11", "Object_13", "Object_21"]);
for (const tr of rodasCarreta) for (const v of tr.vs) { pt.neutro.p.push(...v.p); pt.neutro.n.push(...v.n); pt.neutro.c.push(...tr.cor.map(linear)); }
for (const tr of trisT) {
  if (RODAS.has(tr.no)) continue;
  let s = corFace(tr);
  const ehCorpo = PAINEIS.has(tr.no);
  const [, sat, l] = hsl(...s);
  // cores de marcação em peças pequenas: cinza de chassi
  if (!ehCorpo && sat > 0.35 && l > 0.6 && !(s[0] > 240 && s[1] > 220 && s[2] < 180)) s = [0x76, 0x76, 0x76];
  const alvo = pt[ehCorpo ? "corpo" : "neutro"];
  for (const v of tr.vs) {
    alvo.p.push(...v.p); alvo.n.push(...v.n);
    if (ehCorpo) { const g = l > 0.5 ? 0.94 : 0.82; alvo.c.push(g, g, g); }
    else alvo.c.push(...s.map(linear));
  }
}
const resumo = {
  cavalo_corpo: malha("cavalo_corpo", pc.corpo, matCavalo), cavalo_neutro: malha("cavalo_neutro", pc.neutro, matCavalo),
  carreta_corpo: malha("carreta_corpo", pt.corpo, matCarreta), carreta_neutro: malha("carreta_neutro", pt.neutro, matCarreta),
};
await out.transform(weld(), quantize({ pattern: /^(NORMAL|COLOR_0)$/, quantizeNormal: 10, quantizeColor: 8 }));
out.createExtension(KHRMeshQuantization).setRequired(true);
out.getRoot().getAsset().copyright =
  "Cavalo: \"scania\" por animara777 (CC-BY 4.0). Carreta: \"Refrigerated Trailer (Custom Model)\" por matthew13482 (CC-BY 4.0). Modificados (repintura, atlas, escala).";
await new NodeIO().registerExtensions([KHRMeshQuantization]).write(saida, out);
console.log("triângulos", resumo, "atlas", `${LARGURA}x${ALTURA}`, `${(atlasJpg.length / 1024).toFixed(1)} KB`);
