"use client";
// Pinheiros do KayKit Medieval Hexagon Pack (CC0, Kay Lousberg), convertidos por scripts/modelos-arvores.mjs:
// sem textura, cores de vértice em cinza (copa tingida por p.copa na instância, tronco por p.tronco no material).
// pinheiro_a: 50 triângulos (85% da mata); pinheiro_b: 220 triângulos (15%, dá variedade de silhueta).
// Altura normalizada em 1, base no chão: a cena escala por instância.
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";

export const URL_ARVORES = "/modelos/arvores.glb";
export const VARIANTES_ARVORE = ["pinheiro_a", "pinheiro_b"] as const;
/** fração de cada variante na mata */
export const PESO_ARVORE = [0.85, 0.15];

export interface PecasArvore {
  copa: THREE.BufferGeometry;
  tronco: THREE.BufferGeometry;
}

/** suspende até o .glb carregar; envolva em <Suspense> */
export function useModelosArvore(): PecasArvore[] {
  const { nodes } = useGLTF(URL_ARVORES, false, false);
  return useMemo(
    () => VARIANTES_ARVORE.map((v) => ({
      copa: (nodes[`${v}_copa`] as THREE.Mesh).geometry,
      tronco: (nodes[`${v}_tronco`] as THREE.Mesh).geometry,
    })),
    [nodes],
  );
}
useGLTF.preload(URL_ARVORES, false, false);
