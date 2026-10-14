"use client";
// Coluna de controles do mapa (Imagem 1): seletor 2D/3D em cima e, abaixo, aproximar, afastar, girar 45° (só no 3D),
// camadas do mapa e voltar à vista inicial.
import { House, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useUi, type TipoMapa } from "@/lib/store/ui";
import { useTipoMapa } from "./conceito";
import { MenuCamadas } from "./MenuCamadas";
import { BotaoIcone, Painel, cx } from "./ui";

const MAPAS: { id: TipoMapa; nome: string; rotulo: string }[] = [
  { id: "3d", nome: "3D", rotulo: "Mapa 3D" },
  { id: "plano", nome: "2D", rotulo: "Mapa 2D, visto de cima" },
];

export function ControlesMapa({ className }: { className?: string }) {
  const ui = useUi.getState;
  const tipo = useTipoMapa();
  const plano = tipo === "plano";
  return (
    <div className={cx("flex w-64 flex-col gap-8", className)}>
      <Painel pill className="flex flex-col gap-4 p-8" role="radiogroup" aria-label="Tipo de mapa">
        {MAPAS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={tipo === m.id} aria-label={m.rotulo} title={m.rotulo}
            onClick={() => ui().setMapa(m.id)}
            className={cx("flex size-48 items-center justify-center rounded-full text-[14px] font-semibold leading-20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
              tipo === m.id ? "bg-accent text-accent-ink" : "text-text-2 hover:bg-chip hover:text-text")}>
            {m.nome}
          </button>
        ))}
      </Painel>
      <Painel pill className="flex flex-col gap-8 p-8" aria-label="Controles do mapa">
        <BotaoIcone rotulo="Aproximar" onClick={() => ui().comandar("zoom-in")}><Plus size={20} /></BotaoIcone>
        <BotaoIcone rotulo="Afastar" onClick={() => ui().comandar("zoom-out")}><Minus size={20} /></BotaoIcone>
        {!plano && <BotaoIcone rotulo="Girar à esquerda" onClick={() => ui().comandar("girar-esq")}><RotateCcw size={20} /></BotaoIcone>}
        {!plano && <BotaoIcone rotulo="Girar à direita" onClick={() => ui().comandar("girar-dir")}><RotateCw size={20} /></BotaoIcone>}
        <MenuCamadas />
        <BotaoIcone rotulo="Visão geral" principal onClick={() => { ui().selecionar(null); ui().focar({ tipo: "home" }); }}><House size={20} /></BotaoIcone>
      </Painel>
    </div>
  );
}
