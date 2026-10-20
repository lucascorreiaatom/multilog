"use client";
// Carros de passeio modelados no Blender (sedan e SUV de public/modelos/veiculos.glb, ver modelosVeiculo.ts).
// "corpo" é tingido pela cor da instância e "neutro" traz pneus, vidros, faróis e lanternas em cores de vértice;
// 2 draw calls por variante, qualquer que seja a quantidade de carros.
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useModelosVeiculo, type PecasCaminhao } from "./modelosVeiculo";

/** variantes, na ordem dos índices usados pela cena */
export const VARIANTES_CARRO = ["sedan", "suv"] as const;

/** geometrias de cada variante (suspende até o .glb carregar; envolva em <Suspense>) */
export function useModelosCarro(): PecasCaminhao[] {
  return useModelosVeiculo().carros;
}

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
