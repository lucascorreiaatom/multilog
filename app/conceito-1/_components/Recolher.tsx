"use client";
// Botão de recolher/expandir um bloco da tela (o estado fica salvo no navegador).
import { ChevronDown, ChevronUp } from "lucide-react";
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
      className="flex size-32 items-center justify-center rounded-full text-text-2 hover:bg-chip hover:text-text"
    >
      {recolhido ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
    </button>
  );
}
