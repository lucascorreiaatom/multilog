// Ordem das camadas rentes ao chão. Elas ficam a centímetros umas das outras e, vistas de cima e de longe, a
// precisão de profundidade não separa: o cinturão de grama aparece através do asfalto. Quem fica por cima é
// decidido pelo polygonOffset (passos de profundidade, valem em qualquer distância), não pela altura y.
export const CAMADA = {
  grama: 0, campo: 1, cinturao: 2,
  asfalto: 3, rodovia: 3, concreto: 4, acesso: 4, scanner: 5, faixaRodovia: 5,
  pisoVaga: 6, faixaVaga: 7, sobreposicao: 8,
} as const;

/** props de material para desenhar a camada n por cima das menores. Só `units`: o `factor` escala com a inclinação
 *  por pixel e, num chão visto de longe, puxaria o asfalto ~meio metro para a frente, por cima de meio-fios e rodas */
export const sobre = (n: number) => ({ polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -4 * n });
