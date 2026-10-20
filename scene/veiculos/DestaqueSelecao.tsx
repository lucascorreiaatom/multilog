"use client";
// Destaque da vaga/caminhão selecionado: contorno azul arredondado (acento da marca) no chão em volta do cavalo e da
// carreta, com uma cortina de luz sutil subindo dele
// (segue o caminhão em movimento, com a articulação) e etiqueta com placa e status.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CAMINHAO, poseEstacionado } from "@/lib/patio/rotas";
import { STATUS } from "@/lib/patio/tipos";
import { vagasPorId } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { CAMADA, sobre } from "../camadas";
import { registrarProjetado } from "../projetor";
import { poseAlinhada, type Pose } from "./animador";
import { veiculosEmMovimento } from "./Caminhoes";

/** azul #4E91ED do Brand Book: mesmo acento da seleção na interface */
const COR = "#4e91ed";

/** contorno de retângulo de cantos arredondados (centro na origem, no plano XY), em sentido anti-horário */
function contorno(comprimento: number, largura: number, raio: number, passos = 6): THREE.Vector2[] {
  const hx = comprimento / 2 - raio, hy = largura / 2 - raio;
  const cantos: [number, number, number][] = [[hx, hy, 0], [-hx, hy, Math.PI / 2], [-hx, -hy, Math.PI], [hx, -hy, (3 * Math.PI) / 2]];
  const pts: THREE.Vector2[] = [];
  for (const [cx, cy, a0] of cantos)
    for (let i = 0; i <= passos; i++) { const a = a0 + (i / passos) * (Math.PI / 2); pts.push(new THREE.Vector2(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio)); }
  return pts;
}

/** gradiente vertical da cortina de luz: forte no chão, some para cima (o alphaMap lê o canal verde) */
const GRADIENTE = (() => {
  const n = 64, d = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) { const t = i / (n - 1); const v = Math.round(255 * (1 - t) ** 2); d.set([v, v, v, 255], i * 4); }
  const tex = new THREE.DataTexture(d, 1, n);
  tex.needsUpdate = true;
  return tex;
})();

/** medida de base do quadro (caminhão inteiro com folga); o useFrame escala para o caminhão ou a vaga */
const BASE = { comprimento: 20, largura: 3.6 };

/** ALTURA da cortina e RAIO dos cantos, em metros */
const ALTURA = 4;
const RAIO = 0.9;

/** destaque de cantos arredondados: faixa no chão, preenchimento leve e uma cortina de luz que sobe da faixa e
 *  esvanece. Origem no centro, eixo longo em X */
function Moldura({ comprimento, largura, refGrupo }: { comprimento: number; largura: number; refGrupo: React.RefObject<THREE.Group | null> }) {
  const { faixa, fundo, cortina } = useMemo(() => {
    const e = 0.3;
    const fora = contorno(comprimento + e, largura + e, RAIO + e / 2);
    const dentro = contorno(comprimento - e, largura - e, RAIO - e / 2);
    const anel = new THREE.Shape(fora);
    anel.holes.push(new THREE.Path([...dentro].reverse()));
    const faixa = new THREE.ShapeGeometry(anel);
    const fundo = new THREE.ShapeGeometry(new THREE.Shape(dentro));
    // cortina: tira vertical ao longo do contorno, uv.y de 0 (chão) a 1 (topo)
    const pts = contorno(comprimento, largura, RAIO);
    pts.push(pts[0].clone());
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    pts.forEach((p, i) => {
      // o grupo é girado -90° em X: o Y do contorno vira -Z no mundo e a altura sai pelo +Z local
      pos.push(p.x, p.y, 0, p.x, p.y, ALTURA);
      uv.push(0, 0, 0, 1);
      if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    });
    const cortina = new THREE.BufferGeometry();
    cortina.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    cortina.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    cortina.setIndex(idx);
    return { faixa, fundo, cortina };
  }, [comprimento, largura]);
  useEffect(() => () => { faixa.dispose(); fundo.dispose(); cortina.dispose(); }, [faixa, fundo, cortina]);
  return (
    <group ref={refGrupo}>
      <group rotation-x={-Math.PI / 2}>
        <mesh geometry={faixa} position-z={0.12} renderOrder={3}>
          <meshBasicMaterial color={COR} transparent opacity={0.95} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
        </mesh>
        <mesh geometry={fundo} position-z={0.09} renderOrder={2}>
          <meshBasicMaterial color={COR} transparent opacity={0.14} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
        </mesh>
        <mesh geometry={cortina} position-z={0.12} renderOrder={4}>
          <meshBasicMaterial color={COR} transparent opacity={0.4} alphaMap={GRADIENTE} side={THREE.DoubleSide} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
        </mesh>
      </group>
    </group>
  );
}

export function DestaqueSelecao() {
  const selecao = useUi((s) => s.selecao);
  const vagaId = selecao?.tipo === "vaga" ? selecao.id : null;
  const quadro = useRef<THREE.Group>(null);
  const raiz = useRef<THREE.Group>(null!);
  const etiqueta = useMemo(() => (typeof document !== "undefined" ? document.createElement("div") : null), []);
  const ancora = useMemo(() => new THREE.Vector3(), []);

  // etiqueta DOM projetada (placa e status), criada fora do React para seguir a cena a cada quadro
  useEffect(() => {
    if (!etiqueta) return;
    etiqueta.className = "pointer-events-none absolute top-0 left-0 z-[5] will-change-transform";
    const raizDom = document.querySelector('[data-testid="mapa"]');
    raizDom?.appendChild(etiqueta);
    const des = registrarProjetado("selecao-caminhao", { el: etiqueta, pos: ancora, dy: -12 });
    return () => { des(); etiqueta.remove(); };
  }, [etiqueta, ancora]);

  useFrame((estado) => {
    const g = raiz.current, q = quadro.current;
    if (!g || !q) return;
    const { vagas, ocupantes } = usePatio.getState();
    const e = vagaId ? vagas[vagaId] : undefined;
    const v = vagaId ? vagasPorId.get(vagaId) : undefined;
    if (!v || !e) { g.visible = false; if (etiqueta) etiqueta.innerHTML = ""; return; }
    g.visible = true;
    let pose: Pose | undefined = e.ocupanteId ? veiculosEmMovimento.get(e.ocupanteId) : undefined;
    const temCaminhao = !!e.ocupanteId && e.status !== "livre";
    if (!pose && temCaminhao) { const f = poseEstacionado(v); pose = poseAlinhada(f.pos, f.rumo); }
    const pulso = 1 + Math.sin(estado.clock.elapsedTime * 3) * 0.02;
    if (pose) {
      // um quadro só em volta do conjunto: do para-choque do cavalo à traseira da carreta (centro da carreta 6,3 m
      // atrás do pino-rei, meia carreta 6,8 m); em curva ele segue a reta entre as duas pontas
      const fx = pose.pos[0] + pose.rumo[0] * CAMINHAO.frente, fz = pose.pos[1] + pose.rumo[1] * CAMINHAO.frente;
      const tx = pose.pino[0] - pose.rumoCarreta[0] * 13.1, tz = pose.pino[1] - pose.rumoCarreta[1] * 13.1;
      const dx = fx - tx, dz = fz - tz, comp = Math.hypot(dx, dz) + 1;
      q.position.set((fx + tx) / 2, 0, (fz + tz) / 2);
      q.rotation.y = Math.atan2(-dz, dx);
      q.scale.set((comp / BASE.comprimento) * pulso, 1, pulso);
      ancora.set(pose.pos[0], 6, pose.pos[1]);
    } else {
      // vaga sem caminhão: o quadro toma a medida da própria vaga
      q.position.set(v.centro[0], 0, v.centro[1]);
      q.rotation.y = Math.atan2(-v.eixo[1], v.eixo[0]);
      q.scale.set((v.comprimento / BASE.comprimento) * pulso, 1, (v.largura / BASE.largura) * pulso);
      ancora.set(v.centro[0], 2, v.centro[1]);
    }
    if (etiqueta) {
      const oc = e.ocupanteId ? ocupantes[e.ocupanteId] : undefined;
      const texto = `${v.id}${oc ? ` · ${oc.veiculo.placa}` : ""} · ${STATUS[e.status].nome}`;
      if (etiqueta.dataset.texto !== texto) {
        etiqueta.dataset.texto = texto;
        etiqueta.innerHTML = `<span class="absolute -translate-x-1/2 -translate-y-full inline-flex h-28 items-center gap-8 whitespace-nowrap rounded-[10px] bg-dark px-12 text-[12px] font-semibold leading-16 text-on-dark shadow-float"><span style="width:8px;height:8px;border-radius:2px;background:${STATUS[e.status].cor}"></span>${texto}</span>`;
      }
    }
  });

  return (
    <group ref={raiz}>
      <Moldura comprimento={BASE.comprimento} largura={BASE.largura} refGrupo={quadro} />
    </group>
  );
}
