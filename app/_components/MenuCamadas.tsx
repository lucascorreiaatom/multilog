"use client";
// Menu "Camadas do mapa" (nos controles do mapa): liga/desliga o que aparece sobre o mapa e os painéis.
import * as Popover from "@radix-ui/react-popover";
import { Check, Layers } from "lucide-react";
import { useUi, type Bloco } from "@/lib/store/ui";
import { useTipoMapa } from "./conceito";
import { BotaoIcone, cx } from "./ui";

type Item = { id: Bloco | "cobertura"; nome: string };
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "No mapa",
    itens: [
      { id: "cobertura", nome: "Cobertura das câmeras" },
      { id: "marcadores", nome: "Marcadores de câmera" },
      { id: "callouts", nome: "Resumo dos setores" },
      { id: "predios", nome: "Nomes dos prédios" },
    ],
  },
  {
    titulo: "Painéis",
    itens: [
      { id: "visao", nome: "Pátio e gates" },
      { id: "camera", nome: "Câmera ao vivo" },
    ],
  },
];
const BLOCOS = GRUPOS.flatMap((g) => g.itens.map((i) => i.id)).filter((id): id is Bloco => id !== "cobertura");

export function MenuCamadas() {
  const blocos = useUi((s) => s.blocos);
  const cobertura = useUi((s) => s.cobertura);
  // o mapa plano não desenha os cones de visão das câmeras
  const plano = useTipoMapa() === "plano";
  const grupos = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => !(plano && i.id === "cobertura")) }));
  const ligado = (id: Item["id"]) => (id === "cobertura" ? cobertura : blocos[id] !== "oculto");
  const alternar = (id: Item["id"]) => {
    const ui = useUi.getState();
    if (id === "cobertura") ui.setCobertura(!cobertura);
    else ui.setBloco(id, ligado(id) ? "oculto" : "aberto");
  };
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <BotaoIcone rotulo="Camadas do mapa"><Layers size={20} /></BotaoIcone>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="left" align="end" sideOffset={12} className="z-50 w-[288px] rounded-[16px] bg-panel p-8 shadow-float vidro">
          <p className="px-8 pt-4 text-[14px] font-semibold leading-20 text-text">Camadas do mapa</p>
          {grupos.map((g) => (
            <div key={g.titulo} className="mt-8">
              <p className="px-8 pb-4 text-[12px] font-semibold leading-16 text-text-2">{g.titulo}</p>
              <ul className="flex flex-col gap-4">
                {g.itens.map((i) => (
                  <li key={i.id}>
                    <button type="button" role="menuitemcheckbox" aria-checked={ligado(i.id)} onClick={() => alternar(i.id)}
                      className="flex h-40 w-full items-center gap-12 rounded-[10px] px-8 text-left text-[13px] leading-20 text-text hover:bg-chip">
                      <span className={cx("flex size-20 items-center justify-center rounded-[6px]", ligado(i.id) ? "bg-dark text-on-dark" : "bg-chip")}>{ligado(i.id) && <Check size={14} />}</span>
                      {i.nome}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-8 flex gap-8 px-4 pb-4">
            <button type="button" onClick={() => BLOCOS.forEach((b) => useUi.getState().setBloco(b, "aberto"))} className="h-40 flex-1 rounded-full bg-card text-[13px] font-semibold leading-20 text-text shadow-card hover:bg-card-muted">Mostrar todos</button>
            <button type="button" onClick={() => BLOCOS.forEach((b) => useUi.getState().setBloco(b, "oculto"))} className="h-40 flex-1 rounded-full bg-card text-[13px] font-semibold leading-20 text-text shadow-card hover:bg-card-muted">Só o mapa</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
