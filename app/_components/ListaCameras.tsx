"use client";
// Lista de câmeras dentro das abas Pátio e Gates (sem aba própria): seção recolhível com busca, agrupada por local.
// Com `fixa`, vira o rodapé do painel (fora da rolagem): sempre à vista e abre para cima com rolagem própria.
// Achar uma câmera não depende de saber onde ela fica no mapa; ao escolher, o card AO VIVO abre e, se a câmera tem
// posição, o mapa vai até ela.
import { ChevronDown, Search, Video, VideoOff } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cameraCombina, normalizar } from "@/lib/cameras/busca";
import type { Camera } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { AreaRolagem, ROTULO, cx, linhaLista } from "./ui";

function abrirCamera(c: Camera) {
  const ui = useUi.getState();
  ui.exibirCamera(c.numero);
  if (c.tipo === "externa") { ui.selecionar({ tipo: "camera", numero: c.numero }); ui.focar({ tipo: "camera", numero: c.numero }); }
}

export function ListaCameras({ titulo, grupos, abertaInicial = false, fixa = false }: {
  titulo: string;
  /** rodapé fixo do painel em vez de seção dentro da rolagem */
  fixa?: boolean;
  /** câmeras já na ordem de exibição, por grupo (ex.: setor, ou fila dos gates antes das demais) */
  grupos: { nome: string; cameras: Camera[] }[];
  abertaInicial?: boolean;
}) {
  const [aberta, setAberta] = useState(abertaInicial);
  const [q, setQ] = useState("");
  const id = useId();
  const ativa = useUi((s) => (s.blocos.camera === "oculto" ? null : s.cameraAtiva));
  const offline = usePatio((s) => s.camerasOffline);
  const total = grupos.reduce((n, g) => n + g.cameras.length, 0);
  const termo = normalizar(q.trim());
  const visiveis = useMemo(() => grupos.map((g) => ({ ...g, cameras: g.cameras.filter((c) => cameraCombina(c, termo)) })).filter((g) => g.cameras.length), [grupos, termo]);
  const achadas = visiveis.reduce((n, g) => n + g.cameras.length, 0);

  return (
    <section className={cx("flex flex-col", fixa && "min-h-0 shrink-0 faixa-elevada border-t border-text-3/20 bg-elevado px-20 py-16")}>
      {/* no rodapé a faixa inteira é clara (bg-elevado) e o botão não tem pílula nem hover próprios; dentro da aba, cartão
          branco com o mesmo raio dos cards vizinhos */}
      <button type="button" aria-expanded={aberta} aria-controls={id} onClick={() => setAberta(!aberta)}
        className={cx("flex h-48 items-center gap-12 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent",
          fixa ? "-mx-8 rounded-full pr-16 pl-8" : "w-full rounded-[16px] bg-card px-12 shadow-card hover:bg-card-muted")}>
        <span className="flex size-32 shrink-0 items-center justify-center rounded-full bg-chip text-text"><Video size={16} /></span>
        <span className="flex-1 text-[14px] font-semibold leading-20 text-text">{titulo} <span className="tnum font-medium text-text-2">· {total}</span></span>
        {/* no rodapé a lista abre para cima, então a seta aponta para onde ela vai; gira em vez de trocar de ícone */}
        <ChevronDown size={18} className={cx("text-text-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", aberta !== fixa && "rotate-180")} />
      </button>
      {/* abre e fecha pela altura (grid 0fr → 1fr) com fade e um deslize curto; fechada fica inerte, fora do foco */}
      <div id={id} inert={!aberta}
        className={cx("grid min-h-0 transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          aberta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0", fixa && "-mx-20")}>
        <div className={cx("flex min-h-0 flex-col gap-8 overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          !aberta && "translate-y-8", fixa && "px-20")}>
          {/* margem (não padding) acima da busca: com a faixa fechada em 0fr, padding deixaria 8 px sobrando */}
          <label className="mt-8 flex h-40 shrink-0 items-center gap-8 rounded-full bg-card px-12 shadow-card focus-within:ring-2 focus-within:ring-accent">
            <Search size={16} className="shrink-0 text-text-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, local ou modelo" aria-label={`Buscar em ${titulo.toLowerCase()}`}
              className="h-40 min-w-0 flex-1 bg-transparent text-[14px] leading-20 text-text outline-none placeholder:text-text-2" />
          </label>
          {termo && <p className="text-[13px] leading-20 text-text-2" aria-live="polite">{achadas ? `${achadas} de ${total} câmeras` : "Nenhuma câmera encontrada"}</p>}
          <Rolagem fixa={fixa}>
          {visiveis.map((g) => (
            <div key={g.nome}>
              <h4 className={cx(ROTULO, "pt-16 pb-4")}>{g.nome}</h4>
              <ul className="flex flex-col gap-4">
                {g.cameras.map((c) => {
                  const fora = offline.includes(c.numero), selecionada = ativa === c.numero;
                  return (
                    <li key={c.numero}>
                      <button type="button" onClick={() => abrirCamera(c)} aria-current={selecionada || undefined}
                        className={cx(linhaLista(selecionada), "flex min-h-48 items-center gap-12 py-4")}>
                        <span className={cx("flex size-32 shrink-0 items-center justify-center rounded-full", fora ? "bg-[color-mix(in_srgb,var(--st-ocupada)_14%,transparent)] text-st-ocupada" : "bg-chip text-text")}>
                          {fora ? <VideoOff size={16} /> : <Video size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-8">
                            <span className="tnum text-[14px] font-semibold leading-20 text-text">{c.codigo}</span>
                            {fora && <span className="text-[12px] font-semibold leading-16 text-st-ocupada">Sem sinal</span>}
                          </span>
                          <span className="block truncate text-[13px] leading-20 text-text-2">{c.local.startsWith(`${g.nome} · `) ? c.local.slice(g.nome.length + 3) : c.local} · {MODELOS[c.modelo].nome.replace("AXIS ", "")}{MODELOS[c.modelo].sensores > 1 ? ` · ${MODELOS[c.modelo].sensores} visões` : ""}</span>
                          {c.tipo === "externa" && c.aproximada && <span className="block text-[12px] leading-16 text-text-2">Posição aproximada</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          </Rolagem>
        </div>
      </div>
    </section>
  );
}

/** no rodapé, os grupos rolam numa área própria de altura limitada; dentro da aba, seguem a rolagem dela */
function Rolagem({ fixa, children }: { fixa: boolean; children: React.ReactNode }) {
  if (!fixa) return <>{children}</>;
  // -mx-12 px-12: a rolagem corta no próprio limite, então ela abre 12 px de cada lado para o fundo da seleção sangrar
  return <AreaRolagem className="-mx-12 max-h-[40vh] min-h-0 px-12 pb-4">{children}</AreaRolagem>;
}
