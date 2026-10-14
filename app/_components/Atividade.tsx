"use client";
// Sino do cabeçalho: alarmes operacionais (câmeras sem sinal, permanência excedida) e eventos recentes do pátio.
// Fica à vista em qualquer aba; um ponto no sino avisa: vermelho com alarme, acento quando há eventos novos.
import * as Popover from "@radix-ui/react-popover";
import { Bell, Clock, VideoOff } from "lucide-react";
import { useState } from "react";
import { todasCameras } from "@/lib/cameras/catalogo";
import { hora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { PERMANENCIA_MAX_H, STATUS } from "@/lib/patio/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { AreaRolagem, Ponto } from "./ui";

const secao = "px-8 pt-12 pb-4 text-[12px] font-semibold leading-16 text-text-2";
const linha = "flex h-40 w-full items-center gap-12 rounded-[10px] px-8 text-left text-[13px] leading-20 text-text hover:bg-chip";

function irParaVaga(id: string) {
  const ui = useUi.getState();
  ui.selecionar({ tipo: "vaga", id });
  ui.focar({ tipo: "vaga", id });
}

export function Atividade() {
  const offline = usePatio((s) => s.camerasOffline);
  const vagas = usePatio((s) => s.vagas);
  const ocupantes = usePatio((s) => s.ocupantes);
  const eventos = usePatio((s) => s.eventos);
  const agora = useRelogio();
  // eventos posteriores à última abertura contam como novos; os que já existiam ao carregar, não
  const [visto, setVisto] = useState(() => Date.now());
  const [aberto, setAberto] = useState(false);

  const excedidas = agora
    ? Object.entries(vagas).filter(([, e]) => e.ocupanteId && ocupantes[e.ocupanteId] && agora - ocupantes[e.ocupanteId].horaEntrada > PERMANENCIA_MAX_H * 3600_000).map(([id]) => id)
    : [];
  const alarmes = offline.length + (excedidas.length > 0 ? 1 : 0);
  const novos = aberto ? 0 : eventos.filter((e) => e.hora > visto).length;
  const abrir = (v: boolean) => {
    setAberto(v);
    if (eventos.length) setVisto((t) => Math.max(t, eventos[0].hora));
  };

  const rotulo = [`Alarmes operacionais: ${alarmes}`, novos > 0 && `${novos} eventos novos`].filter(Boolean).join(" · ");

  return (
    <Popover.Root open={aberto} onOpenChange={abrir}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={rotulo} title="Alarmes e eventos"
          className="relative flex size-40 items-center justify-center rounded-full bg-card text-text shadow-card vidro hover:bg-card-muted data-[state=open]:bg-card-muted">
          <Bell size={18} />
          {(alarmes > 0 || novos > 0) && <span className={`absolute top-8 right-8 size-8 rounded-full ring-2 ring-card ${alarmes > 0 ? "bg-st-ocupada" : "bg-accent"}`} />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={8} collisionPadding={16}
          className="animar-entrada z-50 flex max-h-[min(480px,calc(100vh-96px))] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] bg-panel shadow-float vidro">
          <p className="px-16 pt-16 pb-4 text-[14px] font-semibold leading-20 text-text">Alarmes e eventos</p>
          <AreaRolagem className="min-h-0 flex-1 px-8 pb-8">
            {alarmes > 0 && (
              <>
                <p className={secao}>Alarmes</p>
                <ul className="flex flex-col">
                  {offline.map((n) => {
                    const c = todasCameras.find((x) => x.numero === n);
                    return (
                      <li key={n}>
                        <button type="button" className={linha} onClick={() => {
                          const ui = useUi.getState();
                          ui.exibirCamera(n);
                          if (c?.tipo === "externa") { ui.selecionar({ tipo: "camera", numero: n }); ui.focar({ tipo: "camera", numero: n }); }
                          abrir(false);
                        }}>
                          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--st-ocupada)_14%,transparent)] text-st-ocupada"><VideoOff size={14} /></span>
                          <span className="tnum font-semibold">{c?.codigo ?? `Câmera ${n}`}</span>
                          <span className="truncate text-text-2">Sem sinal</span>
                        </button>
                      </li>
                    );
                  })}
                  {excedidas.length > 0 && (
                    <li>
                      <button type="button" className={linha} onClick={() => { irParaVaga(excedidas[0]); abrir(false); }}>
                        <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--st-ocupada)_14%,transparent)] text-st-ocupada"><Clock size={14} /></span>
                        <span className="tnum font-semibold">{excedidas.length} {excedidas.length === 1 ? "vaga" : "vagas"}</span>
                        <span className="truncate text-text-2">Permanência acima de {PERMANENCIA_MAX_H} h</span>
                      </button>
                    </li>
                  )}
                </ul>
              </>
            )}
            <p className={secao}>Eventos recentes</p>
            <ul className="flex flex-col" aria-live="polite">
              {eventos.slice(0, 20).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    disabled={!e.vagaId}
                    onClick={() => { if (e.vagaId) { irParaVaga(e.vagaId); abrir(false); } }}
                    className="grid h-32 w-full grid-cols-[16px_88px_1fr_auto] items-center rounded-[8px] px-8 text-left hover:bg-chip disabled:hover:bg-transparent"
                  >
                    <Ponto cor={e.status ? STATUS[e.status].cor : "var(--text-3)"} redondo />
                    <span className="truncate text-[13px] font-semibold leading-20 text-text">{e.vagaId ?? (e.gate ? `Gate ${e.gate}` : "Sistema")}</span>
                    <span className="truncate text-[13px] leading-20 text-text-2">{e.texto}</span>
                    <span className="tnum pl-8 text-[12px] leading-16 text-text-2">{hora(e.hora)}</span>
                  </button>
                </li>
              ))}
              {eventos.length === 0 && <li className="px-8 py-8 text-[13px] leading-20 text-text-2">Nenhum evento ainda</li>}
            </ul>
          </AreaRolagem>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
