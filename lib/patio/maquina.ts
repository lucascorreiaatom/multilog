// Máquina de estados única das vagas (4 status do SoW): livre, ocupada, em conferência, saindo do recinto.
// As transições vêm dos gatilhos do sistema (entrada, conferência, saída); não há ações de operador na interface.
import type { StatusVaga } from "./tipos";

export type Acao =
  | "ocupar" // gatilho de entrada: vaga definida para um caminhão que passou no gate
  | "iniciarConferencia"
  | "liberarSaida"
  | "registrarSaida" // gatilho de saída: o caminhão deixa a vaga
  | "liberarVaga"; // a vaga fica livre quando o caminhão sai dela

const TRANSICOES: Record<StatusVaga, Partial<Record<Acao, StatusVaga>>> = {
  livre: { ocupar: "ocupada" },
  ocupada: { iniciarConferencia: "conferencia" },
  conferencia: { liberarSaida: "saida" },
  saida: { registrarSaida: "saida", liberarVaga: "livre" },
};

export function proximo(status: StatusVaga, acao: Acao): StatusVaga | null {
  return TRANSICOES[status][acao] ?? null;
}

export function acoesPermitidas(status: StatusVaga): Acao[] {
  return Object.keys(TRANSICOES[status]) as Acao[];
}
