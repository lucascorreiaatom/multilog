"use client";
// Caminhão com modelo (Sketchfab, CC-BY 4.0), convertido por scripts/modelos-caminhao.mjs:
//   cavalo  "scania" de animara777: 1.344 triângulos, 1 atlas JPEG 512×512 (cabine repintada de branco);
//   carreta "Refrigerated Trailer (Custom Model)" de matthew13482: ~680 triângulos, cores de vértice, sem textura.
// Mesmo contrato de geometrias/caminhao.ts: "corpo" é tingido pela cor da instância e "neutro" mantém as cores do modelo.
// Créditos em public/modelos/CREDITOS.txt.
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";
import type { PecasCaminhao } from "../geometrias/caminhao";

export const URL_CAMINHAO = "/modelos/caminhao.glb";

export interface ModeloCaminhao {
  cavalo: PecasCaminhao;
  carreta: PecasCaminhao;
  /** atlas de textura do cavalo (as duas malhas do cavalo usam) */
  atlas: THREE.Texture | null;
}

/** suspende até o .glb carregar; envolva em <Suspense> */
export function useModeloCaminhao(): ModeloCaminhao {
  const { nodes } = useGLTF(URL_CAMINHAO, false, false);
  return useMemo(() => {
    const malha = (n: string) => nodes[n] as THREE.Mesh;
    // cópias: o filtro de status grava um atributo por instância na geometria
    const geo = (n: string) => malha(n).geometry.clone();
    return {
      cavalo: { corpo: geo("cavalo_corpo"), neutro: geo("cavalo_neutro") },
      carreta: { corpo: geo("carreta_corpo"), neutro: geo("carreta_neutro") },
      atlas: (malha("cavalo_corpo").material as THREE.MeshStandardMaterial).map,
    };
  }, [nodes]);
}
useGLTF.preload(URL_CAMINHAO, false, false);
