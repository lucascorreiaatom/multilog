// Roteamento no grafo de vias traçado da planta (A*) e montagem das manobras de entrada e saída.
// Não é rastreamento real: gera trajetos plausíveis (mão das vias, raio de giro, ré nas docas).
import { planta, vagasPorId } from "../site";
import type { Vec2, VagaGeo } from "../site/tipos";

export interface Trecho {
  pontos: Vec2[];
  /** true: o caminhão percorre o trecho em marcha à ré */
  re: boolean;
  /** paradas no trecho: distância (m) a partir do início e duração (s) */
  paradas?: { s: number; duracao: number; motivo: "balanca" | "scanner" | "cancela" }[];
  /** pista do gate envolvida no trecho (para abrir e fechar a cancela) */
  gate?: number;
}

export interface Rota {
  trechos: Trecho[];
}

/** geometria do conjunto cavalo + carreta (metros, a partir do eixo traseiro do cavalo) */
export const CAMINHAO = {
  frente: 4.8, // para-choque dianteiro à frente do eixo traseiro do cavalo
  pinoRei: 0.4, // quinta roda à frente do eixo traseiro
  eixoCarreta: 10.2, // do pino-rei ao centro do conjunto de eixos da carreta
  traseiraCarreta: 13.0, // do pino-rei à traseira da carreta
};
export const TRASEIRA_TOTAL = CAMINHAO.traseiraCarreta - CAMINHAO.pinoRei; // 12,6 m atrás do eixo de referência

const nos = planta.vias.nos;
const adj = new Map<string, string[]>();
for (const [a, b] of planta.vias.arestas) {
  if (!adj.has(a)) adj.set(a, []);
  adj.get(a)!.push(b);
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
const norm = (a: Vec2): Vec2 => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];

/** A* entre dois nós do grafo */
export function caminho(origem: string, destino: string): string[] | null {
  const aberto = new Set([origem]);
  const veio = new Map<string, string>();
  const g = new Map<string, number>([[origem, 0]]);
  const f = new Map<string, number>([[origem, dist(nos[origem], nos[destino])]]);
  while (aberto.size) {
    let atual = "";
    let melhor = Infinity;
    for (const n of aberto) { const v = f.get(n) ?? Infinity; if (v < melhor) { melhor = v; atual = n; } }
    if (atual === destino) {
      const out = [atual];
      while (veio.has(out[0])) out.unshift(veio.get(out[0])!);
      return out;
    }
    aberto.delete(atual);
    for (const viz of adj.get(atual) ?? []) {
      const tent = (g.get(atual) ?? Infinity) + dist(nos[atual], nos[viz]);
      if (tent < (g.get(viz) ?? Infinity)) {
        veio.set(viz, atual);
        g.set(viz, tent);
        f.set(viz, tent + dist(nos[viz], nos[destino]));
        aberto.add(viz);
      }
    }
  }
  return null;
}

/** aresta dirigida mais próxima de um ponto, compatível com a direção desejada */
function arestaProxima(p: Vec2, direcaoPreferida?: Vec2): { de: string; para: string; proj: Vec2; d: Vec2 } {
  let melhor = { de: "", para: "", proj: p as Vec2, d: [1, 0] as Vec2, custo: Infinity };
  for (const [a, b] of planta.vias.arestas) {
    const A = nos[a], B = nos[b], AB = sub(B, A), L2 = dot(AB, AB);
    if (L2 < 1) continue;
    const t = Math.max(0, Math.min(1, dot(sub(p, A), AB) / L2));
    const proj = add(A, mul(AB, t));
    const d = norm(AB);
    let custo = dist(p, proj);
    if (direcaoPreferida && dot(d, direcaoPreferida) < -0.2) custo += 1000;
    if (custo < melhor.custo) melhor = { de: a, para: b, proj, d, custo };
  }
  return melhor;
}

/** Bézier cúbica amostrada */
function bezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, n = 16): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** suaviza cantos de uma polilinha com arcos de Bézier (raio de giro de carreta) */
export function suavizar(pts: Vec2[], raio = 9): Vec2[] {
  if (pts.length < 3) return pts;
  const out: Vec2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const d1 = norm(sub(b, a)), d2 = norm(sub(c, b));
    if (dot(d1, d2) > 0.995) { out.push(b); continue; }
    const r = Math.min(raio, dist(a, b) / 2, dist(b, c) / 2);
    const p0 = sub(b, mul(d1, r)), p3 = add(b, mul(d2, r));
    out.push(p0, ...bezier(p0, sub(b, mul(d1, r * 0.45)), add(b, mul(d2, r * 0.45)), p3, 8));
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const pontosNos = (ids: string[]) => ids.map((id) => nos[id]);

/** posição final do eixo de referência (eixo traseiro do cavalo) na vaga */
export function poseEstacionado(v: VagaGeo): { pos: Vec2; rumo: Vec2 } {
  if (v.tipo === "doca") {
    // de ré: traseira da carreta junto à porta, cavalo apontando para fora
    return { pos: add(v.batente, mul(v.eixo, 0.4 + TRASEIRA_TOTAL)), rumo: v.eixo };
  }
  // de frente: cavalo junto ao batente
  const rumo = mul(v.eixo, -1) as Vec2;
  return { pos: add(v.batente, mul(v.eixo, 0.6 + CAMINHAO.frente)), rumo };
}

function paradaNo(pontos: Vec2[], alvo: Vec2): number {
  let s = 0, melhor = 0, md = Infinity;
  for (let i = 0; i < pontos.length; i++) {
    if (i > 0) s += dist(pontos[i - 1], pontos[i]);
    const d = dist(pontos[i], alvo);
    if (d < md) { md = d; melhor = s; }
  }
  return melhor;
}

/** rota de entrada: rodovia, gate (balança), scanner e vaga definida */
export function rotaEntrada(vagaId: string, pista: number): Rota {
  const v = vagasPorId.get(vagaId);
  if (!v) throw new Error(`vaga ${vagaId} inexistente`);
  const final = poseEstacionado(v);
  const chegada = mul(v.eixo, -1) as Vec2; // direção de entrada na vaga
  const ar = arestaProxima(v.acesso, v.tipo === "doca" ? undefined : chegada);
  const ids = caminho("rod-o", `gate${pista}-n`)!
    .concat(caminho(`gate${pista}-n`, "scan-s")!.slice(1))
    .concat((caminho("scan-s", ar.de) ?? ["scan-s"]).slice(1));
  const base = pontosNos(ids);
  const recuo = v.tipo === "perpendicular" ? 12 : v.tipo === "longitudinal" ? 14 : 9;
  const inicioManobra = sub(ar.proj, mul(ar.d, recuo));
  let pontos: Vec2[];
  const trechos: Trecho[] = [];
  if (v.tipo === "doca") {
    // passa da doca, posiciona com o cavalo apontando para fora e entra de ré em linha reta
    const espera = add(final.pos, mul(v.eixo, 15));
    const curva = bezier(ar.proj, add(ar.proj, mul(ar.d, 9)), sub(espera, mul(v.eixo, 9)), espera, 14);
    pontos = suavizar([...base, ar.proj]).concat(curva);
    trechos.push({ pontos, re: false });
    trechos.push({ pontos: [espera, final.pos], re: true });
  } else {
    const boca = v.boca;
    const curva = bezier(inicioManobra, add(inicioManobra, mul(ar.d, recuo * 0.6)), sub(boca, mul(chegada, recuo * 0.55)), boca, 18);
    pontos = suavizar([...base, inicioManobra]).concat(curva, [final.pos]);
    trechos.push({ pontos, re: false });
  }
  const t0 = trechos[0];
  t0.gate = pista;
  t0.paradas = [
    { s: paradaNo(t0.pontos, nos[`gate${pista}-bal`]), duracao: 3.2, motivo: "balanca" },
    { s: paradaNo(t0.pontos, [nos["scan-n"][0], (nos["scan-n"][1] + nos["scan-s"][1]) / 2]), duracao: 2.4, motivo: "scanner" },
  ];
  return { trechos };
}

/** rota de saída: deixa a vaga, segue até a fila de saída, gate e rodovia */
export function rotaSaida(vagaId: string, pista: number): Rota {
  const v = vagasPorId.get(vagaId);
  if (!v) throw new Error(`vaga ${vagaId} inexistente`);
  const ini = poseEstacionado(v);
  const trechos: Trecho[] = [];
  let partida: Vec2;
  let rumoPartida: Vec2;
  if (v.tipo === "doca") {
    partida = ini.pos; rumoPartida = ini.rumo;
  } else if (v.tipo === "longitudinal" && v.saidaPeloTopo) {
    const topo = v.saidaPeloTopo;
    trechos.push({ pontos: [ini.pos, topo], re: false });
    partida = topo; rumoPartida = ini.rumo;
  } else {
    // ré reta até o corredor
    const ate = v.acesso;
    trechos.push({ pontos: [ini.pos, ate], re: true });
    partida = ate; rumoPartida = ini.rumo;
  }
  const ar = arestaProxima(partida, rumoPartida);
  const frente = add(partida, mul(rumoPartida, 6));
  const ids = (caminho(ar.para, `gate${pista}-s`) ?? [ar.para]).concat(caminho(`gate${pista}-s`, "rod-l")!.slice(1));
  const base = pontosNos(ids);
  const saida = suavizar([partida, frente, add(ar.proj, mul(ar.d, 10)), ...base]);
  trechos.push({ pontos: saida, re: false, gate: pista, paradas: [{ s: paradaNo(saida, nos[`gate${pista}-bal`]), duracao: 3.2, motivo: "balanca" }] });
  return { trechos };
}

export function comprimento(pts: Vec2[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}
