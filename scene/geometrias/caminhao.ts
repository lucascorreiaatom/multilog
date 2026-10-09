// Geometrias procedurais de caminhão (cavalo + implementos), estilo volumes limpos e arredondados.
// Cada peça é separada em "corpo" (recebe a cor da instância) e "neutro" (rodas, chassi, vidros, com cores de vértice).
// Referencial local: X para a frente, Y para cima, Z lateral. Cavalo: origem no eixo traseiro.
// Carreta: origem no pino-rei.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Implemento } from "@/lib/patio/tipos";

const pintar = (g: THREE.BufferGeometry, cor: string) => {
  const c = new THREE.Color(cor);
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
};

const caixa = (w: number, h: number, l: number, x: number, y: number, z = 0, r = 0.12, seg = 2) => {
  // até 1 segmento de arredondamento: mantém a silhueta macia com poucos triângulos (1.000+ veículos)
  const s = Math.min(seg, r >= 0.25 ? 2 : 1);
  const g = r > 0.05 ? new RoundedBoxGeometry(l, h, w, s, Math.min(r, w / 2, h / 2, l / 2)) : new THREE.BoxGeometry(l, h, w);
  g.translate(x, y, z);
  return g.index ? g.toNonIndexed() : g;
};

const roda = (x: number, z: number, raio = 0.52, largura = 0.36) => {
  const g = new THREE.CylinderGeometry(raio, raio, largura, 10, 1, false);
  g.rotateX(Math.PI / 2);
  g.translate(x, raio, z);
  return g.index ? g.toNonIndexed() : g;
};

const limpar = (g: THREE.BufferGeometry) => {
  // mantém só posição, normal e cor para permitir o merge entre geometrias diferentes
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "color"].includes(k)) g.deleteAttribute(k);
  return g;
};
const juntar = (gs: THREE.BufferGeometry[]) => {
  const m = mergeGeometries(gs.map(limpar), false)!;
  m.computeBoundingSphere();
  return m;
};

const PNEU = "#23262d";
const CHASSI = "#3a3f48";
const VIDRO = "#2c3a4d";
const FAROL = "#f2f0e6";

export interface PecasCaminhao {
  corpo: THREE.BufferGeometry;
  neutro: THREE.BufferGeometry;
}

/** cavalo mecânico com cabine leito (origem no eixo traseiro) */
export function geometriaCavalo(): PecasCaminhao {
  const meiaBitola = 0.95;
  const corpo = juntar([
    caixa(2.45, 2.2, 2.25, 3.65, 2.35, 0, 0.32, 3), // cabine
    caixa(2.45, 0.9, 1.0, 2.05, 3.0, 0, 0.25, 2), // teto da cabine leito
    caixa(2.45, 1.1, 1.0, 2.05, 1.85, 0, 0.2, 2),
    caixa(2.5, 0.42, 0.62, 4.85, 1.05, 0, 0.14, 2), // para-choque
  ].map((g) => pintar(g, "#ffffff")));
  const neutro = juntar([
    pintar(caixa(1.0, 0.32, 6.4, 1.6, 0.98, 0, 0.06, 1), CHASSI),
    pintar(caixa(2.47, 0.95, 0.06, 4.78, 2.75, 0, 0, 1), VIDRO), // para-brisa
    pintar(caixa(0.06, 0.8, 1.2, 3.9, 2.8, 1.235, 0, 1), VIDRO),
    pintar(caixa(0.06, 0.8, 1.2, 3.9, 2.8, -1.235, 0, 1), VIDRO),
    pintar(caixa(0.5, 0.18, 0.08, 4.9, 1.38, 0.82, 0.04, 1), FAROL),
    pintar(caixa(0.5, 0.18, 0.08, 4.9, 1.38, -0.82, 0.04, 1), FAROL),
    pintar(caixa(0.55, 0.5, 1.1, 2.4, 0.95, 1.05, 0), "#b9bec7"), // tanque de combustível
    pintar(caixa(0.55, 0.5, 1.1, 2.4, 0.95, -1.05, 0), "#b9bec7"),
    pintar(caixa(2.3, 0.18, 1.3, 0.35, 1.28, 0, 0.05, 1), CHASSI), // quinta roda
    ...[[3.85, meiaBitola + 0.12], [3.85, -meiaBitola - 0.12], [0, meiaBitola], [0, -meiaBitola], [-1.35, meiaBitola], [-1.35, -meiaBitola]].map(([x, z]) => pintar(roda(x, z), PNEU)),
  ]);
  return { corpo, neutro };
}

/** carreta por tipo de implemento (origem no pino-rei, traseira em x = -13) */
export function geometriaCarreta(tipo: Implemento): PecasCaminhao {
  const eixos = [-9.0, -10.3, -11.6];
  const rodas = eixos.flatMap((x) => [pintar(roda(x, 0.92, 0.52, 0.62), PNEU), pintar(roda(x, -0.92, 0.52, 0.62), PNEU)]);
  const chassiCurto = pintar(caixa(1.2, 0.3, 13.4, -6.3, 1.18, 0, 0.05, 1), CHASSI);
  const para = pintar(caixa(2.45, 0.2, 0.15, -12.95, 0.95, 0, 0.03, 1), "#c94a3a");
  let corpo: THREE.BufferGeometry;
  const extras: THREE.BufferGeometry[] = [];
  switch (tipo) {
    case "bau":
      corpo = juntar([pintar(caixa(2.6, 2.8, 13.6, -6.1, 2.75, 0, 0.18, 2), "#ffffff")]);
      break;
    case "sider":
      corpo = juntar([
        pintar(caixa(2.6, 2.65, 13.5, -6.1, 2.72, 0, 0.3, 3), "#ffffff"),
      ]);
      extras.push(pintar(caixa(2.64, 0.22, 13.6, -6.1, 1.4, 0, 0.04, 1), "#5d636e"), pintar(caixa(2.64, 0.16, 13.6, -6.1, 4.08, 0, 0.06, 1), "#d7dbe1"));
      break;
    case "container20":
      corpo = juntar([pintar(caixa(2.44, 2.59, 6.06, -9.6, 2.7, 0, 0.05, 1), "#ffffff")]);
      extras.push(pintar(caixa(2.4, 0.22, 13.2, -6.2, 1.3, 0, 0.03, 1), CHASSI));
      break;
    case "container40":
      corpo = juntar([pintar(caixa(2.44, 2.59, 12.19, -6.6, 2.7, 0, 0.05, 1), "#ffffff")]);
      extras.push(pintar(caixa(2.4, 0.22, 13.2, -6.2, 1.3, 0, 0.03, 1), CHASSI));
      break;
    case "graneleiro":
      corpo = juntar([
        pintar(caixa(2.6, 0.18, 13.4, -6.2, 1.5, 0, 0.04, 1), "#ffffff"),
        pintar(caixa(0.14, 1.6, 13.4, -6.2, 2.35, 1.23, 0.05, 1), "#ffffff"),
        pintar(caixa(0.14, 1.6, 13.4, -6.2, 2.35, -1.23, 0.05, 1), "#ffffff"),
        pintar(caixa(2.6, 1.6, 0.14, 0.45, 2.35, 0, 0.05, 1), "#ffffff"),
        pintar(caixa(2.6, 1.6, 0.14, -12.85, 2.35, 0, 0.05, 1), "#ffffff"),
      ]);
      extras.push(pintar(caixa(2.3, 0.6, 13.0, -6.2, 2.75, 0, 0.3, 2), "#c9a96b"));
      break;
    case "tanque": {
      const t = new THREE.CapsuleGeometry(1.25, 10.6, 3, 12);
      t.rotateZ(Math.PI / 2);
      t.translate(-6.4, 2.65, 0);
      corpo = juntar([pintar(t.index ? t.toNonIndexed() : t, "#ffffff")]);
      extras.push(pintar(caixa(1.4, 0.35, 12.6, -6.4, 1.3, 0, 0.05, 1), CHASSI), pintar(caixa(0.6, 0.6, 0.6, -2.2, 4.0, 0, 0.1, 1), "#c94a3a"));
      break;
    }
  }
  const neutro = juntar([chassiCurto, para, ...rodas, ...extras]);
  return { corpo, neutro };
}

/** carro de passeio simples (origem no centro, X para a frente) */
export function geometriaCarro(): PecasCaminhao {
  const corpo = juntar([pintar(caixa(1.8, 0.75, 4.4, 0, 0.72, 0, 0.3, 3), "#ffffff"), pintar(caixa(1.62, 0.62, 2.3, -0.25, 1.38, 0, 0.28, 3), "#ffffff")]);
  const neutro = juntar([
    pintar(caixa(1.64, 0.5, 2.0, -0.25, 1.4, 0, 0.2, 2), VIDRO),
    ...[[1.35, 0.78], [1.35, -0.78], [-1.35, 0.78], [-1.35, -0.78]].map(([x, z]) => pintar(roda(x, z, 0.33, 0.24), PNEU)),
  ]);
  return { corpo, neutro };
}
