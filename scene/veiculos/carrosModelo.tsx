"use client";
// Carros de passeio com modelo (KayKit City Builder Bits, CC0, Kay Lousberg), convertidos por scripts/modelos-carros.mjs.
// Mesmo contrato das geometrias procedurais: "corpo" é tingido pela cor da instância (paleta e tema) e "neutro"
// traz pneus, vidros, frisos e lanternas em cores de vértice. Sem textura; ~800 triângulos por carro; 2 draw calls por
// variante, qualquer que seja a quantidade de carros.
import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PecasCaminhao } from "../geometrias/caminhao";

export const URL_CARROS = "/modelos/carros.glb";
/** variantes no arquivo, na ordem dos índices usados pela cena */
export const VARIANTES_CARRO = ["hatch", "sedan", "perua"] as const;

/** geometrias de cada variante (suspende até o .glb carregar; envolva em <Suspense>) */
export function useModelosCarro(): PecasCaminhao[] {
  const { nodes } = useGLTF(URL_CARROS, false, false);
  return useMemo(
    () => VARIANTES_CARRO.map((v) => ({
      corpo: (nodes[`${v}_corpo`] as THREE.Mesh).geometry,
      neutro: (nodes[`${v}_neutro`] as THREE.Mesh).geometry,
    })),
    [nodes],
  );
}
useGLTF.preload(URL_CARROS, false, false);

export interface CarroParado {
  x: number;
  z: number;
  /** rotação em Y (rad); 0 = frente para +X */
  giro: number;
  cor: string;
  escala?: number;
}

/** um lote de carros parados de uma mesma variante */
export function CarrosInstanciados({ pecas, itens }: { pecas: PecasCaminhao; itens: CarroParado[] }) {
  const corpo = useRef<THREE.InstancedMesh>(null);
  const neutro = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!corpo.current || !neutro.current) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), y = new THREE.Vector3(0, 1, 0), c = new THREE.Color(), s = new THREE.Vector3();
    itens.forEach((v, i) => {
      q.setFromAxisAngle(y, v.giro);
      m.compose(new THREE.Vector3(v.x, 0, v.z), q, s.setScalar(v.escala ?? 1));
      corpo.current!.setMatrixAt(i, m);
      neutro.current!.setMatrixAt(i, m);
      corpo.current!.setColorAt(i, c.set(v.cor));
    });
    corpo.current.instanceMatrix.needsUpdate = true;
    neutro.current.instanceMatrix.needsUpdate = true;
    if (corpo.current.instanceColor) corpo.current.instanceColor.needsUpdate = true;
    corpo.current.computeBoundingSphere();
    neutro.current.computeBoundingSphere();
  }, [itens]);
  if (!itens.length) return null;
  return (
    <group>
      <instancedMesh ref={corpo} args={[pecas.corpo, undefined, itens.length]} castShadow>
        <meshStandardMaterial vertexColors roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={neutro} args={[pecas.neutro, undefined, itens.length]} castShadow>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
