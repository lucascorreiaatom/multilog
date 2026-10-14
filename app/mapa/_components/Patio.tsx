"use client";
// Tela única do pátio: os mesmos painéis sobre o mapa 3D ou o mapa plano (2D), trocados pelo seletor acima dos
// controles do mapa. No 3D o card AO VIVO recebe a transmissão renderizada; no 2D mostra o aviso da integração.
import dynamic from "next/dynamic";
import type { Sessao } from "@/lib/auth/permissoes";
import { Tela } from "@/app/_components/Tela";
import { Sobreposicoes } from "./3d/Sobreposicoes";
import { VideoTransmissao } from "./3d/VideoTransmissao";
import { MapaPlano } from "./plano/MapaPlano";

const YardCanvas = dynamic(() => import("@/scene/YardCanvas"), { ssr: false });

export function Patio({ sessao }: { sessao: Sessao }) {
  return (
    <Tela
      sessao={sessao}
      mapa={{ "3d": <><YardCanvas /><Sobreposicoes /></>, plano: <MapaPlano /> }}
      video={{ "3d": VideoTransmissao }}
    />
  );
}
