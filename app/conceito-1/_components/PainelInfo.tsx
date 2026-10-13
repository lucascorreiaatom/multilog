"use client";
// Painel de informações (esquerda): abas "Pátio" e "Gates" no mesmo bloco, uma de cada vez.
import { useUi, type AbaInfo } from "@/lib/store/ui";
import { ConteudoGates } from "./GatesEventos";
import { BotaoRecolher } from "./Recolher";
import { Painel, cx } from "./ui";
import { ConteudoPatio } from "./VisaoPatio";

const ABAS: { id: AbaInfo; nome: string }[] = [
  { id: "patio", nome: "Pátio" },
  { id: "gates", nome: "Gates" },
];

export function PainelInfo({ className }: { className?: string }) {
  const aba = useUi((s) => s.abaInfo);
  const recolhido = useUi((s) => s.blocos.visao === "recolhido");
  const abrir = (id: AbaInfo) => {
    const ui = useUi.getState();
    ui.setAbaInfo(id);
    if (recolhido) ui.setBloco("visao", "aberto");
  };

  return (
    <Painel pill={recolhido} className={cx("flex flex-col overflow-hidden", className)} aria-label="Informações do pátio">
      <div className={cx("flex shrink-0 items-center gap-8 px-12", recolhido ? "h-64" : "h-64 pt-4")}>
        {/* abas em trilho pill: a ativa vira um chip claro sobre o trilho */}
        <div role="tablist" aria-label="Informações" className="flex h-40 items-center gap-4 rounded-full bg-chip p-4">
          {ABAS.map((a) => (
            <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-info" onClick={() => abrir(a.id)}
              className={cx("h-32 rounded-full px-16 text-[14px] font-semibold leading-20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
                aba === a.id ? "bg-card text-text shadow-card" : "text-text-2 hover:text-text")}>
              {a.nome}
            </button>
          ))}
        </div>
        <span className="ml-auto" />
        <BotaoRecolher bloco="visao" nome="painel de informações" />
      </div>
      {!recolhido && (
        <>
          <div id="painel-info" role="tabpanel" aria-labelledby={`aba-${aba}`} className="flex min-h-0 flex-1 flex-col pt-4">
            {aba === "patio" ? <ConteudoPatio /> : <ConteudoGates />}
          </div>
        </>
      )}
    </Painel>
  );
}
