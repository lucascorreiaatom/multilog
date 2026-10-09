// Animação de um conjunto cavalo + carreta ao longo de uma Rota (trechos de frente e de ré).
// O cavalo segue a polilinha pelo eixo traseiro; a carreta é articulada no pino-rei e seu eixo
// segue o pino (modelo de reboque), então ela "corta" a curva como uma carreta real.
import { CAMINHAO, comprimento, type Rota } from "@/lib/patio/rotas";
import type { Vec2 } from "@/lib/site/tipos";

export interface Pose {
  /** eixo traseiro do cavalo */
  pos: Vec2;
  rumo: Vec2;
  /** pino-rei e rumo da carreta */
  pino: Vec2;
  rumoCarreta: Vec2;
}

const VEL_CRUZEIRO_MIN = 9; // m/s na tela (trajeto comprimido para durar entre 20 e 40 s)
const VEL_CRUZEIRO_MAX = 22;
const VEL_MANOBRA = 3.2;
const VEL_RE = 2.2;
const ACEL = 4.5;
const DIST_MANOBRA = 34;

interface TrechoPrep {
  pontos: Vec2[];
  acum: number[];
  total: number;
  re: boolean;
  paradas: { s: number; duracao: number; motivo: string }[];
  gate?: number;
}

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const norm = (a: Vec2): Vec2 => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

export class AnimacaoCaminhao {
  private trechos: TrechoPrep[];
  private i = 0;
  private s = 0;
  private v = 0;
  private espera = 0;
  private paradasFeitas = new Set<string>();
  private eixoCarreta: Vec2;
  private cruzeiro: number;
  pose: Pose;
  terminou = false;
  /** pista de gate em uso e se o caminhão está na balança (para a cancela) */
  gateAtual?: number;
  naBalanca = false;
  onFimTrecho?: (indice: number) => void;

  constructor(rota: Rota, opcoes?: { duracaoAlvo?: number; poseInicial?: Pose }) {
    this.trechos = rota.trechos.map((t) => {
      const acum = [0];
      for (let k = 1; k < t.pontos.length; k++) acum.push(acum[k - 1] + Math.hypot(t.pontos[k][0] - t.pontos[k - 1][0], t.pontos[k][1] - t.pontos[k - 1][1]));
      return { pontos: t.pontos, acum, total: acum[acum.length - 1], re: t.re, paradas: t.paradas ?? [], gate: t.gate };
    });
    const total = rota.trechos.reduce((a, t) => a + comprimento(t.pontos), 0);
    this.cruzeiro = Math.max(VEL_CRUZEIRO_MIN, Math.min(VEL_CRUZEIRO_MAX, total / (opcoes?.duracaoAlvo ?? 30)));
    const t0 = this.trechos[0];
    const p0 = t0.pontos[0];
    const d0 = norm(sub(t0.pontos[Math.min(1, t0.pontos.length - 1)], p0));
    const rumo: Vec2 = t0.re ? [-d0[0], -d0[1]] : d0;
    const pino: Vec2 = [p0[0] + rumo[0] * CAMINHAO.pinoRei, p0[1] + rumo[1] * CAMINHAO.pinoRei];
    this.eixoCarreta = [pino[0] - rumo[0] * CAMINHAO.eixoCarreta, pino[1] - rumo[1] * CAMINHAO.eixoCarreta];
    this.pose = opcoes?.poseInicial ?? { pos: p0, rumo, pino, rumoCarreta: rumo };
    if (opcoes?.poseInicial) {
      const pi = opcoes.poseInicial;
      this.eixoCarreta = [pi.pino[0] - pi.rumoCarreta[0] * CAMINHAO.eixoCarreta, pi.pino[1] - pi.rumoCarreta[1] * CAMINHAO.eixoCarreta];
    }
    this.gateAtual = t0.gate;
  }

  private pontoEm(t: TrechoPrep, s: number): { p: Vec2; d: Vec2 } {
    s = Math.max(0, Math.min(t.total, s));
    let k = 1;
    while (k < t.acum.length - 1 && t.acum[k] < s) k++;
    const a = t.pontos[k - 1], b = t.pontos[k];
    const seg = t.acum[k] - t.acum[k - 1] || 1;
    const u = (s - t.acum[k - 1]) / seg;
    return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], d: norm(sub(b, a)) };
  }

  /** avança a animação dt segundos */
  atualizar(dt: number) {
    if (this.terminou) return;
    dt = Math.min(dt, 0.1);
    const t = this.trechos[this.i];
    if (this.espera > 0) { this.espera -= dt; this.naBalanca = true; return; }
    this.naBalanca = false;
    const restante = t.total - this.s;
    const proxParada = t.paradas.find((p) => !this.paradasFeitas.has(`${this.i}:${p.s}`) && p.s >= this.s - 0.5);
    const distParada = proxParada ? proxParada.s - this.s : Infinity;
    const limite = t.re ? VEL_RE : restante < DIST_MANOBRA && this.i === this.trechos.length - 1 ? VEL_MANOBRA + (this.cruzeiro - VEL_MANOBRA) * Math.max(0, (restante - 8) / DIST_MANOBRA) * 0.35 : this.cruzeiro;
    const frear = Math.min(restante, distParada);
    const vMaxFreio = Math.sqrt(2 * ACEL * Math.max(0, frear)) + 0.4;
    const alvo = Math.min(limite, vMaxFreio);
    this.v += Math.max(-ACEL * 2 * dt, Math.min(ACEL * dt, alvo - this.v));
    const passo = Math.max(0, this.v) * dt;
    if (proxParada && distParada <= passo + 0.05) {
      this.s = proxParada.s; this.v = 0; this.espera = proxParada.duracao;
      this.paradasFeitas.add(`${this.i}:${proxParada.s}`);
    } else {
      this.s = Math.min(t.total, this.s + passo);
    }
    // pose do cavalo
    const { p, d } = this.pontoEm(t, this.s);
    const rumo: Vec2 = t.re ? [-d[0], -d[1]] : d;
    const pino: Vec2 = [p[0] + rumo[0] * CAMINHAO.pinoRei, p[1] + rumo[1] * CAMINHAO.pinoRei];
    // carreta: o eixo segue o pino mantendo a distância (sub-passos para estabilidade)
    for (let k = 0; k < 3; k++) {
      const dir = norm(sub(pino, this.eixoCarreta));
      this.eixoCarreta = [pino[0] - dir[0] * CAMINHAO.eixoCarreta, pino[1] - dir[1] * CAMINHAO.eixoCarreta];
    }
    const rumoCarreta = norm(sub(pino, this.eixoCarreta));
    this.pose = { pos: p, rumo, pino, rumoCarreta };
    if (this.s >= t.total - 0.02) {
      this.onFimTrecho?.(this.i);
      if (this.i < this.trechos.length - 1) {
        this.i++; this.s = 0; this.v = 0;
        this.gateAtual = this.trechos[this.i].gate ?? this.gateAtual;
      } else this.terminou = true;
    }
  }

  get indiceTrecho() {
    return this.i;
  }

  /** distância percorrida no trecho atual (para eventos como "deixou a vaga") */
  get progresso() {
    return { trecho: this.i, s: this.s, total: this.trechos[this.i].total };
  }
}

/** pose estática de um caminhão estacionado (carreta alinhada) */
export function poseAlinhada(pos: Vec2, rumo: Vec2): Pose {
  const pino: Vec2 = [pos[0] + rumo[0] * CAMINHAO.pinoRei, pos[1] + rumo[1] * CAMINHAO.pinoRei];
  return { pos, rumo, pino, rumoCarreta: rumo };
}
