"use client";
// Qual mapa está na tela: os painéis são os mesmos no 3D e no plano e só escondem o que não existe no mapa plano
// (girar, cobertura das câmeras e Modo TV).
import { useUi, type TipoMapa } from "@/lib/store/ui";

export type { TipoMapa };

export const useTipoMapa = () => useUi((s) => s.mapa);
