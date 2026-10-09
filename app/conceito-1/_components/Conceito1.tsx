"use client";
// Conceito 1: painéis clay (Imagem 1) sobre o pátio 3D, com componentes do vídeo de referência.
// Layout desktop em grid de 4 px (base 1440 x 900); tablet com painéis recolhíveis; modo TV explícito.
import { LogOut, PanelLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { NOME_PERFIL, type Sessao } from "@/lib/auth/permissoes";
import { SimulatedSource } from "@/lib/patio/simulador";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { Busca } from "./Busca";
import { Cabecalho } from "./Cabecalho";
import { CardCamera } from "./CardCamera";
import { CartaoDetalhe } from "./CartaoDetalhe";
import { ControlesMapa } from "./ControlesMapa";
import { GatesEventos } from "./GatesEventos";
import { SessaoProvider } from "./sessao";
import { Sobreposicoes } from "./Sobreposicoes";
import { cx } from "./ui";
import { VisaoPatio } from "./VisaoPatio";

const YardCanvas = dynamic(() => import("@/scene/YardCanvas"), { ssr: false });

export function Conceito1({ sessao }: { sessao: Sessao }) {
  const selecao = useUi((s) => s.selecao);
  const ampliada = useUi((s) => s.cameraAmpliada);
  const modoTv = useUi((s) => s.modoTv);
  const blocos = useUi((s) => s.blocos);
  /** null: padrão por largura (aberto no desktop, recolhido no tablet via CSS) */
  const [painelAberto, setPainelAberto] = useState<boolean | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tema = document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
    let foco = p.get("visual") === "foco";
    try { foco = foco || localStorage.getItem("foco") === "1"; } catch {}
    useUi.setState({ tema, foco, modoTv: p.get("modo") === "tv" });
    useUi.getState().carregarBlocos();
    const fixture = p.get("fixture");
    return usePatio.getState().iniciar(new SimulatedSource({ congelado: fixture !== null }));
  }, []);

  const detalhe = !!selecao && selecao.tipo !== "setor" && selecao.tipo !== "camera";

  return (
    <SessaoProvider sessao={sessao}>
      <div className={cx("relative h-full w-full overflow-hidden bg-bg", modoTv && "modo-tv")} data-testid="conceito-1">
        <YardCanvas />
        <Sobreposicoes />

        <Cabecalho className="absolute top-16 right-16 left-16 z-10" usuario={{ nome: sessao.nome, perfil: NOME_PERFIL[sessao.perfil] }} />

        <button
          type="button"
          onClick={() => setPainelAberto((v) => !(v ?? window.innerWidth >= 1280))}
          aria-label={painelAberto ? "Recolher painel" : "Abrir painel"}
          className="absolute top-88 left-16 z-20 flex size-40 items-center justify-center vidro rounded-[12px] bg-panel text-text shadow-clay xl:hidden"
        >
          <PanelLeft size={18} />
        </button>

        {blocos.visao !== "oculto" && <VisaoPatio
          className={cx(
            "absolute top-88 left-16 z-10",
            blocos.visao === "aberto" && "bottom-16",
            " w-[320px] transition-transform duration-300 max-xl:top-136",
            painelAberto !== true && "max-xl:-translate-x-[352px]",
            painelAberto === false && "xl:-translate-x-[352px]",
          )}
        />}

        {(detalhe || blocos.gates !== "oculto") && (
          <div className={cx("absolute top-88 right-16 z-10 w-[344px] max-lg:hidden", detalhe ? "bottom-16" : blocos.gates === "aberto" && (blocos.controles === "oculto" ? "bottom-16" : "bottom-[376px]"))}>
            {detalhe ? <CartaoDetalhe className="h-full" /> : <GatesEventos className={blocos.gates === "aberto" ? "h-full" : ""} />}
          </div>
        )}
        {detalhe && <CartaoDetalhe className="absolute right-16 bottom-16 left-16 z-20 max-h-[60vh] lg:hidden" />}

        {blocos.controles !== "oculto" && <ControlesMapa className={cx("absolute bottom-16 z-10", detalhe ? "right-[376px] max-lg:hidden" : "right-16")} />}

        {blocos.camera !== "oculto" && <CardCamera
          className={cx(
            "absolute bottom-16 z-10",
            detalhe && "max-lg:hidden",
            ampliada ? "left-1/2 -translate-x-1/2" : blocos.visao === "oculto" ? "left-16" : "left-[360px] max-xl:left-16",
          )}
        />}

        <form method="post" action="/api/auth/sair" className="absolute top-[-200px] right-16 focus-within:top-80">
          <button type="submit" className="flex h-40 items-center gap-8 vidro rounded-[12px] bg-panel px-12 text-[13px] leading-20 text-text shadow-clay"><LogOut size={16} />Sair</button>
        </form>

        <Busca />
      </div>
    </SessaoProvider>
  );
}
