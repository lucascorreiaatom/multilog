"use client";
// Card AO VIVO (Imagem 1): vídeo renderizado da câmera selecionada sobreposto ao mapa (SoW), sem mosaico.
import { ChevronLeft, ChevronRight, LocateFixed, Maximize2, Minimize2, VideoOff, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { todasCameras, type Camera } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { dataHora } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { alvoTransmissao } from "@/scene/cameras/Transmissao";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ x: number; y: number; pan: number; tilt: number } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    alvoTransmissao.el = cam.tipo === "externa" ? el : null;
    return () => { if (alvoTransmissao.el === el) alvoTransmissao.el = null; };
  }, [cam.tipo, ampliada]);

  const idx = todasCameras.findIndex((c) => c.numero === cam.numero);
  const ir = (d: number) => {
    const prox = todasCameras[(idx + d + todasCameras.length) % todasCameras.length];
    useUi.getState().exibirCamera(prox.numero);
  };
  const ptzAtivo = mod.projecao === "ptz";

  return (
    <Painel
      className={cx("flex gap-16 p-12", ampliada ? "w-full max-w-[960px] flex-col gap-16 p-16" : "h-[232px] w-full max-w-[688px]", className)}
      aria-label={`Câmera ${cam.codigo}`}
    >
      <div
        className={cx("relative overflow-hidden rounded-[16px] bg-[#0d1f3a]", ampliada ? "aspect-video shrink-0 max-h-[calc(100vh-240px)] w-full" : "h-[208px] w-[370px] min-w-[300px] shrink")}
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
              className="pointer-events-auto flex size-28 items-center justify-center rounded-full bg-[rgb(17_41_75/0.72)] text-white backdrop-blur-[8px] hover:bg-[rgb(17_41_75/0.9)]">
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

      <div className={cx("flex min-w-0 flex-1", ampliada ? "flex-row flex-wrap items-center justify-between gap-16 px-4" : "min-w-[150px] flex-col py-4 pr-4")}>
        <div className="min-w-0">
          <div className="flex items-center gap-8">
            <p className="min-w-0 flex-1 truncate text-[13px] leading-20 text-text-2">{cam.tipo === "externa" ? "Câmera externa" : "Câmera interna"} · {mod.nome}</p>
            {!ampliada && <span className="-my-8 -mr-4"><BotaoFechar /></span>}
          </div>
          <div className="mt-4 flex min-w-0 items-center gap-12">
            <h3 className="min-w-0 truncate text-[20px] font-semibold leading-28 tracking-[-0.01em] text-text">{nomeLocal(cam)}</h3>
            <span className="flex shrink-0 items-center gap-8 text-[13px] leading-20 text-text-2" title={online ? "Online" : "Offline · sem sinal"}>
              <Ponto cor={online ? "var(--live)" : "var(--st-bloqueada)"} redondo pulso={online} />
              {/* no card compacto o título ocupa a largura; o rótulo fica só no ampliado */}
              <span className={cx(!ampliada && "sr-only")}>{online ? "Online" : "Offline · sem sinal"}</span>
            </span>
          </div>
          {mod.sensores > 1 && (
            <div className="mt-8 flex gap-4" role="tablist" aria-label="Sensores">
              {Array.from({ length: mod.sensores }, (_, i) => (
                <button key={i} type="button" role="tab" aria-selected={sensor === i} onClick={() => useUi.getState().setSensor(i)}
                  aria-label={`Sensor ${i + 1}`} className={cx("h-28 w-40 rounded-full text-[12px] font-semibold leading-16", sensor === i ? "bg-dark text-on-dark" : "bg-chip text-text-2 hover:text-text")}>
                  S{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={cx("flex gap-8", ampliada ? "items-center" : "mt-auto items-center")}>
          <BotaoIcone rotulo="Câmera anterior" className={cx(ampliada && "size-40!")} onClick={() => ir(-1)}><ChevronLeft size={20} /></BotaoIcone>
          <BotaoIcone rotulo="Próxima câmera" className={cx(ampliada && "size-40!")} onClick={() => ir(1)}><ChevronRight size={20} /></BotaoIcone>
          {/* só ícone: o texto disputava espaço com as setas e truncava no card estreito */}
          <BotaoIcone
            rotulo={cam.tipo === "externa" ? "Localizar no mapa" : "Câmera interna: sem posição no mapa"}
            ativo
            disabled={cam.tipo !== "externa"}
            className={cx("ml-auto hover:bg-accent-hover", ampliada && "size-40!")}
            onClick={() => useUi.getState().focar({ tipo: "camera", numero: cam.numero })}
          >
            <LocateFixed size={20} />
          </BotaoIcone>
        </div>
      </div>
    </Painel>
  );
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
      className="flex size-32 items-center justify-center rounded-full text-text-2 hover:bg-chip hover:text-text">
      <X size={18} />
    </button>
  );
}
