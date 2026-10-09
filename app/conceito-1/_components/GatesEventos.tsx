"use client";
// Painel direito (Imagem 1): Gates com sentido e operação (SoW) e Eventos recentes.
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { hora } from "@/lib/formato";
import { STATUS } from "@/lib/patio/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { BotaoRecolher } from "./Recolher";
import { AreaRolagem, Painel, Ponto, Titulo, cx } from "./ui";

const SENTIDO = { entrada: "Entrada", saida: "Saída", reversivel: "Reversível" } as const;
const OPERACAO = { importacao: "Importação", exportacao: "Exportação" } as const;

export function GatesEventos({ className }: { className?: string }) {
  const gates = usePatio((s) => s.gates);
  const eventos = usePatio((s) => s.eventos);
  const selecao = useUi((s) => s.selecao);
  const recolhido = useUi((s) => s.blocos.gates === "recolhido");
  return (
    <Painel className={cx("flex flex-col overflow-hidden", className)} aria-label="Gates e eventos">
      <div className="flex h-64 shrink-0 items-center gap-8 px-16">
        <Titulo>Gates</Titulo>
        <span className="ml-auto" />
        <BotaoRecolher bloco="gates" nome="Gates e eventos" />
        <button
          type="button"
          onClick={() => useUi.getState().focar({ tipo: "gate", numero: 1 })}
          className="h-36 rounded-[12px] bg-card px-16 text-[13px] font-semibold leading-20 text-text shadow-card hover:bg-card-muted"
        >
          Ver no mapa
        </button>
      </div>
      {!recolhido && <AreaRolagem className="flex min-h-0 flex-1 flex-col px-16 pb-16">
        <ul className="flex flex-col gap-12">
          {gates.map((g) => {
            const Icone = g.sentido === "entrada" ? ArrowDown : g.sentido === "saida" ? ArrowUp : ArrowDownUp;
            const ativo = selecao?.tipo === "gate" && selecao.numero === g.numero;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => { useUi.getState().selecionar({ tipo: "gate", numero: g.numero }); useUi.getState().focar({ tipo: "gate", numero: g.numero }); }}
                  className={cx("flex h-48 w-full items-center gap-12 rounded-[16px] bg-card px-12 text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-accent", ativo && "ring-2 ring-accent")}
                >
                  <span className="flex size-32 shrink-0 items-center justify-center rounded-[10px] bg-chip text-text"><Icone size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-20 text-text">Gate {g.numero}</span>
                    <span className="block truncate text-[12px] leading-16 text-text-2">{SENTIDO[g.sentido]} · {OPERACAO[g.operacao]}</span>
                  </span>
                  <span className={cx("inline-flex h-28 items-center rounded-[14px] px-12 text-[12px] font-semibold leading-16", g.aberto ? "bg-[color-mix(in_srgb,var(--st-livre)_16%,transparent)] text-st-livre" : "bg-chip text-text-2")}>
                    {g.aberto ? "Aberto" : "Fechado"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-20 mb-8 text-[14px] font-semibold leading-20 text-text">Eventos recentes</h3>
        <ul className="flex flex-col" aria-live="polite">
          {eventos.slice(0, 14).map((e) => (
            <li key={e.id}>
              <button
                type="button"
                disabled={!e.vagaId}
                onClick={() => { if (e.vagaId) { useUi.getState().selecionar({ tipo: "vaga", id: e.vagaId }); useUi.getState().focar({ tipo: "vaga", id: e.vagaId }); } }}
                className="grid h-32 w-full grid-cols-[16px_88px_1fr_auto] items-center rounded-[8px] px-4 text-left hover:bg-chip disabled:hover:bg-transparent"
              >
                <Ponto cor={e.status ? STATUS[e.status].cor : "var(--text-3)"} redondo />
                <span className="truncate text-[13px] font-semibold leading-20 text-text">{e.vagaId ?? (e.gate ? `Gate ${e.gate}` : "Sistema")}</span>
                <span className="truncate text-[13px] leading-20 text-text-2">{e.texto}</span>
                <span className="tnum pl-8 text-[12px] leading-16 text-text-3">{hora(e.hora)}</span>
              </button>
            </li>
          ))}
        </ul>
      </AreaRolagem>}
    </Painel>
  );
}
