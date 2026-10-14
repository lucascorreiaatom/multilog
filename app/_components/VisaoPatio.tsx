"use client";
// Aba "Pátio" do painel de informações: ocupação geral, status (filtros do mapa) e setores.
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { numero, pct } from "@/lib/formato";
import { ORDEM_STATUS, STATUS, type StatusVaga } from "@/lib/patio/tipos";
import { NOMES_SETOR, SETORES_VAGAS, type SetorVagas } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { camerasPatioPorLocal } from "@/lib/cameras/catalogo";
import { ListaCameras } from "./ListaCameras";
import { AreaRolagem, Barra, Cartao, Ponto, cx } from "./ui";

/** os 4 status do SoW, em grade 2x2 */
const PRINCIPAIS: StatusVaga[] = ["ocupada", "livre", "conferencia", "saida"];

export function ConteudoPatio() {
  const contagem = usePatio((s) => s.contagem);
  const porSetor = usePatio((s) => s.porSetor);
  const selecao = useUi((s) => s.selecao);
  const ocupacao = pct(contagem.emUso, contagem.total);
  // status clicáveis filtram o mapa (vários ao mesmo tempo); fora do filtro, a vaga fica neutra e sem caminhão
  const filtro = useUi((s) => s.filtroStatus);
  const filtrando = filtro.length > 0;
  const apagado = (s: StatusVaga) => filtrando && !filtro.includes(s);
  const propsFiltro = (s: StatusVaga) => ({
    type: "button" as const,
    "aria-pressed": filtro.includes(s),
    title: filtro.includes(s) ? `Remover ${STATUS[s].nome} do filtro do mapa` : `Mostrar ${STATUS[s].nome} no mapa`,
    onClick: () => useUi.getState().alternarFiltro(s),
  });

  return (
    <>
    <AreaRolagem className="flex min-h-0 flex-1 flex-col gap-8 px-16 pb-16">
      <Cartao className="p-16">
        <div className="flex items-center justify-between text-[13px] leading-20 text-text-2">
          <span>Ocupação geral</span>
          <span className="tnum">{numero(contagem.emUso)} de {numero(contagem.total)} vagas</span>
        </div>
        <div className="tnum mt-8 text-[40px] font-bold leading-48 tracking-[-0.03em] text-text" data-testid="ocupacao-geral">{ocupacao}%</div>
        {/* barra de distribuição: cada trecho tem tooltip com o detalhe e filtra o mapa ao clicar */}
        <Tooltip.Provider delayDuration={120} skipDelayDuration={400}>
          <div className="mt-4 -mb-8 flex h-24 w-full gap-4" aria-label="Distribuição das vagas por status">
            {ORDEM_STATUS.filter((s) => contagem[s] > 0).map((s) => (
              <SegmentoBarra key={s} s={s} contagem={contagem} porSetor={porSetor} ativo={filtro.includes(s)} apagado={apagado(s)} />
            ))}
          </div>
        </Tooltip.Provider>
      </Cartao>

      {/* instrução logo acima dos status clicáveis */}
      <div className="px-4 pt-4"><LegendaFiltro /></div>
      <div className="grid grid-cols-2 gap-8">
        {PRINCIPAIS.map((s) => (
          <button key={s} {...propsFiltro(s)}
            className={cx("flex h-72 flex-col justify-center gap-4 rounded-[16px] px-16 text-left shadow-card transition-[opacity,box-shadow] outline-none hover:bg-card-muted focus-visible:ring-2 focus-visible:ring-accent",
              filtro.includes(s) ? "bg-card-muted realce-acento" : "bg-card", apagado(s) && "opacity-55")}>
            <span className="flex items-center gap-8 whitespace-nowrap text-[13px] leading-20 text-text-2"><Ponto cor={STATUS[s].cor} />{STATUS[s].curto}</span>
            <span className="tnum text-[22px] font-bold leading-28 text-text" data-testid={`status-${s}`}>{numero(contagem[s])}</span>
          </button>
        ))}
      </div>

      <h3 className="mt-12 text-[16px] font-semibold leading-24 text-text">Setores</h3>
      {SETORES_VAGAS.map((id) => {
        const c = porSetor[id];
        const ativo = selecao?.tipo === "setor" && selecao.id === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { useUi.getState().selecionar({ tipo: "setor", id }); useUi.getState().focar({ tipo: "setor", id }); }}
            className={cx("w-full rounded-[16px] px-16 py-12 text-left shadow-card transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-accent", ativo ? "bg-card-muted realce-acento" : "bg-card")}
          >
            <span className="flex items-center justify-between">
              <span className="text-[14px] font-semibold leading-20 text-text">{NOMES_SETOR[id]}</span>
              <span className="tnum text-[13px] font-semibold leading-20 text-text">{c.emUso}/{c.total}</span>
            </span>
            <span className="mt-8 block"><Barra valor={pct(c.emUso, c.total)} /></span>
          </button>
        );
      })}
      <div className="w-full rounded-[16px] bg-card px-16 py-12 shadow-card">
        <span className="flex items-center justify-between">
          <span className="text-[14px] font-semibold leading-20 text-text">{NOMES_SETOR.CTN}</span>
          <span className="tnum text-[13px] font-semibold leading-20 text-text">0/0</span>
        </span>
        <span className="mt-8 block"><Barra valor={0} /></span>
      </div>
    </AreaRolagem>
    {/* câmeras fixas no rodapé do painel: sempre à vista, sem depender da rolagem */}
    <ListaCameras fixa titulo="Câmeras do pátio" grupos={camerasPatioPorLocal} />
    </>
  );
}

/** linha acima dos status: dica do filtro ou o filtro ativo com "Limpar" */
export function LegendaFiltro() {
  const filtro = useUi((s) => s.filtroStatus);
  return (
    <p className="flex h-20 min-w-0 items-center gap-4 text-[12px] leading-16 text-text-2" aria-live="polite">
      {filtro.length ? (
        <>
          <span className="truncate">Mapa filtrado · {filtro.map((s) => STATUS[s].curto).join(", ")}</span>
          <button type="button" onClick={() => useUi.getState().limparFiltro()}
            className="-my-4 inline-flex h-24 shrink-0 items-center gap-4 rounded-full px-8 font-semibold text-text hover:bg-chip">
            <X size={12} />Limpar
          </button>
        </>
      ) : (
        <span className="truncate">Selecione quais vagas mostrar no mapa</span>
      )}
    </p>
  );
}

type Contagem = ReturnType<typeof usePatio.getState>["contagem"];

/** tooltip de um trecho da barra: participação no pátio e como o status se distribui pelos setores */
function DetalheStatus({ s, contagem, porSetor }: { s: StatusVaga; contagem: Contagem; porSetor: Record<SetorVagas, Contagem> }) {
  const noFiltro = useUi((u) => u.filtroStatus.includes(s));
  const setores = SETORES_VAGAS.filter((id) => porSetor[id][s] > 0).sort((a, b) => porSetor[b][s] - porSetor[a][s]);
  return (
    <div className="text-[12px] leading-16 text-text-2">
      <div className="flex items-center justify-between gap-8">
        <span className="flex items-center gap-8 text-[13px] font-semibold leading-20 text-text"><Ponto cor={STATUS[s].cor} />{STATUS[s].curto}</span>
        <span className="tnum text-[13px] font-semibold leading-20 text-text">{pct(contagem[s], contagem.total)}%</span>
      </div>
      <p className="tnum mt-4">{numero(contagem[s])} de {numero(contagem.total)} vagas do pátio</p>
      {setores.length > 0 && (
        <ul className="mt-12 flex flex-col gap-8 border-t border-text-3/20 pt-12">
          {setores.map((id) => {
            const c = porSetor[id];
            return (
              <li key={id}>
                <span className="flex items-center justify-between gap-8">
                  <span className="truncate text-text">{NOMES_SETOR[id]}</span>
                  <span className="tnum shrink-0">{c[s]} <span className="text-text-3">· {pct(c[s], c.total)}% do setor</span></span>
                </span>
                <span className="mt-4 block h-4 overflow-hidden rounded-full bg-chip">
                  <span className="block h-full rounded-full" style={{ width: `${pct(c[s], c.total)}%`, background: STATUS[s].cor }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-12 text-text-3">{noFiltro ? "Selecione de novo para tirar do mapa" : "Selecione para mostrar no mapa"}</p>
    </div>
  );
}

/** trecho da barra de distribuição: tooltip ao lado do painel (sem cobrir o conteúdo) e clique filtra o mapa */
function SegmentoBarra({ s, contagem, porSetor, ativo, apagado }: { s: StatusVaga; contagem: Contagem; porSetor: Record<SetorVagas, Contagem>; ativo: boolean; apagado: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [afastamento, setAfastamento] = useState(16);
  // distância do trecho até a borda direita do painel + 16 px de respiro
  const medir = () => {
    const el = ref.current, painel = el?.closest("[aria-label='Informações do pátio']");
    if (el && painel) setAfastamento(painel.getBoundingClientRect().right - el.getBoundingClientRect().right + 16);
  };
  return (
    <Tooltip.Root onOpenChange={(v) => v && medir()}>
      <Tooltip.Trigger asChild>
        <button ref={ref} type="button" aria-label={`${STATUS[s].nome}: ${contagem[s]} vagas`} aria-pressed={ativo} onClick={() => useUi.getState().alternarFiltro(s)}
          className="group flex h-24 items-center outline-none transition-[flex-grow] duration-500" style={{ flexGrow: contagem[s], flexBasis: 0, minWidth: 4 }}>
          <span className={cx("h-8 w-full rounded-[4px] transition-[opacity,height] duration-200 group-hover:h-12 group-focus-visible:h-12", apagado && "opacity-25")} style={{ background: STATUS[s].cor }} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" align="center" sideOffset={afastamento} collisionPadding={16} className="animar-entrada z-50 w-[280px] rounded-[16px] bg-card-muted p-16 shadow-float vidro">
          <DetalheStatus s={s} contagem={contagem} porSetor={porSetor} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
