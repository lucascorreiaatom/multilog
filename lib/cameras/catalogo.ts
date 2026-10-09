// Catálogo das câmeras do PDF de implantação (340 numerações; 70 a 106 ausentes do documento).
import { planta } from "../site";
import type { Vec2 } from "../site/tipos";
import { MODELO_POR_COR, type ModeloId } from "./modelos";

export interface CameraExterna {
  numero: number;
  codigo: string;
  tipo: "externa";
  modelo: ModeloId;
  posicao: Vec2;
  altura: number;
  /** direção principal em radianos no plano XZ (0 = +X, sentido anti-horário visto de cima com Z para baixo) */
  rumo: number;
  inclinacao: number;
  local: string;
  pagina: 6;
}

export interface CameraInterna {
  numero: number;
  codigo: string;
  tipo: "interna";
  pagina: number;
  local: string;
  nivel?: string;
  modelo: ModeloId;
  /** posição na planta interna (0 a 1), preenchida na digitalização das plantas internas */
  posicaoPlanta?: Vec2;
}

export type Camera = CameraExterna | CameraInterna;

export const codigoCamera = (n: number) => `CAM-${String(n).padStart(3, "0")}`;

const centroSitio: Vec2 = [0, 0];

const OCTANTES = ["leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste", "norte", "nordeste"];
/** octante relativo ao centro do recinto (norte = topo do desenho, onde fica a rodovia) */
function octante([x, z]: Vec2): string {
  const ang = Math.atan2(z - centroSitio[1], x - centroSitio[0]); // Z para baixo = sul
  const i = Math.round(((ang + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8;
  return OCTANTES[i];
}

function setorProximo([x, z]: Vec2): string {
  let melhor = "Perímetro", dist = 22;
  for (const v of planta.vagas) {
    const d = Math.hypot(v.centro[0] - x, v.centro[1] - z);
    if (d < dist) { dist = d; melhor = { EST: "Estacionamento", PUL: "Pulmão", CPG: "Cargas Perigosas", DOC: "Docas" }[v.setor]; }
  }
  for (const p of planta.predios) {
    const cx = p.contorno.reduce((a, q) => a + q[0], 0) / p.contorno.length, cz = p.contorno.reduce((a, q) => a + q[1], 0) / p.contorno.length;
    if (Math.hypot(cx - x, cz - z) < dist - 4) { dist = Math.hypot(cx - x, cz - z); melhor = p.nome.split(" · ")[0]; }
  }
  return melhor;
}

export const camerasExternas: CameraExterna[] = planta.camerasExternas.map((c) => {
  const modelo = MODELO_POR_COR[c.cor];
  const paraCentro = Math.atan2(centroSitio[1] - c.posicao[1], centroSitio[0] - c.posicao[0]);
  // eixo do símbolo na planta (graus, y para baixo); escolhe o sentido que aponta para dentro do recinto
  const eixo = (c.eixoGraus * Math.PI) / 180;
  const sentidos = [eixo, eixo + Math.PI];
  const dentro = (a: number) => Math.cos(a - paraCentro);
  let rumo = paraCentro;
  if (modelo === "P1487-LE" || modelo === "P4707-PLVE") rumo = sentidos.sort((a, b) => dentro(b) - dentro(a))[0];
  if (modelo === "P3738-PLE") rumo = 0;
  const altura = modelo === "P3738-PLE" || modelo === "Q6225-LE" ? 12 : modelo === "P4707-PLVE" ? 8 : 6;
  return {
    numero: c.numero, codigo: codigoCamera(c.numero), tipo: "externa", modelo, posicao: c.posicao, altura, rumo,
    inclinacao: modelo === "P3827-PVE" ? -0.35 : -0.42,
    local: `${setorProximo(c.posicao)} · ${octante(c.posicao)}`, pagina: 6,
  };
});

// Câmeras internas por página e local (texto do PDF). Fisheye conforme legenda de cada planta.
const faixas = (pares: [number, number][]) => pares.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));
const INTERNAS: { pagina: number; local: string; nivel?: string; numeros: number[]; fisheye: number[] }[] = [
  { pagina: 7, local: "Administração", nivel: "Nível -3,95 e -2,90", numeros: faixas([[128, 154], [285, 310]]), fisheye: [140, 141, 142, 143, 144, 145, 146, 149, 291] },
  { pagina: 8, local: "Administração", nivel: "Nível 0,00", numeros: faixas([[155, 165], [311, 320]]), fisheye: [] },
  { pagina: 9, local: "Administração", nivel: "Níveis 2,05 e 6,20", numeros: faixas([[166, 179], [321, 324]]), fisheye: [166, 167, 168, 169] },
  { pagina: 10, local: "Armazém de Conferência", numeros: faixas([[180, 252]]), fisheye: [241, 242, 243] },
  { pagina: 11, local: "Gates e Balanças", numeros: faixas([[107, 127], [271, 284]]), fisheye: [] },
  { pagina: 12, local: "Scanner", numeros: faixas([[325, 329]]), fisheye: [] },
  { pagina: 13, local: "Apoio Motoristas", numeros: faixas([[330, 340]]), fisheye: [330] },
  { pagina: 14, local: "Portaria Geral", numeros: [253, 254], fisheye: [] },
  { pagina: 14, local: "Apoio Motorista Pulmão", numeros: faixas([[255, 261]]), fisheye: [261] },
  { pagina: 14, local: "Cabine de Medição", numeros: [262, 263], fisheye: [] },
  { pagina: 15, local: "Subestação", numeros: [264, 265, 266], fisheye: [] },
  { pagina: 15, local: "Casa de Bombas", numeros: [267, 268], fisheye: [] },
  { pagina: 15, local: "Guarita Estacionamento", numeros: [269, 270], fisheye: [] },
];

export const camerasInternas: CameraInterna[] = INTERNAS.flatMap((g) =>
  g.numeros.map((n) => ({
    numero: n, codigo: codigoCamera(n), tipo: "interna" as const, pagina: g.pagina, local: g.local, nivel: g.nivel,
    modelo: (g.fisheye.includes(n) ? "M4318-PLVE" : "FIXA") as ModeloId,
  })),
);

export const todasCameras: Camera[] = [...camerasExternas, ...camerasInternas].sort((a, b) => a.numero - b.numero);

/** numerações do PDF sem localização em nenhuma planta */
export const camerasNaoMapeadas = faixas([[70, 106]]);

/** pendências encontradas na digitalização do PDF */
export const PENDENCIAS = [
  { id: "lentes", texto: "A legenda da pág. 6 soma 164 lentes nas câmeras 1 a 69; o texto do PDF diz 198." },
  { id: "simbolo-14", texto: "Símbolo azul sem número logo abaixo da câmera 14 (pág. 6)." },
  { id: "faixa-70-106", texto: "Câmeras 70 a 106 não aparecem em nenhuma planta do PDF." },
  { id: "dup-149", texto: "Número 149 aparece duas vezes na pág. 7." },
  { id: "dup-216", texto: "Número 216 aparece duas vezes na pág. 10." },
  { id: "pag9", texto: "Pág. 9 informa 14 câmeras, mas a planta mostra 18." },
  { id: "container", texto: "Pátio Container: o PDF mostra a grade de contêineres, sem vagas de caminhão marcadas." },
];
