"use client";
// Card AO VIVO (Imagem 1): vídeo da câmera selecionada sobreposto ao mapa (SoW). Câmeras multissensor mostram as
// visões do modelo (PDF págs. 4 a 6) em grade: 4 sensores em 2x2, 2 lado a lado; clicar numa abre ela sozinha.
import { ChevronLeft, ChevronRight, LocateFixed, Maximize2, Minimize2, VideoOff, X } from "lucide-react";
import { useRef, type ComponentType, type ReactNode } from "react";
import { todasCameras, type Camera } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { dataHora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { BotaoIcone, Chip, Painel, cx } from "./ui";


const nomeLocal = (c: Camera) => (c.tipo === "externa" ? c.local : `${c.local}${c.nivel ? ` · ${c.nivel}` : ""}`);

/** vídeo da câmera: o mapa 3D fornece a transmissão renderizada; sem ele (mapa plano), o card mostra o aviso da integração */
export type VideoCamera = ComponentType<{ cam: Camera }>;

export function CardCamera({ className, Video }: { className?: string; Video?: VideoCamera }) {
  const numeroAtivo = useUi((s) => s.cameraAtiva);
  const sensor = useUi((s) => s.sensor);
  const grade = useUi((s) => s.grade);
  const ampliada = useUi((s) => s.cameraAmpliada);
  const ptz = useUi((s) => s.ptz);
  const offline = usePatio((s) => s.camerasOffline);
  const agora = useRelogio();
  const cam = todasCameras.find((c) => c.numero === numeroAtivo) ?? todasCameras[0];
  const mod = MODELOS[cam.modelo];
  const online = !offline.includes(cam.numero);
  const arrasto = useRef<{ x: number; y: number; pan: number; tilt: number } | null>(null);

  const idx = todasCameras.findIndex((c) => c.numero === cam.numero);
  const ir = (d: number) => {
    const prox = todasCameras[(idx + d + todasCameras.length) % todasCameras.length];
    useUi.getState().exibirCamera(prox.numero);
  };
  const ptzAtivo = mod.projecao === "ptz";
  const multi = mod.sensores > 1;
  /** sensores na tela: todos em grade ou só o escolhido */
  const visoes = multi && grade ? Array.from({ length: mod.sensores }, (_, i) => i) : [multi ? sensor : 0];
  const emGrade = visoes.length > 1;

  const botaoAmpliar = (
    <BotaoIcone rotulo={ampliada ? "Reduzir imagem" : "Ampliar imagem"} compacto onClick={() => useUi.getState().setAmpliada(!ampliada)}>
      {ampliada ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </BotaoIcone>
  );
  const setas = (
    <>
      <BotaoIcone rotulo="Câmera anterior" compacto onClick={() => ir(-1)}><ChevronLeft size={20} /></BotaoIcone>
      <BotaoIcone rotulo="Próxima câmera" compacto onClick={() => ir(1)}><ChevronRight size={20} /></BotaoIcone>
    </>
  );
  // só ícone: o texto disputava espaço com as setas e truncava no card estreito
  const localizar = (
    <BotaoIcone
      rotulo={cam.tipo === "externa" ? "Localizar no mapa" : "Câmera interna: sem posição no mapa"}
      ativo
      disabled={cam.tipo !== "externa"}
      compacto
      className="hover:bg-accent-hover"
      onClick={() => useUi.getState().focar({ tipo: "camera", numero: cam.numero })}
    >
      <LocateFixed size={20} />
    </BotaoIcone>
  );

  return (
    <Painel
      className={cx("flex gap-16 p-12", ampliada ? "w-full max-w-[960px] flex-col gap-16 p-16" : "h-[232px] w-full max-w-[688px]", className)}
      aria-label={`Câmera ${cam.codigo}`}
    >
      <div
        className={cx("relative overflow-hidden rounded-[16px]", !emGrade && "bg-[#0d1f3a]", ampliada ? "aspect-video shrink-0 max-h-[calc(100vh-240px)] w-full" : "h-[208px] w-[368px] min-w-[300px] shrink")}
        onPointerDown={(e) => { if (!ptzAtivo) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); arrasto.current = { x: e.clientX, y: e.clientY, pan: ptz.pan, tilt: ptz.tilt }; }}
        onPointerMove={(e) => { const a = arrasto.current; if (!a) return; const k = 0.004 / ptz.zoom; useUi.getState().setPtz({ pan: a.pan + (e.clientX - a.x) * k, tilt: Math.max(-1.2, Math.min(0.2, a.tilt - (e.clientY - a.y) * k)) }); }}
        onPointerUp={() => { arrasto.current = null; }}
        onWheel={(e) => { if (!ptzAtivo) return; useUi.getState().setPtz({ zoom: Math.max(1, Math.min(mod.zoomMax ?? 1, ptz.zoom * (e.deltaY < 0 ? 1.15 : 0.87))) }); }}
        style={{ cursor: ptzAtivo ? "grab" : "default", touchAction: ptzAtivo ? "none" : "auto" }}
      >
        {/* fundo de cada visão; a transmissão desenha por cima e os vãos da grade deixam ver o card */}
        <Tiles n={visoes.length} className="pointer-events-none">
          {visoes.map((i) => <span key={i} className={cx("bg-[#0d1f3a]", emGrade && "rounded-[12px]")} />)}
        </Tiles>
        {Video && cam.tipo === "externa" ? <Video cam={cam} /> : !emGrade && <SemImagem cam={cam} />}
        {/* tiles que a transmissão lê (data-tile) e que abrem a visão única ao clicar */}
        <Tiles n={visoes.length}>
          {visoes.map((i) => emGrade ? (
            <button key={i} type="button" data-tile data-sensor={i} aria-label={`Abrir a visão do sensor ${i + 1}`} title={`Sensor ${i + 1}`}
              onClick={() => useUi.getState().setSensor(i)}
              className="relative flex flex-col items-center justify-center gap-4 rounded-[12px] text-white/70 outline-none hover:ring-2 hover:ring-accent/70 focus-visible:ring-2 focus-visible:ring-accent">
              {!(Video && cam.tipo === "externa") && <VideoOff size={16} />}
              <span className="absolute right-8 bottom-8 inline-flex h-20 items-center rounded-full bg-[rgb(17_41_75/0.72)] px-8 text-[12px] font-semibold leading-16 text-white">S{i + 1}</span>
            </button>
          ) : <span key={i} data-tile data-sensor={i} className="pointer-events-none" />)}
        </Tiles>
        {/* sobre o vídeo só o que é da imagem (data e PTZ); status, código e ações ficam na coluna ao lado, para não
            cruzar os tiles da grade */}
        {/* na grade compacta a data cobriria o rótulo dos sensores de baixo */}
        {(!emGrade || ampliada) && <div className="pointer-events-none absolute bottom-12 left-12">
          <Chip tom="escuro" className="tnum">{agora ? dataHora(agora) : "--/--/---- --:--:--"}</Chip>
        </div>}
        {ptzAtivo && (
          <div className="pointer-events-none absolute right-12 bottom-12"><Chip tom="escuro" className="tnum">PTZ · {ptz.zoom.toFixed(1)}x</Chip></div>
        )}
      </div>

      <div className={cx("flex min-w-0 flex-1", ampliada ? "flex-row items-stretch justify-between gap-16 px-4" : "min-w-[150px] flex-col py-4 pr-4")}>
        <div className="min-w-0 flex-1">
          {/* linha de status: código à esquerda; no compacto, fechar à direita */}
          <div className="flex h-32 items-center gap-8">
            {/* ao vivo é o normal e não leva selo (o cabeçalho já mostra); só a falta de sinal aparece */}
            <span className="tnum min-w-0 flex-1 truncate text-[12px] font-semibold leading-16 text-text-2">
              {cam.codigo}{!online && <span className="text-st-ocupada"> · Sem sinal</span>}
            </span>
            {!ampliada && <span className="-mr-4 flex shrink-0"><BotaoFechar /></span>}
          </div>
          <h3 className="mt-4 truncate text-[20px] font-semibold leading-28 tracking-[-0.01em] text-text">{nomeLocal(cam)}</h3>
          {/* multissensor são sempre externas: o espaço vai para a contagem de visões */}
          <p className="truncate text-[13px] leading-20 text-text-2">
            {multi ? `${mod.nome} · ${mod.sensores} visões` : `${cam.tipo === "externa" ? "Câmera externa" : "Câmera interna"} · ${mod.nome}`}</p>
          {multi && (
            <div className="mt-8 flex gap-4" role="tablist" aria-label="Visões da câmera">
              <button type="button" role="tab" aria-selected={grade} onClick={() => useUi.getState().setGrade(true)}
                className={cx("h-28 rounded-full px-12 text-[12px] font-semibold leading-16", grade ? "bg-accent text-accent-ink" : "bg-card text-text shadow-card hover:bg-card-muted")}>
                Todas
              </button>
              {Array.from({ length: mod.sensores }, (_, i) => (
                <button key={i} type="button" role="tab" aria-selected={!grade && sensor === i} onClick={() => useUi.getState().setSensor(i)}
                  aria-label={`Sensor ${i + 1}`} className={cx("h-28 w-40 rounded-full text-[12px] font-semibold leading-16", !grade && sensor === i ? "bg-accent text-accent-ink" : "bg-card text-text shadow-card hover:bg-card-muted")}>
                  S{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* ações de imagem (ampliar/reduzir e localizar) sempre juntas, à direita da base; no ampliado as setas sobem para o
            topo da coluna direita, no compacto ficam na base à esquerda */}
        {ampliada ? (
          <div className="flex shrink-0 flex-col items-end justify-between gap-16">
            <div className="flex items-center gap-8">{setas}</div>
            <div className="flex items-center gap-8">{botaoAmpliar}{localizar}</div>
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-8">{setas}<span className="ml-auto flex gap-8">{botaoAmpliar}{localizar}</span></div>
        )}
      </div>
    </Painel>
  );
}

/** grade das visões: 1 ocupa a área toda, 2 em colunas, 4 em 2x2 (gap 8: tiles de 180 x 100 no card compacto) */
function Tiles({ n, className, children }: { n: number; className?: string; children: ReactNode }) {
  return <div className={cx("absolute inset-0 grid gap-8", n > 1 && "grid-cols-2", n > 2 && "grid-rows-2", className)}>{children}</div>;
}

/** fecha o card e desseleciona a câmera; ele volta ao escolher uma câmera (mapa, busca, detalhe) ou pelo menu de camadas */
function BotaoFechar() {
  return (
    <button type="button" aria-label="Fechar câmera ao vivo" title="Fechar"
      onClick={() => {
        // fechar também tira a câmera de seleção (marcador e leque deixam de destacar)
        const ui = useUi.getState();
        ui.setAmpliada(false);
        ui.setBloco("camera", "oculto");
        if (ui.selecao?.tipo === "camera") ui.selecionar(null);
      }}
      className="flex size-32 items-center justify-center rounded-full text-text-2 outline-none hover:bg-chip hover:text-text focus-visible:ring-2 focus-visible:ring-accent">
      <X size={18} />
    </button>
  );
}

/** aviso no lugar do vídeo: câmeras internas (sem cena) ou mapa plano, sem transmissão renderizada */
function SemImagem({ cam }: { cam: Camera }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-24 text-center text-white/80">
      <VideoOff size={24} />
      <span className="text-[14px] font-semibold leading-20">{cam.tipo === "externa" ? "Câmera externa" : "Câmera interna"} · {cam.local}</span>
      <span className="text-[13px] leading-20 text-white/70">Imagem pela integração com o CFTV da Multilog</span>
    </div>
  );
}
