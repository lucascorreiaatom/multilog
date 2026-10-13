"use client";
// Entorno estilizado (Imagem 2): gramado, campo, mata densa instanciada e rodovia com tráfego ao norte.
// Nada aqui inventa estruturas dentro do terreno do recinto.
import { useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { criarRng } from "@/lib/patio/ficticio";
import { planta } from "@/lib/site";
import { CAMADA, sobre } from "../camadas";
import { useDetalheChao } from "../materiais/chao";
import type { Paleta } from "../paleta";
import { PESO_ARVORE, useModelosArvore } from "./arvoresModelo";
import { useModelosCarro } from "../veiculos/carrosModelo";

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
      <Suspense fallback={null}>
        <Mata p={p} densidade={densidade} />
      </Suspense>
      <Rodovia p={p} />
      <Suspense fallback={null}>
        <Trafego p={p} />
      </Suspense>
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
  const detalheGrama = useDetalheChao("grama");
  const detalheCampo = useDetalheChao("campo");
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color={p.gramaEscura} roughness={1} {...sobre(CAMADA.grama)} onBeforeCompile={detalheGrama} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <shapeGeometry args={[campo]} />
        <meshStandardMaterial color={p.campo} roughness={1} {...sobre(CAMADA.campo)} onBeforeCompile={detalheCampo} />
      </mesh>
      {/* faixa gramada clara contornando o recinto */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} scale={[1.07, 1.1, 1]} receiveShadow>
        <shapeGeometry args={[cinturao]} />
        <meshStandardMaterial color={p.grama} roughness={1} {...sobre(CAMADA.cinturao)} onBeforeCompile={detalheGrama} />
      </mesh>
    </group>
  );
}

/** mata densa: pinheiros do KayKit instanciados (2 variantes, 4 draw calls para milhares de árvores) */
function Mata({ p, densidade }: { p: Paleta; densidade: number }) {
  const modelos = useModelosArvore();
  const copas = useRef<(THREE.InstancedMesh | null)[]>([]);
  const troncos = useRef<(THREE.InstancedMesh | null)[]>([]);
  const arvores = useMemo(() => {
    const r = criarRng(77);
    const rv = criarRng(79); // variante em sequência própria: posições e cores seguem as de antes
    const out: { x: number; z: number; s: number; c: number; v: number }[] = [];
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
      out.push({ x, z, s: 0.75 + r() * 0.6, c: Math.floor(r() * p.copa.length), v: rv() < PESO_ARVORE[0] ? 0 : 1 });
    }
    return out;
  }, [densidade, p.copa.length]);
  const lotes = useMemo(() => modelos.map((_, k) => arvores.filter((a) => a.v === k)), [modelos, arvores]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), y = new THREE.Vector3(0, 1, 0), e = new THREE.Vector3();
    const giro = criarRng(78);
    lotes.forEach((lote, k) => {
      const copa = copas.current[k], tronco = troncos.current[k];
      if (!copa || !tronco) return;
      lote.forEach((a, i) => {
        const h = 11 * a.s; // altura total (m); pinheiro um pouco mais largo que o original para a mata fechar
        q.setFromAxisAngle(y, giro() * Math.PI * 2);
        m.compose(e.set(a.x, 0, a.z), q, new THREE.Vector3(h * 1.35, h, h * 1.35));
        copa.setMatrixAt(i, m);
        tronco.setMatrixAt(i, m);
        copa.setColorAt(i, c.set(p.copa[a.c]));
      });
      copa.instanceMatrix.needsUpdate = true;
      tronco.instanceMatrix.needsUpdate = true;
      if (copa.instanceColor) copa.instanceColor.needsUpdate = true;
      copa.computeBoundingSphere();
      tronco.computeBoundingSphere();
    });
  }, [lotes, p.copa]);

  return (
    <group>
      {modelos.map((pecas, k) => lotes[k].length > 0 && (
        <group key={k}>
          <instancedMesh ref={(m) => { copas.current[k] = m; }} args={[pecas.copa, undefined, lotes[k].length]} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.9} />
          </instancedMesh>
          <instancedMesh ref={(m) => { troncos.current[k] = m; }} args={[pecas.tronco, undefined, lotes[k].length]}>
            <meshStandardMaterial vertexColors color={p.tronco} roughness={1} />
          </instancedMesh>
        </group>
      ))}
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
        <meshStandardMaterial color={p.asfaltoRodovia} roughness={0.95} {...sobre(CAMADA.rodovia)} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, Z_RODOVIA + 9.5]} receiveShadow>
        <planeGeometry args={[3000, 15]} />
        <meshStandardMaterial color={p.asfaltoRodovia} roughness={0.95} {...sobre(CAMADA.rodovia)} />
      </mesh>
      <mesh position={[0, 0.25, Z_RODOVIA]} receiveShadow>
        <boxGeometry args={[3000, 0.5, 4]} />
        <meshStandardMaterial color={p.canteiro} roughness={1} />
      </mesh>
      <instancedMesh ref={tracos} args={[undefined, undefined, n]} receiveShadow>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color={p.faixa} roughness={0.8} {...sobre(CAMADA.faixaRodovia)} />
      </instancedMesh>
      {/* acesso pavimentado da rodovia às pistas dos Gates */}
      <mesh rotation-x={-Math.PI / 2} position={[xGate, 0.025, (Z_RODOVIA + zGateN) / 2 + 4]} receiveShadow>
        <planeGeometry args={[64, Math.abs(zGateN - Z_RODOVIA) + 2]} />
        <meshStandardMaterial color={p.asfalto} roughness={0.95} {...sobre(CAMADA.acesso)} />
      </mesh>
    </group>
  );
}

function Trafego({ p }: { p: Paleta }) {
  const modelos = useModelosCarro();
  const corpos = useRef<(THREE.InstancedMesh | null)[]>([]);
  const neutros = useRef<(THREE.InstancedMesh | null)[]>([]);
  const veiculos = useMemo(() => {
    const r = criarRng(9);
    const rv = criarRng(10); // variante em sequência própria: faixas, velocidades e cores seguem as de antes
    const ocupacao = modelos.map(() => 0);
    return Array.from({ length: 34 }, (_, i) => {
      const sentido = i % 2 === 0 ? 1 : -1;
      const faixa = sentido > 0 ? (r() < 0.5 ? 6 : 12.5) : r() < 0.5 ? -6 : -12.5;
      const base = { x: (r() - 0.5) * 3000, z: Z_RODOVIA + faixa, v: (16 + r() * 8) * sentido, cor: p.carro[Math.floor(r() * p.carro.length)] };
      r(); // antes sorteava escala 1,6 para 1 em 4 carros; com modelos reais o carro gigante destoa, então todos em escala 1
      const variante = Math.floor(rv() * modelos.length);
      return { ...base, variante, indice: ocupacao[variante]++ };
    });
  }, [p.carro, modelos]);
  const quantidade = useMemo(() => modelos.map((_, k) => veiculos.filter((v) => v.variante === k).length), [modelos, veiculos]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), y: new THREE.Vector3(0, 1, 0), c: new THREE.Color(), pos: new THREE.Vector3(), um: new THREE.Vector3(1, 1, 1) }), []);
  useLayoutEffect(() => {
    veiculos.forEach((v) => corpos.current[v.variante]?.setColorAt(v.indice, tmp.c.set(v.cor)));
    for (const c of corpos.current) if (c?.instanceColor) c.instanceColor.needsUpdate = true;
  }, [veiculos, tmp]);
  useFrame((_, dt) => {
    veiculos.forEach((v) => {
      const corpo = corpos.current[v.variante], neutro = neutros.current[v.variante];
      if (!corpo || !neutro) return;
      v.x += v.v * Math.min(dt, 0.1);
      if (v.x > 1500) v.x = -1500;
      if (v.x < -1500) v.x = 1500;
      tmp.q.setFromAxisAngle(tmp.y, v.v > 0 ? 0 : Math.PI);
      tmp.m.compose(tmp.pos.set(v.x, 0, v.z), tmp.q, tmp.um);
      corpo.setMatrixAt(v.indice, tmp.m);
      neutro.setMatrixAt(v.indice, tmp.m);
    });
    for (const c of corpos.current) if (c) c.instanceMatrix.needsUpdate = true;
    for (const n of neutros.current) if (n) n.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {modelos.map((pecas, k) => quantidade[k] > 0 && (
        <group key={k}>
          <instancedMesh ref={(m) => { corpos.current[k] = m; }} args={[pecas.corpo, undefined, quantidade[k]]} castShadow frustumCulled={false}>
            <meshStandardMaterial vertexColors roughness={0.45} />
          </instancedMesh>
          <instancedMesh ref={(m) => { neutros.current[k] = m; }} args={[pecas.neutro, undefined, quantidade[k]]} castShadow frustumCulled={false}>
            <meshStandardMaterial vertexColors roughness={0.6} />
          </instancedMesh>
        </group>
      ))}
    </group>
  );
}
