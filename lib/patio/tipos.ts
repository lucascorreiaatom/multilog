// Domínio operacional do pátio: status de vaga, ocupantes, gates e eventos.

export type StatusVaga = "livre" | "reservada" | "ocupada" | "vistoria" | "conferencia" | "saida" | "bloqueada";

/** descricao: uma linha para a legenda e a dica da vaga (fluxo: ocupada, vistoria RFB, conferência, saída liberada) */
export const STATUS: Record<StatusVaga, { nome: string; curto: string; cor: string; ordem: number; descricao: string }> = {
  ocupada: { nome: "Ocupada", curto: "Ocupada", cor: "var(--st-ocupada)", ordem: 0, descricao: "Caminhão estacionado, aguardando o próximo passo" },
  livre: { nome: "Livre", curto: "Livre", cor: "var(--st-livre)", ordem: 1, descricao: "Vaga disponível para um novo caminhão" },
  conferencia: { nome: "Em conferência", curto: "Conferência", cor: "var(--st-conferencia)", ordem: 2, descricao: "Carga em conferência física; o caminhão ainda não pode sair" },
  saida: { nome: "Saída liberada", curto: "Saída liberada", cor: "var(--st-saida)", ordem: 3, descricao: "Conferência concluída: o caminhão pode sair" },
  reservada: { nome: "Reservada", curto: "Reservada", cor: "var(--st-reservada)", ordem: 4, descricao: "Vaga definida para um caminhão que acabou de entrar" },
  vistoria: { nome: "Aguardando vistoria RFB", curto: "Vistoria RFB", cor: "var(--st-vistoria)", ordem: 5, descricao: "Na fila da vistoria da Receita Federal" },
  bloqueada: { nome: "Bloqueada", curto: "Bloqueada", cor: "var(--st-bloqueada)", ordem: 6, descricao: "Fora de uso (manutenção ou interdição)" },
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
  | "entrada" | "estacionou" | "vistoria" | "conferencia" | "saida-liberada" | "saida" | "liberada"
  | "bloqueio" | "desbloqueio" | "gate-aberto" | "gate-fechado" | "camera-offline" | "camera-online" | "permanencia";

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
