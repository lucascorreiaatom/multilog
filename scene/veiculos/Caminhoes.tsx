"use client";
// Frota de caminhões: estacionados (um por vaga ocupada) e em movimento (gatilhos de entrada e saída).
// Instanciado: 2 malhas para o cavalo e 2 por tipo de implemento, poucas draw calls para 1.000+ veículos.
// Modelo: scene/veiculos/caminhaoModelo.ts (Scania e carreta baú do Sketchfab, CC-BY; créditos em public/modelos).
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Gatilho } from "@/lib/patio/fonte";
import { poseEstacionado, rotaEntrada, rotaSaida } from "@/lib/patio/rotas";
import type { Implemento, StatusVaga } from "@/lib/patio/tipos";
import { vagasPorId } from "@/lib/site";
import { assinarGatilhos, usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { atributoFiltro, ocultavel, profundidadeOcultavel } from "../filtroStatus";
import { CAMINHAO_FOCO, CAMINHAO_PADRAO } from "../paleta";
import { AnimacaoCaminhao, poseAlinhada, type Pose } from "./animador";
import { useModeloCaminhao } from "./caminhaoModelo";
import { cursorClicavel } from "../cursor";

const CAP = 1200;
/** trajeto animado gate até vaga: desligado por padrão; reativar com ?animar=1 */
const ANIMAR = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("animar") === "1";
/** frota padronizada: todo caminhão é desenhado com carreta baú, qualquer que seja o implemento do ocupante */
const TIPOS: Implemento[] = ["bau"];
const ESTACIONADO: StatusVaga[] = ["ocupada", "vistoria", "conferencia", "saida"];
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
/** estacionado numa vaga cujo status passa no filtro do mapa (filtro vazio = todos) */
const passaFiltro = (st: StatusVaga) => { const f = useUi.getState().filtroStatus; return f.length === 0 || f.includes(st); };

/** estado compartilhado com as cancelas dos gates: pista -> instante da última passagem */
export const passagemGate = new Map<number, number>();
/** posições de veículos em movimento (para etiquetas e câmeras) */
export const veiculosEmMovimento = new Map<string, Pose>();

interface Ativa {
  anim: AnimacaoCaminhao;
  g: Gatilho;
  deixouVaga: boolean;
  origem: [number, number];
}

/**
 * Índices de instância compactos: cada malha desenha só até o maior índice em uso (mesh.count),
 * em vez das CAP instâncias com matriz zero. Vale para a renderização, a sombra e o raycast do clique.
 */
class Pool {
  dono: (string | undefined)[] = [];
  private livres: number[] = [];
  topo = 0;
  alocar(id: string) {
    let i: number;
    if (this.livres.length) {
      // menor índice livre, para manter o topo baixo
      let k = 0;
      for (let j = 1; j < this.livres.length; j++) if (this.livres[j] < this.livres[k]) k = j;
      i = this.livres[k];
      this.livres[k] = this.livres[this.livres.length - 1];
      this.livres.pop();
    } else i = this.dono.length;
    if (i >= CAP) return undefined;
    this.dono[i] = id;
    this.topo = Math.max(this.topo, i + 1);
    return i;
  }
  liberar(i: number) {
    this.dono[i] = undefined;
    this.livres.push(i);
    while (this.topo > 0 && this.dono[this.topo - 1] === undefined) this.topo--;
  }
}

interface Slot {
  cavalo: number;
  tipo?: Implemento;
  carreta?: number;
}

/** caminhões com modelo real (Scania + carreta baú, public/modelos/caminhao.glb); aparecem quando o .glb carrega */
export function Caminhoes() {
  return (
    <Suspense fallback={null}>
      <Frota />
    </Suspense>
  );
}

function Frota() {
  const modelo = useModeloCaminhao();
  const cavalo = modelo.cavalo;
  const carretas = useMemo(() => Object.fromEntries(TIPOS.map((t) => [t, modelo.carreta])) as Record<Implemento, typeof modelo.carreta>, [modelo]);
  // cavalo: atlas de textura; carreta: cores de vértice. A cor da instância tinge as malhas "corpo".
  const matCorpo = useMemo(() => Object.assign(new THREE.MeshStandardMaterial({ map: modelo.atlas, roughness: 0.55, metalness: 0.05 }), { onBeforeCompile: ocultavel }), [modelo]);
  const matNeutro = useMemo(() => Object.assign(new THREE.MeshStandardMaterial({ map: modelo.atlas, roughness: 0.7, metalness: 0.1 }), { onBeforeCompile: ocultavel }), [modelo]);
  const matCarretaCorpo = useMemo(() => Object.assign(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }), { onBeforeCompile: ocultavel }), []);
  const matCarretaNeutro = useMemo(() => Object.assign(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1 }), { onBeforeCompile: ocultavel }), []);
  const matSombra = useMemo(() => profundidadeOcultavel(), []);

  const refCavaloCorpo = useRef<THREE.InstancedMesh>(null!);
  const refCavaloNeutro = useRef<THREE.InstancedMesh>(null!);
  const refCarretaCorpo = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const refCarretaNeutro = useRef<Record<string, THREE.InstancedMesh | null>>({});

  const slots = useRef(new Map<string, Slot>());
  const poolCavalo = useRef(new Pool());
  const poolCarreta = useRef(Object.fromEntries(TIPOS.map((t) => [t, new Pool()])) as Record<Implemento, Pool>);
  const ativas = useRef(new Map<string, Ativa>());
  /** malhas alteradas desde o último quadro: o upload acontece uma vez, no useFrame */
  const sujas = useRef(new Set<"cavalo" | Implemento>());
  /** estacionados escondidos pelo filtro de status */
  const ocultos = useRef(new Set<string>());
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), y: new THREE.Vector3(0, 1, 0), c: new THREE.Color() }), []);

  // nenhuma instância desenhada até haver caminhão
  useEffect(() => {
    const todas = [refCavaloCorpo.current, refCavaloNeutro.current, ...Object.values(refCarretaCorpo.current), ...Object.values(refCarretaNeutro.current)];
    for (const m of todas) {
      if (!m) continue;
      m.count = 0;
      m.frustumCulled = false;
    }
  }, []);

  const descarregar = () => {
    if (!sujas.current.size) return;
    const atualizar = (m: THREE.InstancedMesh | null | undefined, topo: number, cor: boolean) => {
      if (!m) return;
      m.count = topo;
      m.boundingSphere = null; // recalculado no próximo raycast
      m.instanceMatrix.clearUpdateRanges();
      m.instanceMatrix.addUpdateRange(0, topo * 16);
      m.instanceMatrix.needsUpdate = true;
      const flag = flagDe(m);
      if (flag) {
        flag.clearUpdateRanges();
        flag.addUpdateRange(0, topo);
        flag.needsUpdate = true;
      }
      if (cor && m.instanceColor) {
        m.instanceColor.clearUpdateRanges();
        m.instanceColor.addUpdateRange(0, topo * 3);
        m.instanceColor.needsUpdate = true;
      }
    };
    for (const k of sujas.current) {
      if (k === "cavalo") {
        atualizar(refCavaloCorpo.current, poolCavalo.current.topo, true);
        atualizar(refCavaloNeutro.current, poolCavalo.current.topo, false);
      } else {
        atualizar(refCarretaCorpo.current[k], poolCarreta.current[k].topo, true);
        atualizar(refCarretaNeutro.current[k], poolCarreta.current[k].topo, false);
      }
    }
    sujas.current.clear();
  };

  const flagDe = (m: THREE.InstancedMesh | null | undefined) =>
    m ? ((m.geometry.getAttribute("aOculto") as THREE.InstancedBufferAttribute | undefined) ?? atributoFiltro(m.geometry, "aOculto", CAP)) : undefined;

  const matriz = (pos: [number, number], rumo: [number, number]) => {
    tmp.p.set(pos[0], 0, pos[1]);
    tmp.q.setFromAxisAngle(tmp.y, Math.atan2(-rumo[1], rumo[0]));
    return tmp.m.compose(tmp.p, tmp.q, tmp.s);
  };

  const soltarCarreta = (sl: Slot) => {
    if (sl.tipo === undefined || sl.carreta === undefined) return;
    refCarretaCorpo.current[sl.tipo]?.setMatrixAt(sl.carreta, ZERO);
    refCarretaNeutro.current[sl.tipo]?.setMatrixAt(sl.carreta, ZERO);
    poolCarreta.current[sl.tipo].liberar(sl.carreta);
    sujas.current.add(sl.tipo);
    sl.tipo = undefined;
    sl.carreta = undefined;
  };

  const aplicar = (sl: Slot, ocId: string, pose: Pose, visivel = true) => {
    const oc = usePatio.getState().ocupantes[ocId];
    const tipo: Implemento = "bau";
    if (sl.tipo !== tipo) {
      soltarCarreta(sl);
      const i = poolCarreta.current[tipo].alocar(ocId);
      if (i !== undefined) { sl.tipo = tipo; sl.carreta = i; }
    }
    if (visivel) ocultos.current.delete(ocId); else ocultos.current.add(ocId);
    // flag "fora do filtro" por instância, lida da geometria de cada malha (corpo e neutro compartilham o índice)
    const oculto = visivel ? 0 : 1;
    flagDe(refCavaloCorpo.current)?.setX(sl.cavalo, oculto);
    flagDe(refCavaloNeutro.current)?.setX(sl.cavalo, oculto);
    if (sl.tipo !== undefined && sl.carreta !== undefined) {
      flagDe(refCarretaCorpo.current[sl.tipo])?.setX(sl.carreta, oculto);
      flagDe(refCarretaNeutro.current[sl.tipo])?.setX(sl.carreta, oculto);
    }
    const mc = matriz(pose.pos, pose.rumo);
    refCavaloCorpo.current.setMatrixAt(sl.cavalo, mc);
    refCavaloNeutro.current.setMatrixAt(sl.cavalo, mc);
    sujas.current.add("cavalo");
    if (sl.tipo !== undefined && sl.carreta !== undefined) {
      const mt = matriz(pose.pino, pose.rumoCarreta);
      refCarretaCorpo.current[sl.tipo]?.setMatrixAt(sl.carreta, mt);
      refCarretaNeutro.current[sl.tipo]?.setMatrixAt(sl.carreta, mt);
      sujas.current.add(sl.tipo);
    }
    if (oc) {
      const ui = useUi.getState();
      // frota padronizada: a cor vem só do modo e do tema, não do ocupante
      const cores = (ui.foco ? CAMINHAO_FOCO : CAMINHAO_PADRAO)[ui.tema];
      refCavaloCorpo.current.setColorAt(sl.cavalo, tmp.c.set(cores.cavalo));
      if (sl.tipo !== undefined && sl.carreta !== undefined) refCarretaCorpo.current[sl.tipo]?.setColorAt(sl.carreta, tmp.c.set(cores.carga));
    }
  };

  const slotDe = (ocId: string) => {
    let sl = slots.current.get(ocId);
    if (sl === undefined) {
      const i = poolCavalo.current.alocar(ocId);
      if (i === undefined) return undefined;
      sl = { cavalo: i };
      slots.current.set(ocId, sl);
    }
    return sl;
  };

  const liberarSlot = (ocId: string) => {
    const sl = slots.current.get(ocId);
    if (sl === undefined) return;
    refCavaloCorpo.current.setMatrixAt(sl.cavalo, ZERO);
    refCavaloNeutro.current.setMatrixAt(sl.cavalo, ZERO);
    poolCavalo.current.liberar(sl.cavalo);
    sujas.current.add("cavalo");
    soltarCarreta(sl);
    slots.current.delete(ocId);
    ocultos.current.delete(ocId);
  };

  // sincroniza caminhões estacionados com o estado das vagas
  useEffect(() => {
    const sincronizar = () => {
      const { vagas } = usePatio.getState();
      const presentes = new Set<string>();
      for (const [vagaId, e] of Object.entries(vagas)) {
        if (!e.ocupanteId || !ESTACIONADO.includes(e.status)) continue;
        presentes.add(e.ocupanteId);
        if (ativas.current.has(e.ocupanteId)) continue;
        const visivel = passaFiltro(e.status);
        // já estacionado: só reaplica se o status mudou de lado no filtro
        if (slots.current.has(e.ocupanteId) && visivel !== ocultos.current.has(e.ocupanteId)) continue;
        const sl = slotDe(e.ocupanteId);
        if (sl === undefined) continue;
        const v = vagasPorId.get(vagaId)!;
        const fim = poseEstacionado(v);
        aplicar(sl, e.ocupanteId, poseAlinhada(fim.pos, fim.rumo), visivel);
      }
      for (const ocId of [...slots.current.keys()]) if (!presentes.has(ocId) && !ativas.current.has(ocId)) liberarSlot(ocId);
    };
    sincronizar();
    const des1 = usePatio.subscribe((s) => s.vagas, sincronizar);
    const des2 = assinarGatilhos((g) => {
      const v = vagasPorId.get(g.vagaId);
      if (!v) return;
      // sem animação (padrão, pedido do usuário) ou aba oculta: aplica o resultado direto, caminhões não se movem
      if (!ANIMAR || (typeof document !== "undefined" && document.hidden)) {
        usePatio.getState().animacaoConcluida(g, g.tipo === "entrada" ? "estacionou" : "deixou-vaga");
        if (g.tipo === "saida") usePatio.getState().animacaoConcluida(g, "saiu");
        return;
      }
      if (g.tipo === "entrada") {
        const anim = new AnimacaoCaminhao(rotaEntrada(g.vagaId, g.pista), { duracaoAlvo: 32 });
        ativas.current.set(g.ocupanteId, { anim, g, deixouVaga: false, origem: anim.pose.pos });
      } else {
        const fim = poseEstacionado(v);
        const anim = new AnimacaoCaminhao(rotaSaida(g.vagaId, g.pista), { duracaoAlvo: 30, poseInicial: poseAlinhada(fim.pos, fim.rumo) });
        ativas.current.set(g.ocupanteId, { anim, g, deixouVaga: false, origem: fim.pos });
      }
      slotDe(g.ocupanteId);
    });
    const des3 = useUi.subscribe((s) => [s.foco, s.tema, s.filtroStatus] as const, () => {
      const vagas = usePatio.getState().vagas;
      const vagaDe = new Map<string, string>();
      for (const [vagaId, e] of Object.entries(vagas)) if (e.ocupanteId) vagaDe.set(e.ocupanteId, vagaId);
      for (const [ocId, sl] of slots.current) {
        const vagaId = vagaDe.get(ocId);
        if (!vagaId || ativas.current.has(ocId)) continue;
        const geo = vagasPorId.get(vagaId);
        if (geo) { const fim = poseEstacionado(geo); aplicar(sl, ocId, poseAlinhada(fim.pos, fim.rumo), passaFiltro(vagas[vagaId].status)); }
      }
    }, { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] });
    return () => { des1(); des2(); des3(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const agora = performance.now();
    for (const [ocId, a] of ativas.current) {
      a.anim.atualizar(dt);
      const sl = slotDe(ocId);
      if (sl !== undefined) aplicar(sl, ocId, a.anim.pose);
      veiculosEmMovimento.set(ocId, a.anim.pose);
      if (a.anim.naBalanca && a.anim.gateAtual) passagemGate.set(a.anim.gateAtual, agora);
      if (a.g.tipo === "saida" && !a.deixouVaga && Math.hypot(a.anim.pose.pos[0] - a.origem[0], a.anim.pose.pos[1] - a.origem[1]) > 22) {
        a.deixouVaga = true;
        usePatio.getState().animacaoConcluida(a.g, "deixou-vaga");
      }
      if (a.anim.terminou) {
        ativas.current.delete(ocId);
        veiculosEmMovimento.delete(ocId);
        if (a.g.tipo === "entrada") {
          usePatio.getState().animacaoConcluida(a.g, "estacionou");
        } else {
          liberarSlot(ocId);
          usePatio.getState().animacaoConcluida(a.g, "saiu");
        }
      }
    }
    descarregar();
  });

  // clique num caminhão seleciona a vaga dele
  const selecionarOcupante = (ocId: string | undefined, e: { stopPropagation: () => void }) => {
    if (!ocId) return;
    e.stopPropagation();
    const vaga = Object.entries(usePatio.getState().vagas).find(([, v]) => v.ocupanteId === ocId)?.[0];
    if (!vaga) return;
    useUi.getState().selecionar({ tipo: "vaga", id: vaga });
    // voa até o caminhão: posição atual se estiver em movimento, senão a vaga
    const mov = veiculosEmMovimento.get(ocId);
    useUi.getState().focar(mov ? { tipo: "ponto", x: mov.pos[0], z: mov.pos[1], dist: 80 } : { tipo: "vaga", id: vaga });
  };
  // caminhão escondido pelo filtro não recebe clique (o clique passa para a vaga)
  const visivelNoMapa = (ocId: string | undefined) => (ocId && !ocultos.current.has(ocId) ? ocId : undefined);
  const clicarCavalo = (e: { instanceId?: number; stopPropagation: () => void }) => {
    if (e.instanceId !== undefined) selecionarOcupante(visivelNoMapa(poolCavalo.current.dono[e.instanceId]), e);
  };
  const clicarCarreta = (t: Implemento) => (e: { instanceId?: number; stopPropagation: () => void }) => {
    if (e.instanceId !== undefined) selecionarOcupante(visivelNoMapa(poolCarreta.current[t].dono[e.instanceId]), e);
  };

  return (
    <group>
      <instancedMesh ref={refCavaloCorpo} args={[cavalo.corpo, matCorpo, CAP]} customDepthMaterial={matSombra} castShadow receiveShadow onClick={clicarCavalo} {...cursorClicavel} />
      <instancedMesh ref={refCavaloNeutro} args={[cavalo.neutro, matNeutro, CAP]} customDepthMaterial={matSombra} castShadow />
      {TIPOS.map((t) => (
        <group key={t}>
          <instancedMesh ref={(m) => { refCarretaCorpo.current[t] = m; }} args={[carretas[t].corpo, matCarretaCorpo, CAP]} customDepthMaterial={matSombra} castShadow receiveShadow onClick={clicarCarreta(t)} {...cursorClicavel} />
          <instancedMesh ref={(m) => { refCarretaNeutro.current[t] = m; }} args={[carretas[t].neutro, matCarretaNeutro, CAP]} customDepthMaterial={matSombra} castShadow />
        </group>
      ))}
    </group>
  );
}
