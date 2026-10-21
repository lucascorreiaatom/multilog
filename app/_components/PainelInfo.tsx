"use client";
// Painel de informações (esquerda): logo Multilog no topo (sobre a superfície do painel, nunca sobre o canvas)
// e abas "Pátio" e "Gates" no mesmo bloco, uma de cada vez.
import { useUi, type AbaInfo } from "@/lib/store/ui";
import { ConteudoGates } from "./GatesEventos";
import { Logo } from "./Logo";
import { BotaoRecolher } from "./Recolher";
import { Painel, cx } from "./ui";
import { ConteudoPatio } from "./VisaoPatio";

const ABAS: { id: AbaInfo; nome: string }[] = [
  { id: "patio", nome: "Pátio" },
  { id: "gates", nome: "Gates" },
];

export function PainelInfo({ className, ...rest }: { className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const aba = useUi((s) => s.abaInfo);
  const recolhido = useUi((s) => s.blocos.visao === "recolhido");
  const abrir = (id: AbaInfo) => {
    const ui = useUi.getState();
    ui.setAbaInfo(id);
    if (recolhido) ui.setBloco("visao", "aberto");
  };

  return (
    <Painel className={cx("flex flex-col overflow-hidden", className)} aria-label="Informações do pátio" {...rest}>
      {/* linha da marca: logo à esquerda e recolher à direita, na mesma altura */}
      <div className="flex h-56 shrink-0 items-center justify-between pr-8 pl-20">
        <Logo altura={24} />
        <BotaoRecolher bloco="visao" nome="painel de informações" />
      </div>
      <div className={cx("flex shrink-0 items-start px-20 transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", recolhido ? "h-56" : "h-48")}>
        {/* abas em trilho pill: a ativa vira um chip claro sobre o trilho */}
        <div role="tablist" aria-label="Informações" className="flex h-40 flex-1 items-center gap-4 rounded-full bg-chip p-4">
          {ABAS.map((a) => (
            <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-info" onClick={() => abrir(a.id)}
              className={cx("h-32 flex-1 rounded-full px-16 text-[14px] font-semibold leading-20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
                aba === a.id ? "bg-card text-text shadow-card" : "text-text-2 hover:text-text")}>
              {a.nome}
            </button>
          ))}
        </div>
      </div>
      {/* conteúdo fica montado e esvanece enquanto a altura anima (desmontar fazia ele sumir antes do painel encolher);
          recolhido fica inerte, fora do foco e do leitor de tela */}
      <div id="painel-info" role="tabpanel" aria-labelledby={`aba-${aba}`} inert={recolhido}
        className={cx("flex min-h-0 flex-1 flex-col pt-8 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", recolhido && "opacity-0")}>
        {aba === "patio" ? <ConteudoPatio /> : <ConteudoGates />}
      </div>
    </Painel>
  );
}
