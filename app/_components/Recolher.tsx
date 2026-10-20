"use client";
// Botão de recolher/expandir um bloco da tela (o estado fica salvo no navegador).
import { ChevronUp } from "lucide-react";
import { cx } from "./ui";
import { useUi, type Bloco } from "@/lib/store/ui";

export function BotaoRecolher({ bloco, nome }: { bloco: Bloco; nome: string }) {
  const estado = useUi((s) => s.blocos[bloco]);
  const recolhido = estado === "recolhido";
  return (
    <button
      type="button"
      aria-expanded={!recolhido}
      aria-label={recolhido ? `Expandir ${nome}` : `Recolher ${nome}`}
      title={recolhido ? "Expandir" : "Recolher"}
      onClick={() => useUi.getState().setBloco(bloco, recolhido ? "aberto" : "recolhido")}
      className="flex size-40 items-center justify-center rounded-full text-text-2 hover:bg-chip hover:text-text"
    >
      {/* gira em vez de trocar de ícone, no mesmo tempo da animação do bloco */}
      <ChevronUp size={18} className={cx("transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", recolhido && "rotate-180")} />
    </button>
  );
}
