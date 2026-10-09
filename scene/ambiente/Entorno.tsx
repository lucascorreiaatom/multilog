"use client";
// Entorno estilizado (Imagem 2): gramado, campo, mata densa instanciada e rodovia com tráfego ao norte.
// Nada aqui inventa estruturas dentro do terreno do recinto.
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { criarRng } from "@/lib/patio/ficticio";
import { planta } from "@/lib/site";
import { geometriaCarro } from "../geometrias/caminhao";
import type { Paleta } from "../paleta";

const Z_RODOVIA = planta.vias.nos["rod-gate"][1]; // eixo da rodovia (m), fora da cerca

function dentroPoligono(x: number, z: number, pol: [number, number][]) {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, zi] = pol[i], [xj, zj] = pol[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

function distPoligono(x: number, z: number, pol: [number, number][]) {
  let d = Infinity;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [ax, az] = pol[j], [bx, bz] = pol[i];
    const abx = bx - ax, abz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)));
    d = Math.min(d, Math.hypot(x - (ax + abx * t), z - (az + abz * t)));
  }
  return d;
}

export function Entorno({ p, densidade = 1 }: { p: Paleta; densidade?: number }) {
  return (
    <group>
      <Chao p={p} />
      <Mata p={p} densidade={densidade} />
      <Rodovia p={p} />
      <Trafego p={p} />
    </group>
  );
}

function Chao({ p }: { p: Paleta }) {
  // campo agrícola a noroeste (como na Imagem 2) e gramado claro ao redor do recinto
  const campo = useMemo(() => {
    const s = new THREE.Shape();
    // coordenadas da forma em (x, -z): campo entre z = -1500 e z = -300
    s.moveTo(-1500, 1500); s.lineTo(-260, 1500); s.lineTo(-560, 300); s.lineTo(-1500, 300); s.closePath();
    return s;
  }, []);
  const cinturao = useMemo(() => {
    const s = new THREE.Shape(planta.cerca.map(([x, z]) => new THREE.Vector2(x, -z)));
    return s;
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color={p.gramaEscura} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <shapeGeometry args={[campo]} />
        <meshStandardMaterial color={p.campo} roughness={1} />
      </mesh>
      {/* faixa gramada clara contornando o recinto */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} scale={[1.07, 1.1, 1]} receiveShadow>
        <shapeGeometry args={[cinturao]} />
        <meshStandardMaterial color={p.grama} roughness={1} />
      </mesh>
    </group>
  );
}

function Mata({ p, densidade }: { p: Paleta; densidade: number }) {
  const copa = useRef<THREE.InstancedMesh>(null!);
  const tronco = useRef<THREE.InstancedMesh>(null!);
  const arvores = useMemo(() => {
    const r = criarRng(77);
    const out: { x: number; z: number; s: number; c: number }[] = [];
    const alvo = Math.round(7000 * densidade);
    let tent = 0;
    while (out.length < alvo && tent < alvo * 12) {
      tent++;
      const x = (r() - 0.5) * 2600, z = (r() - 0.5) * 2000;
      if (dentroPoligono(x, z, planta.cerca)) continue;
      if (distPoligono(x, z, planta.cerca) < 34) continue;
      if (Math.abs(z - Z_RODOVIA) < 34) continue; // rodovia e acostamentos
      if (z < -300 && x < -560 + (z + 300) * -0.25) continue; // campo agrícola
      // clareiras suaves por ruído de baixa frequência
      const n = Math.sin(x * 0.011) * Math.cos(z * 0.013) + Math.sin((x + z) * 0.006);
      if (n > 1.15) continue;
      out.push({ x, z, s: 0.75 + r() * 0.6, c: Math.floor(r() * p.copa.length) });
    }
    return out;
  }, [densidade, p.copa.length]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    arvores.forEach((a, i) => {
      const h = 9 * a.s;
      m.compose(new THREE.Vector3(a.x, h * 0.62, a.z), q, new THREE.Vector3(5.2 * a.s, 4.8 * a.s, 5.2 * a.s));
      copa.current.setMatrixAt(i, m);
      copa.current.setColorAt(i, c.set(p.copa[a.c]));
      m.compose(new THREE.Vector3(a.x, h * 0.2, a.z), q, new THREE.Vector3(a.s, h * 0.4, a.s));
      tronco.current.setMatrixAt(i, m);
    });
    copa.current.instanceMatrix.needsUpdate = true;
    if (copa.current.instanceColor) copa.current.instanceColor.needsUpdate = true;
    tronco.current.instanceMatrix.needsUpdate = true;
  }, [arvores, p.copa]);

  return (
    <group>
      <instancedMesh ref={copa} args={[undefined, undefined, arvores.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading={false} />
      </instancedMesh>
      <instancedMesh ref={tronco} args={[undefined, undefined, arvores.length]}>
        <cylinderGeometry args={[0.35, 0.45, 1, 6]} />
        <meshStandardMaterial color={p.tronco} roughness={1} />
      </instancedMesh>
    </group>
  );
}

function Rodovia({ p }: { p: Paleta }) {
  const tracos = useRef<THREE.InstancedMesh>(null!);
  const n = 150;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    let i = 0;
    for (const dz of [-7.4, 7.4]) for (let k = 0; k < n / 2; k++) {
      m.compose(new THREE.Vector3(-1500 + k * 40, 0.06, Z_RODOVIA + dz), q, new THREE.Vector3(12, 1, 0.22));
      tracos.current.setMatrixAt(i++, m);
    }
    tracos.current.instanceMatrix.needsUpdate = true;
  }, []);
  const xGate = (planta.pistasGate[0].x + planta.pistasGate[5].x) / 2;
  const zGateN = planta.pistasGate[0].zNorte;
  return (
    <group>
      {/* duas pistas de duas faixas com canteiro central */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, Z_RODOVIA - 9.5]} receiveShadow>
        <planeGeometry args={[3000, 15]} />
        <meshStandardMaterial color={p.asfaltoRodovia} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, Z_RODOVIA + 9.5]} receiveShadow>
        <planeGeometry args={[3000, 15]} />
        <meshStandardMaterial color={p.asfaltoRodovia} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.25, Z_RODOVIA]} receiveShadow>
        <boxGeometry args={[3000, 0.5, 4]} />
        <meshStandardMaterial color={p.canteiro} roughness={1} />
      </mesh>
      <instancedMesh ref={tracos} args={[undefined, undefined, n]} receiveShadow>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color={p.faixa} roughness={0.8} />
      </instancedMesh>
      {/* acesso pavimentado da rodovia às pistas dos Gates */}
      <mesh rotation-x={-Math.PI / 2} position={[xGate, 0.025, (Z_RODOVIA + zGateN) / 2 + 4]} receiveShadow>
        <planeGeometry args={[64, Math.abs(zGateN - Z_RODOVIA) + 2]} />
        <meshStandardMaterial color={p.asfalto} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Trafego({ p }: { p: Paleta }) {
  const pecas = useMemo(() => geometriaCarro(), []);
  const corpo = useRef<THREE.InstancedMesh>(null!);
  const neutro = useRef<THREE.InstancedMesh>(null!);
  const veiculos = useMemo(() => {
    const r = criarRng(9);
    return Array.from({ length: 34 }, (_, i) => {
      const sentido = i % 2 === 0 ? 1 : -1;
      const faixa = sentido > 0 ? (r() < 0.5 ? 6 : 12.5) : r() < 0.5 ? -6 : -12.5;
      return { x: (r() - 0.5) * 3000, z: Z_RODOVIA + faixa, v: (16 + r() * 8) * sentido, cor: p.carro[Math.floor(r() * p.carro.length)], escala: r() < 0.25 ? 1.6 : 1 };
    });
  }, [p.carro]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), y: new THREE.Vector3(0, 1, 0), c: new THREE.Color() }), []);
  useLayoutEffect(() => {
    veiculos.forEach((v, i) => corpo.current.setColorAt(i, tmp.c.set(v.cor)));
    if (corpo.current.instanceColor) corpo.current.instanceColor.needsUpdate = true;
  }, [veiculos, tmp]);
  useFrame((_, dt) => {
    veiculos.forEach((v, i) => {
      v.x += v.v * Math.min(dt, 0.1);
      if (v.x > 1500) v.x = -1500;
      if (v.x < -1500) v.x = 1500;
      tmp.q.setFromAxisAngle(tmp.y, v.v > 0 ? 0 : Math.PI);
      tmp.m.compose(new THREE.Vector3(v.x, 0, v.z), tmp.q, new THREE.Vector3(v.escala, v.escala, v.escala));
      corpo.current.setMatrixAt(i, tmp.m);
      neutro.current.setMatrixAt(i, tmp.m);
    });
    corpo.current.instanceMatrix.needsUpdate = true;
    neutro.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={corpo} args={[pecas.corpo, undefined, veiculos.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={neutro} args={[pecas.neutro, undefined, veiculos.length]} frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
