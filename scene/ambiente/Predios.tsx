"use client";
// Prédios extrudados das plantas: volumes claros com faixa azul Multilog, sem competir com as cores de status.
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { planta } from "@/lib/site";
import type { Predio } from "@/lib/site/tipos";
import type { Paleta } from "../paleta";
import { passagemGate } from "../veiculos/Caminhoes";
import { cursorClicavel } from "../cursor";

const forma = (pts: [number, number][]) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));

function centroide(pts: [number, number][]) {
  return [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length] as const;
}

function dentro(x: number, z: number, pol: [number, number][]) {
  let d = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, zi] = pol[i], [xj, zj] = pol[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}

export function Predios({ p, noite, onSelecionar }: { p: Paleta; noite: boolean; onSelecionar?: (id: string) => void }) {
  return (
    <group>
      {planta.predios.filter((b) => b.tipo !== "cobertura" && b.tipo !== "scanner").map((b) => (
        <Volume key={b.id} b={b} p={p} noite={noite} onSelecionar={onSelecionar} />
      ))}
      <Gates p={p} noite={noite} onSelecionar={onSelecionar} />
      <Scanner p={p} onSelecionar={onSelecionar} />
      <Reservatorio p={p} />
      <PortasDocas p={p} />
    </group>
  );
}

function Volume({ b, p, noite, onSelecionar }: { b: Predio; p: Paleta; noite: boolean; onSelecionar?: (id: string) => void }) {
  const s = useMemo(() => forma(b.contorno), [b.contorno]);
  const geoParede = useMemo(() => { const g = new THREE.ExtrudeGeometry(s, { depth: b.altura, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; }, [s, b.altura]);
  const geoTeto = useMemo(() => { const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.1, bevelSegments: 1 }); g.rotateX(-Math.PI / 2); return g; }, [s]);
  const geoFaixa = useMemo(() => { const g = new THREE.ExtrudeGeometry(s, { depth: 1.1, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0, bevelSegments: 1 }); g.rotateX(-Math.PI / 2); return g; }, [s]);
  const andares = b.tipo === "administracao" ? [2.6, 6.4, 10.2] : b.tipo === "apoio" ? [2.4] : [];
  const geoVidro = useMemo(() => { const g = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0, bevelSegments: 1 }); g.rotateX(-Math.PI / 2); return g; }, [s]);
  const nervuras = useMemo(() => {
    if (b.tipo !== "armazem") return [] as { x: number; z0: number; z1: number }[];
    const xs = b.contorno.map((q) => q[0]), zs = b.contorno.map((q) => q[1]);
    const out: { x: number; z0: number; z1: number }[] = [];
    for (let x = Math.min(...xs) + 0.6; x < Math.max(...xs); x += 1.4) {
      let z0 = Infinity, z1 = -Infinity;
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 0.5) if (dentro(x, z, b.contorno)) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      if (z1 > z0) out.push({ x, z0, z1 });
    }
    return out;
  }, [b]);
  const refNerv = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!refNerv.current) return;
    const m = new THREE.Matrix4();
    nervuras.forEach((n, i) => { m.compose(new THREE.Vector3(n.x, b.altura + 0.5, (n.z0 + n.z1) / 2), new THREE.Quaternion(), new THREE.Vector3(1, 1, n.z1 - n.z0)); refNerv.current!.setMatrixAt(i, m); });
    refNerv.current.instanceMatrix.needsUpdate = true;
  }, [nervuras, b.altura]);
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelecionar?.(b.id); }} {...cursorClicavel}>
      <mesh geometry={geoParede} castShadow receiveShadow>
        <meshStandardMaterial color={p.predio} roughness={0.75} />
      </mesh>
      {andares.map((y) => (
        <mesh key={y} geometry={geoVidro} position-y={y} castShadow={false}>
          <meshStandardMaterial color={p.vidro} roughness={0.25} metalness={0.3} emissive={noite ? "#f2c879" : "#000000"} emissiveIntensity={noite ? 0.35 : 0} />
        </mesh>
      ))}
      <mesh geometry={geoFaixa} position-y={b.altura - 1.6}>
        <meshStandardMaterial color={p.faixaAzul} roughness={0.5} />
      </mesh>
      <mesh geometry={geoTeto} position-y={b.altura} castShadow receiveShadow>
        <meshStandardMaterial color={p.telhado} roughness={0.6} metalness={0.2} />
      </mesh>
      {nervuras.length > 0 && (
        <instancedMesh ref={refNerv} args={[undefined, undefined, nervuras.length]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.22, 1]} />
          <meshStandardMaterial color={p.predioSombra} roughness={0.5} metalness={0.3} />
        </instancedMesh>
      )}
    </group>
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
    <group onClick={(e) => { e.stopPropagation(); onSelecionar?.("gates"); }} {...cursorClicavel}>
      {/* cobertura sobre as pistas */}
      <mesh position={[(x0 + x1) / 2, 8.4, (z0 + z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[x1 - x0 + 4, 0.7, z1 - z0]} />
        <meshStandardMaterial color={p.predio} roughness={0.6} />
      </mesh>
      <mesh position={[(x0 + x1) / 2, 7.95, (z0 + z1) / 2]}>
        <boxGeometry args={[x1 - x0 + 4.1, 0.35, z1 - z0 + 0.1]} />
        <meshStandardMaterial color={p.faixaAzul} roughness={0.5} />
      </mesh>
      {pistas.map((pi, i) => (
        <group key={pi.id}>
          {/* balança */}
          <mesh position={[pi.x, 0.06, pi.zBalanca]} receiveShadow>
            <boxGeometry args={[3.6, 0.1, 22]} />
            <meshStandardMaterial color={p.concreto} roughness={0.8} />
          </mesh>
          {/* ilha com guarita e pilar entre pistas */}
          {i < pistas.length - 1 && (
            <group position={[pi.x + largura / 2, 0, (z0 + z1) / 2]}>
              <mesh position-y={0.15} receiveShadow>
                <boxGeometry args={[1.6, 0.3, z1 - z0 - 4]} />
                <meshStandardMaterial color={p.meioFio} roughness={0.9} />
              </mesh>
              <mesh position={[0, 4.2, 0]} castShadow>
                <boxGeometry args={[0.6, 8.2, 0.6]} />
                <meshStandardMaterial color={p.predioSombra} roughness={0.7} />
              </mesh>
              {i % 2 === 1 && (
                <mesh position={[0, 1.5, 6]} castShadow>
                  <boxGeometry args={[1.5, 2.8, 2.4]} />
                  <meshStandardMaterial color={p.vidro} roughness={0.3} metalness={0.3} />
                </mesh>
              )}
            </group>
          )}
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

function Scanner({ p, onSelecionar }: { p: Paleta; onSelecionar?: (id: string) => void }) {
  const s = planta.predios.find((x) => x.id === "scanner")!;
  const [cx, cz] = centroide(s.contorno);
  return (
    <group position={[cx, 0, cz]} onClick={(e) => { e.stopPropagation(); onSelecionar?.("scanner"); }} {...cursorClicavel}>
      {/* pórtico de inspeção não invasiva */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 3.6, 3.4, 0]} castShadow>
          <boxGeometry args={[1.1, 6.8, 4.5]} />
          <meshStandardMaterial color={p.predio} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 7.2, 0]} castShadow>
        <boxGeometry args={[8.4, 1.2, 4.5]} />
        <meshStandardMaterial color={p.predio} roughness={0.6} />
      </mesh>
      <mesh position={[0, 7.2, 2.27]}>
        <boxGeometry args={[8.42, 0.5, 0.05]} />
        <meshStandardMaterial color={p.faixaAzul} roughness={0.5} />
      </mesh>
      <mesh position={[8.5, 1.6, 10]} castShadow>
        <boxGeometry args={[4.2, 3.2, 6]} />
        <meshStandardMaterial color={p.predio} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Reservatorio({ p }: { p: Paleta }) {
  const r = planta.reservatorio;
  return (
    <group position={[r.centro[0], 0, r.centro[1]]}>
      <mesh position-y={r.altura / 2} castShadow receiveShadow>
        <cylinderGeometry args={[r.raio, r.raio, r.altura, 32]} />
        <meshStandardMaterial color={p.predio} roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position-y={r.altura + 0.4} castShadow>
        <coneGeometry args={[r.raio * 1.02, 1.2, 32]} />
        <meshStandardMaterial color={p.telhado} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

function PortasDocas({ p }: { p: Paleta }) {
  const docas = planta.vagas.filter((v) => v.setor === "DOC");
  return (
    <group>
      {docas.map((v) => {
        const ang = Math.atan2(-v.eixo[1], v.eixo[0]);
        return (
          <group key={v.id} position={[v.batente[0], 0, v.batente[1]]} rotation-y={ang}>
            <mesh position={[0.15, 2.4, 0]}>
              <boxGeometry args={[0.3, 4.2, 3.4]} />
              <meshStandardMaterial color={p.porta} roughness={0.6} />
            </mesh>
            <mesh position={[0.5, 2.4, 0]}>
              <boxGeometry args={[0.6, 4.6, 3.9]} />
              <meshStandardMaterial color="#2c313a" roughness={0.9} transparent opacity={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
