"use client";
// Barra de controles do mapa (Imagem 1): aproximar, afastar, girar 45° (só no 3D), camadas do mapa e voltar à vista inicial.
import { House, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useUi } from "@/lib/store/ui";
import { useTipoMapa } from "./conceito";
import { MenuCamadas } from "./MenuCamadas";
import { BotaoIcone, Painel, cx } from "./ui";

export function ControlesMapa({ className }: { className?: string }) {
  const ui = useUi.getState;
  const plano = useTipoMapa() === "plano";
  return (
    <Painel pill className={cx("flex w-64 flex-col gap-8 p-8", className)} aria-label="Controles do mapa">
      <BotaoIcone rotulo="Aproximar" onClick={() => ui().comandar("zoom-in")}><Plus size={20} /></BotaoIcone>
      <BotaoIcone rotulo="Afastar" onClick={() => ui().comandar("zoom-out")}><Minus size={20} /></BotaoIcone>
      {!plano && <BotaoIcone rotulo="Girar à esquerda" onClick={() => ui().comandar("girar-esq")}><RotateCcw size={20} /></BotaoIcone>}
      {!plano && <BotaoIcone rotulo="Girar à direita" onClick={() => ui().comandar("girar-dir")}><RotateCw size={20} /></BotaoIcone>}
      <MenuCamadas />
      <BotaoIcone rotulo="Visão geral" principal onClick={() => { ui().selecionar(null); ui().focar({ tipo: "home" }); }}><House size={20} /></BotaoIcone>
    </Painel>
  );
}
