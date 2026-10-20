"use client";
// Entorno: gramado até o horizonte e o tráfego da BR-277. Mata, lavoura, rodovia e o acesso aos Gates vêm do
// cenário do Blender (Cenario.tsx), que cobre a área em volta do recinto.
import { useFrame } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { criarRng } from "@/lib/patio/ficticio";
import { planta } from "@/lib/site";
import { CAMADA, sobre } from "../camadas";
import { useDetalheChao } from "../materiais/chao";
import type { Paleta } from "../paleta";
import { useModelosCarro } from "../veiculos/carrosModelo";

const Z_RODOVIA = planta.vias.nos["rod-gate"][1]; // eixo da rodovia (m), fora da cerca

export function Entorno({ p }: { p: Paleta }) {
  return (
    <group>
      <Horizonte />
      <Suspense fallback={null}>
        <Trafego p={p} />
      </Suspense>
    </group>
  );
}

/** mesma cor do material Grama_Entorno do cenário: o horizonte continua o terreno sem emenda */
const GRAMA_ENTORNO = "#9cb183";

/** gramado sob o cenário, até onde a câmera alcança (o terreno do Blender cobre ~1,8 km em volta do recinto) */
function Horizonte() {
  const detalheGrama = useDetalheChao("grama");
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
      <planeGeometry args={[6000, 6000]} />
      <meshStandardMaterial color={GRAMA_ENTORNO} roughness={1} {...sobre(CAMADA.grama)} onBeforeCompile={detalheGrama} />
    </mesh>
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
    return Array.from({ length: 12 }, (_, i) => {
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
