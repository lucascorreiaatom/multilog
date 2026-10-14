"use client";
// Busca global (Cmd+K ou "/"): placas, vagas, câmeras (número, código, modelo, local), gates, setores e prédios.
// Fica no cabeçalho como ícone; ao abrir, o pill cresce para a direita e vira o campo, com os resultados logo abaixo.
import { Command } from "cmdk";
import { Building2, DoorOpen, LayoutGrid, Search, SquareParking, Truck, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cameraCombina, normalizar } from "@/lib/cameras/busca";
import { todasCameras } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { STATUS } from "@/lib/patio/tipos";
import { NOMES_SETOR, planta, SETORES_VAGAS } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { cx, useRolagem } from "./ui";

const grupo = "px-8 pt-12 pb-4 text-[12px] font-semibold leading-16 text-text-2 [&_[cmdk-group-heading]]:px-8 [&_[cmdk-group-heading]]:pb-4";

const item = "flex h-40 cursor-pointer items-center gap-12 rounded-[10px] px-8 text-[13px] leading-20 text-text data-[selected=true]:bg-chip";

export function Busca() {
  const aberta = useUi((s) => s.busca);
  const [q, setQ] = useState("");
  const rolagem = useRolagem<HTMLDivElement>();
  const vagas = usePatio((s) => s.vagas);
  const ocupantes = usePatio((s) => s.ocupantes);
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !digitando)) { e.preventDefault(); useUi.getState().setBusca(true); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const placas = useMemo(() => {
    const out: { placa: string; vagaId: string; status: keyof typeof STATUS }[] = [];
    for (const [vagaId, e] of Object.entries(vagas)) {
      const oc = e.ocupanteId ? ocupantes[e.ocupanteId] : undefined;
      if (oc) out.push({ placa: oc.veiculo.placa, vagaId, status: e.status });
    }
    return out;
  }, [vagas, ocupantes]);

  const termo = normalizar(q.trim());
  const limite = termo.length < 2 ? 0 : 8;
  const fechar = () => { useUi.getState().setBusca(false); setQ(""); campo.current?.blur(); };
  const ir = (fn: () => void) => { fn(); fechar(); };

  // ao abrir (clique, "/" ou Cmd+K) o foco vai para o campo; clique fora fecha
  useEffect(() => {
    if (!aberta) return;
    campo.current?.focus();
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) fechar(); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberta]);

  return (
    <div ref={raiz} className="relative h-40">
      <Command shouldFilter={false} label="Buscar no pátio" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); fechar(); } }}>
        <div className={cx("vidro flex h-40 items-center overflow-hidden rounded-full shadow-card transition-[width,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] max-md:transition-none",
          aberta ? "w-[360px] max-md:w-[calc(100vw-32px)] bg-card" : "w-40 bg-card hover:bg-card-muted")}>
          <button type="button" aria-label="Buscar placa, vaga, câmera ou prédio" title="Buscar ( / )" aria-expanded={aberta}
            onClick={() => (aberta ? campo.current?.focus() : useUi.getState().setBusca(true))}
            className="flex size-40 shrink-0 items-center justify-center rounded-full text-text">
            <Search size={18} />
          </button>
          <Command.Input ref={campo} value={q} onValueChange={setQ} tabIndex={aberta ? 0 : -1} aria-hidden={!aberta}
            placeholder="Placa, vaga, câmera, gate, setor ou prédio"
            className={cx("h-40 min-w-0 flex-1 bg-transparent pr-16 text-[14px] leading-20 text-text outline-none placeholder:text-text-3 transition-opacity duration-200",
              aberta ? "opacity-100 delay-100" : "pointer-events-none opacity-0")} />
        </div>
        {aberta && q.length > 0 && (
          // fundo fora da lista: o esmaecimento da rolagem (máscara) não pode deixar o painel transparente
          <div className="animar-entrada absolute top-48 left-0 z-50 w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[20px] bg-panel shadow-float vidro">
            <Command.List ref={rolagem} className="rolagem max-h-[420px] overflow-y-auto px-8 pb-8">
              <Command.Empty className="px-8 py-16 text-[13px] leading-20 text-text-3">{termo.length < 2 ? "Digite ao menos 2 caracteres" : "Nada encontrado"}</Command.Empty>
              {limite > 0 && (
                <>
                  <Command.Group heading="Placas" className={grupo}>
                    {placas.filter((p) => p.placa.includes(termo)).slice(0, limite).map((p) => (
                      <Command.Item key={p.placa + p.vagaId} value={`placa-${p.placa}`} className={item} onSelect={() => ir(() => { useUi.getState().selecionar({ tipo: "vaga", id: p.vagaId }); useUi.getState().focar({ tipo: "vaga", id: p.vagaId }); })}>
                        <Truck size={16} /><span className="tnum font-semibold">{p.placa}</span><span className="text-text-2">{p.vagaId} · {STATUS[p.status].nome}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Vagas" className={grupo}>
                    {planta.vagas.filter((v) => v.id.includes(termo)).slice(0, limite).map((v) => (
                      <Command.Item key={v.id} value={`vaga-${v.id}`} className={item} onSelect={() => ir(() => { useUi.getState().selecionar({ tipo: "vaga", id: v.id }); useUi.getState().focar({ tipo: "vaga", id: v.id }); })}>
                        <SquareParking size={16} /><span className="font-semibold">{v.id}</span><span className="text-text-2">{NOMES_SETOR[v.setor]} · {STATUS[vagas[v.id]?.status ?? "livre"].nome}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Prédios" className={grupo}>
                    {planta.predios.filter((b) => normalizar(b.nome).includes(termo)).map((b) => (
                      <Command.Item key={b.id} value={`predio-${b.id}`} className={item} onSelect={() => ir(() => { useUi.getState().selecionar({ tipo: "predio", id: b.id }); useUi.getState().focar({ tipo: "predio", id: b.id }); })}>
                        <Building2 size={16} /><span className="font-semibold">{b.nome}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Câmeras" className={grupo}>
                    {todasCameras.filter((c) => cameraCombina(c, termo)).slice(0, limite).map((c) => (
                      <Command.Item key={c.numero} value={`cam-${c.numero}`} className={item} onSelect={() => ir(() => { useUi.getState().exibirCamera(c.numero); if (c.tipo === "externa") useUi.getState().focar({ tipo: "camera", numero: c.numero }); })}>
                        <Video size={16} /><span className="tnum font-semibold">{c.codigo}</span><span className="truncate text-text-2">{c.local} · {MODELOS[c.modelo].nome}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Gates e setores" className={grupo}>
                    {planta.pistasGate.filter((g) => `GATE ${g.numero}`.includes(termo)).map((g) => (
                      <Command.Item key={g.id} value={g.id} className={item} onSelect={() => ir(() => { useUi.getState().selecionar({ tipo: "gate", numero: g.numero }); useUi.getState().focar({ tipo: "gate", numero: g.numero }); })}>
                        <DoorOpen size={16} /><span className="font-semibold">Gate {g.numero}</span>
                      </Command.Item>
                    ))}
                    {SETORES_VAGAS.filter((s) => normalizar(NOMES_SETOR[s]).includes(termo)).map((s) => (
                      <Command.Item key={s} value={`setor-${s}`} className={item} onSelect={() => ir(() => { useUi.getState().selecionar({ tipo: "setor", id: s }); useUi.getState().focar({ tipo: "setor", id: s }); })}>
                        <LayoutGrid size={16} /><span className="font-semibold">{NOMES_SETOR[s]}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </div>
        )}
      </Command>
    </div>
  );
}
