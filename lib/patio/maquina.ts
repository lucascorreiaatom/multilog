// Máquina de estados única das vagas: status, ações do operador e eventos derivam daqui.
import type { StatusVaga } from "./tipos";

export type Acao =
  | "reservar" // gatilho de entrada: vaga definida para um caminhão que passou no gate
  | "estacionar" // fim da animação de entrada
  | "iniciarVistoria"
  | "iniciarConferencia"
  | "liberarSaida"
  | "registrarSaida" // gatilho de saída: o caminhão deixa a vaga
  | "liberarVaga" // a vaga fica livre quando o caminhão sai dela
  | "bloquear"
  | "desbloquear";

const TRANSICOES: Record<StatusVaga, Partial<Record<Acao, StatusVaga>>> = {
  livre: { reservar: "reservada", bloquear: "bloqueada" },
  reservada: { estacionar: "ocupada", liberarVaga: "livre" },
  ocupada: { iniciarVistoria: "vistoria", iniciarConferencia: "conferencia" },
  vistoria: { iniciarConferencia: "conferencia" },
  conferencia: { liberarSaida: "saida" },
  saida: { registrarSaida: "saida", liberarVaga: "livre" },
  bloqueada: { desbloquear: "livre" },
};

export function proximo(status: StatusVaga, acao: Acao): StatusVaga | null {
  return TRANSICOES[status][acao] ?? null;
}

export function acoesPermitidas(status: StatusVaga): Acao[] {
  return Object.keys(TRANSICOES[status]) as Acao[];
}

/** ações que o operador pode disparar pela interface (as demais são gatilhos do sistema) */
export const ACOES_OPERADOR: Partial<Record<Acao, string>> = {
  iniciarVistoria: "Enviar para vistoria RFB",
  iniciarConferencia: "Iniciar conferência",
  liberarSaida: "Liberar saída",
  registrarSaida: "Registrar saída do caminhão",
  bloquear: "Bloquear vaga",
  desbloquear: "Desbloquear vaga",
};
