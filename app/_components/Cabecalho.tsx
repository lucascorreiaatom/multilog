"use client";
// Cabeçalho (componentes do vídeo de referência): busca global (ícone que expande, atalho "/"), relógio ao vivo,
// alarmes e eventos (sino), tema e usuário. A unidade é rótulo fixo: existe um único recinto.
import { Focus, Moon, Sun, Tv } from "lucide-react";
import { hora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { useUi } from "@/lib/store/ui";
import { Atividade } from "./Atividade";
import { Busca } from "./Busca";
import { Logo } from "./Logo";
import { useTipoMapa } from "./conceito";
import { Ponto, cx } from "./ui";

export function Cabecalho({ className, usuario }: { className?: string; usuario: { nome: string; perfil: string } }) {
  const tema = useUi((s) => s.tema);
  const modoTv = useUi((s) => s.modoTv);
  const foco = useUi((s) => s.foco);
  const visao = useUi((s) => s.blocos.visao);
  // Modo TV só existe no 3D; o Modo foco vale nos dois mapas
  const plano = useTipoMapa() === "plano";
  const agora = useRelogio();

  return (
    <div className={cx("pointer-events-none flex h-64 items-center gap-12 [&>*]:pointer-events-auto", className)} aria-label="Cabeçalho">
      {/* busca logo à direita do painel de informações (que ocupa a coluna esquerda até o topo) */}
      <div className={cx(visao === "oculto" || foco ? "" : "xl:ml-[360px]", !foco && "max-xl:ml-56")}><Busca /></div>
      <div className="ml-auto flex shrink-0 items-center gap-12">
        <span className="inline-flex h-32 items-center gap-8 rounded-full bg-card px-12 text-[13px] font-semibold leading-20 text-text shadow-card vidro">
          <Ponto cor="var(--live)" redondo pulso />
          <span className="max-md:hidden">Ao vivo</span>
          <span aria-hidden className="h-16 w-px bg-text-3/40 max-md:hidden" />
          <span className="tnum font-medium text-text-2">{agora ? hora(agora) : "--:--:--"}</span>
        </span>
        {!plano && (
          <button type="button" aria-label="Modo TV" title="Modo TV" aria-pressed={modoTv} onClick={() => useUi.getState().setModoTv(!modoTv)}
            className={cx("flex size-40 max-md:hidden items-center justify-center rounded-full shadow-card", modoTv ? "bg-accent text-accent-ink" : "bg-card text-text hover:bg-card-muted")}>
            <Tv size={18} />
          </button>
        )}
        <button type="button" aria-label="Modo foco" title="Modo foco: mapa neutro, sem painéis; o detalhe abre ao clicar numa vaga" aria-pressed={foco} onClick={() => useUi.getState().setFoco(!foco)}
          className={cx("flex h-40 items-center gap-8 rounded-full px-12 text-[13px] font-semibold leading-20 shadow-card", foco ? "bg-accent text-accent-ink" : "bg-card text-text hover:bg-card-muted")}>
          <Focus size={18} /><span className="max-2xl:hidden">Modo foco</span>
        </button>
        <button type="button" aria-label={tema === "escuro" ? "Tema claro" : "Tema escuro"} title={tema === "escuro" ? "Tema claro" : "Tema escuro"}
          onClick={() => useUi.getState().setTema(tema === "escuro" ? "claro" : "escuro")}
          className="flex size-40 items-center justify-center rounded-full bg-card text-text shadow-card vidro hover:bg-card-muted">
          {tema === "escuro" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Atividade />
        <span className="flex h-48 items-center gap-12 rounded-full bg-card pr-16 pl-8 shadow-card vidro max-xl:pr-8">
          <span className="flex size-32 items-center justify-center rounded-full bg-chip text-[12px] font-semibold leading-16 text-text">{usuario.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          <span className="hidden xl:block">
            <span className="block text-[13px] font-semibold leading-16 text-text">{usuario.nome}</span>
            <span className="block text-[12px] leading-16 text-text-2">{usuario.perfil}</span>
          </span>
        </span>
        {/* logo no extremo direito, na altura do pill de usuário, sobre vidro e nunca direto sobre o canvas 3D (regra do Brand Book) */}
        <span className="flex h-48 items-center rounded-full bg-card px-20 shadow-card vidro max-md:hidden">
          <Logo altura={24} />
        </span>
      </div>
    </div>
  );
}
