"use client";
// Sobreposições projetadas da cena: marcadores das câmeras externas e callouts dos setores (Imagem 1).
// O projetor da cena atualiza a posição de todos num único loop, sem re-render do React.
import { Video, VideoOff } from "lucide-react";
import { useCallback } from "react";
import * as THREE from "three";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { pct } from "@/lib/formato";
import { centroSetor, NOMES_SETOR, SETORES_VAGAS, type SetorVagas } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { registrarProjetado } from "@/scene/projetor";
import { Barra, cx } from "./ui";

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
            "vidro flex size-32 items-center justify-center rounded-[10px] shadow-float transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
            ativa ? "bg-accent text-white" : "bg-card text-text hover:bg-card-muted",
          )}
        >
          {offline ? <VideoOff size={16} className={ativa ? "" : "text-st-bloqueada"} /> : <Video size={16} />}
        </button>
        {ativa && <span className="tnum inline-flex h-24 items-center whitespace-nowrap rounded-[8px] bg-dark px-8 text-[12px] font-semibold leading-16 text-on-dark">{codigo}</span>}
      </div>
    </div>
  );
}

function Callout({ setor }: { setor: SetorVagas }) {
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
          className="vidro pointer-events-auto w-[216px] rounded-[16px] bg-card px-16 py-12 text-left shadow-float outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="flex items-center justify-between text-[14px] font-semibold leading-20 text-text">
            <span className="truncate">{NOMES_SETOR[setor]}</span>
            <span className="tnum pl-8">{valor}%</span>
          </span>
          <span className="mt-8 block"><Barra valor={valor} /></span>
          <span className="tnum mt-8 block text-[13px] leading-20 text-text-2">{c.emUso} de {c.total} vagas em uso</span>
        </button>
        <span className="h-40 w-2 bg-accent/70" />
        <span className="size-16 rounded-full border-[3px] border-white bg-accent shadow-float" />
      </div>
    </div>
  );
}

export function Sobreposicoes() {
  const ativa = useUi((s) => s.cameraAtiva);
  const offline = usePatio((s) => s.camerasOffline);
  const modoTv = useUi((s) => s.modoTv);
  const blocos = useUi((s) => s.blocos);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden={false}>
      {blocos.callouts !== "oculto" && SETORES_VAGAS.map((s) => <Callout key={s} setor={s} />)}
      {!modoTv && blocos.marcadores !== "oculto" && camerasExternas.map((c) => (
        <MarcadorCamera key={c.numero} numero={c.numero} pos={[c.posicao[0], c.altura + 2, c.posicao[1]]} ativa={ativa === c.numero} offline={offline.includes(c.numero)} />
      ))}
    </div>
  );
}
