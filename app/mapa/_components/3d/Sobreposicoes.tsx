"use client";
// Sobreposições projetadas da cena: marcadores das câmeras externas, callouts dos setores (Imagem 1) e nomes dos prédios.
// O projetor da cena atualiza a posição de todos num único loop, sem re-render do React.
import { Building2, ChevronRight, Video, VideoOff } from "lucide-react";
import { useCallback } from "react";
import * as THREE from "three";
import { camerasExternas, camerasInternas } from "@/lib/cameras/catalogo";
import { pct } from "@/lib/formato";
import { centroSetor, NOMES_SETOR, planta, SETORES_VAGAS, type SetorVagas } from "@/lib/site";
import type { Predio } from "@/lib/site/tipos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { registrarProjetado } from "@/scene/projetor";
import { Barra, cx } from "@/app/_components/ui";

function useProjetado(chave: string, pos: [number, number, number], distMax?: number) {
  return useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    return registrarProjetado(chave, { el, pos: new THREE.Vector3(...pos), distMax });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, distMax]);
}

function MarcadorCamera({ numero, pos, ativa, offline }: { numero: number; pos: [number, number, number]; ativa: boolean; offline: boolean }) {
  const ref = useProjetado(`cam-${numero}`, pos, ativa ? 4000 : 620);
  const codigo = `CAM-${String(numero).padStart(3, "0")}`;
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 will-change-transform" style={{ visibility: "hidden" }}>
      <div className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-8">
        <button
          type="button"
          aria-label={`Abrir câmera ${codigo}`}
          title={codigo}
          onClick={() => { useUi.getState().exibirCamera(numero); useUi.getState().selecionar({ tipo: "camera", numero }); }}
          className={cx(
            "vidro flutuante flex size-32 items-center justify-center rounded-full shadow-float transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
            ativa ? "bg-accent text-accent-ink" : "bg-card text-text hover:bg-card-muted",
          )}
        >
          {offline ? <VideoOff size={16} className={ativa ? "" : "text-inativo"} /> : <Video size={16} />}
        </button>
        {ativa && <span className="tnum inline-flex h-24 items-center whitespace-nowrap rounded-full bg-dark px-8 text-[12px] font-semibold leading-16 text-on-dark">{codigo}</span>}
      </div>
    </div>
  );
}

function Callout({ setor, predioAtivo }: { setor: SetorVagas; predioAtivo: string | null }) {
  const c = usePatio((s) => s.porSetor[setor]);
  const [x, z] = centroSetor(setor);
  const ref = useProjetado(`setor-${setor}`, [x, 0, z], 1800);
  const valor = pct(c.emUso, c.total);
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 will-change-transform" style={{ visibility: "hidden" }}>
      <div className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center">
        <button
          type="button"
          onClick={() => { useUi.getState().selecionar({ tipo: "setor", id: setor }); useUi.getState().focar({ tipo: "setor", id: setor }); }}
          className="vidro flutuante pointer-events-auto w-[240px] rounded-[16px] bg-card px-16 py-12 text-left shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* mesmo resumo do mapa plano: nome em linha própria (Montserrat é larga), % em destaque */}
          <span className="block truncate text-[15px] font-semibold leading-20 text-text">{NOMES_SETOR[setor]}</span>
          <span className="mt-4 flex items-baseline justify-between gap-8">
            <span className="tnum text-[22px] font-bold leading-28 text-text">{valor}%</span>
            <span className="tnum text-[13px] leading-20 text-text-2">{c.emUso} de {c.total} em uso</span>
          </span>
          <span className="mt-8 block"><Barra valor={valor} /></span>
        </button>
        {/* as docas são as vagas encostadas no armazém; o prédio (câmeras internas) é outra seleção. Com os callouts
            visíveis este atalho é o rótulo do armazém (o do telhado ficaria atrás do callout, repetindo o nome) */}
        {setor === "DOC" && (
          <button type="button" onClick={() => selecionarPredio("armazem")}
            className={cx("vidro flutuante pointer-events-auto mt-4 flex h-32 w-[240px] items-center gap-8 rounded-full px-12 text-left text-[12px] font-semibold leading-16 shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent",
              predioAtivo === "armazem" ? "bg-accent text-accent-ink" : "bg-card text-text hover:bg-card-muted")}>
            <Building2 size={14} className="shrink-0" /><span className="min-w-0 flex-1 truncate">Armazém de Conferência</span><ChevronRight size={14} className={cx("shrink-0", predioAtivo === "armazem" ? "text-accent-ink/70" : "text-text-3")} />
          </button>
        )}
        <span className="h-40 w-2 bg-accent/70" />
        <span className="size-16 rounded-full border-[3px] border-white bg-accent shadow-float" />
      </div>
    </div>
  );
}

function selecionarPredio(id: string) {
  useUi.getState().selecionar({ tipo: "predio", id });
  useUi.getState().focar({ tipo: "predio", id });
}

function ancoraRotulo(b: Predio): [number, number] {
  const x = b.contorno.reduce((a, q) => a + q[0], 0) / b.contorno.length, z = b.contorno.reduce((a, q) => a + q[1], 0) / b.contorno.length;
  // o callout das Docas cai no meio do armazém (docas dos dois lados): o nome vai para a ponta oeste, sem docas
  if (b.id === "armazem") return [(Math.min(...b.contorno.map((q) => q[0])) + x) / 2, z];
  return [x, z];
}
// a sala do apoio aos motoristas fica colada ao prédio principal: um rótulo só
const PREDIOS_ROTULADOS = planta.predios.filter((b) => b.id !== "apoio-motoristas-sala");

/** nome do prédio sobre o telhado: mostra que o prédio é clicável (câmeras internas da planta) */
function RotuloPredio({ b, ativo }: { b: Predio; ativo: boolean }) {
  const [x, z] = ancoraRotulo(b);
  const ref = useProjetado(`predio-${b.id}`, [x, b.altura + 2, z], ativo ? 4000 : 700);
  const internas = camerasInternas.filter((c) => b.paginas?.includes(c.pagina)).length;
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 will-change-transform" style={{ visibility: "hidden" }}>
      <button type="button" onClick={() => selecionarPredio(b.id)} title={internas ? `${b.nome} · ${internas} câmeras internas` : b.nome}
        className={cx("vidro flutuante pointer-events-auto absolute flex h-28 -translate-x-1/2 -translate-y-full items-center gap-4 whitespace-nowrap rounded-full px-8 text-[12px] font-semibold leading-16 shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent",
          ativo ? "bg-accent text-accent-ink" : "bg-card text-text hover:bg-card-muted")}>
        <Building2 size={14} />{b.nome}
      </button>
    </div>
  );
}

export function Sobreposicoes() {
  // card da câmera fechado = nenhuma câmera em destaque
  const ativa = useUi((s) => (s.blocos.camera === "oculto" ? null : s.cameraAtiva));
  const offline = usePatio((s) => s.camerasOffline);
  const modoTv = useUi((s) => s.modoTv);
  const blocos = useUi((s) => s.blocos);
  const predioAtivo = useUi((s) => (s.selecao?.tipo === "predio" ? s.selecao.id : null));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden={false}>
      {!modoTv && blocos.predios !== "oculto" && PREDIOS_ROTULADOS.filter((b) => b.id !== "armazem" || blocos.callouts === "oculto").map((b) => <RotuloPredio key={b.id} b={b} ativo={predioAtivo === b.id} />)}
      {blocos.callouts !== "oculto" && SETORES_VAGAS.map((s) => <Callout key={s} setor={s} predioAtivo={predioAtivo} />)}
      {!modoTv && blocos.marcadores !== "oculto" && camerasExternas.map((c) => (
        <MarcadorCamera key={c.numero} numero={c.numero} pos={[c.posicao[0], c.altura + 2, c.posicao[1]]} ativa={ativa === c.numero} offline={offline.includes(c.numero)} />
      ))}
    </div>
  );
}
