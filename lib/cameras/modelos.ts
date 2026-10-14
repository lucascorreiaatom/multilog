// Modelos AXIS do projeto (PDF págs. 4 e 5) e a legenda por cor da planta do pátio (pág. 6).

export type ModeloId = "P3738-PLE" | "P4707-PLVE" | "P3827-PVE" | "P1487-LE" | "Q6225-LE" | "M4318-PLVE" | "FIXA";

export type Projecao = "perspectiva" | "fisheye360" | "ptz";

export interface Modelo {
  id: ModeloId;
  nome: string;
  resumo: string;
  sensores: number;
  projecao: Projecao;
  /** campo de visão horizontal por sensor, em graus (a transmissão deriva o vertical do formato do quadro) */
  fovH: number;
  /** campo de visão vertical por sensor, em graus */
  fovV: number;
  /** direções dos sensores relativas ao eixo da câmera, em graus */
  direcoes: number[];
  zoomMax?: number;
  alturaMontagem: number;
}

export const MODELOS: Record<ModeloId, Modelo> = {
  "P3738-PLE": {
    id: "P3738-PLE", nome: "AXIS P3738-PLE", resumo: "Multidirecional 4x 4K com IR 360°",
    sensores: 4, projecao: "perspectiva", fovH: 100, fovV: 56, direcoes: [0, 90, 180, 270], alturaMontagem: 12,
  },
  "P4707-PLVE": {
    id: "P4707-PLVE", nome: "AXIS P4707-PLVE", resumo: "Dois sensores 5 MP com IR 360°",
    sensores: 2, projecao: "perspectiva", fovH: 98, fovV: 54, direcoes: [0, 180], alturaMontagem: 8,
  },
  "P3827-PVE": {
    // PDF pág. 6: "panorâmica com 4 sensores" emendados em 180° x 90°; cada sensor cobre ~45° (48° com sobreposição)
    id: "P3827-PVE", nome: "AXIS P3827-PVE", resumo: "Panorâmica 4 sensores, 180°",
    sensores: 4, projecao: "perspectiva", fovH: 48, fovV: 90, direcoes: [-67.5, -22.5, 22.5, 67.5], alturaMontagem: 6,
  },
  "P1487-LE": {
    id: "P1487-LE", nome: "AXIS P1487-LE", resumo: "Bullet 5 MP, lente 3 a 8,5 mm",
    sensores: 1, projecao: "perspectiva", fovH: 70, fovV: 39, direcoes: [0], zoomMax: 2.8, alturaMontagem: 6,
  },
  "Q6225-LE": {
    id: "Q6225-LE", nome: "AXIS Q6225-LE", resumo: "PTZ HDTV 1080p, zoom óptico 31x",
    sensores: 1, projecao: "ptz", fovH: 63, fovV: 35, direcoes: [0], zoomMax: 31, alturaMontagem: 12,
  },
  "M4318-PLVE": {
    id: "M4318-PLVE", nome: "AXIS M4318-PLVE", resumo: "Fisheye 12 MP com visão 360°",
    sensores: 1, projecao: "fisheye360", fovH: 360, fovV: 180, direcoes: [0], alturaMontagem: 3,
  },
  FIXA: {
    id: "FIXA", nome: "Câmera fixa", resumo: "Modelo não especificado no PDF",
    sensores: 1, projecao: "perspectiva", fovH: 90, fovV: 50, direcoes: [0], alturaMontagem: 3,
  },
};

/** legenda da pág. 6: cor do símbolo para o modelo */
export const MODELO_POR_COR = {
  verde: "P3738-PLE",
  azul: "P4707-PLVE",
  amarelo: "P3827-PVE",
  vermelho: "P1487-LE",
  cinza: "Q6225-LE",
} as const satisfies Record<string, ModeloId>;
