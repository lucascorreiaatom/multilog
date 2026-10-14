// Domínio operacional do pátio: status de vaga, ocupantes, gates e eventos.

/** os 4 status do SoW MUL01 (p.4): ocupado e livre, mais os 2 definidos no UX (em conferência e saindo do recinto) */
export type StatusVaga = "livre" | "ocupada" | "conferencia" | "saida";

/** curto: rótulo que cabe nos cards de filtro (o nome completo vai na dica) · descricao: uma linha para a legenda e a dica da vaga (fluxo: ocupada, em conferência, saindo do recinto) */
export const STATUS: Record<StatusVaga, { nome: string; curto: string; cor: string; ordem: number; descricao: string }> = {
  ocupada: { nome: "Ocupada", curto: "Ocupada", cor: "var(--st-ocupada)", ordem: 0, descricao: "Caminhão estacionado na vaga" },
  livre: { nome: "Livre", curto: "Livre", cor: "var(--st-livre)", ordem: 1, descricao: "Vaga disponível para um novo caminhão" },
  conferencia: { nome: "Em conferência", curto: "Em conferência", cor: "var(--st-conferencia)", ordem: 2, descricao: "Carga em conferência ou vistoria, na vaga ou na doca" },
  saida: { nome: "Saindo do recinto", curto: "Em saída", cor: "var(--st-saida)", ordem: 3, descricao: "Conferência concluída: o caminhão está deixando o recinto" },
};

export const ORDEM_STATUS = (Object.keys(STATUS) as StatusVaga[]).sort((a, b) => STATUS[a].ordem - STATUS[b].ordem);

export type Implemento = "bau" | "sider" | "container20" | "container40" | "graneleiro" | "tanque";

export const NOME_IMPLEMENTO: Record<Implemento, string> = {
  bau: "Baú", sider: "Sider", container20: "Porta-contêiner 20'", container40: "Porta-contêiner 40'", graneleiro: "Graneleiro", tanque: "Tanque",
};

export type Canal = "verde" | "amarelo" | "vermelho" | "cinza";
export type Operacao = "importacao" | "exportacao";

export interface Ocupante {
  id: string;
  motorista: { nome: string; cpf: string; cnh: string; telefone: string; nacionalidade: "BR" | "PY" | "AR" };
  veiculo: { placa: string; placaCarreta: string; implemento: Implemento; corCavalo: string; corCarga: string; transportadora: string; pesoEntradaKg: number };
  carga: { operacao: Operacao; documento: string; lacre: string; descricao: string; perigosa: boolean; canal: Canal; processo: string };
  gateEntrada: number;
  horaEntrada: number;
}

export interface EstadoVaga {
  status: StatusVaga;
  ocupanteId?: string;
  desde: number;
}

export interface Gate {
  id: string;
  numero: number;
  sentido: "entrada" | "saida" | "reversivel";
  operacao: Operacao;
  aberto: boolean;
}

export type TipoEvento =
  | "entrada" | "estacionou" | "conferencia" | "saida-liberada" | "saida" | "liberada"
  | "gate-aberto" | "gate-fechado" | "camera-offline" | "camera-online" | "permanencia";

export interface Evento {
  id: string;
  hora: number;
  tipo: TipoEvento;
  vagaId?: string;
  placa?: string;
  gate?: number;
  camera?: number;
  status?: StatusVaga;
  texto: string;
}

/** limite de permanência para o alerta (horas) */
export const PERMANENCIA_MAX_H = 48;
