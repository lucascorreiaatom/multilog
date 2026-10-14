"use client";
// Pavimento, canteiros, pintura das vagas (cor do status), cerca, postes, veículos leves e Pátio Container.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { criarRng } from "@/lib/patio/ficticio";
import type { StatusVaga } from "@/lib/patio/tipos";
import { planta } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { CAMADA, sobre } from "../camadas";
import { atributoFiltro, ocultavel } from "../filtroStatus";
import { useDetalheChao } from "../materiais/chao";
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

const forma = (pts: [number, number][]) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));

export function Patio({ p, noite }: { p: Paleta; noite: boolean }) {
  return (
    <group>
      <Pavimento p={p} />
      <Canteiros p={p} />
      <PinturaVagas p={p} noite={noite} />
      <Cerca p={p} />
      <PostesLuz p={p} noite={noite} />
      <VeiculosLeves p={p} />
      <PatioContainer p={p} />
    </group>
  );
}

function Pavimento({ p }: { p: Paleta }) {
  const area = useMemo(() => forma(planta.cerca), []);
  const cpg = useMemo(() => forma(planta.areaCPG), []);
  const scanner = useMemo(() => forma(planta.scannerPlataforma), []);
  const detalheAsfalto = useDetalheChao("asfalto");
  const detalheConcreto = useDetalheChao("concreto");
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} receiveShadow>
        <shapeGeometry args={[area]} />
        <meshStandardMaterial color={p.asfalto} roughness={0.95} {...sobre(CAMADA.asfalto)} onBeforeCompile={detalheAsfalto} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
        <shapeGeometry args={[cpg]} />
        <meshStandardMaterial color={p.concreto} roughness={0.9} {...sobre(CAMADA.concreto)} onBeforeCompile={detalheConcreto} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow>
        <shapeGeometry args={[scanner]} />
        <meshStandardMaterial color={p.concreto} roughness={0.9} {...sobre(CAMADA.scanner)} onBeforeCompile={detalheConcreto} />
      </mesh>
    </group>
  );
}

function Canteiros({ p }: { p: Paleta }) {
  const detalheGrama = useDetalheChao("grama");
  // canteiro central em cápsula (meio-fio claro + grama), com ilhas arredondadas nas pontas
  const itens = useMemo(() => planta.canteiros.map((c) => {
    const dx = c.b[0] - c.a[0], dz = c.b[1] - c.a[1], L = Math.hypot(dx, dz);
    return { cx: (c.a[0] + c.b[0]) / 2, cz: (c.a[1] + c.b[1]) / 2, L, ang: Math.atan2(-dz, dx), w: Math.max(2.4, c.largura) };
  }), []);
  return (
    <group>
      {itens.map((c, i) => (
        <group key={i} position={[c.cx, 0, c.cz]} rotation-y={c.ang}>
          <mesh position-y={0.09} receiveShadow castShadow>
            <boxGeometry args={[c.L, 0.18, c.w + 0.5]} />
            <meshStandardMaterial color={p.meioFio} roughness={0.9} />
          </mesh>
          <mesh position-y={0.19} receiveShadow>
            <boxGeometry args={[c.L - 0.6, 0.04, c.w - 0.2]} />
            <meshStandardMaterial color={p.canteiro} roughness={1} onBeforeCompile={detalheGrama} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position-x={(s * c.L) / 2}>
              <mesh position-y={0.09} receiveShadow castShadow>
                <cylinderGeometry args={[c.w * 0.5 + 3.2, c.w * 0.5 + 3.2, 0.18, 28]} />
                <meshStandardMaterial color={p.meioFio} roughness={0.9} />
              </mesh>
              <mesh position-y={0.19} receiveShadow>
                <cylinderGeometry args={[c.w * 0.5 + 2.8, c.w * 0.5 + 2.8, 0.04, 28]} />
                <meshStandardMaterial color={p.canteiro} roughness={1} onBeforeCompile={detalheGrama} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
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

function Cerca({ p }: { p: Paleta }) {
  const postes = useRef<THREE.InstancedMesh>(null!);
  const { pts, telas } = useMemo(() => {
    const pts: [number, number][] = [];
    const telas: { cx: number; cz: number; L: number; ang: number }[] = [];
    const c = planta.cerca;
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[(i + 1) % c.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // trecho do acesso dos Gates fica aberto
      const abertoGates = Math.abs(a[1] - b[1]) < 1 && a[1] < -200 && Math.min(a[0], b[0]) < -100 && Math.max(a[0], b[0]) > -160;
      if (abertoGates) {
        const xs = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
        const vao = [planta.pistasGate[0].x - 8, planta.pistasGate[5].x + 8];
        for (const [x0, x1] of [[xs[0], vao[0]], [vao[1], xs[1]]]) {
          const l = x1 - x0;
          telas.push({ cx: (x0 + x1) / 2, cz: a[1], L: l, ang: 0 });
          for (let s = 0; s <= l; s += 3) pts.push([x0 + s, a[1]]);
        }
        continue;
      }
      telas.push({ cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, L, ang: Math.atan2(-(b[1] - a[1]), b[0] - a[0]) });
      for (let s = 0; s < L; s += 3) pts.push([a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L]);
    }
    return { pts, telas };
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    pts.forEach(([x, z], i) => { m.makeTranslation(x, 1.25, z); postes.current.setMatrixAt(i, m); });
    postes.current.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return (
    <group>
      <instancedMesh ref={postes} args={[undefined, undefined, pts.length]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.5, 5]} />
        <meshStandardMaterial color={p.cerca} roughness={0.6} metalness={0.3} />
      </instancedMesh>
      {telas.map((t, i) => (
        <mesh key={i} position={[t.cx, 1.25, t.cz]} rotation-y={t.ang}>
          <planeGeometry args={[t.L, 2.5]} />
          <meshStandardMaterial color={p.cerca} transparent opacity={0.28} side={THREE.DoubleSide} roughness={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** postes: à noite só a cabeça acende (cor quente, discreta); sem poças de luz no chão, que brigavam com o status */
function PostesLuz({ p, noite }: { p: Paleta; noite: boolean }) {
  const haste = useRef<THREE.InstancedMesh>(null!);
  const cabeca = useRef<THREE.InstancedMesh>(null!);
  const n = planta.postes.length;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    planta.postes.forEach(([x, z], i) => {
      m.makeTranslation(x, 7, z); haste.current.setMatrixAt(i, m);
      m.makeTranslation(x, 14.1, z); cabeca.current.setMatrixAt(i, m);
    });
    for (const r of [haste, cabeca]) r.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={haste} args={[undefined, undefined, n]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 14, 6]} />
        <meshStandardMaterial color={p.poste} roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={cabeca} args={[undefined, undefined, n]}>
        <boxGeometry args={[1.6, 0.25, 0.7]} />
        <meshStandardMaterial color={noite ? "#ffe2aa" : p.poste} emissive={noite ? "#ffd38a" : "#000000"} emissiveIntensity={noite ? 0.8 : 0} roughness={0.4} />
      </instancedMesh>
    </group>
  );
}

/** estacionamento de carros: só as coberturas (os carros saíram na redução de detalhe; as vagas leves não têm status) */
function VeiculosLeves({ p }: { p: Paleta }) {
  return (
    <group>
      {planta.coberturasLeves.map((c, i) => {
        const xs = c.map((q) => q[0]), zs = c.map((q) => q[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
        return (
          <group key={i} position={[cx, 0, cz]}>
            <mesh position-y={3.2} castShadow receiveShadow>
              <boxGeometry args={[Math.max(...xs) - Math.min(...xs), 0.18, Math.max(...zs) - Math.min(...zs) + 1.5]} />
              <meshStandardMaterial color={p.vidro} roughness={0.35} metalness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function PatioContainer({ p }: { p: Paleta }) {
  const detalheGrama = useDetalheChao("grama");
  const caixas = useRef<THREE.InstancedMesh>(null!);
  const lista = useMemo(() => {
    const r = criarRng(52);
    const out: { x: number; y: number; z: number; c: number }[] = [];
    for (const bloco of planta.blocosContainer) {
      const xs = bloco.map((q) => q[0]), zs = bloco.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      const filas = Math.max(1, Math.round((z1 - z0) / 3.3));
      const colunas = 5;
      for (let f = 0; f < filas; f++) for (let k = 0; k < colunas; k++) {
        const altura = r() < 0.12 ? 0 : 1 + Math.floor(r() * 4);
        for (let h = 0; h < altura; h++) out.push({ x: x0 + ((k + 0.5) * (x1 - x0)) / colunas, y: 1.3 + h * 2.62, z: z0 + ((f + 0.5) * (z1 - z0)) / filas, c: Math.floor(r() * p.container.length) });
      }
    }
    return out;
  }, [p.container.length]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    lista.forEach((b, i) => { m.makeTranslation(b.x, b.y, b.z); caixas.current.setMatrixAt(i, m); caixas.current.setColorAt(i, c.set(p.container[b.c])); });
    caixas.current.instanceMatrix.needsUpdate = true;
    if (caixas.current.instanceColor) caixas.current.instanceColor.needsUpdate = true;
  }, [lista, p.container]);
  return (
    <group>
      <instancedMesh ref={caixas} args={[undefined, undefined, lista.length]} castShadow receiveShadow>
        <boxGeometry args={[12.0, 2.55, 2.4]} />
        <meshStandardMaterial roughness={0.7} metalness={0.15} />
      </instancedMesh>
      {planta.canteirosContainer.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position-y={0.15} receiveShadow>
            <cylinderGeometry args={[5.4, 5.6, 0.3, 24]} />
            <meshStandardMaterial color={p.meioFio} roughness={0.9} />
          </mesh>
          <mesh position-y={0.31} receiveShadow>
            <cylinderGeometry args={[5, 5, 0.04, 24]} />
            <meshStandardMaterial color={p.canteiro} roughness={1} onBeforeCompile={detalheGrama} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
