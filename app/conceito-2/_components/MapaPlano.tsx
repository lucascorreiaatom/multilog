"use client";
// Mapa plano do pátio (Conceito 2): SVG sem WebGL, leve em máquinas básicas. Visão geral com o resumo dos setores,
// vagas pela cor do status ao aproximar, número da vaga e caminhão de perto. A navegação fica em mapa/motor.ts.
import { useEffect, useRef, useState } from "react";
import { STATUS } from "@/lib/patio/tipos";
import { NOMES_SETOR, vagasPorId } from "@/lib/site";
import { useUi } from "@/lib/store/ui";
import { assinarGatilhos, concluirGatilhoSemAnimacao, usePatio } from "@/lib/store/patio";
import { Ponto } from "@/app/_components/ui";
import { Fundo, Predios } from "./mapa/Fundo";
import { criarMotor } from "./mapa/motor";
import { Sobreposicoes } from "./mapa/Sobreposicoes";
import { Vagas } from "./mapa/Vagas";

type Dica = { id: string; x: number; y: number } | null;

export function MapaPlano() {
  const raiz = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const grupo = useRef<SVGGElement>(null);
  const [dica, setDica] = useState<Dica>(null);
  const filtrando = useUi((s) => s.filtroStatus.length > 0);
  const foco = useUi((s) => s.foco);

  useEffect(() => criarMotor({ raiz: raiz.current!, svg: svg.current!, grupo: grupo.current!, aoDica: setDica }), []);
  // sem animação de caminhões: entradas e saídas do simulador se completam na hora (a vaga muda de cor direto)
  useEffect(() => { const parar = assinarGatilhos(concluirGatilhoSemAnimacao); return () => { parar(); }; }, []);

  return (
    <div
      ref={raiz}
      tabIndex={0}
      role="application"
      aria-roledescription="mapa"
      aria-label="Mapa do pátio. Teclas mais e menos aproximam e afastam, as setas movem e Home volta à visão geral."
      data-filtro={filtrando || undefined}
      data-foco={foco || undefined}
      className="mapa-plano absolute inset-0 touch-none overflow-hidden bg-[var(--mapa-fora)] outline-none select-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
    >
      {/* tamanho só até o motor montar: depois ele desenha o SVG maior que o mapa (SOBRA em motor.ts) */}
      <svg ref={svg} className="absolute inset-0 h-full w-full" data-testid="mapa-2d">
        <g ref={grupo}>
          <Fundo />
          <Vagas />
          <Predios />
        </g>
      </svg>
      <Sobreposicoes />
      {dica && <DicaVaga {...dica} />}
    </div>
  );
}

/** dica ao passar o mouse: vaga, status com a explicação de uma linha e a placa, se houver caminhão */
function DicaVaga({ id, x, y }: { id: string; x: number; y: number }) {
  const estado = usePatio((s) => s.vagas[id]);
  const placa = usePatio((s) => (estado?.ocupanteId ? s.ocupantes[estado.ocupanteId]?.veiculo.placa : undefined));
  const v = vagasPorId.get(id);
  if (!estado || !v) return null;
  const st = STATUS[estado.status];
  return (
    <div className="pointer-events-none absolute top-0 left-0 z-20 w-[248px] rounded-[12px] bg-panel p-12 shadow-float" style={{ transform: `translate(${x + 16}px, ${y + 16}px)` }}>
      <p className="flex items-center justify-between gap-8">
        <span className="text-[15px] font-semibold leading-20 text-text">{id}</span>
        {placa && <span className="tnum text-[13px] font-semibold leading-20 text-text-2">{placa}</span>}
      </p>
      <p className="mt-4 flex items-center gap-8 text-[13px] font-semibold leading-20 text-text"><Ponto cor={st.cor} tamanho={10} />{st.nome}</p>
      <p className="mt-4 text-[13px] leading-20 text-text-2">{st.descricao}</p>
      <p className="mt-4 text-[12px] leading-16 text-text-2">{NOMES_SETOR[v.setor]}</p>
    </div>
  );
}
