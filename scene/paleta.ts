// Paleta da cena: modelagem limpa (vídeo de referência) com entorno colorido (Imagem 2).
// Prédios claros com faixa azul Multilog, para não competir com o azul de "Em conferência".
export const PALETA = {
  dia: {
    ceu: "#dfe8f1",
    neblina: "#dfe8f1",
    grama: "#9cc77a",
    gramaEscura: "#7fb35f",
    campo: "#c9b27a",
    copa: ["#3f7d45", "#4b8a4c", "#356f3d", "#5a9752", "#2f6538"],
    tronco: "#6b5640",
    asfalto: "#5a5f68",
    asfaltoRodovia: "#4d525a",
    faixa: "#f4f5f7",
    faixaAmarela: "#e8c45a",
    concreto: "#d9dce0",
    meioFio: "#eceef1",
    canteiro: "#6f8f4e", // verde-oliva: não confundir com o verde de vaga livre
    predio: "#eef0f3",
    predioSombra: "#dfe3e8",
    telhado: "#cfd5dd",
    faixaAzul: "#2f5fb3",
    vidro: "#5f7898",
    porta: "#9aa3b0",
    cerca: "#aab1bb",
    poste: "#8d949f",
    container: ["#2f6db5", "#c4472f", "#2d8a63", "#d48a1e", "#7f8895", "#1f3d6b", "#a33a52", "#e1e4e8"],
    carro: ["#f4f5f7", "#2e3440", "#9aa1ab", "#c9332f", "#1f4fa3", "#dfe3e8", "#6b717d"],
    sol: "#fff6e8",
    hemisferioCeu: "#e9f1fb",
    hemisferioChao: "#b9c4a8",
  },
  noite: {
    ceu: "#0d1420",
    neblina: "#0d1420",
    grama: "#2a3d2c",
    gramaEscura: "#223325",
    campo: "#3a3628",
    copa: ["#1c3322", "#21392a", "#183020", "#264030", "#162b1d"],
    tronco: "#2a2420",
    asfalto: "#2a2e35",
    asfaltoRodovia: "#24272d",
    faixa: "#c9ccd2",
    faixaAmarela: "#b9984a",
    concreto: "#4a4f58",
    meioFio: "#5a606a",
    canteiro: "#2f3d26",
    predio: "#5c6370",
    predioSombra: "#4a505c",
    telhado: "#3d434d",
    faixaAzul: "#2f5fb3",
    vidro: "#f2d79a",
    porta: "#4a505c",
    cerca: "#5a606a",
    poste: "#5a606a",
    container: ["#1f4677", "#7e2f20", "#1d5a41", "#8a5a14", "#4e555f", "#142846", "#6a2535", "#8f9298"],
    carro: ["#9a9ea6", "#1c2027", "#5d636d", "#7e2321", "#14326a", "#8a8f97", "#454a53"],
    sol: "#9fb4d8",
    hemisferioCeu: "#2a3a55",
    hemisferioChao: "#1a2018",
  },
};

/** Modo foco (vídeo de referência): cena quase monocromática; só status, seleção e câmeras têm cor */
export const PALETA_FOCO: { claro: Paleta; escuro: Paleta } = {
  claro: {
    ...PALETA.dia,
    // branco de maquete (vídeo): superfícies quase brancas; volume vem da luz e do AO, não da cor
    ceu: "#f6f7fb", neblina: "#f6f7fb", grama: "#f1f3f7", gramaEscura: "#eceff4", campo: "#f3f2ef",
    copa: ["#e4eae6", "#dfe6e1", "#e8ede9", "#dbe3dd", "#e2e8e4"], tronco: "#d6dad4",
    asfalto: "#e6e9ef", asfaltoRodovia: "#e0e3ea", faixa: "#ffffff", faixaAmarela: "#ffffff", concreto: "#f2f4f7",
    meioFio: "#ffffff", canteiro: "#e9eee9", predio: "#ffffff", predioSombra: "#f0f2f6", telhado: "#f7f8fa",
    faixaAzul: "#c3cee0", vidro: "#dfe5ee", porta: "#e7ebf0", cerca: "#d9dde4", poste: "#d2d7df",
    container: ["#f4f5f8", "#eceef2", "#f8f9fb", "#e6e9ee"], carro: ["#ffffff", "#f0f2f5", "#e4e7ec"],
    sol: "#ffffff", hemisferioCeu: "#ffffff", hemisferioChao: "#eef0f4",
  },
  escuro: {
    ...PALETA.noite,
    ceu: "#11151d", neblina: "#11151d", grama: "#1a1f28", gramaEscura: "#161b23", campo: "#1c2029",
    copa: ["#232a33", "#262d36", "#20262f", "#29303a", "#242b34"], tronco: "#1d222a",
    asfalto: "#262b34", asfaltoRodovia: "#222730", faixa: "#8a92a2", faixaAmarela: "#8a92a2", concreto: "#2e343e",
    meioFio: "#353c47", canteiro: "#222830", predio: "#3a414c", predioSombra: "#323843", telhado: "#2c323c",
    faixaAzul: "#4a5a78", vidro: "#4a5262", porta: "#323843", cerca: "#3c434e", poste: "#4a515c",
    container: ["#3a404a", "#333943", "#40464f", "#2f353e"], carro: ["#4a505a", "#3c424c", "#565c66"],
  },
};

/** cores neutras dos caminhões no Modo foco */
export const CAMINHAO_FOCO = { claro: { cavalo: "#ffffff", carga: "#f1f3f6" }, escuro: { cavalo: "#6a717c", carga: "#565d68" } };
/** cores padrão da frota fora do Modo foco: todos os caminhões iguais */
export const CAMINHAO_PADRAO = { claro: { cavalo: "#f4f5f7", carga: "#dfe3e8" }, escuro: { cavalo: "#9a9ea6", carga: "#7d828b" } };

export type Paleta = typeof PALETA.dia;
