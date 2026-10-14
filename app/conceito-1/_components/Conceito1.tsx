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
import { Cabecalho } from "./Cabecalho";
import { CardCamera } from "./CardCamera";
import { CartaoDetalhe } from "./CartaoDetalhe";
import { ControlesMapa } from "./ControlesMapa";
import { SessaoProvider } from "./sessao";
import { Sobreposicoes } from "./Sobreposicoes";
import { PainelInfo } from "./PainelInfo";
import { cx } from "./ui";

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

        <Cabecalho className="absolute top-16 right-16 left-16 z-30" usuario={{ nome: sessao.nome, perfil: NOME_PERFIL[sessao.perfil] }} />

        <button
          type="button"
          onClick={() => setPainelAberto((v) => !(v ?? window.innerWidth >= 1280))}
          aria-label={painelAberto ? "Recolher painel" : "Abrir painel"}
          className="absolute top-28 left-16 z-20 flex size-40 items-center justify-center vidro rounded-full bg-panel text-text shadow-clay xl:hidden"
        >
          <PanelLeft size={18} />
        </button>

        {blocos.visao !== "oculto" && <PainelInfo
          className={cx(
            "absolute top-16 left-16 z-10",
            blocos.visao === "aberto" && "bottom-16",
            " w-[344px] transition-transform duration-300 max-xl:top-80",
            painelAberto !== true && "max-xl:-translate-x-[376px]",
            painelAberto === false && "xl:-translate-x-[376px]",
          )}
        />}

        {detalhe && (
          <div className="absolute top-96 right-16 bottom-16 z-10 w-[344px] max-lg:hidden">
            <CartaoDetalhe className="h-full" />
          </div>
        )}
        {detalhe && <CartaoDetalhe className="absolute right-16 bottom-16 left-16 z-20 max-h-[60vh] lg:hidden" />}

        <ControlesMapa
          className={cx(
            "absolute bottom-16 z-10",
            detalhe ? "right-[376px] max-lg:hidden" : "right-16",
            // some quando o card da câmera passaria por cima (larguras em que card + controles + detalhe não cabem lado a lado)
            blocos.camera !== "oculto" && (ampliada ? (detalhe ? "max-[1880px]:hidden" : "max-[1160px]:hidden") : detalhe && "max-[1600px]:hidden"),
          )}
        />

        {/* faixa livre entre o painel da esquerda e o detalhe da direita; o card centraliza nela e encolhe se faltar
            espaço, então nunca passa por baixo das colunas laterais */}
        {blocos.camera !== "oculto" && (
          <div
            className={cx(
              "pointer-events-none absolute bottom-16 z-10 flex justify-center *:pointer-events-auto",
              // à direita também desvia da coluna de controles do mapa (64 px) quando ela está visível
              detalhe ? "right-[376px] max-lg:hidden min-[1600px]:right-[456px]" : ampliada ? "right-16" : "right-96",
              ampliada && !detalhe ? "left-16"
                : detalhe ? (blocos.visao === "oculto" || painelAberto === false ? "left-16" : "left-16 xl:left-[376px]")
                // sem detalhe, as margens são sempre simétricas para o card ficar centralizado na tela; entre xl e 1440 px,
                // com o painel aberto, os dois lados recuam 376 px e o card encolhe em vez de passar por baixo do painel
                : blocos.visao === "oculto" || painelAberto === false ? "left-96"
                : "left-96 xl:left-[376px] xl:right-[376px] min-[1440px]:left-96 min-[1440px]:right-96",
            )}
          >
            <CardCamera />
          </div>
        )}

        {/* atribuição obrigatória do caminhão 3D (CC-BY 4.0); créditos completos em public/modelos/CREDITOS.txt */}
        <p className="pointer-events-auto absolute right-16 bottom-2 z-10 text-[10px] leading-12 text-text-2">
          Caminhão 3D: Scania por animara777, carreta por matthew13482 (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">CC-BY 4.0</a>, Sketchfab)
        </p>

        <form method="post" action="/api/auth/sair" className="absolute top-[-200px] right-16 focus-within:top-80">
          <button type="submit" className="flex h-40 items-center gap-8 vidro rounded-full bg-panel px-12 text-[13px] leading-20 text-text shadow-clay"><LogOut size={16} />Sair</button>
        </form>

      </div>
    </SessaoProvider>
  );
}
