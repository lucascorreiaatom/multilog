"use client";
// Busca global (Cmd+K ou "/"): placas, vagas, câmeras (número, código, modelo, local), gates e setores.
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { DoorOpen, LayoutGrid, Search, SquareParking, Truck, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { todasCameras } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { STATUS } from "@/lib/patio/tipos";
import { NOMES_SETOR, planta, SETORES_VAGAS } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { useRolagem } from "./ui";

const grupo = "px-8 pt-12 pb-4 text-[12px] font-semibold leading-16 text-text-3 [&_[cmdk-group-heading]]:px-8 [&_[cmdk-group-heading]]:pb-4";
const item = "flex h-40 cursor-pointer items-center gap-12 rounded-[10px] px-8 text-[13px] leading-20 text-text data-[selected=true]:bg-chip";

export function Busca() {
  const aberta = useUi((s) => s.busca);
  const [q, setQ] = useState("");
  const rolagem = useRolagem<HTMLDivElement>();
  const vagas = usePatio((s) => s.vagas);
  const ocupantes = usePatio((s) => s.ocupantes);

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

  const termo = q.trim().toUpperCase();
  const limite = termo.length < 2 ? 0 : 8;
  const fechar = () => { useUi.getState().setBusca(false); setQ(""); };
  const ir = (fn: () => void) => { fn(); fechar(); };

  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => (v ? useUi.getState().setBusca(true) : fechar())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(25_32_50/0.24)]" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-96 left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden vidro rounded-[20px] bg-panel shadow-float">
          <Dialog.Title className="sr-only">Buscar</Dialog.Title>
          <Command shouldFilter={false} label="Buscar no pátio">
            <div className="flex h-56 items-center gap-12 px-16">
              <Search size={18} className="text-text-3" />
              <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Placa, vaga (EST-B12), câmera (CAM-005 ou 5), gate, setor"
                className="h-40 flex-1 bg-transparent text-[14px] leading-20 text-text outline-none placeholder:text-text-3" />
            </div>
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
                  <Command.Group heading="Câmeras" className={grupo}>
                    {todasCameras.filter((c) => c.codigo.includes(termo) || String(c.numero) === termo.replace(/^0+/, "") || MODELOS[c.modelo].nome.toUpperCase().includes(termo) || c.local.toUpperCase().includes(termo)).slice(0, limite).map((c) => (
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
                    {SETORES_VAGAS.filter((s) => NOMES_SETOR[s].toUpperCase().includes(termo)).map((s) => (
                      <Command.Item key={s} value={`setor-${s}`} className={item} onSelect={() => ir(() => { useUi.getState().selecionar({ tipo: "setor", id: s }); useUi.getState().focar({ tipo: "setor", id: s }); })}>
                        <LayoutGrid size={16} /><span className="font-semibold">{NOMES_SETOR[s]}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
