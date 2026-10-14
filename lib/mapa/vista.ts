// Geometria do mapa plano (2D): coordenadas do desenho, caixa de cada alvo e a vista (escala e deslocamento).
// O desenho gira a planta 180° como a vista inicial do 3D e a Imagem 2 (rodovia embaixo). A rotação é feita aqui, nos
// dados, e não com transform no SVG: assim nenhum texto fica de cabeça para baixo.
import { camerasExternas } from "../cameras/catalogo";
import { planta, vagasPorId, vagasPorSetor } from "../site";
import type { Vec2, VagaGeo } from "../site/tipos";
import type { AlvoCamera3D } from "../store/ui";

/** ponto no desenho, em metros (x para a direita, y para baixo) */
export type Ponto = [number, number];
export interface Caixa { x0: number; y0: number; x1: number; y1: number }
/** tela = desenho * k + (x, y); k em pixels por metro */
export interface Vista { k: number; x: number; y: number }
/** faixas da tela cobertas por painéis, em pixels */
export interface Folga { esq: number; dir: number; topo: number; base: number }

export const paraTela = ([x, z]: Vec2): Ponto => [-x, -z];

export function caixaDe(pts: Ponto[], margem = 0): Caixa {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0: x0 - margem, y0: y0 - margem, x1: x1 + margem, y1: y1 + margem };
}

const emVolta = ([x, y]: Ponto, raio: number): Caixa => ({ x0: x - raio, y0: y - raio, x1: x + raio, y1: y + raio });

/** cerca do recinto: limite do que interessa no mapa */
export const TERRENO = caixaDe(planta.cerca.map(paraTela));

/** quatro cantos da vaga no desenho (retângulo ao longo do eixo batente-boca) */
export function cantosVaga(v: VagaGeo): Ponto[] {
  const [ex, ez] = v.eixo, [cx, cz] = v.centro;
  const l = v.comprimento / 2, w = v.largura / 2;
  return ([[l, w], [l, -w], [-l, -w], [-l, w]] as const).map(([a, b]) => paraTela([cx + ex * a - ez * b, cz + ez * a + ex * b]));
}

export const centroDe = (pts: Ponto[]): Ponto => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

/** área de interesse de cada alvo de navegação (o mesmo contrato que move a câmera do 3D) */
export function caixaDoAlvo(alvo: AlvoCamera3D): Caixa {
  switch (alvo.tipo) {
    case "home": return caixaDe([[TERRENO.x0, TERRENO.y0], [TERRENO.x1, TERRENO.y1]], 12);
    case "ponto": return emVolta(paraTela([alvo.x, alvo.z]), alvo.dist / 2);
    case "setor": return caixaDe(vagasPorSetor[alvo.id].flatMap(cantosVaga), 16);
    case "vaga": {
      const v = vagasPorId.get(alvo.id);
      return v ? emVolta(paraTela(v.centro), 38) : caixaDoAlvo({ tipo: "home" });
    }
    case "camera": {
      const c = camerasExternas.find((q) => q.numero === alvo.numero);
      return c ? emVolta(paraTela(c.posicao), 50) : caixaDoAlvo({ tipo: "home" });
    }
    case "gate": {
      // a balança e a fila em volta dela, perto o bastante para separar as pistas (8 m entre si)
      const g = planta.pistasGate.find((q) => q.numero === alvo.numero) ?? planta.pistasGate[0];
      return emVolta(paraTela([g.x, g.zBalanca]), 30);
    }
    case "gates": return caixaDe(planta.pistasGate.flatMap((g) => [paraTela([g.x, g.zNorte]), paraTela([g.x, g.zSul])]), 30);
    case "predio": {
      if (alvo.id === "reservatorio") return emVolta(paraTela(planta.reservatorio.centro), 40);
      const b = planta.predios.find((q) => q.id === alvo.id);
      return b ? caixaDe(b.contorno.map(paraTela), 24) : caixaDoAlvo({ tipo: "home" });
    }
  }
}

/** escala máxima: uma vaga de 3,9 m com cerca de 110 px de largura */
export const K_MAX = 28;

/** vista que encaixa a caixa na área livre (descontadas as folgas dos painéis) */
export function encaixar(c: Caixa, largura: number, altura: number, folga: Folga, kMax = K_MAX): Vista {
  const w = Math.max(120, largura - folga.esq - folga.dir), h = Math.max(120, altura - folga.topo - folga.base);
  const k = Math.min(kMax, w / (c.x1 - c.x0), h / (c.y1 - c.y0));
  const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
  return { k, x: folga.esq + w / 2 - cx * k, y: folga.topo + h / 2 - cy * k };
}

/** aproxima ou afasta mantendo fixo o ponto (px, py) da tela, como a roda do mouse sob o cursor */
export function zoomNoPonto(v: Vista, fator: number, px: number, py: number, kMin: number, kMax = K_MAX): Vista {
  const k = Math.min(kMax, Math.max(kMin, v.k * fator));
  const f = k / v.k;
  return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
}

/** escala dentro dos limites e o centro da tela sempre sobre o recinto (o mapa não "foge" no arrasto) */
export function limitar(v: Vista, largura: number, altura: number, kMin: number, kMax = K_MAX): Vista {
  const k = Math.min(kMax, Math.max(kMin, v.k));
  const f = k / v.k;
  const cx = largura / 2, cy = altura / 2;
  let x = cx - (cx - v.x) * f, y = cy - (cy - v.y) * f;
  const m = 60;
  x = Math.min(cx - (TERRENO.x0 - m) * k, Math.max(cx - (TERRENO.x1 + m) * k, x));
  y = Math.min(cy - (TERRENO.y0 - m) * k, Math.max(cy - (TERRENO.y1 + m) * k, y));
  return { k, x, y };
}

/** passo t (0 a 1) entre duas vistas: escala em progressão geométrica e centro em linha reta (zoom suave) */
export function interpolar(a: Vista, b: Vista, t: number, largura: number, altura: number): Vista {
  const cx = largura / 2, cy = altura / 2;
  const ma: Ponto = [(cx - a.x) / a.k, (cy - a.y) / a.k], mb: Ponto = [(cx - b.x) / b.k, (cy - b.y) / b.k];
  const k = a.k * Math.pow(b.k / a.k, t);
  // o centro acompanha a escala (u), não o tempo: aproximando, ele chega antes; afastando, depois
  const u = Math.abs(b.k - a.k) < 1e-6 ? t : (k - a.k) / (b.k - a.k);
  const mx = ma[0] + (mb[0] - ma[0]) * u, my = ma[1] + (mb[1] - ma[1]) * u;
  return { k, x: cx - mx * k, y: cy - my * k };
}

export const paraTelaVista = (v: Vista, [x, y]: Ponto): Ponto => [x * v.k + v.x, y * v.k + v.y];
export const doTelaVista = (v: Vista, px: number, py: number): Ponto => [(px - v.x) / v.k, (py - v.y) / v.k];

/**
 * Nível de detalhe pela escala:
 * - geral: o pátio inteiro, com o resumo de cada setor;
 * - setor: vagas pela cor do status, câmeras e gates com ícone;
 * - vaga: número da vaga e caminhão nas vagas ocupadas.
 */
export type Detalhe = "geral" | "setor" | "vaga";
export const LIMIAR_SETOR = 1.9;
export const LIMIAR_VAGA = 6;
export const nivelDetalhe = (k: number): Detalhe => (k < LIMIAR_SETOR ? "geral" : k < LIMIAR_VAGA ? "setor" : "vaga");
