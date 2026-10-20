"use client";
// Pintura das vagas (cor do status, filtro e clique). Pavimento, canteiros, cerca, postes, coberturas e o Pátio
// Container vêm do cenário modelado no Blender (Cenario.tsx).
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { StatusVaga } from "@/lib/patio/tipos";
import { planta } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { CAMADA, sobre } from "../camadas";
import { atributoFiltro, ocultavel } from "../filtroStatus";
import type { Paleta } from "../paleta";
import { cursorClicavel } from "../cursor";

/** cores do piso por status. Dia: tons de tinta de piso, mais sóbrios que os da interface.
 *  Noite: iguais aos --st-* do tema escuro (app/globals.css) para piso e legenda baterem; mantenha os dois juntos */
export const COR_PISO: Record<"dia" | "noite", Record<StatusVaga, string>> = {
  dia: { livre: "#5fae74", ocupada: "#cf5a52", conferencia: "#6656c0", saida: "#e3a34a" },
  noite: { livre: "#4fb874", ocupada: "#e5605b", conferencia: "#8b7ef0", saida: "#eba84a" },
};

/** autoiluminação da tinta das vagas (0 de dia): à noite o status lê em qualquer ângulo sem acender o resto da cena.
 *  Uniform compartilhado: trocar o tema não recompila o shader */
const uBrilhoVaga = { value: 0 };
function pisoVaga(shader: THREE.WebGLProgramParametersWithUniforms) {
  ocultavel(shader);
  shader.uniforms.uBrilhoVaga = uBrilhoVaga;
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform float uBrilhoVaga;")
    .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uBrilhoVaga;");
}

export function Patio({ p, noite }: { p: Paleta; noite: boolean }) {
  return <PinturaVagas p={p} noite={noite} />;
}

function PinturaVagas({ p, noite }: { p: Paleta; noite: boolean }) {
  const piso = useRef<THREE.InstancedMesh>(null!);
  const linhas = useRef<THREE.InstancedMesh>(null!);
  const n = planta.vagas.length;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), y = new THREE.Vector3(0, 1, 0);
    let k = 0;
    planta.vagas.forEach((v, i) => {
      const ang = Math.atan2(-v.eixo[1], v.eixo[0]);
      q.setFromAxisAngle(y, ang);
      m.compose(new THREE.Vector3(v.centro[0], 0.04, v.centro[1]), q, new THREE.Vector3(v.comprimento - 0.5, 1, v.largura - 0.45));
      piso.current.setMatrixAt(i, m);
      // bordas laterais (linhas brancas)
      const px = -v.eixo[1], pz = v.eixo[0];
      for (const s of [-1, 1]) {
        m.compose(new THREE.Vector3(v.centro[0] + px * s * (v.largura / 2), 0.045, v.centro[1] + pz * s * (v.largura / 2)), q, new THREE.Vector3(v.comprimento, 1, 0.14));
        linhas.current.setMatrixAt(k++, m);
      }
    });
    piso.current.instanceMatrix.needsUpdate = true;
    linhas.current.instanceMatrix.needsUpdate = true;
  }, []);

  useLayoutEffect(() => {
    const cores = COR_PISO[noite ? "noite" : "dia"];
    uBrilhoVaga.value = noite ? 0.4 : 0;
    const c = new THREE.Color();
    // fora do filtro de status a vaga some (piso e faixas), no shader: só reescreve as flags
    const flag = (m: THREE.InstancedMesh, k: number) => (m.geometry.getAttribute("aOculto") as THREE.InstancedBufferAttribute | undefined) ?? atributoFiltro(m.geometry, "aOculto", k);
    const fPiso = flag(piso.current, n), fLinhas = flag(linhas.current, n * 2);
    const pintar = () => {
      const { vagas } = usePatio.getState();
      const filtro = useUi.getState().filtroStatus;
      planta.vagas.forEach((v, i) => {
        const st = vagas[v.id]?.status ?? "livre";
        piso.current.setColorAt(i, c.set(cores[st]));
        const fora = filtro.length && !filtro.includes(st) ? 1 : 0;
        fPiso.setX(i, fora);
        fLinhas.setX(2 * i, fora);
        fLinhas.setX(2 * i + 1, fora);
      });
      if (piso.current.instanceColor) piso.current.instanceColor.needsUpdate = true;
      fPiso.needsUpdate = true;
      fLinhas.needsUpdate = true;
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
        args={[undefined, undefined, n]}
        receiveShadow
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
        <meshStandardMaterial roughness={0.85} {...sobre(CAMADA.pisoVaga)} onBeforeCompile={pisoVaga} />
      </instancedMesh>
      <instancedMesh ref={linhas} args={[undefined, undefined, n * 2]} receiveShadow>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color={p.faixa} roughness={0.8} {...sobre(CAMADA.faixaVaga)} onBeforeCompile={ocultavel} />
      </instancedMesh>
    </group>
  );
}
