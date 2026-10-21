"use client";
// Aba "Pátio" do painel de informações: ocupação geral, status (filtros do mapa) e setores.
import * as Tooltip from "@radix-ui/react-tooltip";
import { useRef, useState } from "react";
import { numero, pct } from "@/lib/formato";
import { ORDEM_STATUS, STATUS, type StatusVaga } from "@/lib/patio/tipos";
import { NOMES_SETOR, SETORES_VAGAS, type SetorVagas } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { camerasPatioPorLocal } from "@/lib/cameras/catalogo";
import { ListaCameras } from "./ListaCameras";
import { AreaRolagem, Barra, Ponto, ROTULO, cx, linhaLista } from "./ui";

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
    onClick: () => useUi.getState().alternarFiltro(s),
  });

  return (
    <>
    {/* um eixo só: rótulos, números e listas começam a 20 px da borda do painel; fundos de hover e seleção
        sangram 12 px para fora do eixo, sem empurrar o texto */}
    <AreaRolagem className="flex min-h-0 flex-1 flex-col px-20 pt-8 pb-20">
      <section aria-label="Ocupação geral">
        <div className="flex items-center justify-between">
          <h3 className={ROTULO}>Ocupação geral</h3>
          <span className="tnum text-[12px] leading-16 text-text-2">{numero(contagem.emUso)} de {numero(contagem.total)} vagas</span>
        </div>
        <div className="mt-8 flex items-baseline gap-8">
          <span className="tnum text-[40px] font-bold leading-48 tracking-[-0.03em] text-text" data-testid="ocupacao-geral">{ocupacao}%</span>
          <span className="tnum text-[13px] leading-20 text-text-2">{numero(contagem.livre)} vagas livres</span>
        </div>
        {/* barra de distribuição: cada trecho tem tooltip com o detalhe e filtra o mapa ao clicar */}
        <Tooltip.Provider delayDuration={120} skipDelayDuration={400}>
          <div className="mt-4 flex h-24 w-full gap-4" aria-label="Distribuição das vagas por status">
            {ORDEM_STATUS.filter((s) => contagem[s] > 0).map((s) => (
              <SegmentoBarra key={s} s={s} contagem={contagem} porSetor={porSetor} ativo={filtro.includes(s)} apagado={apagado(s)} />
            ))}
          </div>
        </Tooltip.Provider>
      </section>

      <section aria-label="Status das vagas" className={SECAO}>
        <LegendaFiltro />
        <ul className="mt-8 flex flex-col gap-4">
          {PRINCIPAIS.map((s) => (
            <li key={s}>
              <button {...propsFiltro(s)}
                className={cx(linhaLista(filtro.includes(s)), "flex h-40 items-center gap-12 transition-opacity", apagado(s) && "opacity-55")}>
                <Ponto cor={STATUS[s].cor} />
                <span className="min-w-0 flex-1 truncate text-[14px] leading-20 text-text">{STATUS[s].curto}</span>
                <span className="tnum text-[14px] font-semibold leading-20 text-text" data-testid={`status-${s}`}>{numero(contagem[s])}</span>
                <span className="tnum w-40 text-right text-[12px] leading-16 text-text-2">{pct(contagem[s], contagem.total)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Setores" className={SECAO}>
        <h3 className={ROTULO}>Setores</h3>
        <ul className="mt-8 flex flex-col gap-4">
          {SETORES_VAGAS.map((id) => {
            const c = porSetor[id];
            const ativo = selecao?.tipo === "setor" && selecao.id === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={ativo || undefined}
                  onClick={() => { useUi.getState().selecionar({ tipo: "setor", id }); useUi.getState().focar({ tipo: "setor", id }); }}
                  className={cx(linhaLista(ativo), "block py-8")}
                >
                  <span className="flex items-center justify-between gap-8">
                    <span className="truncate text-[14px] font-semibold leading-20 text-text">{NOMES_SETOR[id]}</span>
                    <span className="tnum text-[14px] font-semibold leading-20 text-text">{pct(c.emUso, c.total)}%</span>
                  </span>
                  <span className="mt-8 block"><Barra valor={pct(c.emUso, c.total)} /></span>
                  <span className="tnum mt-8 flex items-center justify-between gap-8 text-[12px] leading-16 text-text-2">
                    <span>{numero(c.emUso)} de {numero(c.total)} em uso</span>
                    <span>{numero(c.total - c.emUso)} {c.total - c.emUso === 1 ? "livre" : "livres"}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {/* sem vagas cadastradas: não vira botão nem barra vazia */}
          <li className="flex h-40 items-center justify-between gap-8">
            <span className="text-[14px] font-semibold leading-20 text-text-2">{NOMES_SETOR.CTN}</span>
            <span className="text-[12px] leading-16 text-text-2">Sem vagas cadastradas</span>
          </li>
        </ul>
      </section>
    </AreaRolagem>
    {/* câmeras fixas no rodapé do painel: sempre à vista, sem depender da rolagem */}
    <ListaCameras fixa titulo="Câmeras do pátio" grupos={camerasPatioPorLocal} />
    </>
  );
}

/** quebra entre seções: linha fina com 20 px de respiro de cada lado */
const SECAO = "mt-20 border-t border-text-3/15 pt-20";

/** cabeçalho dos status: rótulo da seção e, com o mapa filtrado, a ação de voltar a mostrar todas */
export function LegendaFiltro() {
  const filtro = useUi((s) => s.filtroStatus);
  return (
    <div className="flex h-20 items-center justify-between gap-8">
      <h3 className={ROTULO}>Mostrar no mapa</h3>
      {filtro.length > 0 && (
        <button type="button" onClick={() => useUi.getState().limparFiltro()}
          className="-mx-8 inline-flex h-24 shrink-0 items-center rounded-full px-8 text-[12px] font-semibold leading-16 text-accent outline-none hover:bg-chip focus-visible:ring-2 focus-visible:ring-accent">
          Mostrar todas
        </button>
      )}
      <p className="sr-only" aria-live="polite">{filtro.length ? `Mapa filtrado: ${filtro.map((s) => STATUS[s].curto).join(", ")}` : "Mapa com todas as vagas"}</p>
    </div>
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
        <span className="flex items-center gap-8 text-[14px] font-semibold leading-20 text-text"><Ponto cor={STATUS[s].cor} />{STATUS[s].curto}</span>
        <span className="tnum text-[14px] font-semibold leading-20 text-text">{pct(contagem[s], contagem.total)}%</span>
      </div>
      {/* subtítulo no eixo do nome (depois do ponto de 10 px + 8 px) */}
      <p className="tnum mt-4 pl-18">{numero(contagem[s])} de {numero(contagem.total)} vagas do pátio</p>
      {setores.length > 0 && (
        <div className="mt-16 border-t border-text-3/15 pt-16">
          {/* três colunas fixas: setor, vagas no status e quanto isso pesa no setor; números alinhados à direita */}
          <div className="grid grid-cols-[1fr_40px_40px] items-center gap-x-12">
            <span className={ROTULO}>Por setor</span>
            <span className="text-right text-[11px] leading-16 text-text-3">Vagas</span>
            <span className="text-right text-[11px] leading-16 text-text-3">Setor</span>
          </div>
          <ul className="mt-8 flex flex-col gap-12">
            {setores.map((id) => {
              const c = porSetor[id];
              return (
                <li key={id}>
                  <span className="grid grid-cols-[1fr_40px_40px] items-center gap-x-12">
                    <span className="truncate text-[13px] leading-20 text-text">{NOMES_SETOR[id]}</span>
                    <span className="tnum text-right text-[13px] font-semibold leading-20 text-text">{numero(c[s])}</span>
                    <span className="tnum text-right">{pct(c[s], c.total)}%</span>
                  </span>
                  <span className="mt-4 block h-4 overflow-hidden rounded-full bg-chip">
                    <span className="block h-full rounded-full" style={{ width: `${pct(c[s], c.total)}%`, background: STATUS[s].cor }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="mt-16 border-t border-text-3/15 pt-12 text-text-3">{noFiltro ? "Selecione de novo para tirar do mapa" : "Selecione para mostrar no mapa"}</p>
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
        <Tooltip.Content side="right" align="center" sideOffset={afastamento} collisionPadding={16} className="animar-entrada z-50 w-[304px] rounded-[16px] bg-card-muted p-20 shadow-float vidro">
          <DetalheStatus s={s} contagem={contagem} porSetor={porSetor} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
