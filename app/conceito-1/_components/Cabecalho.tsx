"use client";
// Cabeçalho (componentes do vídeo de referência): busca global (ícone que expande, atalho "/"), relógio ao vivo,
// alarmes operacionais, tema e usuário. A unidade é rótulo fixo: existe um único recinto.
import { Bell, Focus, Moon, Sun, Tv } from "lucide-react";
import { hora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { PERMANENCIA_MAX_H } from "@/lib/patio/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { Busca } from "./Busca";
import { Ponto, cx } from "./ui";

export function Cabecalho({ className, usuario }: { className?: string; usuario: { nome: string; perfil: string } }) {
  const tema = useUi((s) => s.tema);
  const modoTv = useUi((s) => s.modoTv);
  const foco = useUi((s) => s.foco);
  const visao = useUi((s) => s.blocos.visao);
  const offline = usePatio((s) => s.camerasOffline);
  const ocupantes = usePatio((s) => s.ocupantes);
    const agora = useRelogio();
  const excedidos = agora ? Object.values(ocupantes).filter((o) => agora - o.horaEntrada > PERMANENCIA_MAX_H * 3600_000).length : 0;
  const alarmes = offline.length + (excedidos > 0 ? 1 : 0);

  return (
    <div className={cx("pointer-events-none flex h-64 items-center gap-12 [&>*]:pointer-events-auto", className)} aria-label="Cabeçalho">
      {/* busca logo à direita do painel de informações (que ocupa a coluna esquerda até o topo) */}
      <div className={cx(visao === "oculto" ? "" : "xl:ml-[360px]", "max-xl:ml-56")}><Busca /></div>
      <div className="ml-auto flex shrink-0 items-center gap-12">
        <span className="inline-flex h-32 items-center gap-8 rounded-full bg-card px-12 text-[13px] font-semibold leading-20 text-text shadow-card vidro">
          <Ponto cor="var(--live)" redondo pulso />
          <span className="max-md:hidden">Ao vivo</span>
          <span aria-hidden className="h-16 w-px bg-text-3/40 max-md:hidden" />
          <span className="tnum font-medium text-text-2">{agora ? hora(agora) : "--:--:--"}</span>
        </span>
        <button type="button" aria-label="Modo TV" title="Modo TV" aria-pressed={modoTv} onClick={() => useUi.getState().setModoTv(!modoTv)}
          className={cx("flex size-40 max-md:hidden items-center justify-center rounded-full shadow-card", modoTv ? "bg-dark text-on-dark" : "bg-card text-text hover:bg-card-muted")}>
          <Tv size={18} />
        </button>
        <button type="button" aria-label="Modo foco" title="Modo foco: cena neutra, só o essencial em cor" aria-pressed={foco} onClick={() => useUi.getState().setFoco(!foco)}
          className={cx("flex h-40 items-center gap-8 rounded-full px-12 text-[13px] font-semibold leading-20 shadow-card", foco ? "bg-dark text-on-dark" : "bg-card text-text hover:bg-card-muted")}>
          <Focus size={18} /><span className="max-2xl:hidden">Modo foco</span>
        </button>
        <button type="button" aria-label={tema === "escuro" ? "Tema claro" : "Tema escuro"} title={tema === "escuro" ? "Tema claro" : "Tema escuro"}
          onClick={() => useUi.getState().setTema(tema === "escuro" ? "claro" : "escuro")}
          className="flex size-40 items-center justify-center rounded-full bg-card text-text shadow-card vidro hover:bg-card-muted">
          {tema === "escuro" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" aria-label={`Alarmes operacionais: ${alarmes}`} title={`${offline.length} câmera(s) offline · ${excedidos} permanência(s) excedida(s)`}
          className="relative flex size-40 items-center justify-center rounded-full bg-card text-text shadow-card vidro hover:bg-card-muted">
          <Bell size={18} />
          {alarmes > 0 && <span className="absolute top-8 right-8 size-8 rounded-full bg-st-ocupada ring-2 ring-card" />}
        </button>
        <span className="flex h-48 items-center gap-12 rounded-full bg-card pr-16 pl-8 shadow-card vidro max-xl:pr-8">
          <span className="flex size-32 items-center justify-center rounded-full bg-chip text-[12px] font-semibold leading-16 text-text">{usuario.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          <span className="hidden xl:block">
            <span className="block text-[13px] font-semibold leading-16 text-text">{usuario.nome}</span>
            <span className="block text-[12px] leading-16 text-text-3">{usuario.perfil}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
