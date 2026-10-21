"use client";
// Canvas único da cena do pátio (WebGL2): cenário, vagas, caminhões, carros e câmeras do projeto Blender (multilog_foz),
// com a luz do app Vite do mapa, e a transmissão AO VIVO.
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { Canvas, events as eventosPadrao, useFrame, useThree, type RootStore } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { centroSetor, planta, vagasPorId } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi, type AlvoCamera3D } from "@/lib/store/ui";
import { Atmosfera, SombraEstatica } from "./ambiente/Atmosfera";
import { Cenario } from "./ambiente/Cenario";
import { Entorno } from "./ambiente/Entorno";
import { Patio } from "./ambiente/Patio";
import { Predios } from "./ambiente/Predios";
import { CamerasExternas, Cobertura } from "./cameras/CamerasExternas";
import { Transmissao } from "./cameras/Transmissao";
import { PALETA } from "./paleta";
import { projetarTodos } from "./projetor";
import { Caminhoes } from "./veiculos/Caminhoes";
import { CarrosEstacionados } from "./veiculos/CarrosEstacionados";
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

const { ACTION } = CameraControlsImpl;

/** até onde o arrasto leva o centro da vista: 300 m além da cerca, para o pátio não sumir da tela */
const LIMITE_ARRASTO = (() => {
  const xs = planta.cerca.map((p) => p[0]), zs = planta.cerca.map((p) => p[1]);
  return { x0: Math.min(...xs) - 300, x1: Math.max(...xs) + 300, z0: Math.min(...zs) - 300, z1: Math.max(...zs) + 300 };
})();

/** o esquerdo é do arrasto feito no Rig (vira ROTATE só enquanto há tecla modificadora); no toque, um dedo arrasta
 *  no chão, dois aproximam e giram */
// a roda também é do Rig: no camera-controls o passo variava muito por evento (no Mac, 1 a 2 % por clique) e o zoom
// herdava os 0,55 s de suavização dos voos, e parecia travar
// direito: para os lados gira, para cima e para baixo inclina a vista (nunca aproxima)
const BOTOES = { left: ACTION.NONE, middle: ACTION.DOLLY, right: ACTION.ROTATE, wheel: ACTION.NONE };
/** roda: log da distância por px de deltaY, teto por evento (um clique de mouse ~100 px vira ~20 %) e constante de
 *  tempo do amortecimento, curta para responder já no quadro seguinte */
const RODA_POR_PX = 0.002;
const RODA_MAX_EVENTO = 0.35;
const RODA_TAU = 0.09;
const TOQUES = { one: ACTION.TOUCH_SCREEN_PAN, two: ACTION.TOUCH_DOLLY_ROTATE, three: ACTION.TOUCH_ROTATE };

/** a inércia do arrasto perde 1/e da velocidade a cada 1/AMORTECIMENTO s: a vista desliza ~1/6 da velocidade e para */
const AMORTECIMENTO = 6;
const CENTRO_INERCIA = new THREE.Vector3();

/** mouse do mapa 3D igual ao do plano: o botão esquerdo agarra o chão e o ponto sob o cursor acompanha o mouse,
 *  com inércia ao soltar. O direito (ou o esquerdo com Shift, Alt, Ctrl ou Cmd) gira para os lados e inclina para
 *  cima e para baixo; nos dois botões o cursor vira a mão fechada. A roda aproxima no cursor. O arrasto é feito aqui
 *  e não no camera-controls: o TRUCK dele move no plano da tela (o alvo sobe e desce e trava no chão) e o SCREEN_PAN anda no chão mas não segue o cursor com a câmera inclinada. */
function Rig() {
  const ref = useRef<CameraControls>(null!);
  const camera = useThree((s) => s.camera);
  const el = useThree((s) => (s.events.connected as HTMLElement | undefined) ?? s.gl.domElement);
  const inercia = useRef(new THREE.Vector2());
  /** zoom da roda ainda por aplicar (log da distância) e o ponto da tela que fica parado */
  const zoom = useRef({ log: 0, x: 0, y: 0 });
  const aplicarZoom = useRef<(dt: number) => void>(() => {});
  const alvo = useUi((s) => s.alvo);
  const comando = useUi((s) => s.comando);
  useEffect(() => {
    // o zoom em direção ao cursor puxa o alvo para baixo do chão e a câmera atravessa o asfalto: alvo nunca abaixo de y=0
    ref.current?.setBoundary(new THREE.Box3(new THREE.Vector3(-Infinity, 0, -Infinity), new THREE.Vector3(Infinity, Infinity, Infinity)));
  }, []);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    inercia.current.set(0, 0);
    zoom.current.log = 0;
    const v = alvoParaVista(alvo.alvo);
    c.setLookAt(...v.pos, ...v.alvo, alvo.seq > 0);
  }, [alvo]);
  useEffect(() => {
    const c = ref.current;
    if (!c || !comando) return;
    inercia.current.set(0, 0);
    zoom.current.log = 0;
    if (comando.tipo === "zoom-in") c.dolly(c.distance * 0.3, true);
    if (comando.tipo === "zoom-out") c.dolly(-c.distance * 0.4, true);
    if (comando.tipo === "girar-esq") c.rotate(-Math.PI / 4, 0, true);
    if (comando.tipo === "girar-dir") c.rotate(Math.PI / 4, 0, true);
  }, [comando]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const raio = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const posicao = new THREE.Vector3(), centro = new THREE.Vector3(), ponto = new THREE.Vector3();
    let arrasto: { id: number; x: number; y: number; moveu: boolean; ancora: THREE.Vector3; amostras: { t: number; x: number; z: number }[] } | null = null;
    /** congela uma transição em curso onde ela está, para o gesto partir exatamente do que aparece na tela */
    const congelar = () => {
      c.getPosition(posicao, false);
      c.getTarget(centro, false);
      c.setLookAt(posicao.x, posicao.y, posicao.z, centro.x, centro.y, centro.z, false);
    };

    /** ponto do chão (y=0) sob o cursor visto da posição final da câmera. Perto do horizonte o raio quase não toca o
     *  chão: o alcance é limitado a 4x a distância do alvo para um movimento pequeno não atirar a vista longe. */
    const noChao = (x: number, y: number, out: THREE.Vector3) => {
      const r = el.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      raio.setFromCamera(ndc, camera);
      c.getPosition(posicao, true);
      const d = raio.ray.direction, alcance = c.distance * 4;
      const t = d.y < -1e-4 ? Math.min(-posicao.y / d.y, alcance) : alcance;
      return out.copy(posicao).addScaledVector(d, t).setY(0);
    };
    const moverCentro = (x: number, z: number) => {
      c.getTarget(centro, true);
      const L = LIMITE_ARRASTO;
      c.moveTo(THREE.MathUtils.clamp(x, L.x0, L.x1), centro.y, THREE.MathUtils.clamp(z, L.z0, L.z1), false);
    };

    // mão fechada enquanto o esquerdo (arrasta) ou o direito (gira e inclina) seguram, até soltar (globals.css, .cena-3d)
    const segurar = (sim: boolean) => {
      document.body.toggleAttribute("data-segurando-3d", sim);
    };
    const descer = (e: PointerEvent) => {
      inercia.current.set(0, 0);
      if (e.pointerType === "touch") return;
      zoom.current.log = 0;
      if (e.button === 2) { segurar(true); return; }
      if (e.button !== 0) return;
      segurar(true);
      const girar = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
      c.mouseButtons.left = girar ? ACTION.ROTATE : ACTION.NONE;
      if (girar) return;
      arrasto = { id: e.pointerId, x: e.clientX, y: e.clientY, moveu: false, ancora: new THREE.Vector3(), amostras: [] };
    };
    const mover = (e: PointerEvent) => {
      if (!arrasto || e.pointerId !== arrasto.id) return;
      if (!arrasto.moveu) {
        if (Math.hypot(e.clientX - arrasto.x, e.clientY - arrasto.y) < 4) return;
        arrasto.moveu = true;
        congelar();
        noChao(arrasto.x, arrasto.y, arrasto.ancora);
      }
      noChao(e.clientX, e.clientY, ponto);
      c.getTarget(centro, true);
      moverCentro(centro.x + arrasto.ancora.x - ponto.x, centro.z + arrasto.ancora.z - ponto.z);
      c.getTarget(centro, true);
      const a = arrasto.amostras;
      a.push({ t: e.timeStamp, x: centro.x, z: centro.z });
      while (a.length > 2 && e.timeStamp - a[0].t > 80) a.shift();
    };
    const soltar = (e: PointerEvent) => {
      if (e.buttons === 0 || e.type === "pointercancel") segurar(false);
      if (e.button === 0) c.mouseButtons.left = ACTION.NONE;
      if (!arrasto || e.pointerId !== arrasto.id) return;
      const a = arrasto.amostras;
      arrasto = null;
      // inércia só se o mouse ainda se movia ao soltar (parou e soltou: a vista fica onde está)
      if (a.length < 2 || e.timeStamp - a[a.length - 1].t > 40) return;
      const dt = (a[a.length - 1].t - a[0].t) / 1000;
      if (dt <= 0) return;
      inercia.current.set((a[a.length - 1].x - a[0].x) / dt, (a[a.length - 1].z - a[0].z) / dt);
      const max = c.distance * 3;
      if (inercia.current.length() > max) inercia.current.setLength(max);
    };
    const roda = (e: WheelEvent) => {
      // na janela, para valer também sobre os ícones e etiquetas do mapa (fora do canvas); painéis rolam normalmente
      const t = e.target as Element | null;
      if (!t || !(el.contains(t) || t.closest("[data-camada-mapa]"))) return;
      e.preventDefault();
      inercia.current.set(0, 0);
      // linhas e páginas viram px; ctrlKey é a pinça do trackpad (deltas pequenos, então pesa mais)
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1) * (e.ctrlKey ? 4 : 1);
      if (zoom.current.log === 0) congelar();
      const z = zoom.current;
      z.log = THREE.MathUtils.clamp(z.log + THREE.MathUtils.clamp(px * RODA_POR_PX, -RODA_MAX_EVENTO, RODA_MAX_EVENTO), -1.5, 1.5);
      z.x = e.clientX; z.y = e.clientY;
    };
    /** aplica um pedaço do zoom pendente: escala câmera e alvo em torno do ponto do chão sob o cursor, que fica parado
     *  na tela (homotetia), com a distância presa entre o mínimo e o máximo do camera-controls */
    aplicarZoom.current = (dt) => {
      const z = zoom.current;
      if (z.log === 0) return;
      const passo = Math.abs(z.log) < 1e-3 ? z.log : z.log * (1 - Math.exp(-dt / RODA_TAU));
      z.log -= passo;
      const d = c.distance;
      const f = THREE.MathUtils.clamp(Math.exp(passo), c.minDistance / d, c.maxDistance / d);
      if (Math.abs(f - 1) < 1e-5) { z.log = 0; return; }
      noChao(z.x, z.y, ponto);
      c.getPosition(posicao, false);
      c.getTarget(centro, false);
      posicao.sub(ponto).multiplyScalar(f).add(ponto);
      centro.sub(ponto).multiplyScalar(f).add(ponto);
      const L = LIMITE_ARRASTO;
      const ax = THREE.MathUtils.clamp(centro.x, L.x0, L.x1) - centro.x, az = THREE.MathUtils.clamp(centro.z, L.z0, L.z1) - centro.z;
      c.setLookAt(posicao.x + ax, Math.max(posicao.y, 1), posicao.z + az, centro.x + ax, Math.max(centro.y, 0), centro.z + az, false);
    };
    // o direito é gesto do mapa: sem o menu do navegador por cima
    const menu = (e: Event) => e.preventDefault();

    // captura: roda antes do pointerdown do camera-controls, que lê mouseButtons.left a cada movimento
    el.addEventListener("pointerdown", descer, { capture: true });
    window.addEventListener("wheel", roda, { passive: false });
    el.addEventListener("contextmenu", menu);
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      el.removeEventListener("pointerdown", descer, { capture: true });
      window.removeEventListener("wheel", roda);
      el.removeEventListener("contextmenu", menu);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      segurar(false);
    };
  }, [camera, el]);

  // inércia antes do update do camera-controls (prioridade -1), para entrar no mesmo quadro
  useFrame((_, delta) => {
    aplicarZoom.current(Math.min(delta, 0.05));
    const v = inercia.current;
    if (v.x === 0 && v.y === 0) return;
    const c = ref.current;
    const dt = Math.min(delta, 0.05);
    const centro = c.getTarget(CENTRO_INERCIA, true);
    const L = LIMITE_ARRASTO;
    c.moveTo(THREE.MathUtils.clamp(centro.x + v.x * dt, L.x0, L.x1), centro.y, THREE.MathUtils.clamp(centro.z + v.y * dt, L.z0, L.z1), false);
    v.multiplyScalar(Math.exp(-AMORTECIMENTO * dt));
    if (v.length() < 0.5) v.set(0, 0);
  }, -2);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={25}
      maxDistance={1500}
      minPolarAngle={0.12}
      maxPolarAngle={1.32}
      smoothTime={0.55}
      azimuthRotateSpeed={0.7}
      polarRotateSpeed={0.6}
      mouseButtons={BOTOES}
      touches={TOQUES}
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

/** eventos 3D sem raycast desperdiçado: a cena só tem clique e cursor de hover, então
 *  - nada de raycast no pointermove com botão apertado (arrasto da câmera) nem na roda do mouse;
 *  - o hover junta os pointermove de um quadro num raycast só (mouses de 1000 Hz mandam vários por quadro).
 *  - clique só sem arrasto (o ponteiro não se afastou 4 px do pointerdown em nenhum momento). */
function eventosLeves(store: RootStore) {
  const base = eventosPadrao(store);
  const h = base.handlers!;
  let pendente: Event | null = null;
  let agendado = false;
  // o R3F entrega o clique ao objeto mesmo depois de um arrasto da câmera: arrastar a partir de um prédio o selecionava
  let inicio = { x: 0, y: 0 }, arrastou = false;
  const descer = (e: Event) => {
    inicio = { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
    arrastou = false;
    h.onPointerDown(e);
  };
  const clicar = (e: Event) => {
    if (!arrastou) h.onClick(e);
  };
  const mover = (e: Event) => {
    if ((e as PointerEvent).buttons) {
      if (!arrastou && Math.hypot((e as PointerEvent).clientX - inicio.x, (e as PointerEvent).clientY - inicio.y) >= 4) arrastou = true;
      return;
    }
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
  return { ...base, handlers: { ...h, onPointerDown: descer, onClick: clicar, onPointerMove: mover, onWheel: () => {} } };
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

/** céu, luz e sombra iguais aos do app Vite do mapa (ambiente/Atmosfera.tsx). A sombra do sol é feita uma vez e
 *  refeita quando o pátio muda; no nível máximo ela acompanha também os caminhões em movimento. */
function Cena({ dinamica, leve, mapaSombra }: { dinamica: boolean; leve: boolean; mapaSombra: number }) {
  const tema = useUi((s) => s.tema);
  const noite = tema === "escuro";
  const p = noite ? PALETA.noite : PALETA.dia;
  const offline = usePatio((s) => s.camerasOffline);
  const selecionar = useUi((s) => s.selecionar);
  const focar = useUi((s) => s.focar);
  return (
    <>
      <Atmosfera noite={noite} mapaSombra={mapaSombra} />
      {!SEM.has("sombra") && <SombraEstatica dinamica={dinamica} versao={tema} />}
      <Entorno p={p} />
      <Suspense fallback={null}>
        <Cenario noite={noite} semEntorno={SEM.has("mata")} />
      </Suspense>
      <CarrosEstacionados />
      <Patio noite={noite} />
      <Predios p={p} noite={noite} onSelecionar={(id) => { selecionar({ tipo: "predio", id }); focar({ tipo: "predio", id }); }} />
      {!SEM.has("caminhoes") && <Caminhoes />}
      <DestaqueSelecao />
      <CamerasExternas />
      <Cobertura />
      {!SEM.has("feed") && <Transmissao noite={noite} offline={offline} leve={leve} />}
      <ProjetorDom />
    </>
  );
}

export default function YardCanvas() {
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
      className="cena-3d"
      data-testid="cena-3d"
    >
      <Cena dinamica={q.sombra} leve={nivel === "desempenho"} mapaSombra={nivel === "desempenho" ? 2048 : 4096} />
      <Rig />
      <PlanoProximo />
      {PERF && <InfoCena nivel={nivel} />}
      {SEM.has("eventos") && <SemEventos />}
      {SEM.has("pos") && <RenderSimples />}
      {/* MSAA 4x: faixas das vagas (0,14 m) e vãos entre vagas ficam abaixo de 1 px; só com SMAA viram pontilhado e piscam */}
      {!SEM.has("pos") && <EffectComposer multisampling={q.msaa} enableNormalPass={false}>
        {!SEM.has("ao") && q.ao ? <N8AO aoRadius={6} distanceFalloff={0.8} intensity={noiteUi ? 1.4 : 2.4} quality="medium" halfRes={q.ao === "meia"} /> : <></>}
        {/* só o que emite (LEDs, letreiros) passa do limiar; o chão iluminado pelas luminárias não brilha, como no render */}
        {noiteUi ? <Bloom mipmapBlur intensity={0.7} luminanceThreshold={3.5} luminanceSmoothing={0.4} /> : <></>}
        <SMAA />
        {/* mesmo acabamento do app Vite do mapa: ACES e vinheta leve */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.28} darkness={0.35} />
      </EffectComposer>}
    </Canvas>
  );
}
