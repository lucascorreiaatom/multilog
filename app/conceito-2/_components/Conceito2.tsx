"use client";
// Conceito 2: os mesmos painéis do Conceito 1 sobre um mapa plano do pátio (sem 3D), mais leve e direto.
// O vídeo das câmeras vem da integração com o CFTV; aqui o card mostra o aviso no lugar da imagem.
import type { Sessao } from "@/lib/auth/permissoes";
import { Tela } from "@/app/_components/Tela";
import { MapaPlano } from "./MapaPlano";

export function Conceito2({ sessao }: { sessao: Sessao }) {
  return <Tela sessao={sessao} tipo="plano" testId="conceito-2" mapa={<MapaPlano />} />;
}
