// Fundo do mapa plano (estático, desenhado uma vez): recinto, rodovia, acesso e pistas dos gates, canteiros, pátio de
// contêineres e prédios. Visual de maquete: tudo branco e cinza-azulado claro; a cor forte fica para os status.
import { memo } from "react";
import { paraTela } from "@/lib/mapa/vista";
import { planta } from "@/lib/site";
import type { Vec2 } from "@/lib/site/tipos";

const pts = (lista: Vec2[]) => lista.map((q) => paraTela(q).map((n) => n.toFixed(2)).join(",")).join(" ");

const Y_RODOVIA = paraTela(planta.vias.nos["rod-gate"])[1];
const PISTAS = planta.pistasGate;
const xsPista = PISTAS.map((g) => paraTela([g.x, 0])[0]);
const ACESSO = { x0: Math.min(...xsPista) - 6, x1: Math.max(...xsPista) + 6 };

/** canteiro em cápsula: segmento a-b com pontas arredondadas */
function capsula(a: Vec2, b: Vec2, largura: number) {
  const [ax, ay] = paraTela(a), [bx, by] = paraTela(b);
  return { d: `M${ax.toFixed(2)},${ay.toFixed(2)}L${bx.toFixed(2)},${by.toFixed(2)}`, w: Math.max(2.4, largura) + 6 };
}

export const Fundo = memo(function Fundo() {
  return (
    <g aria-hidden>
      {/* entorno, rodovia e acesso aos gates */}
      <rect x={-3000} y={-3000} width={6000} height={6000} className="fill-[var(--mapa-fora)]" />
      <rect x={-3000} y={Y_RODOVIA - 18} width={6000} height={36} className="fill-[var(--mapa-via)]" />
      <line x1={-3000} x2={3000} y1={Y_RODOVIA} y2={Y_RODOVIA} className="stroke-[var(--mapa-fora)]" strokeWidth={3} />
      <rect x={ACESSO.x0} y={paraTela([0, PISTAS[0].zNorte])[1]} width={ACESSO.x1 - ACESSO.x0} height={Y_RODOVIA - paraTela([0, PISTAS[0].zNorte])[1]} className="fill-[var(--mapa-via)]" />

      {/* recinto: piso dentro da cerca, concreto da área de Cargas Perigosas e do Scanner */}
      <polygon points={pts(planta.cerca)} className="fill-[var(--mapa-piso)] stroke-[var(--mapa-cerca)]" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      <polygon points={pts(planta.areaCPG)} className="fill-[var(--mapa-concreto)]" />
      <polygon points={pts(planta.scannerPlataforma)} className="fill-[var(--mapa-concreto)]" />

      {/* pistas dos gates: faixa de cada pista com a balança no meio */}
      {PISTAS.map((g) => {
        const [x, yN] = paraTela([g.x, g.zNorte]), [, yS] = paraTela([g.x, g.zSul]), [, yB] = paraTela([g.x, g.zBalanca]);
        return (
          <g key={g.id}>
            <rect x={x - 3.2} y={yS} width={6.4} height={yN - yS} className="fill-[var(--mapa-via)]" />
            <rect x={x - 2.4} y={yB - 9} width={4.8} height={18} rx={0.8} className="fill-[var(--mapa-concreto)] stroke-[var(--mapa-cerca)]" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}

      {/* canteiros centrais entre as fileiras de vagas */}
      <g className="stroke-[var(--mapa-canteiro)]" strokeLinecap="round" fill="none">
        {planta.canteiros.map((c, i) => { const k = capsula(c.a, c.b, c.largura); return <path key={i} d={k.d} strokeWidth={k.w} />; })}
      </g>

      {/* pátio de contêineres: blocos da grade e ilhas circulares */}
      {planta.blocosContainer.map((b, i) => <polygon key={i} points={pts(b)} className="fill-[var(--mapa-container)] stroke-[var(--mapa-cerca)]" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
      {planta.canteirosContainer.map((c, i) => { const [x, y] = paraTela(c); return <circle key={i} cx={x} cy={y} r={5.5} className="fill-[var(--mapa-canteiro)]" />; })}

      {/* vagas de carros (sem status): só aparecem de perto */}
      <g className="lod-perto fill-none stroke-[var(--mapa-cerca)]" strokeWidth={1} vectorEffect="non-scaling-stroke">
        {planta.vagasLeves.map((v, i) => {
          const [x, y] = paraTela(v.centro), w = v.giro ? 4.8 : 2.3, h = v.giro ? 2.3 : 4.8;
          return <rect key={i} x={x - w / 2} y={y - h / 2} width={w} height={h} vectorEffect="non-scaling-stroke" />;
        })}
      </g>

      {/* coberturas leves (estacionamento de carros) */}
      {planta.coberturasLeves.map((c, i) => <polygon key={i} points={pts(c)} className="fill-[var(--mapa-predio)] stroke-[var(--mapa-predio-borda)] opacity-70" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />)}
    </g>
  );
});

/** prédios por cima das vagas (o armazém fica entre as docas): sombra deslocada + volume branco com contorno azul */
export const Predios = memo(function Predios() {
  const [rx, ry] = paraTela(planta.reservatorio.centro);
  return (
    <g>
      {planta.predios.map((b) => (
        <polygon key={`s-${b.id}`} points={pts(b.contorno)} transform="translate(1.6 1.6)" className="fill-[var(--mapa-sombra)]" aria-hidden />
      ))}
      {planta.predios.map((b) => (
        <polygon key={b.id} points={pts(b.contorno)} data-predio={b.id}
          className={b.tipo === "cobertura" ? "predio fill-[var(--mapa-predio)] stroke-[var(--mapa-predio-borda)] opacity-80" : "predio fill-[var(--mapa-predio)] stroke-[var(--mapa-predio-borda)]"}
          strokeWidth={1.5} strokeDasharray={b.tipo === "cobertura" ? "5 3" : undefined} vectorEffect="non-scaling-stroke">
          <title>{b.nome}</title>
        </polygon>
      ))}
      <circle cx={rx} cy={ry} r={planta.reservatorio.raio} data-predio="reservatorio" className="predio fill-[var(--mapa-predio)] stroke-[var(--mapa-predio-borda)]" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
        <title>{planta.reservatorio.nome}</title>
      </circle>
    </g>
  );
});

