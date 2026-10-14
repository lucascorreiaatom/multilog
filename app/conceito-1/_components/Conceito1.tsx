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
   
    />
  );
}
