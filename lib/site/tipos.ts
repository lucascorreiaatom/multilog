// Tipos da geometria do recinto gerada por scripts/build-site.mjs (lib/site/planta.json).
// Coordenadas em metros no plano XZ: X para a direita do desenho, Z para baixo (sul), rodovia ao norte (-Z).

export type Vec2 = [number, number];

export type SetorId = "EST" | "PUL" | "CPG" | "DOC" | "CTN";

export type TipoVaga = "espinha" | "longitudinal" | "perpendicular" | "doca";

export interface VagaGeo {
  id: string;
  setor: Exclude<SetorId, "CTN">;
  fila: string;
  numero: number;
  tipo: TipoVaga;
  centro: Vec2;
  /** eixo unitário do batente para a boca da vaga (voltada ao corredor) */
  eixo: Vec2;
  comprimento: number;
  largura: number;
  batente: Vec2;
  boca: Vec2;
  /** ponto no eixo do corredor de onde parte a manobra de entrada */
  acesso: Vec2;
  /** colunas longitudinais do Pulmão: saída de frente pelo topo da coluna */
  saidaPeloTopo?: Vec2;
}

export interface Predio {
  id: string;
  nome: string;
  tipo: "armazem" | "administracao" | "cobertura" | "scanner" | "apoio" | "tecnico";
  altura: number;
  contorno: Vec2[];
  paginas?: number[];
  confianca?: "media" | "baixa";
}

export interface PistaGate {
  id: string;
  numero: number;
  sentido: "entrada" | "saida" | "reversivel";
  x: number;
  zNorte: number;
  zBalanca: number;
  zSul: number;
}

export interface CameraExternaGeo {
  numero: number;
  cor: "verde" | "azul" | "amarelo" | "vermelho" | "cinza";
  posicao: Vec2;
  eixoGraus: number;
}

export interface Planta {
  meta: { fonte: string; metrosPorPx: number; origemPx: Vec2; dimensoes: Vec2; orientacao: string };
  setores: { id: SetorId; nome: string }[];
  vagas: VagaGeo[];
  /** canteiros centrais dos blocos de vagas (segmento a-b e largura em metros) */
  canteiros: { a: Vec2; b: Vec2; largura: number }[];
  predios: Predio[];
  reservatorio: { id: string; nome: string; centro: Vec2; raio: number; altura: number };
  coberturasLeves: Vec2[][];
  scannerPlataforma: Vec2[];
  areaCPG: Vec2[];
  blocosContainer: Vec2[][];
  canteirosContainer: Vec2[];
  /** vagas de carro; rumo: da vaga para o corredor (o carro entra de frente) */
  vagasLeves: { centro: Vec2; giro: 0 | 1; rumo?: Vec2 }[];
  cerca: Vec2[];
  postes: Vec2[];
  pistasGate: PistaGate[];
  vias: { nos: Record<string, Vec2>; arestas: [string, string][] };
  camerasExternas: CameraExternaGeo[];
}
