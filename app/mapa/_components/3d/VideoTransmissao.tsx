"use client";
// Vídeo do card AO VIVO no mapa 3D: canvas 2D que recebe o quadro renderizado pela cena 3D (scene/cameras/Transmissao).
import { useEffect, useRef } from "react";
import type { Camera } from "@/lib/cameras/catalogo";
import { useUi } from "@/lib/store/ui";
import { alvoTransmissao } from "@/scene/cameras/Transmissao";

export function VideoTransmissao({ cam }: { cam: Camera }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ampliada = useUi((s) => s.cameraAmpliada);
  useEffect(() => {
    const el = ref.current;
    alvoTransmissao.el = el;
    return () => { if (alvoTransmissao.el === el) alvoTransmissao.el = null; };
  }, [cam.numero, ampliada]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-label={`Imagem da câmera ${cam.codigo}`} data-testid="video-camera" />;
}
