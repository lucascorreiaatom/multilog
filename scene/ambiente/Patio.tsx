"use client";
// Status das vagas por cima da pintura do cenário do Blender, no estilo do app Vite do mapa: preenchimento
// translúcido na vaga inteira e uma faixa forte na cabeceira (lado da boca). Clique seleciona a vaga; fora do filtro
// de status a vaga some (no shader, só as flags são reescritas).
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { StatusVaga } from "@/lib/patio/tipos";
import { planta } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { CAMADA, sobre } from "../camadas";
import { atributoFiltro, ocultavel } from "../filtroStatus";
import { cursorClicavel } from "../cursor";

/** cores por status. Dia: tons de tinta de piso, mais sóbrios que os da interface.
 *  Noite: iguais aos --st-* do tema escuro (app/globals.css) para piso e legenda baterem; mantenha os dois juntos */
export const COR_PISO: Record<"dia" | "noite", Record<StatusVaga, string>> = {
  dia: { livre: "#5fae74", ocupada: "#cf5a52", conferencia: "#6656c0", saida: "#e3a34a" },
  noite: { livre: "#4fb874", ocupada: "#e5605b", conferencia: "#8b7ef0", saida: "#eba84a" },
};

const CABECEIRA = 1.4;

function tinta(opacidade: number, camada: number) {
  return Object.assign(
    new THREE.MeshBasicMaterial({ transparent: true, opacity: opacidade, depthWrite: false, toneMapped: false, ...sobre(camada) }),
    { onBeforeCompile: ocultavel },
  );
}

export function Patio({ noite }: { noite: boolean }) {
  const piso = useRef<THREE.InstancedMesh>(null!);
  const cabeceira = useRef<THREE.InstancedMesh>(null!);
  const n = planta.vagas.length;
  // um material por camada; trocar o tema só muda a opacidade (args do instancedMesh não mudam)
  const materiais = useMemo(() => ({ piso: tinta(0.36, CAMADA.pisoVaga), cabeceira: tinta(0.9, CAMADA.faixaVaga) }), []);
  useLayoutEffect(() => {
    materiais.piso.opacity = noite ? 0.2 : 0.36;
    materiais.cabeceira.opacity = noite ? 0.6 : 0.9;
  }, [materiais, noite]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), y = new THREE.Vector3(0, 1, 0);
    planta.vagas.forEach((v, i) => {
      q.setFromAxisAngle(y, Math.atan2(-v.eixo[1], v.eixo[0]));
      m.compose(new THREE.Vector3(v.centro[0], 0.06, v.centro[1]), q, new THREE.Vector3(v.comprimento - 0.6, 1, v.largura - 0.4));
      piso.current.setMatrixAt(i, m);
      const alcance = v.comprimento / 2 - CABECEIRA / 2 - 0.3;
      m.compose(new THREE.Vector3(v.centro[0] + v.eixo[0] * alcance, 0.07, v.centro[1] + v.eixo[1] * alcance), q, new THREE.Vector3(CABECEIRA, 1, v.largura - 0.4));
      cabeceira.current.setMatrixAt(i, m);
    });
    piso.current.instanceMatrix.needsUpdate = true;
    cabeceira.current.instanceMatrix.needsUpdate = true;
  }, []);

  useLayoutEffect(() => {
    const cores = COR_PISO[noite ? "noite" : "dia"];
    const c = new THREE.Color();
    const flag = (m: THREE.InstancedMesh) => (m.geometry.getAttribute("aOculto") as THREE.InstancedBufferAttribute | undefined) ?? atributoFiltro(m.geometry, "aOculto", n);
    const fPiso = flag(piso.current), fCabeceira = flag(cabeceira.current);
    const pintar = () => {
      const { vagas } = usePatio.getState();
      const filtro = useUi.getState().filtroStatus;
      planta.vagas.forEach((v, i) => {
        const st = vagas[v.id]?.status ?? "livre";
        c.set(cores[st]);
        piso.current.setColorAt(i, c);
        cabeceira.current.setColorAt(i, c);
        const fora = filtro.length && !filtro.includes(st) ? 1 : 0;
        fPiso.setX(i, fora);
        fCabeceira.setX(i, fora);
      });
      for (const m of [piso.current, cabeceira.current]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
      fPiso.needsUpdate = true;
      fCabeceira.needsUpdate = true;
    };
    pintar();
    const des1 = usePatio.subscribe((s) => s.vagas, pintar);
    const des2 = useUi.subscribe((s) => s.filtroStatus, pintar);
    return () => { des1(); des2(); };
  }, [noite, n]);

  return (
    <group>
      <instancedMesh
        ref={piso}
        args={[undefined, materiais.piso, n]}
        {...cursorClicavel}
        onClick={(e) => {
          if (e.instanceId === undefined) return;
          e.stopPropagation();
          const id = planta.vagas[e.instanceId].id;
          // vaga escondida pelo filtro não recebe clique
          const filtro = useUi.getState().filtroStatus;
          if (filtro.length && !filtro.includes(usePatio.getState().vagas[id]?.status ?? "livre")) return;
          useUi.getState().selecionar({ tipo: "vaga", id });
          useUi.getState().focar({ tipo: "vaga", id });
        }}
      >
        <boxGeometry args={[1, 0.02, 1]} />
      </instancedMesh>
      <instancedMesh ref={cabeceira} args={[undefined, materiais.cabeceira, n]}>
        <boxGeometry args={[1, 0.02, 1]} />
      </instancedMesh>
    </group>
  );
}
