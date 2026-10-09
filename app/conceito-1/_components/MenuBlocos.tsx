"use client";
// Menu "Blocos da tela": mostra, recolhe ou oculta cada bloco sobre o mapa.
import * as Popover from "@radix-ui/react-popover";
import { Check, PanelsTopLeft } from "lucide-react";
import { useUi, type Bloco } from "@/lib/store/ui";
import { cx } from "./ui";

const ITENS: { id: Bloco; nome: string }[] = [
  { id: "visao", nome: "Visão do pátio" },
  { id: "gates", nome: "Gates e eventos" },
  { id: "camera", nome: "Câmera ao vivo" },
  { id: "controles", nome: "Controles do mapa" },
  { id: "callouts", nome: "Resumo dos setores no mapa" },
  { id: "marcadores", nome: "Marcadores de câmera" },
];

export function MenuBlocos() {
  const blocos = useUi((s) => s.blocos);
  const visiveis = ITENS.filter((i) => blocos[i.id] !== "oculto").length;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label="Blocos da tela" title="Blocos da tela"
          className="flex size-40 items-center justify-center rounded-[12px] bg-card text-text shadow-card vidro hover:bg-card-muted">
          <PanelsTopLeft size={18} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[288px] rounded-[16px] bg-panel p-8 shadow-float vidro">
          <p className="px-8 pt-4 pb-8 text-[12px] font-semibold leading-16 text-text-3">Blocos da tela · {visiveis} de {ITENS.length}</p>
          <ul className="flex flex-col gap-4">
            {ITENS.map((i) => {
              const ligado = blocos[i.id] !== "oculto";
              return (
                <li key={i.id}>
                  <button type="button" role="menuitemcheckbox" aria-checked={ligado}
                    onClick={() => useUi.getState().setBloco(i.id, ligado ? "oculto" : "aberto")}
                    className="flex h-40 w-full items-center gap-12 rounded-[10px] px-8 text-left text-[13px] leading-20 text-text hover:bg-chip">
                    <span className={cx("flex size-20 items-center justify-center rounded-[6px]", ligado ? "bg-dark text-on-dark" : "bg-chip")}>{ligado && <Check size={14} />}</span>
                    {i.nome}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex gap-8 px-4 pb-4">
            <button type="button" onClick={() => ITENS.forEach((i) => useUi.getState().setBloco(i.id, "aberto"))} className="h-32 flex-1 rounded-[10px] bg-card text-[12px] font-semibold leading-16 text-text shadow-card">Mostrar todos</button>
            <button type="button" onClick={() => ITENS.forEach((i) => useUi.getState().setBloco(i.id, i.id === "controles" ? "aberto" : "oculto"))} className="h-32 flex-1 rounded-[10px] bg-card text-[12px] font-semibold leading-16 text-text shadow-card">Só o mapa</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
