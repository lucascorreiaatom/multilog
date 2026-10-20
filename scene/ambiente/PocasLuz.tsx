"use client";
// À noite cada poste do cenário (planta.postes) ganha a poça de luz no chão, como no app Vite do mapa.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { planta } from "@/lib/site";

const TAMANHO = 38;

function textura() {
  const n = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, "rgba(255, 214, 160, 0.6)");
  g.addColorStop(0.45, "rgba(255, 190, 120, 0.2)");
  g.addColorStop(1, "rgba(255, 180, 110, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, n, n);
  return new THREE.CanvasTexture(canvas);
}

export function PocasLuz({ noite }: { noite: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: textura(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), s = new THREE.Vector3(TAMANHO, TAMANHO, 1);
    planta.postes.forEach(([x, z], i) => m.setMatrixAt(i, mat.compose(new THREE.Vector3(x, 0.2, z), q, s)));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [noite]);
  if (!noite) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, material, planta.postes.length]} renderOrder={3}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
