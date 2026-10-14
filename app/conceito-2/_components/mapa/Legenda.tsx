"use client";
// Legenda fixa sobre o mapa plano: o que cada cor significa, sem precisar abrir o painel. Cada item filtra o mapa
// (o mesmo filtro dos status no painel Pátio) e explica o status em uma linha ao passar o mouse.
import { X } from "lucide-react";
import { ORDEM_STATUS, STATUS } from "@/lib/patio/tipos";
import { useUi } from "@/lib/store/ui";
import { Ponto, cx } from "@/app/_components/ui";

export function Legenda() {
  const filtro = useUi((s) => s.filtroStatus);
  const painel = useUi((s) => s.blocos.visao);
  // o cartão de detalhe (vaga, gate, prédio) ocupa a coluna da direita a partir do topo da legenda
  const detalhe = useUi((s) => !!s.selecao && s.selecao.tipo !== "setor" && s.selecao.tipo !== "camera");
  return (
    <div data-ocupa="topo" aria-label="Legenda das vagas"
      className={cx("pointer-events-none absolute top-88 z-10 flex flex-wrap items-center gap-8 *:pointer-events-auto max-xl:top-136", painel === "oculto" ? "left-16" : "left-16 xl:left-[376px]", detalhe ? "right-16 lg:right-[376px]" : "right-16")}>
      {ORDEM_STATUS.map((s) => {
        const ativo = filtro.includes(s), apagado = filtro.length > 0 && !ativo;
        return (
          <button key={s} type="button" aria-pressed={ativo} title={`${STATUS[s].descricao}. Selecione para ${ativo ? "tirar do" : "mostrar no"} filtro do mapa.`}
            onClick={() => useUi.getState().alternarFiltro(s)}
            className={cx("flex h-32 items-center gap-8 rounded-full px-12 text-[13px] font-semibold leading-20 shadow-card outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent",
              ativo ? "bg-dark text-on-dark" : "bg-panel text-text hover:bg-card", apagado && "opacity-60")}>
            <Ponto cor={STATUS[s].cor} tamanho={10} redondo />{STATUS[s].curto}
          </button>
        );
      })}
      {filtro.length > 0 && (
        <button type="button" onClick={() => useUi.getState().limparFiltro()}
          className="flex h-32 items-center gap-4 rounded-full bg-panel px-12 text-[13px] font-semibold leading-20 text-text shadow-card outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-accent">
          <X size={14} />Limpar filtro
        </button>
      )}
    </div>
  );
}
