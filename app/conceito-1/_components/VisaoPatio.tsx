"use client";
// Painel esquerdo (Imagem 1): Visão do pátio, ocupação geral, status, setores e pendências do projeto.
import { ChevronDown, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PENDENCIAS } from "@/lib/cameras/catalogo";
import { numero, pct } from "@/lib/formato";
import { ORDEM_STATUS, STATUS, type StatusVaga } from "@/lib/patio/tipos";
import { NOMES_SETOR, SETORES_VAGAS } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { BotaoRecolher } from "./Recolher";
import { AreaRolagem, Barra, Cartao, Painel, Ponto, Titulo, cx } from "./ui";

const PRINCIPAIS: StatusVaga[] = ["ocupada", "livre", "conferencia", "saida"];
const OUTROS: StatusVaga[] = ["reservada", "vistoria", "bloqueada"];

export function VisaoPatio({ className }: { className?: string }) {
  const contagem = usePatio((s) => s.contagem);
  const porSetor = usePatio((s) => s.porSetor);
  const selecao = useUi((s) => s.selecao);
  const [pendencias, setPendencias] = useState(false);
  const recolhido = useUi((s) => s.blocos.visao === "recolhido");
  const ocupacao = pct(contagem.emUso, contagem.total);

  return (
    <Painel className={cx("flex flex-col overflow-hidden", className)} aria-label="Visão do pátio">
      <div className="flex h-64 shrink-0 items-center justify-between px-16">
        <Titulo>Visão do pátio</Titulo>
        <BotaoRecolher bloco="visao" nome="Visão do pátio" />
      </div>
      {!recolhido && <AreaRolagem className="flex min-h-0 flex-1 flex-col gap-8 px-16 pb-16">
        <Cartao className="p-16">
          <div className="flex items-center justify-between text-[13px] leading-20 text-text-2">
            <span>Ocupação geral</span>
            <span className="tnum">{numero(contagem.emUso)} de {numero(contagem.total)} vagas</span>
          </div>
          <div className="tnum mt-8 text-[40px] font-bold leading-48 tracking-[-0.03em] text-text" data-testid="ocupacao-geral">{ocupacao}%</div>
          <div className="mt-12 flex h-8 w-full gap-4" role="img" aria-label="Distribuição das vagas por status">
            {ORDEM_STATUS.filter((s) => contagem[s] > 0).map((s) => (
              <div key={s} title={`${STATUS[s].nome}: ${contagem[s]}`} className="h-8 rounded-[4px] transition-[flex-grow] duration-500" style={{ flexGrow: contagem[s], flexBasis: 0, background: STATUS[s].cor, minWidth: 4 }} />
            ))}
          </div>
        </Cartao>

        <div className="grid grid-cols-2 gap-8">
          {PRINCIPAIS.map((s) => (
            <Cartao key={s} className="flex h-72 flex-col justify-center gap-4 px-16">
              <span className="flex items-center gap-8 whitespace-nowrap text-[13px] leading-20 text-text-2"><Ponto cor={STATUS[s].cor} />{STATUS[s].nome}</span>
              <span className="tnum text-[22px] font-bold leading-28 text-text" data-testid={`status-${s}`}>{numero(contagem[s])}</span>
            </Cartao>
          ))}
        </div>
        <div className="flex flex-wrap gap-8">
          {OUTROS.map((s) => (
            <span key={s} title={STATUS[s].nome} className="inline-flex h-28 items-center gap-8 whitespace-nowrap rounded-[14px] bg-card px-8 text-[12px] leading-16 text-text-2 shadow-card">
              <Ponto cor={STATUS[s].cor} />{STATUS[s].curto}<b className="tnum font-semibold text-text">{contagem[s]}</b>
            </span>
          ))}
        </div>

        <h3 className="mt-12 text-[14px] font-semibold leading-20 text-text">Setores</h3>
        {SETORES_VAGAS.map((id) => {
          const c = porSetor[id];
          const ativo = selecao?.tipo === "setor" && selecao.id === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { useUi.getState().selecionar({ tipo: "setor", id }); useUi.getState().focar({ tipo: "setor", id }); }}
              className={cx("w-full rounded-[16px] bg-card px-16 py-12 text-left shadow-card transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-accent", ativo && "ring-2 ring-accent")}
            >
              <span className="flex items-center justify-between">
                <span className="text-[14px] font-semibold leading-20 text-text">{NOMES_SETOR[id]}</span>
                <span className="tnum text-[13px] font-semibold leading-20 text-text">{c.emUso}/{c.total}</span>
              </span>
              <span className="mt-8 block"><Barra valor={pct(c.emUso, c.total)} /></span>
            </button>
          );
        })}
        <div className="w-full rounded-[16px] bg-card px-16 py-12 opacity-70 shadow-card" title="O PDF mostra a grade de contêineres, sem vagas de caminhão marcadas">
          <span className="flex items-center justify-between text-[14px] font-semibold leading-20 text-text">
            {NOMES_SETOR.CTN}<span className="text-[12px] font-medium text-text-3">sem vagas no PDF</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPendencias((v) => !v)}
          aria-expanded={pendencias}
          className="mt-12 flex h-40 w-full items-center justify-between rounded-[12px] px-12 text-[13px] font-semibold leading-20 text-text-2 hover:bg-chip"
        >
          <span className="flex items-center gap-8"><TriangleAlert size={16} className="text-st-saida" />Pendências do projeto · {PENDENCIAS.length}</span>
          <ChevronDown size={16} className={cx("transition-transform", pendencias && "rotate-180")} />
        </button>
        {pendencias && (
          <ul className="flex flex-col gap-8 px-12 pb-4">
            {PENDENCIAS.map((p) => <li key={p.id} className="text-[12px] leading-16 text-text-2">{p.texto}</li>)}
          </ul>
        )}
      </AreaRolagem>}
    </Painel>
  );
}
