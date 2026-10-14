"use client";
// Canvas único da cena do pátio (WebGL2): entorno, pátio, prédios, caminhões, câmeras e transmissão AO VIVO.
import { CameraControls } from "@react-three/drei";
import { Canvas, events as eventosPadrao, useFrame, useThree, type RootStore } from "@react-three/fiber";
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
    case "gates": {
      // as seis pistas inteiras, das cancelas ao norte à saída ao sul
      const xs = planta.pistasGate.map((g) => g.x);
      const z = (Math.min(...planta.pistasGate.map((g) => g.zNorte)) + Math.max(...planta.pistasGate.map((g) => g.zSul))) / 2;
      return de((Math.min(...xs) + Math.max(...xs)) / 2, z, 340, 0.8);
    }
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
    // o zoom em direção ao cursor puxa o alvo para baixo do chão e a câmera atravessa o asfalto: alvo nunca abaixo de y=0
    ref.current?.setBoundary(new THREE.Box3(new THREE.Vector3(-Infinity, 0, -Infinity), new THREE.Vector3(Infinity, Infinity, Infinity)));
  }, []);
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

/** maior altura de objeto na cena (postes 14 m, prédios 13 m) com folga: abaixo disso a câmera pode ter algo perto */
const ALTURA_MAX = 20;

/** near acompanha a altura da câmera: com near=2 visto do alto falta precisão de profundidade e camadas a poucos
 *  centímetros (meio-fio e grama dos canteiros, balanças) se misturam */
function PlanoProximo() {
  useFrame(({ camera }) => {
    const near = THREE.MathUtils.clamp((camera.position.y - ALTURA_MAX) * 0.5, 2, 150);
    if (Math.abs(near - camera.near) > camera.near * 0.05) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/** renderiza a cena principal quando o pós-processamento está desligado (depuração) */
function RenderSimples() {
  useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1);
  return null;
}

/** níveis de qualidade. "alta" é o visual completo (modo alta); "desempenho" é o modo para GPU integrada
 *  (lib/grafico.ts); "maxima" acrescenta a sombra projetada e só entra por ?qualidade=maxima.
 *  O nível é fixo durante a sessão: trocar de nível realoca o composer e o AO e travava a cena no meio do uso. */
const NIVEIS = {
  desempenho: { dpr: 1, msaa: 2, ao: "meia", sombra: false },
  alta: { dpr: 1.25, msaa: 4, ao: "cheia", sombra: false },
  maxima: { dpr: 1.5, msaa: 4, ao: "cheia", sombra: true },
} as const;
type Nivel = keyof typeof NIVEIS;

/** ?qualidade=desempenho|alta|maxima força o nível, acima do modo gráfico */
const QUALIDADE_FIXA = (() => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("qualidade");
  return q !== null && q in NIVEIS ? (q as Nivel) : null;
})();

/** medição: ?perf=1 expõe em window.__cenaInfo os totais do último quadro (todas as passadas) */
const PERF = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

function InfoCena({ nivel }: { nivel: Nivel }) {
  const gl = useThree((s) => s.gl);
  const info = useRef({ calls: 0, triangles: 0, geometries: 0, textures: 0 });
  useEffect(() => {
    gl.info.autoReset = false;
    const ctx = gl.getContext();
    const dbg = ctx.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    const t = setInterval(() => {
      (window as unknown as { __cenaInfo: unknown }).__cenaInfo = { ...info.current, dpr: gl.getPixelRatio(), renderer, qualidade: nivel };
    }, 500);
    return () => { clearInterval(t); gl.info.autoReset = true; };
  }, [gl, nivel]);
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

/** sombra projetada só no nível máximo: a passada de sombra redesenha a cena inteira (caminhões inclusive).
 *  Noite é tema escuro operacional: a cor fria da paleta diz "noite", a intensidade continua alta para o status ler;
 *  sem sombra à noite (a da lua seria invisível e custa uma passada). */
function Luzes({ noite, sombra, foco }: { noite: boolean; sombra: boolean; foco: boolean }) {
  const p = foco ? PALETA_FOCO[noite ? "escuro" : "claro"] : noite ? PALETA.noite : PALETA.dia;
  const sol = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    const s = sol.current;
    s.shadow.camera.left = -460; s.shadow.camera.right = 460;
    s.shadow.camera.top = 320; s.shadow.camera.bottom = -320;
    s.shadow.camera.near = 50; s.shadow.camera.far = 1600;
    s.shadow.camera.updateProjectionMatrix();
    s.shadow.mapSize.set(2048, 2048);
  }, []);
  return (
    <>
      <hemisphereLight args={[p.hemisferioCeu, p.hemisferioChao, noite ? 1.1 : foco ? 1.6 : 1.25]} />
      <directionalLight
        ref={sol}
        position={[-320, 520, -380]}
        intensity={noite ? 1.0 : foco ? 1.9 : 2.4}
        color={p.sol}
        castShadow={sombra && !noite}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <ambientLight intensity={noite ? 0.3 : foco ? 0.45 : 0.25} />
    </>
  );
}

/** eventos 3D sem raycast desperdiçado: a cena só tem clique e cursor de hover, então
 *  - nada de raycast no pointermove com botão apertado (arrasto da câmera) nem na roda do mouse;
 *  - o hover junta os pointermove de um quadro num raycast só (mouses de 1000 Hz mandam vários por quadro).
 *  Clique continua igual: o R3F decide pelo pointerdown/pointerup, que não passam por aqui. */
function eventosLeves(store: RootStore) {
  const base = eventosPadrao(store);
  const h = base.handlers!;
  let pendente: Event | null = null;
  let agendado = false;
  const mover = (e: Event) => {
    if ((e as PointerEvent).buttons) return;
    pendente = e;
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      const ev = pendente;
      pendente = null;
      if (ev) h.onPointerMove(ev);
    });
  };
  return { ...base, handlers: { ...h, onPointerMove: mover, onWheel: () => {} } };
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

function Cena({ sombra, leve }: { sombra: boolean; leve: boolean }) {
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
    // à noite a neblina vem mais perto e dissolve o entorno distante no céu
    scene.fog = noite ? new THREE.Fog(p.neblina, 800, 2200) : new THREE.Fog(p.neblina, 1100, 2900);
  }, [scene, p.ceu, p.neblina, noite]);
  return (
    <>
      <Luzes noite={noite} foco={foco} sombra={sombra && !SEM.has("sombra")} />
      <Entorno p={p} densidade={SEM.has("mata") ? 0.01 : 1} />
      <Patio p={p} noite={noite} />
      <Predios p={p} noite={noite} onSelecionar={(id) => { selecionar({ tipo: "predio", id }); focar({ tipo: "predio", id }); }} />
      {!SEM.has("caminhoes") && <Caminhoes />}
      <DestaqueSelecao />
      <CamerasExternas p={p} />
      <Cobertura />
      {!SEM.has("feed") && <Transmissao noite={noite} offline={offline} leve={leve} />}
      <ProjetorDom />
    </>
  );
}

export default function YardCanvas() {
  const foco = useUi((s) => s.foco);
  const noiteUi = useUi((s) => s.tema === "escuro");
  const dprForcado = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("dpr")) || 0 : 0;
  const grafico = useUi((s) => s.grafico);
  const nivel: Nivel = QUALIDADE_FIXA ?? grafico;
  const q = NIVEIS[nivel];
  const dpr = useMemo<[number, number]>(() => (dprForcado ? [dprForcado, dprForcado] : [1, q.dpr]), [dprForcado, q.dpr]);
  return (
    <Canvas
      shadows="percentage" // PCFShadowMap: o three 0.186 removeu o PCFSoft e já caía neste, com aviso no console
      dpr={dpr}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ position: [...VISTA_HOME.pos], fov: 30, near: 2, far: 6000 }}
      events={eventosLeves}
      onPointerMissed={() => useUi.getState().selecionar(null)}
      style={{ position: "absolute", inset: 0 }}
      data-testid="cena-3d"
    >
      <Cena sombra={q.sombra} leve={nivel === "desempenho"} />
      <Rig />
      <PlanoProximo />
      {PERF && <InfoCena nivel={nivel} />}
      {SEM.has("eventos") && <SemEventos />}
      {SEM.has("pos") && <RenderSimples />}
      {/* MSAA 4x: faixas das vagas (0,14 m) e vãos entre vagas ficam abaixo de 1 px; só com SMAA viram pontilhado e piscam */}
      {!SEM.has("pos") && <EffectComposer multisampling={q.msaa} enableNormalPass={false}>
        {!SEM.has("ao") && q.ao ? <N8AO aoRadius={7} distanceFalloff={1.2} intensity={noiteUi ? 1.5 : 2.4} quality="medium" halfRes={q.ao === "meia"} /> : <></>}
        <SMAA />
        <ToneMapping mode={foco || noiteUi ? ToneMappingMode.NEUTRAL : ToneMappingMode.AGX} />
      </EffectComposer>}
    </Canvas>
  );
}
