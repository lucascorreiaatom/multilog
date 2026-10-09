"use client";
// Cabeçalho (componentes do vídeo de referência): marca, busca global com atalho "/", relógio ao vivo,
// alarmes operacionais, tema e usuário. A unidade é rótulo fixo: existe um único recinto.
import { Bell, Focus, Moon, Search, Sun, Tv } from "lucide-react";
import { hora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { PERMANENCIA_MAX_H } from "@/lib/patio/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { MenuBlocos } from "./MenuBlocos";
import { Ponto, cx } from "./ui";

export function Cabecalho({ className, usuario }: { className?: string; usuario: { nome: string; perfil: string } }) {
  const tema = useUi((s) => s.tema);
  const modoTv = useUi((s) => s.modoTv);
  const foco = useUi((s) => s.foco);
  const offline = usePatio((s) => s.camerasOffline);
  const ocupantes = usePatio((s) => s.ocupantes);
    const agora = useRelogio();
  const excedidos = agora ? Object.values(ocupantes).filter((o) => agora - o.horaEntrada > PERMANENCIA_MAX_H * 3600_000).length : 0;
  const alarmes = offline.length + (excedidos > 0 ? 1 : 0);

  return (
    <div className={cx("pointer-events-none flex h-56 items-center gap-12 [&>*]:pointer-events-auto", className)} aria-label="Cabeçalho">
      <button
        type="button"
        onClick={() => useUi.getState().setBusca(true)}
        className="flex h-48 w-[320px] min-w-0 items-center gap-8 rounded-[16px] bg-card px-16 shadow-clay vidro text-left text-[13px] leading-20 text-text-3 shadow-card hover:text-text-2"
        aria-label="Buscar placa, vaga ou câmera"
      >
        <Search size={16} />
        <span className="flex-1 truncate">Buscar placa, vaga ou câmera</span>
        <kbd className="flex size-24 items-center justify-center rounded-[6px] bg-chip text-[12px] font-semibold leading-16 text-text-2">/</kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-12">
        <MenuBlocos />
        <span className="inline-flex h-32 items-center gap-8 rounded-[16px] bg-card px-12 text-[13px] font-semibold leading-20 text-text shadow-card vidro">
          <Ponto cor="var(--live)" redondo /><span className="tnum"><span className="max-md:hidden">Ao vivo </span>{agora ? hora(agora) : "--:--:--"}</span>
        </span>
        <button type="button" aria-label="Modo TV" title="Modo TV" aria-pressed={modoTv} onClick={() => useUi.getState().setModoTv(!modoTv)}
          className={cx("flex size-40 max-md:hidden items-center justify-center rounded-[12px] shadow-card", modoTv ? "bg-dark text-on-dark" : "bg-card text-text hover:bg-card-muted")}>
          <Tv size={18} />
        </button>
        <button type="button" aria-label="Modo foco" title="Modo foco: cena neutra, só o essencial em cor" aria-pressed={foco} onClick={() => useUi.getState().setFoco(!foco)}
          className={cx("flex h-40 items-center gap-8 rounded-[12px] px-12 text-[13px] font-semibold leading-20 shadow-card", foco ? "bg-dark text-on-dark" : "bg-card text-text hover:bg-card-muted")}>
          <Focus size={18} /><span className="max-2xl:hidden">Modo foco</span>
        </button>
        <button type="button" aria-label={tema === "escuro" ? "Tema claro" : "Tema escuro"} title={tema === "escuro" ? "Tema claro" : "Tema escuro"}
          onClick={() => useUi.getState().setTema(tema === "escuro" ? "claro" : "escuro")}
          className="flex size-40 items-center justify-center rounded-[12px] bg-card text-text shadow-card vidro hover:bg-card-muted">
          {tema === "escuro" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" aria-label={`Alarmes operacionais: ${alarmes}`} title={`${offline.length} câmera(s) offline · ${excedidos} permanência(s) excedida(s)`}
          className="relative flex size-40 items-center justify-center rounded-[12px] bg-card text-text shadow-card vidro hover:bg-card-muted">
          <Bell size={18} />
          {alarmes > 0 && <span className="absolute top-8 right-8 size-8 rounded-full bg-st-ocupada ring-2 ring-card" />}
        </button>
        <span className="flex h-48 items-center gap-12 rounded-[16px] bg-card pr-16 pl-8 shadow-card vidro max-xl:pr-8">
          <span className="flex size-32 items-center justify-center rounded-[10px] bg-chip text-[12px] font-semibold leading-16 text-text">{usuario.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
          <span className="hidden xl:block">
            <span className="block text-[13px] font-semibold leading-16 text-text">{usuario.nome}</span>
            <span className="block text-[12px] leading-16 text-text-3">{usuario.perfil}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
