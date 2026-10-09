// Contrato de dados do pátio. A UI e a cena só conhecem esta interface:
// SimulatedSource implementa agora; RecintoSource (stub) receberá os endpoints da Multilog.
import type { Acao } from "./maquina";
import type { EstadoVaga, Evento, Gate, Ocupante } from "./tipos";

export interface Snapshot {
  agora: number;
  vagas: Record<string, EstadoVaga>;
  ocupantes: Record<string, Ocupante>;
  gates: Gate[];
  eventos: Evento[];
  camerasOffline: number[];
}

/** gatilhos que disparam animações na cena (um por entrada ou saída de caminhão) */
export type Gatilho =
  | { tipo: "entrada"; ocupanteId: string; vagaId: string; pista: number; hora: number }
  | { tipo: "saida"; ocupanteId: string; vagaId: string; pista: number; hora: number };

export type Mudanca =
  | { tipo: "vaga"; vagaId: string; estado: EstadoVaga }
  | { tipo: "ocupante"; ocupante: Ocupante }
  | { tipo: "ocupante-removido"; ocupanteId: string }
  | { tipo: "gate"; gate: Gate }
  | { tipo: "evento"; evento: Evento }
  | { tipo: "camera"; numero: number; online: boolean }
  | { tipo: "gatilho"; gatilho: Gatilho };

export interface ResultadoAcao {
  ok: boolean;
  motivo?: string;
}

export interface YardDataSource {
  readonly simulada: boolean;
  snapshot(): Snapshot;
  assinar(ouvinte: (m: Mudanca) => void): () => void;
  iniciar(): void;
  parar(): void;
  /** ação do operador sobre uma vaga */
  acaoVaga(vagaId: string, acao: Acao): ResultadoAcao;
  /** entrada manual: atribui uma vaga livre a um novo caminhão, disparando o gatilho de entrada */
  atribuirEntrada(vagaId: string, placa?: string): ResultadoAcao;
  alternarGate(numero: number): ResultadoAcao;
  /** a cena informa que a animação terminou (caminhão encaixado ou fora da vaga) */
  animacaoConcluida(g: Gatilho, fase: "estacionou" | "deixou-vaga" | "saiu"): void;
}
