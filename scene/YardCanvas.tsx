"use client";
// Canvas único da cena do pátio (WebGL2): entorno, pátio, prédios, caminhões, câmeras e transmissão AO VIVO.
import { CameraControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { centroSetor, planta, vagasPorId } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi, type AlvoCamera3D } from "@/lib/store/ui";
import { Entorno } from "./ambiente/Entorno";
import { Patio } from "./ambiente/Patio";
import { Predios } from "./ambiente/Predios";
import { CamerasExternas, Cobertura } from "./cameras/CamerasExternas";
import { Transmissao } from "./cameras/Transmissao";
import { PALETA, PALETA_FOCO } from "./paleta";
import { projetarTodos } from "./projetor";
import { Caminhoes } from "./veiculos/Caminhoes";
import { DestaqueSelecao } from "./veiculos/DestaqueSelecao";

/** vista inicial: do norte (rodovia) olhando para o sul, como na Imagem 2 */
export const VISTA_HOME = { pos: [40, 430, -560] as const, alvo: [10, 0, 40] as const };

function alvoParaVista(a: AlvoCamera3D): { pos: [number, number, number]; alvo: [number, number, number] } {
  const de = (x: number, z: number, dist: number, alt = 0.75): { pos: [number, number, number]; alvo: [number, number, number] } => ({
    pos: [x + dist * 0.15, dist * alt, z - dist * 0.75], alvo: [x, 0, z],
  });
  switch (a.tipo) {
    case "home": return { pos: [...VISTA_HOME.pos], alvo: [...VISTA_HOME.alvo] };
    case "ponto": return de(a.x, a.z, a.dist, 0.7);
    case "setor": { const [x, z] = centroSetor(a.id); return de(x, z, a.id === "EST" ? 420 : 200); }
    case "vaga": { const v = vagasPorId.get(a.id); return v ? de(v.centro[0], v.centro[1], 70, 0.7) : alvoParaVista({ tipo: "home" }); }
    case "camera": { const c = camerasExternas.find((q) => q.numero === a.numero); return c ? de(c.posicao[0], c.posicao[1], 80, 0.8) : alvoParaVista({ tipo: "home" }); }
    case "gate": { const g = planta.pistasGate.find((q) => q.numero === a.numero) ?? planta.pistasGate[0]; return de(g.x, g.zBalanca, 90, 0.8); }
    case "predio": {
      if (a.id === "reservatorio") { const [x, z] = planta.reservatorio.centro; return de(x, z, 120); }
      const b = planta.predios.find((q) => q.id === a.id);
      if (!b) return alvoParaVista({ tipo: "home" });
      const x = b.contorno.reduce((s, q) => s + q[0], 0) / b.contorno.length, z = b.contorno.reduce((s, q) => s + q[1], 0) / b.contorno.length;
      return de(x, z, b.id === "armazem" ? 260 : 150);
    }
  }
}

function Rig() {
  const ref = useRef<CameraControls>(null!);
  const alvo = useUi((s) => s.alvo);
  const comando = useUi((s) => s.comando);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const v = alvoParaVista(alvo.alvo);
    c.setLookAt(...v.pos, ...v.alvo, alvo.seq > 0);
  }, [alvo]);
  useEffect(() => {
    const c = ref.current;
    if (!c || !comando) return;
    if (comando.tipo === "zoom-in") c.dolly(c.distance * 0.3, true);
    if (comando.tipo === "zoom-out") c.dolly(-c.distance * 0.4, true);
    if (comando.tipo === "girar-esq") c.rotate(-Math.PI / 4, 0, true);
    if (comando.tipo === "girar-dir") c.rotate(Math.PI / 4, 0, true);
  }, [comando]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={25}
      maxDistance={1500}
      minPolarAngle={0.12}
      maxPolarAngle={1.32}
      smoothTime={0.55}
      dollyToCursor
      boundaryEnclosesCamera
    />
  );
}

/** renderiza a cena principal quando o pós-processamento está desligado (depuração) */
function RenderSimples() {
  useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1);
  return null;
}

/** medição: ?perf=1 expõe em window.__cenaInfo os totais do último quadro (todas as passadas) */
const PERF = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

function InfoCena() {
  const gl = useThree((s) => s.gl);
  const info = useRef({ calls: 0, triangles: 0, geometries: 0, textures: 0 });
  useEffect(() => {
    gl.info.autoReset = false;
    const ctx = gl.getContext();
    const dbg = ctx.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    const t = setInterval(() => {
      (window as unknown as { __cenaInfo: unknown }).__cenaInfo = { ...info.current, dpr: gl.getPixelRatio(), renderer };
    }, 500);
    return () => { clearInterval(t); gl.info.autoReset = true; };
  }, [gl]);
  useFrame(() => {
    info.current = { calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures };
    gl.info.reset();
  }, -1000);
  return null;
}

function ProjetorDom() {
  const { camera, size } = useThree();
  useFrame(() => projetarTodos(camera, size.width, size.height), 3);
  return null;
}

function Luzes({ noite, sombra, foco }: { noite: boolean; sombra: number; foco: boolean }) {
  const p = foco ? PALETA_FOCO[noite ? "escuro" : "claro"] : noite ? PALETA.noite : PALETA.dia;
  const sol = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    const s = sol.current;
    s.shadow.camera.left = -460; s.shadow.camera.right = 460;
    s.shadow.camera.top = 320; s.shadow.camera.bottom = -320;
    s.shadow.camera.near = 50; s.shadow.camera.far = 1600;
    s.shadow.camera.updateProjectionMatrix();
    s.shadow.mapSize.set(sombra, sombra);
    s.shadow.map?.dispose();
    s.shadow.map = null;
  }, [sombra]);
  return (
    <>
      <hemisphereLight args={[p.hemisferioCeu, p.hemisferioChao, noite ? 0.35 : foco ? 1.6 : 1.25]} />
      <directionalLight
        ref={sol}
        position={[-320, 520, -380]}
        intensity={noite ? 0.35 : foco ? 1.9 : 2.4}
        color={p.sol}
        castShadow
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <ambientLight intensity={noite ? 0.12 : foco ? 0.45 : 0.25} />
    </>
  );
}

/** depuração de desempenho: ?sem=ao,sombra,caminhoes,mata,feed,pos */
const SEM: Set<string> = new Set(typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("sem") ?? "").split(",") : []);
if (SEM.has("vidro")) document.documentElement.classList.add("sem-vidro");

/** depuração: ?sem=eventos desliga o raycast dos cliques 3D */
function SemEventos() {
  const set = useThree((s) => s.setEvents);
  useEffect(() => set({ enabled: false }), [set]);
  return null;
}

function Cena() {
  const tema = useUi((s) => s.tema);
  const foco = useUi((s) => s.foco);
  const noite = tema === "escuro";
  const p = foco ? PALETA_FOCO[noite ? "escuro" : "claro"] : noite ? PALETA.noite : PALETA.dia;
  const offline = usePatio((s) => s.camerasOffline);
  const selecionar = useUi((s) => s.selecionar);
  const focar = useUi((s) => s.focar);
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(p.ceu);
    scene.fog = new THREE.Fog(p.neblina, 1100, 2900);
  }, [scene, p.ceu, p.neblina]);
  return (
    <>
      <Luzes noite={noite} foco={foco} sombra={SEM.has("sombra") ? 16 : 4096} />
      <Entorno p={p} densidade={SEM.has("mata") ? 0.01 : 1} />
      <Patio p={p} noite={noite} />
      <Predios p={p} noite={noite} onSelecionar={(id) => { selecionar({ tipo: "predio", id }); focar({ tipo: "predio", id }); }} />
      {!SEM.has("caminhoes") && <Caminhoes />}
      <DestaqueSelecao />
      <CamerasExternas p={p} />
      <Cobertura />
      {!SEM.has("feed") && <Transmissao noite={noite} offline={offline} />}
      <ProjetorDom />
    </>
  );
}

export default function YardCanvas() {
  const foco = useUi((s) => s.foco);
  const noiteUi = useUi((s) => s.tema === "escuro");
  const dprForcado = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("dpr")) || 0 : 0;
  const dpr = useMemo<[number, number]>(() => (dprForcado ? [dprForcado, dprForcado] : [1, 1.75]), [dprForcado]);
  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ position: [...VISTA_HOME.pos], fov: 30, near: 2, far: 6000 }}
      onPointerMissed={() => useUi.getState().selecionar(null)}
      style={{ position: "absolute", inset: 0 }}
      data-testid="cena-3d"
    >
      {/* qualidade sempre máxima: sem rebaixamento automático (pedido do usuário) */}
      <Cena />
      <Rig />
      {PERF && <InfoCena />}
      {SEM.has("eventos") && <SemEventos />}
      {SEM.has("pos") && <RenderSimples />}
      {!SEM.has("pos") && <EffectComposer multisampling={0} enableNormalPass={false}>
        {!SEM.has("ao") ? <N8AO aoRadius={7} distanceFalloff={1.2} intensity={2.4} quality="medium" /> : <></>}
        <SMAA />
        <ToneMapping mode={foco && !noiteUi ? ToneMappingMode.NEUTRAL : ToneMappingMode.AGX} />
      </EffectComposer>}
    </Canvas>
  );
}
