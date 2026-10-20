"use client";
// Prédios clicáveis. O volume visível vem do cenário do Blender (Cenario.tsx); aqui fica o alvo de clique de cada
// prédio (extrudado do contorno da planta, invisível) e as cancelas dos Gates, que sobem quando um caminhão passa.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { planta } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
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

/** cancelas no estilo do app Vite: poste na ilha, lâmpada verde com o gate aberto, braço listrado que sobe quando
 *  um caminhão passa. Entrada e reversível fecham ao sul da cobertura; saída, ao norte */
const ALTURA_POSTE = 1.15;
const ABERTURA = 1.38;
const AFASTAMENTO_BALANCA = 19.3;

function Gates({ onSelecionar }: { p: Paleta; noite: boolean; onSelecionar?: (id: string) => void }) {
  const g = planta.predios.find((x) => x.id === "gates")!;
  const xs = g.contorno.map((q) => q[0]), zs = g.contorno.map((q) => q[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const pistas = planta.pistasGate;
  const gates = usePatio((s) => s.gates);
  const bracos = useRef<(THREE.Group | null)[]>([]);
  const largura = pistas[1].x - pistas[0].x;
  const braco = largura - 1.2;
  const pecas = useMemo(() => ({
    poste: new THREE.BoxGeometry(0.45, ALTURA_POSTE, 0.45),
    lampada: new THREE.SphereGeometry(0.2, 12, 12),
    faixa: new THREE.BoxGeometry(0.7, 0.15, 0.16),
    branco: new THREE.MeshStandardMaterial({ color: "#f4f4f2", roughness: 0.5 }),
    vermelho: new THREE.MeshStandardMaterial({ color: "#d33a35", roughness: 0.5 }),
    aberto: new THREE.MeshBasicMaterial({ color: "#22b35e", toneMapped: false }),
    fechado: new THREE.MeshBasicMaterial({ color: "#e5484d", toneMapped: false }),
  }), []);
  useFrame(() => {
    const agora = performance.now();
    pistas.forEach((pi, i) => {
      const t = passagemGate.get(pi.numero) ?? -1e9;
      const alvo = agora - t < 2200 ? ABERTURA : 0;
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
      {pistas.map((pi, i) => {
        const z = pi.zBalanca + (pi.sentido === "saida" ? -AFASTAMENTO_BALANCA : AFASTAMENTO_BALANCA);
        const aberto = gates.find((q) => q.numero === pi.numero)?.aberto ?? false;
        return (
          <group key={pi.id} position={[pi.x - largura / 2 + 0.6, 0.22, z]}>
            <mesh geometry={pecas.poste} material={pecas.branco} position={[0, ALTURA_POSTE / 2, 0]} castShadow />
            <mesh geometry={pecas.lampada} material={aberto ? pecas.aberto : pecas.fechado} position={[0, ALTURA_POSTE + 0.25, 0]} />
            <group position={[0, ALTURA_POSTE - 0.1, 0]} ref={(r) => { bracos.current[i] = r; }}>
              <mesh material={pecas.branco} position={[braco / 2, 0, 0]} castShadow>
                <boxGeometry args={[braco, 0.13, 0.13]} />
              </mesh>
              {[0.2, 0.45, 0.7, 0.92].map((f) => <mesh key={f} geometry={pecas.faixa} material={pecas.vermelho} position={[braco * f, 0, 0]} />)}
            </group>
          </group>
        );
      })}
    </group>
  );
}
