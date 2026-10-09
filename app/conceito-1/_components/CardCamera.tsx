"use client";
// Card AO VIVO (Imagem 1): vídeo renderizado da câmera selecionada sobreposto ao mapa (SoW), sem mosaico.
import { ChevronLeft, ChevronRight, Crosshair, Maximize2, Minimize2, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { todasCameras, type Camera } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { dataHora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { alvoTransmissao } from "@/scene/cameras/Transmissao";
import { BotaoRecolher } from "./Recolher";
import { BotaoIcone, Chip, Painel, Ponto, cx } from "./ui";


const nomeLocal = (c: Camera) => (c.tipo === "externa" ? c.local : `${c.local}${c.nivel ? ` · ${c.nivel}` : ""}`);

export function CardCamera({ className }: { className?: string }) {
  const numeroAtivo = useUi((s) => s.cameraAtiva);
  const sensor = useUi((s) => s.sensor);
  const ampliada = useUi((s) => s.cameraAmpliada);
  const ptz = useUi((s) => s.ptz);
  const offline = usePatio((s) => s.camerasOffline);
  const agora = useRelogio();
  const cam = todasCameras.find((c) => c.numero === numeroAtivo) ?? todasCameras[0];
  const mod = MODELOS[cam.modelo];
  const online = !offline.includes(cam.numero);
  const recolhido = useUi((s) => s.blocos.camera === "recolhido");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ x: number; y: number; pan: number; tilt: number } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    alvoTransmissao.el = cam.tipo === "externa" ? el : null;
    return () => { if (alvoTransmissao.el === el) alvoTransmissao.el = null; };
  }, [cam.tipo, ampliada, recolhido]);

  const idx = todasCameras.findIndex((c) => c.numero === cam.numero);
  const ir = (d: number) => {
    const prox = todasCameras[(idx + d + todasCameras.length) % todasCameras.length];
    useUi.getState().exibirCamera(prox.numero);
  };
  const ptzAtivo = mod.projecao === "ptz";

  if (recolhido) {
    return (
      <Painel className={cx("flex h-56 w-[320px] items-center gap-12 pr-8 pl-16", className)} aria-label={`Câmera ${cam.codigo}`}>
        <Ponto cor={online ? "#e5484d" : "#8a92a2"} redondo />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-20 text-text">{cam.codigo} · {online ? "AO VIVO" : "SEM SINAL"}</span>
          <span className="block truncate text-[12px] leading-16 text-text-2">{nomeLocal(cam)}</span>
        </span>
        <BotaoRecolher bloco="camera" nome="câmera ao vivo" />
      </Painel>
    );
  }

  return (
    <Painel
      className={cx("flex gap-16 p-12", ampliada ? "w-[min(960px,calc(100vw-32px))] flex-col gap-12" : "h-[232px] w-[648px] max-xl:w-[min(648px,calc(100vw-112px))]", className)}
      aria-label={`Câmera ${cam.codigo}`}
    >
      <div
        className={cx("relative shrink-0 overflow-hidden rounded-[16px] bg-[#1b2230]", ampliada ? "aspect-video max-h-[calc(100vh-240px)] w-full" : "h-[208px] w-[370px]")}
        onPointerDown={(e) => { if (!ptzAtivo) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); arrasto.current = { x: e.clientX, y: e.clientY, pan: ptz.pan, tilt: ptz.tilt }; }}
        onPointerMove={(e) => { const a = arrasto.current; if (!a) return; const k = 0.004 / ptz.zoom; useUi.getState().setPtz({ pan: a.pan + (e.clientX - a.x) * k, tilt: Math.max(-1.2, Math.min(0.2, a.tilt - (e.clientY - a.y) * k)) }); }}
        onPointerUp={() => { arrasto.current = null; }}
        onWheel={(e) => { if (!ptzAtivo) return; useUi.getState().setPtz({ zoom: Math.max(1, Math.min(mod.zoomMax ?? 1, ptz.zoom * (e.deltaY < 0 ? 1.15 : 0.87))) }); }}
        style={{ cursor: ptzAtivo ? "grab" : "default", touchAction: ptzAtivo ? "none" : "auto" }}
      >
        {cam.tipo === "externa" ? (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label={`Imagem da câmera ${cam.codigo}`} data-testid="video-camera" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-24 text-center text-white/80">
            <VideoOff size={24} />
            <span className="text-[13px] font-semibold leading-20">Câmera interna · {cam.local}</span>
            <span className="text-[12px] leading-16 text-white/60">Imagem pela integração com o CFTV da Multilog</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-12 top-12 flex items-start justify-between">
          <Chip tom="escuro"><Ponto cor={online ? "#e5484d" : "#8a92a2"} redondo />{online ? "AO VIVO" : "SEM SINAL"}</Chip>
          <span className="flex gap-8">
            <Chip tom="escuro">{cam.codigo}</Chip>
            <button type="button" aria-label={ampliada ? "Reduzir imagem" : "Ampliar imagem"} title={ampliada ? "Reduzir imagem" : "Ampliar imagem"} onClick={() => useUi.getState().setAmpliada(!ampliada)}
              className="pointer-events-auto flex size-28 items-center justify-center rounded-[10px] bg-[rgb(25_32_50/0.72)] text-white backdrop-blur-[8px] hover:bg-[rgb(25_32_50/0.9)]">
              {ampliada ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-12 left-12">
          <Chip tom="escuro" className="tnum">{agora ? dataHora(agora) : "--/--/---- --:--:--"}</Chip>
        </div>
        {ptzAtivo && (
          <div className="pointer-events-none absolute right-12 bottom-12"><Chip tom="escuro" className="tnum">PTZ · {ptz.zoom.toFixed(1)}x</Chip></div>
        )}
      </div>

      <div className={cx("flex min-w-0 flex-1", ampliada ? "flex-row flex-wrap items-center justify-between gap-12 px-4 pb-4" : "flex-col py-4 pr-4")}>
        <div className="min-w-0">
          <div className="flex items-center gap-8">
            <p className="min-w-0 flex-1 truncate text-[13px] leading-20 text-text-2">{cam.tipo === "externa" ? "Câmera externa" : `Planta pág. ${cam.pagina}`} · {mod.nome}</p>
            {!ampliada && <span className="-my-8 -mr-4"><BotaoRecolher bloco="camera" nome="câmera ao vivo" /></span>}
          </div>
          <h3 className="mt-4 truncate text-[20px] font-semibold leading-28 tracking-[-0.01em] text-text">{nomeLocal(cam)}</h3>
          <p className="mt-8 flex items-center gap-8 text-[13px] leading-20 text-text-2">
            <Ponto cor={online ? "var(--live)" : "var(--st-bloqueada)"} redondo />
            {online ? "Online" : "Offline · sem sinal"}
          </p>
          {mod.sensores > 1 && (
            <div className="mt-8 flex gap-4" role="tablist" aria-label="Sensores">
              {Array.from({ length: mod.sensores }, (_, i) => (
                <button key={i} type="button" role="tab" aria-selected={sensor === i} onClick={() => useUi.getState().setSensor(i)}
                  aria-label={`Sensor ${i + 1}`} className={cx("h-28 w-40 rounded-[8px] text-[12px] font-semibold leading-16", sensor === i ? "bg-dark text-on-dark" : "bg-chip text-text-2 hover:text-text")}>
                  S{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={cx("flex items-center gap-8", !ampliada && "mt-auto")}>
          <BotaoIcone rotulo="Câmera anterior" onClick={() => ir(-1)}><ChevronLeft size={20} /></BotaoIcone>
          <BotaoIcone rotulo="Próxima câmera" onClick={() => ir(1)}><ChevronRight size={20} /></BotaoIcone>
          <button
            type="button"
            disabled={cam.tipo !== "externa"}
            onClick={() => useUi.getState().focar({ tipo: "camera", numero: cam.numero })}
            className="inline-flex h-48 flex-1 items-center justify-center gap-8 whitespace-nowrap rounded-[14px] bg-accent px-16 text-[14px] font-semibold leading-20 text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            <Crosshair size={18} />Focar no mapa
          </button>
        </div>
      </div>
    </Painel>
  );
}
