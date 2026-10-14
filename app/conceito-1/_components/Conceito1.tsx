"use client";
// Conceito 1: painéis clay (Imagem 1) sobre o pátio 3D, com componentes do vídeo de referência e modo TV explícito.
import dynamic from "next/dynamic";
import type { Sessao } from "@/lib/auth/permissoes";
import { Tela } from "@/app/_components/Tela";
import { Sobreposicoes } from "./Sobreposicoes";
import { VideoTransmissao } from "./VideoTransmissao";

const YardCanvas = dynamic(() => import("@/scene/YardCanvas"), { ssr: false });

export function Conceito1({ sessao }: { sessao: Sessao }) {
  return (
    <Tela
      sessao={sessao}
      tipo="3d"
      testId="conceito-1"
      mapa={<><YardCanvas /><Sobreposicoes /></>}
      Video={VideoTransmissao}
      rodape={
        // atribuição obrigatória do caminhão 3D (CC-BY 4.0); créditos completos em public/modelos/CREDITOS.txt
        <p className="pointer-events-auto absolute right-16 bottom-0 z-10 text-[12px] leading-16 text-text-2">
          Caminhão 3D: Scania por animara777, carreta por matthew13482 (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">CC-BY 4.0</a>, Sketchfab)
        </p>
      }
    />
  );
}
