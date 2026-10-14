"use client";
// Estado operacional do pátio, alimentado por uma YardDataSource (simulada agora, Recinto depois).
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Gatilho, Mudanca, YardDataSource } from "../patio/fonte";
import type { Acao } from "../patio/maquina";
import type { EstadoVaga, Evento, Gate, Ocupante, StatusVaga } from "../patio/tipos";
import { planta, SETORES_VAGAS, type SetorVagas } from "../site";

type Contagem = Record<StatusVaga, number> & { total: number; emUso: number };

const vazia = (): Contagem => ({ livre: 0, reservada: 0, ocupada: 0, vistoria: 0, conferencia: 0, saida: 0, bloqueada: 0, total: 0, emUso: 0 });

export interface PatioState {
  pronto: boolean;
  simulada: boolean;
  vagas: Record<string, EstadoVaga>;
  ocupantes: Record<string, Ocupante>;
  gates: Gate[];
  eventos: Evento[];
  camerasOffline: number[];
  contagem: Contagem;
  porSetor: Record<SetorVagas, Contagem>;
  iniciar: (fonte: YardDataSource) => () => void;
  acaoVaga: (vagaId: string, acao: Acao) => { ok: boolean; motivo?: string };
  atribuirEntrada: (vagaId: string, placa?: string) => { ok: boolean; motivo?: string };
  alternarGate: (numero: number) => { ok: boolean; motivo?: string };
  animacaoConcluida: (g: Gatilho, fase: "estacionou" | "deixou-vaga" | "saiu") => void;
}

const setorDaVaga = new Map(planta.vagas.map((v) => [v.id, v.setor as SetorVagas]));

function contar(vagas: Record<string, EstadoVaga>) {
  const contagem = vazia();
  const porSetor = Object.fromEntries(SETORES_VAGAS.map((s) => [s, vazia()])) as Record<SetorVagas, Contagem>;
  for (const [id, e] of Object.entries(vagas)) {
    const s = setorDaVaga.get(id)!;
    contagem[e.status]++; contagem.total++;
    porSetor[s][e.status]++; porSetor[s].total++;
    if (e.status !== "livre" && e.status !== "bloqueada") { contagem.emUso++; porSetor[s].emUso++; }
  }
  return { contagem, porSetor };
}

let fonteAtual: YardDataSource | null = null;
const ouvintesGatilho = new Set<(g: Gatilho) => void>();

/** sem animação (mapa plano, aba oculta ou animação desligada): aplica o resultado do gatilho na hora */
export function concluirGatilhoSemAnimacao(g: Gatilho) {
  const { animacaoConcluida } = usePatio.getState();
  animacaoConcluida(g, g.tipo === "entrada" ? "estacionou" : "deixou-vaga");
  if (g.tipo === "saida") animacaoConcluida(g, "saiu");
}

/** a cena assina os gatilhos para animar entradas e saídas */
export function assinarGatilhos(fn: (g: Gatilho) => void) {
  ouvintesGatilho.add(fn);
  return () => ouvintesGatilho.delete(fn);
}

export const usePatio = create<PatioState>()(
  subscribeWithSelector((set, get) => ({
    pronto: false,
    simulada: true,
    vagas: {},
    ocupantes: {},
    gates: [],
    eventos: [],
    camerasOffline: [],
    contagem: vazia(),
    porSetor: Object.fromEntries(SETORES_VAGAS.map((s) => [s, vazia()])) as Record<SetorVagas, Contagem>,
    iniciar: (fonte) => {
      fonteAtual = fonte;
      const s = fonte.snapshot();
      set({ pronto: true, simulada: fonte.simulada, vagas: { ...s.vagas }, ocupantes: { ...s.ocupantes }, gates: s.gates.map((g) => ({ ...g })), eventos: s.eventos, camerasOffline: s.camerasOffline, ...contar(s.vagas) });
      const desassinar = fonte.assinar((m: Mudanca) => {
        switch (m.tipo) {
          case "vaga": {
            const vagas = { ...get().vagas, [m.vagaId]: m.estado };
            set({ vagas, ...contar(vagas) });
            break;
          }
          case "ocupante": set({ ocupantes: { ...get().ocupantes, [m.ocupante.id]: m.ocupante } }); break;
          case "ocupante-removido": { const o = { ...get().ocupantes }; delete o[m.ocupanteId]; set({ ocupantes: o }); break; }
          case "gate": set({ gates: get().gates.map((g) => (g.numero === m.gate.numero ? m.gate : g)) }); break;
          case "evento": set({ eventos: [m.evento, ...get().eventos].slice(0, 60) }); break;
          case "camera": set({ camerasOffline: m.online ? get().camerasOffline.filter((n) => n !== m.numero) : [...get().camerasOffline, m.numero] }); break;
          case "gatilho": for (const fn of ouvintesGatilho) fn(m.gatilho); break;
        }
      });
      fonte.iniciar();
      return () => { desassinar(); fonte.parar(); };
    },
    acaoVaga: (vagaId, acao) => fonteAtual?.acaoVaga(vagaId, acao) ?? { ok: false, motivo: "Sem fonte de dados" },
    atribuirEntrada: (vagaId, placa) => fonteAtual?.atribuirEntrada(vagaId, placa) ?? { ok: false, motivo: "Sem fonte de dados" },
    alternarGate: (numero) => fonteAtual?.alternarGate(numero) ?? { ok: false, motivo: "Sem fonte de dados" },
    animacaoConcluida: (g, fase) => fonteAtual?.animacaoConcluida(g, fase),
  })),
);
