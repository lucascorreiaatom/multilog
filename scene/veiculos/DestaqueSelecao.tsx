"use client";
// Destaque da vaga/caminhão selecionado: contorno azul (acento da marca) no chão em volta do cavalo e da carreta
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

/** moldura retangular (4 barras finas) com origem no centro */
function Moldura({ comprimento, largura, refGrupo }: { comprimento: number; largura: number; refGrupo: React.RefObject<THREE.Group | null> }) {
  const e = 0.35;
  return (
    <group ref={refGrupo}>
      {[
        [0, largura / 2, comprimento + e, e],
        [0, -largura / 2, comprimento + e, e],
        [comprimento / 2, 0, e, largura + e],
        [-comprimento / 2, 0, e, largura + e],
      ].map(([x, z, l, w], i) => (
        <mesh key={i} position={[x, 0.12, z]} renderOrder={3}>
          <boxGeometry args={[l, 0.06, w]} />
          <meshBasicMaterial color={COR} transparent opacity={0.95} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
        </mesh>
      ))}
      <mesh position-y={0.09} rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[comprimento, largura]} />
        <meshBasicMaterial color={COR} transparent opacity={0.16} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
      </mesh>
    </group>
  );
}

export function DestaqueSelecao() {
  const selecao = useUi((s) => s.selecao);
  const vagaId = selecao?.tipo === "vaga" ? selecao.id : null;
  const cavalo = useRef<THREE.Group>(null);
  const carreta = useRef<THREE.Group>(null);
  const raiz = useRef<THREE.Group>(null!);
  const etiqueta = useMemo(() => (typeof document !== "undefined" ? document.createElement("div") : null), []);
  const ancora = useMemo(() => new THREE.Vector3(), []);

  // etiqueta DOM projetada (placa e status), criada fora do React para seguir a cena a cada quadro
  useEffect(() => {
    if (!etiqueta) return;
    etiqueta.className = "pointer-events-none absolute top-0 left-0 z-[5] will-change-transform";
    const raizDom = document.querySelector('[data-testid="conceito-1"]');
    raizDom?.appendChild(etiqueta);
    const des = registrarProjetado("selecao-caminhao", { el: etiqueta, pos: ancora, dy: -12 });
    return () => { des(); etiqueta.remove(); };
  }, [etiqueta, ancora]);

  useFrame((estado) => {
    const g = raiz.current;
    if (!g) return;
    const { vagas, ocupantes } = usePatio.getState();
    const e = vagaId ? vagas[vagaId] : undefined;
    const v = vagaId ? vagasPorId.get(vagaId) : undefined;
    if (!v || !e) { g.visible = false; if (etiqueta) etiqueta.innerHTML = ""; return; }
    g.visible = true;
    let pose: Pose | undefined = e.ocupanteId ? veiculosEmMovimento.get(e.ocupanteId) : undefined;
    const temCaminhao = !!e.ocupanteId && ["ocupada", "vistoria", "conferencia", "saida", "reservada"].includes(e.status);
    if (!pose && temCaminhao && e.status !== "reservada") { const f = poseEstacionado(v); pose = poseAlinhada(f.pos, f.rumo); }
    const pulso = 1 + Math.sin(estado.clock.elapsedTime * 3) * 0.04;
    if (pose && cavalo.current && carreta.current) {
      // cavalo: do eixo traseiro à frente; carreta: do pino-rei à traseira
      const cc: [number, number] = [pose.pos[0] + pose.rumo[0] * (CAMINHAO.frente - 3.0) / 1, pose.pos[1] + pose.rumo[1] * (CAMINHAO.frente - 3.0)];
      cavalo.current.position.set(cc[0], 0, cc[1]);
      cavalo.current.rotation.y = Math.atan2(-pose.rumo[1], pose.rumo[0]);
      cavalo.current.scale.setScalar(pulso);
      const ct: [number, number] = [pose.pino[0] - pose.rumoCarreta[0] * 6.3, pose.pino[1] - pose.rumoCarreta[1] * 6.3];
      carreta.current.position.set(ct[0], 0, ct[1]);
      carreta.current.rotation.y = Math.atan2(-pose.rumoCarreta[1], pose.rumoCarreta[0]);
      carreta.current.scale.setScalar(pulso);
      cavalo.current.visible = carreta.current.visible = true;
      ancora.set(pose.pos[0], 6, pose.pos[1]);
    } else if (cavalo.current && carreta.current) {
      // vaga sem caminhão: moldura da própria vaga
      carreta.current.visible = false;
      cavalo.current.visible = true;
      cavalo.current.position.set(v.centro[0], 0, v.centro[1]);
      cavalo.current.rotation.y = Math.atan2(-v.eixo[1], v.eixo[0]);
      cavalo.current.scale.set((v.comprimento / 7) * pulso, 1, (v.largura / 3.4) * pulso);
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
      <Moldura comprimento={7} largura={3.4} refGrupo={cavalo} />
      <Moldura comprimento={13.6} largura={3.4} refGrupo={carreta} />
    </group>
  );
}
