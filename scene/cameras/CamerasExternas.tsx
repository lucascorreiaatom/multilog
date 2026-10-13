"use client";
// Postes e caixas das câmeras externas (págs. 4 a 6) e leques de cobertura no chão por modelo.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { useUi } from "@/lib/store/ui";
import { CAMADA, sobre } from "../camadas";
import type { Paleta } from "../paleta";

export function CamerasExternas({ p }: { p: Paleta }) {
  const poste = useRef<THREE.InstancedMesh>(null!);
  const domo = useRef<THREE.InstancedMesh>(null!);
  const n = camerasExternas.length;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    camerasExternas.forEach((c, i) => {
      m.compose(new THREE.Vector3(c.posicao[0], c.altura / 2, c.posicao[1]), q, s.set(1, c.altura, 1));
      poste.current.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(c.posicao[0], c.altura + 0.1, c.posicao[1]), q, s.set(1, 1, 1));
      domo.current.setMatrixAt(i, m);
    });
    poste.current.instanceMatrix.needsUpdate = true;
    domo.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={poste} args={[undefined, undefined, n]} castShadow>
        <cylinderGeometry args={[0.12, 0.17, 1, 6]} />
        <meshStandardMaterial color={p.poste} roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={domo} args={[undefined, undefined, n]} castShadow>
        <sphereGeometry args={[0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
        <meshStandardMaterial color="#f4f5f7" roughness={0.3} />
      </instancedMesh>
    </group>
  );
}

/** leques de cobertura de todas as câmeras externas (camada opcional) e destaque da selecionada */
export function Cobertura() {
  const ligada = useUi((s) => s.cobertura);
  // card da câmera fechado = nenhuma câmera em destaque
  const ativa = useUi((s) => (s.blocos.camera === "oculto" ? null : s.cameraAtiva));
  const sensor = useUi((s) => s.sensor);
  const geos = useMemo(() => camerasExternas.map((c) => {
    const mod = MODELOS[c.modelo];
    const alcance = c.modelo === "Q6225-LE" ? 140 : c.modelo === "P1487-LE" ? 70 : c.modelo === "P3827-PVE" ? 45 : 60;
    const fatias: THREE.BufferGeometry[] = [];
    const dirs = mod.projecao === "panoramica180" ? [0] : mod.direcoes;
    for (const d of dirs) {
      const abertura = (Math.min(mod.fovH, 359) * Math.PI) / 180;
      const g = new THREE.CircleGeometry(alcance, 24, -abertura / 2, abertura);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-(c.rumo + (d * Math.PI) / 180));
      fatias.push(g);
    }
    return { c, fatias };
  }), []);
  return (
    <group>
      {geos.map(({ c, fatias }) => {
        const destaque = c.numero === ativa;
        if (!ligada && !destaque) return null;
        return (
          <group key={c.numero} position={[c.posicao[0], 0.12, c.posicao[1]]}>
            {fatias.map((g, i) => (
              <mesh key={i} geometry={g} renderOrder={2}>
                <meshBasicMaterial color={destaque ? "#e0683a" : "#4a72e8"} transparent opacity={destaque ? (i === sensor || fatias.length === 1 ? 0.26 : 0.12) : 0.08} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
