"use client";
// Barra de controles do mapa (Imagem 1): aproximar, afastar, girar 45° e voltar à vista inicial.
import { House, Layers, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useUi } from "@/lib/store/ui";
import { BotaoIcone, Painel, cx } from "./ui";

export function ControlesMapa({ className }: { className?: string }) {
  const cobertura = useUi((s) => s.cobertura);
  const ui = useUi.getState;
  return (
    <Painel className={cx("flex w-64 flex-col gap-8 p-8", className)} aria-label="Controles do mapa">
      <BotaoIcone rotulo="Aproximar" onClick={() => ui().comandar("zoom-in")}><Plus size={20} /></BotaoIcone>
      <BotaoIcone rotulo="Afastar" onClick={() => ui().comandar("zoom-out")}><Minus size={20} /></BotaoIcone>
      <BotaoIcone rotulo="Girar à esquerda" onClick={() => ui().comandar("girar-esq")}><RotateCcw size={20} /></BotaoIcone>
      <BotaoIcone rotulo="Girar à direita" onClick={() => ui().comandar("girar-dir")}><RotateCw size={20} /></BotaoIcone>
      <BotaoIcone rotulo={cobertura ? "Ocultar cobertura das câmeras" : "Mostrar cobertura das câmeras"} ativo={cobertura} onClick={() => ui().setCobertura(!cobertura)}><Layers size={20} /></BotaoIcone>
      <BotaoIcone rotulo="Vista inicial" escuro onClick={() => { ui().selecionar(null); ui().focar({ tipo: "home" }); }}><House size={20} /></BotaoIcone>
    </Painel>
  );
}
