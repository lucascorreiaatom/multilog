"use client";
// Aba "Gates" do painel de informações: gates com sentido e operação (SoW) e câmeras dos gates.
// Os eventos recentes ficam no sino do cabeçalho (Atividade), à vista em qualquer aba.
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { camerasGates } from "@/lib/cameras/catalogo";
import { ListaCameras } from "./ListaCameras";
import { AreaRolagem, cx } from "./ui";

const SENTIDO = { entrada: "Entrada", saida: "Saída", reversivel: "Reversível" } as const;
const OPERACAO = { importacao: "Importação", exportacao: "Exportação" } as const;

export function ConteudoGates() {
  const gates = usePatio((s) => s.gates);
  const selecao = useUi((s) => s.selecao);
  return (
    <AreaRolagem className="flex min-h-0 flex-1 flex-col px-16 pb-16">
      <ul className="flex flex-col gap-12">
        {gates.map((g) => {
          const Icone = g.sentido === "entrada" ? ArrowDown : g.sentido === "saida" ? ArrowUp : ArrowDownUp;
          const ativo = selecao?.tipo === "gate" && selecao.numero === g.numero;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => { useUi.getState().selecionar({ tipo: "gate", numero: g.numero }); useUi.getState().focar({ tipo: "gate", numero: g.numero }); }}
                className={cx("flex h-48 w-full items-center gap-12 rounded-[16px] px-12 text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-accent", ativo ? "bg-card-muted realce-acento" : "bg-card")}
              >
                <span className="flex size-32 shrink-0 items-center justify-center rounded-[10px] bg-chip text-text"><Icone size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-20 text-text">Gate {g.numero}</span>
                  <span className="block truncate text-[12px] leading-16 text-text-2">{SENTIDO[g.sentido]} · {OPERACAO[g.operacao]}</span>
                </span>
                <span className={cx("inline-flex h-28 items-center rounded-[14px] px-12 text-[12px] font-semibold leading-16", g.aberto ? "bg-[color-mix(in_srgb,var(--st-livre)_16%,transparent)] text-st-livre" : "bg-chip text-text-2")}>
                  {g.aberto ? "Aberto" : "Fechado"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {/* filas dos gates: requisito destacado pelo cliente; aberta nesta aba e logo abaixo dos gates, à vista sem rolar.
          Não vai para o rodapé fixo: aberta, ela espremeria a lista de gates */}
      <div className="mt-16"><ListaCameras titulo="Câmeras dos gates" grupos={camerasGates} abertaInicial /></div>
    </AreaRolagem>
  );
}
