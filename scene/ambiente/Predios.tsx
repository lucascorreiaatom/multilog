"use client";
// Prédios clicáveis. O volume visível vem do cenário do Blender (Cenario.tsx); aqui fica o alvo de clique de cada
// prédio (extrudado do contorno da planta, invisível) e as cancelas dos Gates, que abrem quando um caminhão passa.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { planta } from "@/lib/site";
import type { Predio } from "@/lib/site/tipos";
import type { Paleta } from "../paleta";
import { passagemGate } from "../veiculos/Caminhoes";
import { cursorClicavel } from "../cursor";

const forma = (pts: [number, number][]) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));

/** recebe o raio do clique sem desenhar nada nem escrever profundidade */
const INVISIVEL = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

export function Predios({ p, noite, onSelecionar }: { p: Paleta; noite: boolean; onSelecionar?: (id: string) => void }) {
  return (
    <group>
      {planta.predios.filter((b) => b.tipo !== "cobertura").map((b) => (
        <AlvoPredio key={b.id} b={b} onSelecionar={onSelecionar} />
      ))}
      <Gates p={p} noite={noite} onSelecionar={onSelecionar} />
    </group>
  );
}

function AlvoPredio({ b, onSelecionar }: { b: Predio; onSelecionar?: (id: string) => void }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(forma(b.contorno), { depth: b.altura, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [b.contorno, b.altura]);
  return (
    <mesh geometry={geo} material={INVISIVEL} onClick={(e) => { e.stopPropagation(); onSelecionar?.(b.id); }} {...cursorClicavel} />
  );
}

function Gates({ p, noite, onSelecionar }: { p: Paleta; noite: boolean; onSelecionar?: (id: string) => void }) {
  const g = planta.predios.find((x) => x.id === "gates")!;
  const xs = g.contorno.map((q) => q[0]), zs = g.contorno.map((q) => q[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const pistas = planta.pistasGate;
  const bracos = useRef<(THREE.Group | null)[]>([]);
  const largura = pistas[1].x - pistas[0].x;
  useFrame(() => {
    const agora = performance.now();
    pistas.forEach((pi, i) => {
      const t = passagemGate.get(pi.numero) ?? -1e9;
      const aberto = agora - t < 2200;
      const alvo = aberto ? -Math.PI / 2.2 : 0;
      const b = bracos.current[i];
      if (b) b.rotation.z += (alvo - b.rotation.z) * 0.12;
    });
  });
  return (
    <group>
      {/* alvo de clique da cobertura dos Gates */}
      <mesh position={[(x0 + x1) / 2, 4.5, (z0 + z1) / 2]} material={INVISIVEL} onClick={(e) => { e.stopPropagation(); onSelecionar?.("gates"); }} {...cursorClicavel}>
        <boxGeometry args={[x1 - x0 + 4, 9, z1 - z0]} />
      </mesh>
      {pistas.map((pi, i) => (
        <group key={pi.id}>
          {/* cancela na saída da balança; à noite levemente acesa para o estado do gate ler */}
          <group position={[pi.x - largura / 2 + 0.9, 1.1, pi.zSul - 6]} ref={(r) => { bracos.current[i] = r; }}>
            <mesh position={[largura / 2 - 0.6, 0, 0]} castShadow>
              <boxGeometry args={[largura - 1.2, 0.14, 0.14]} />
              <meshStandardMaterial color={p.cancela} roughness={0.5} emissive={noite ? p.cancela : "#000000"} emissiveIntensity={noite ? 0.45 : 0} />
            </mesh>
          </group>
          <mesh position={[pi.x - largura / 2 + 0.9, 0.55, pi.zSul - 6]} castShadow>
            <boxGeometry args={[0.35, 1.1, 0.35]} />
            <meshStandardMaterial color={p.predioSombra} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
