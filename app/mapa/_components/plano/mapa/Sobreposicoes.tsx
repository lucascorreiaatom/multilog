"use client";
// Camada HTML sobre o mapa plano: resumo dos setores (visão geral), gates, câmeras e nomes dos prédios (de perto).
// Botões de verdade (foco, leitor de tela) em tamanho fixo na tela; a posição vem da projeção, sem re-render.
import { ArrowDown, ArrowDownUp, ArrowUp, Building2, DoorOpen, Video, VideoOff } from "lucide-react";
import { useCallback } from "react";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { pct } from "@/lib/formato";
import { centroDe, paraTela, type Ponto } from "@/lib/mapa/vista";
import { centroSetor, NOMES_SETOR, planta, SETORES_VAGAS, type SetorVagas } from "@/lib/site";
import type { Predio } from "@/lib/site/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi, type AlvoCamera3D, type Selecao } from "@/lib/store/ui";
import { Barra, cx } from "@/app/_components/ui";
import { registrar } from "./projecao";

function useProjetado(chave: string, p: Ponto) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((el: HTMLDivElement | null) => (el ? registrar(chave, el, p) : undefined), [chave]);
}

const ir = (s: Selecao, alvo: AlvoCamera3D) => { useUi.getState().selecionar(s); useUi.getState().focar(alvo); };

/** âncora: ponto do desenho no canto superior esquerdo; o conteúdo centraliza nele (dx/dy afastam vizinhos, em px) */
function Ancora({ chave, p, className, children, dx = 0, dy = 0 }: { chave: string; p: Ponto; className?: string; children: React.ReactNode; dx?: number; dy?: number }) {
  const ref = useProjetado(chave, p);
  return (
    <div ref={ref} className={cx("pointer-events-none absolute top-0 left-0 will-change-transform", className)}>
      <div className="pointer-events-auto absolute" style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}>{children}</div>
    </div>
  );
}

/** Cargas Perigosas e Docas ficam lado a lado no centro do desenho: os resumos se afastam na vertical */
const DESLOCAMENTO: Partial<Record<SetorVagas, number>> = { CPG: -28, DOC: 28 };

function ResumoSetor({ setor }: { setor: SetorVagas }) {
  const c = usePatio((s) => s.porSetor[setor]);
  const valor = pct(c.emUso, c.total);
  return (
    <Ancora chave={`setor-${setor}`} p={paraTela(centroSetor(setor))} dy={DESLOCAMENTO[setor]} className="lod-geral">
      <button type="button" onClick={() => ir({ tipo: "setor", id: setor }, { tipo: "setor", id: setor })}
        className="w-[240px] rounded-[16px] bg-panel px-16 py-12 text-left shadow-float outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-accent">
        <span className="block truncate text-[15px] font-semibold leading-20 text-text">{NOMES_SETOR[setor]}</span>
        <span className="mt-4 flex items-baseline justify-between gap-8">
          <span className="tnum text-[22px] font-bold leading-28 text-text">{valor}%</span>
          <span className="tnum text-[13px] leading-20 text-text-2">{c.emUso} de {c.total} em uso</span>
        </span>
        <span className="mt-8 block"><Barra valor={valor} /></span>
      </button>
    </Ancora>
  );
}

const CENTRO_CONTAINER = centroDe(planta.blocosContainer.flat().map(paraTela));

// mesmos ícones da aba Gates do painel (entrada, saída, reversível), para o operador reconhecer o gate nos dois lugares
const SENTIDO = { entrada: ArrowDown, saida: ArrowUp, reversivel: ArrowDownUp } as const;

function MarcadorGate({ numero, p, sentido }: { numero: number; p: Ponto; sentido: keyof typeof SENTIDO }) {
  const ativo = useUi((s) => s.selecao?.tipo === "gate" && s.selecao.numero === numero);
  const aberto = usePatio((s) => s.gates.find((g) => g.numero === numero)?.aberto ?? true);
  const Icone = SENTIDO[sentido];
  return (
    <Ancora chave={`gate-${numero}`} p={p} className="lod-vaga">
      <button type="button" aria-label={`Gate ${numero}`} title={`Gate ${numero} · ${aberto ? "aberto" : "fechado"}`} onClick={() => ir({ tipo: "gate", numero }, { tipo: "gate", numero })}
        className={cx("flex h-32 items-center gap-4 rounded-full pr-8 pl-4 text-[13px] font-semibold leading-20 shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent",
          ativo ? "bg-accent text-accent-ink" : "bg-panel text-text hover:bg-card")}>
        <span className={cx("flex size-24 items-center justify-center rounded-full", ativo ? "bg-white/20" : aberto ? "bg-[color-mix(in_srgb,var(--st-livre)_18%,transparent)] text-st-livre" : "bg-chip text-text-2")}><Icone size={14} /></span>
        {numero}
      </button>
    </Ancora>
  );
}

// atalho dos gates na ponta norte das pistas (embaixo no desenho), longe do resumo do Pulmão
const CENTRO_GATES = centroDe(planta.pistasGate.map((g) => paraTela([g.x, g.zNorte + 12])));

function MarcadorCamera({ numero, p, fila }: { numero: number; p: Ponto; fila?: boolean }) {
  const ativa = useUi((s) => s.blocos.camera !== "oculto" && s.cameraAtiva === numero);
  const offline = usePatio((s) => s.camerasOffline.includes(numero));
  const codigo = `CAM-${String(numero).padStart(3, "0")}`;
  return (
    // as câmeras de fila ficam a 8 m umas das outras: só aparecem de perto, junto com os marcadores das pistas
    <Ancora chave={`cam-${numero}`} p={p} className={ativa ? "z-10" : fila ? "lod-vaga" : "lod-perto"}>
      <span className="flex items-center gap-8">
        <button type="button" aria-label={`Abrir câmera ${codigo}`} title={codigo}
          onClick={() => { useUi.getState().exibirCamera(numero); useUi.getState().selecionar({ tipo: "camera", numero }); }}
          className={cx("flex size-32 items-center justify-center rounded-full shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent",
            ativa ? "bg-accent text-accent-ink" : "bg-panel text-text hover:bg-card")}>
          {offline ? <VideoOff size={16} className={ativa ? "" : "text-st-ocupada"} /> : <Video size={16} />}
        </button>
        {ativa && <span className="tnum inline-flex h-24 items-center whitespace-nowrap rounded-full bg-dark px-8 text-[12px] font-semibold leading-16 text-on-dark">{codigo}</span>}
      </span>
    </Ancora>
  );
}

function ancoraPredio(b: Predio): Ponto {
  const c = centroDe(b.contorno.map(paraTela));
  // armazém: docas dos dois lados; o nome vai para a metade oeste (à direita no desenho girado), longe do resumo das Docas
  if (b.id === "armazem") return [(Math.max(...b.contorno.map((q) => paraTela(q)[0])) + c[0]) / 2, c[1]];
  return c;
}
// a sala do apoio fica colada ao prédio principal; a cobertura dos gates já tem os marcadores das pistas
const ROTULADOS = planta.predios.filter((b) => b.id !== "apoio-motoristas-sala" && b.id !== "gates");

function RotuloPredio({ b }: { b: Predio }) {
  const ativo = useUi((s) => s.selecao?.tipo === "predio" && s.selecao.id === b.id);
  return (
    <Ancora chave={`predio-${b.id}`} p={ancoraPredio(b)} className="lod-perto">
      <button type="button" onClick={() => ir({ tipo: "predio", id: b.id }, { tipo: "predio", id: b.id })}
        className={cx("flex h-28 items-center gap-4 whitespace-nowrap rounded-full px-8 text-[12px] font-semibold leading-16 shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent",
          ativo ? "bg-accent text-accent-ink" : "bg-panel text-text hover:bg-card")}>
        <Building2 size={14} />{b.nome}
      </button>
    </Ancora>
  );
}

export function Sobreposicoes() {
  const blocos = useUi((s) => s.blocos);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {blocos.predios !== "oculto" && ROTULADOS.map((b) => <RotuloPredio key={b.id} b={b} />)}
      {blocos.callouts !== "oculto" && SETORES_VAGAS.map((s) => <ResumoSetor key={s} setor={s} />)}
      {blocos.callouts !== "oculto" && (
        // rótulo curto, deslocado para não cruzar o resumo das Docas; o detalhe fica na dica
        <Ancora chave="setor-CTN" p={CENTRO_CONTAINER} dx={-56}>
          <span className="block whitespace-nowrap rounded-full bg-panel px-12 py-4 text-[13px] font-semibold leading-20 text-text shadow-card">
            {NOMES_SETOR.CTN}
          </span>
        </Ancora>
      )}
      {/* gates: um atalho enquanto as pistas (8 m entre si) estão próximas demais; de perto, um marcador por pista */}
      <Ancora chave="gates" p={CENTRO_GATES} className="lod-longe">
        <button type="button" onClick={() => ir(null, { tipo: "gates" })}
          className="flex h-40 items-center gap-8 rounded-full bg-panel px-12 text-[14px] font-semibold leading-20 text-text shadow-float outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-accent">
          <DoorOpen size={18} />Gates
        </button>
      </Ancora>
      {planta.pistasGate.map((g) => <MarcadorGate key={g.id} numero={g.numero} sentido={g.sentido} p={paraTela([g.x, g.zBalanca])} />)}
      {blocos.marcadores !== "oculto" && camerasExternas.map((c) => <MarcadorCamera key={c.numero} numero={c.numero} p={paraTela(c.posicao)} fila={c.aproximada} />)}
    </div>
  );
}
