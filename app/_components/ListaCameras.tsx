"use client";
// Lista de câmeras dentro das abas Pátio e Gates (sem aba própria): seção recolhível com busca, agrupada por local.
// Achar uma câmera não depende de saber onde ela fica no mapa; ao escolher, o card AO VIVO abre e, se a câmera tem
// posição, o mapa vai até ela.
import { ChevronDown, ChevronUp, Search, Video, VideoOff } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cameraCombina, normalizar } from "@/lib/cameras/busca";
import type { Camera } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { cx } from "./ui";

function abrirCamera(c: Camera) {
  const ui = useUi.getState();
  ui.exibirCamera(c.numero);
  if (c.tipo === "externa") { ui.selecionar({ tipo: "camera", numero: c.numero }); ui.focar({ tipo: "camera", numero: c.numero }); }
}

export function ListaCameras({ titulo, grupos, abertaInicial = false }: {
  titulo: string;
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
    <section className="flex flex-col gap-8">
      <button type="button" aria-expanded={aberta} aria-controls={id} onClick={() => setAberta(!aberta)}
        className="-mx-4 flex h-40 items-center gap-8 rounded-[12px] px-4 text-left outline-none hover:bg-chip focus-visible:ring-2 focus-visible:ring-accent">
        <span className="flex-1 text-[16px] font-semibold leading-24 text-text">{titulo} <span className="tnum font-medium text-text-2">· {total}</span></span>
        {aberta ? <ChevronUp size={18} className="text-text-2" /> : <ChevronDown size={18} className="text-text-2" />}
      </button>
      {aberta && (
        <div id={id} className="flex flex-col gap-8">
          <label className="flex h-40 items-center gap-8 rounded-full bg-card px-12 shadow-card focus-within:ring-2 focus-within:ring-accent">
            <Search size={16} className="shrink-0 text-text-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, local ou modelo" aria-label={`Buscar em ${titulo.toLowerCase()}`}
              className="h-40 min-w-0 flex-1 bg-transparent text-[14px] leading-20 text-text outline-none placeholder:text-text-2" />
          </label>
          {termo && <p className="px-4 text-[13px] leading-20 text-text-2" aria-live="polite">{achadas ? `${achadas} de ${total} câmeras` : "Nenhuma câmera encontrada"}</p>}
          {visiveis.map((g) => (
            <div key={g.nome}>
              <h4 className="px-4 pt-4 pb-4 text-[13px] font-semibold leading-20 text-text-2">{g.nome}</h4>
              <ul className="flex flex-col gap-4">
                {g.cameras.map((c) => {
                  const fora = offline.includes(c.numero), selecionada = ativa === c.numero;
                  return (
                    <li key={c.numero}>
                      <button type="button" onClick={() => abrirCamera(c)} aria-current={selecionada || undefined}
                        className={cx("flex min-h-48 w-full items-center gap-12 rounded-[12px] px-12 py-4 text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          selecionada ? "bg-card-muted realce-acento" : "bg-card hover:bg-card-muted")}>
                        <span className={cx("flex size-32 shrink-0 items-center justify-center rounded-full", fora ? "bg-[color-mix(in_srgb,var(--st-ocupada)_14%,transparent)] text-st-ocupada" : "bg-chip text-text")}>
                          {fora ? <VideoOff size={16} /> : <Video size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-8">
                            <span className="tnum text-[14px] font-semibold leading-20 text-text">{c.codigo}</span>
                            {fora && <span className="text-[12px] font-semibold leading-16 text-st-ocupada">Sem sinal</span>}
                          </span>
                          <span className="block truncate text-[13px] leading-20 text-text-2">{c.local.startsWith(`${g.nome} · `) ? c.local.slice(g.nome.length + 3) : c.local} · {MODELOS[c.modelo].nome.replace("AXIS ", "")}</span>
                          {c.tipo === "externa" && c.aproximada && <span className="block text-[12px] leading-16 text-text-2">Posição aproximada</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
