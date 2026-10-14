"use client";
// Vagas do mapa plano: um polígono por vaga, pintado pela cor do status. Cada vaga assina só o próprio status, então
// uma mudança do simulador redesenha uma vaga, não as 1.022. De perto aparecem o número e o caminhão (via CSS, pelo
// data-lod do mapa, sem re-render).
import { memo } from "react";
import { cantosVaga, paraTela, type Ponto } from "@/lib/mapa/vista";
import type { StatusVaga } from "@/lib/patio/tipos";
import { planta, vagasPorId } from "@/lib/site";
import type { VagaGeo } from "@/lib/site/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";

/** status em que há caminhão parado na vaga */
const COM_CAMINHAO: StatusVaga[] = ["ocupada", "vistoria", "conferencia", "saida"];

const caminho = (p: Ponto[]) => `M${p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`;

/** retângulo ao longo do eixo da vaga, de a0 a a1 metros a partir do centro (positivo = lado da boca) */
function faixa(v: VagaGeo, a0: number, a1: number, meiaLargura: number): Ponto[] {
  const [ex, ez] = v.eixo, [cx, cz] = v.centro;
  return ([[a1, meiaLargura], [a1, -meiaLargura], [a0, -meiaLargura], [a0, meiaLargura]] as const)
    .map(([a, b]) => paraTela([cx + ex * a - ez * b, cz + ez * a + ex * b]));
}

interface Forma { id: string; d: string; caminhao: string; rotulo: string; texto: Ponto; angulo: number }

const FORMAS: Forma[] = planta.vagas.map((v) => {
  const l = v.comprimento / 2, w = v.largura / 2;
  // cavalo junto à boca (sai de frente), carreta até o batente; o número fica no trecho livre da boca
  const carreta = faixa(v, -l + 1, l - 8.6, w * 0.5), cavalo = faixa(v, l - 8, l - 5.2, w * 0.46);
  const [ex, ez] = v.eixo;
  let angulo = (Math.atan2(-ez, -ex) * 180) / Math.PI;
  if (angulo > 90) angulo -= 180;
  if (angulo <= -90) angulo += 180;
  return {
    id: v.id, d: caminho(cantosVaga(v)), caminhao: caminho(carreta) + caminho(cavalo),
    rotulo: `${v.fila}${String(v.numero).padStart(2, "0")}`,
    texto: paraTela([v.centro[0] + ex * (l - 2.4), v.centro[1] + ez * (l - 2.4)]), angulo,
  };
});

const Vaga = memo(function Vaga({ f }: { f: Forma }) {
  const status = usePatio((s) => s.vagas[f.id]?.status ?? "livre");
  const fora = useUi((s) => s.filtroStatus.length > 0 && !s.filtroStatus.includes(status));
  return (
    <g data-id={f.id} className={`vaga st-${status}`} data-fora={fora || undefined}>
      <path d={f.d} className="piso" />
      {COM_CAMINHAO.includes(status) && <path d={f.caminhao} className="caminhao lod-vaga" />}
      <text x={f.texto[0]} y={f.texto[1]} transform={`rotate(${f.angulo.toFixed(1)} ${f.texto[0].toFixed(2)} ${f.texto[1].toFixed(2)})`} className="numero lod-vaga">{f.rotulo}</text>
    </g>
  );
});

/** anel da vaga selecionada, por cima de todas */
function Selecionada() {
  const id = useUi((s) => (s.selecao?.tipo === "vaga" ? s.selecao.id : null));
  const v = id ? vagasPorId.get(id) : undefined;
  if (!v) return null;
  return <path d={caminho(cantosVaga(v))} className="anel-vaga" vectorEffect="non-scaling-stroke" />;
}

export const Vagas = memo(function Vagas() {
  return (
    <g className="vagas">
      {FORMAS.map((f) => <Vaga key={f.id} f={f} />)}
      <Selecionada />
    </g>
  );
});
