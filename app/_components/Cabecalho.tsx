"use client";
// Cabeçalho (componentes do vídeo de referência): busca global (ícone que expande, atalho "/"), relógio ao vivo
// num container próprio e, noutro, Modo TV (só 3D), tema, alarmes e eventos (sino) e usuário. Os dois usam a superfície
// do painel Pátio/Gates para ter contraste sobre o mapa.
// O logo fica no topo do painel Pátio/Gates.
import { Moon, Sun, Video } from "lucide-react";
import { hora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { useUi } from "@/lib/store/ui";
import { Atividade } from "./Atividade";
import { Busca } from "./Busca";
import { useTipoMapa } from "./conceito";
import { ICONE_CABECALHO, Ponto, cx } from "./ui";

function Divisor() {
  return <span aria-hidden className="mx-4 h-24 w-px shrink-0 bg-text-3/40" />;
}

export function Cabecalho({ className, usuario }: { className?: string; usuario: { nome: string; perfil: string } }) {
  const tema = useUi((s) => s.tema);
  const modoTv = useUi((s) => s.modoTv);
  const visao = useUi((s) => s.blocos.visao);
  // Modo TV só existe no 3D
  const plano = useTipoMapa() === "plano";
  const agora = useRelogio();

  return (
    <div className={cx("pointer-events-none flex h-64 items-center gap-12 [&>*]:pointer-events-auto", className)} aria-label="Cabeçalho">
      {/* busca logo à direita do painel de informações (que ocupa a coluna esquerda até o topo) */}
      <div className={cx(visao !== "oculto" && "xl:ml-[360px]", "max-xl:ml-56")}><Busca /></div>
      {/* relógio ao vivo num container próprio; ações e usuário noutro */}
      <span className="ml-auto flex h-48 shrink-0 items-center gap-8 rounded-full bg-panel px-16 text-[13px] font-semibold leading-20 text-text shadow-clay vidro">
        <Ponto cor="var(--live)" redondo pulso />
        <span className="max-md:hidden">Ao vivo</span>
        <span className="tnum font-medium text-text-2">{agora ? hora(agora) : "--:--:--"}</span>
      </span>
      <div className="flex h-48 shrink-0 items-center gap-4 rounded-full bg-panel px-4 shadow-clay vidro">
        {!plano && (
          <button type="button" aria-label="Modo TV" title="Modo TV" aria-pressed={modoTv} onClick={() => useUi.getState().setModoTv(!modoTv)}
            className={cx(ICONE_CABECALHO, "max-md:hidden", modoTv && "bg-accent text-accent-ink hover:bg-accent-hover")}>
            <Video size={18} />
          </button>
        )}
        <button type="button" aria-label={tema === "escuro" ? "Tema claro" : "Tema escuro"} title={tema === "escuro" ? "Tema claro" : "Tema escuro"}
          onClick={() => useUi.getState().setTema(tema === "escuro" ? "claro" : "escuro")}
          className={ICONE_CABECALHO}>
          {tema === "escuro" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Atividade />
        <Divisor />
        <span className="flex h-40 items-center gap-8 pr-12 pl-4 max-xl:pr-4">
          <span className="flex size-32 items-center justify-center rounded-full bg-chip text-[12px] font-semibold leading-16 text-text">{usuario.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          <span className="hidden xl:block">
            <span className="block text-[13px] font-semibold leading-16 text-text">{usuario.nome}</span>
            <span className="block text-[12px] leading-16 text-text-2">{usuario.perfil}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
