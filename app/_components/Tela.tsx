"use client";
// Tela comum aos conceitos: cabeçalho, painel Pátio/Gates, cartão de detalhe, controles do mapa e card AO VIVO.
// Cada conceito entrega só o mapa (3D ou plano) e o vídeo da câmera; o resto é idêntico, para o cliente comparar
// as duas formas de ver o pátio sem outras diferenças. Layout desktop em grid de 4 px (base 1440 x 900); tablet com
// painéis recolhíveis.
//
// data-ocupa marca o que cobre o mapa (esq, dir, base): o mapa plano desconta essas faixas ao enquadrar um alvo.
import { LogOut, PanelLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NOME_PERFIL, type Sessao } from "@/lib/auth/permissoes";
import { modoGraficoInicial } from "@/lib/grafico";
import { SimulatedSource } from "@/lib/patio/simulador";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { Cabecalho } from "./Cabecalho";
import { CardCamera, type VideoCamera } from "./CardCamera";
import { CartaoDetalhe } from "./CartaoDetalhe";
import { MapaProvider, type TipoMapa } from "./conceito";
import { ControlesMapa } from "./ControlesMapa";
import { PainelInfo } from "./PainelInfo";
import { SessaoProvider } from "./sessao";
import { cx } from "./ui";

export function Tela({ sessao, tipo, mapa, Video, rodape, testId }: {
  sessao: Sessao;
  tipo: TipoMapa;
  /** mapa e o que é desenhado sobre ele (marcadores, rótulos) */
  mapa: ReactNode;
  Video?: VideoCamera;
  rodape?: ReactNode;
  testId: string;
}) {
  const selecao = useUi((s) => s.selecao);
  const ampliada = useUi((s) => s.cameraAmpliada);
  const modoTv = useUi((s) => s.modoTv);
  const blocos = useUi((s) => s.blocos);
  // Modo foco tira os painéis da frente do mapa (3D e plano): fica o cabeçalho e, ao clicar numa vaga, o detalhe
  const foco = useUi((s) => s.foco);
  const cameraNoFoco = useUi((s) => s.cameraNoFoco);
  /** null: padrão por largura (aberto no desktop, recolhido no tablet via CSS) */
  const [painelAberto, setPainelAberto] = useState<boolean | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tema = document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
    // Modo foco vale nos dois conceitos; Modo TV só existe no 3D
    let foco = p.get("visual") === "foco";
    try { foco = foco || localStorage.getItem("foco") === "1"; } catch {}
    useUi.setState({ tema, foco, modoTv: tipo === "3d" && p.get("modo") === "tv", selecao: null });
    useUi.getState().carregarBlocos();
    // superfícies opacas e sem desfoque no mapa plano (inclusive popovers, que ficam fora desta árvore)
    document.documentElement.classList.toggle("plano", tipo === "plano");
    // modo gráfico só pesa no 3D; sem salvar, para o padrão (desempenho) não virar escolha do usuário
    const grafico = tipo === "3d" ? modoGraficoInicial() : "alta";
    document.documentElement.classList.toggle("desempenho", grafico === "desempenho");
    useUi.setState({ grafico });
    const fixture = p.get("fixture");
    const parar = usePatio.getState().iniciar(new SimulatedSource({ congelado: fixture !== null }));
    return () => { parar(); document.documentElement.classList.remove("plano", "desempenho"); };
  }, [tipo]);

  const detalhe = !!selecao && selecao.tipo !== "setor" && selecao.tipo !== "camera";

  return (
    <SessaoProvider sessao={sessao}>
      <MapaProvider value={tipo}>
        <div className={cx("relative h-full w-full overflow-hidden bg-bg", modoTv && "modo-tv")} data-testid={testId}>
          {mapa}

          <Cabecalho className="absolute top-16 right-16 left-16 z-30" usuario={{ nome: sessao.nome, perfil: NOME_PERFIL[sessao.perfil] }} />

          {!foco && <button
            type="button"
            onClick={() => setPainelAberto((v) => !(v ?? window.innerWidth >= 1280))}
            aria-label={painelAberto ? "Recolher painel" : "Abrir painel"}
            className="absolute top-28 left-16 z-20 flex size-40 items-center justify-center vidro rounded-full bg-panel text-text shadow-clay xl:hidden"
          >
            <PanelLeft size={18} />
          </button>}

          {!foco && blocos.visao !== "oculto" && <PainelInfo
            data-ocupa="esq"
            className={cx(
              "absolute top-16 left-16 z-10",
              blocos.visao === "aberto" && "bottom-16",
              " w-[344px] transition-transform duration-300 max-xl:top-80",
              painelAberto !== true && "max-xl:-translate-x-[376px]",
              painelAberto === false && "xl:-translate-x-[376px]",
            )}
          />}

          {detalhe && (
            <div data-ocupa="dir" className="absolute top-96 right-16 bottom-16 z-10 w-[344px] max-lg:hidden">
              <CartaoDetalhe className="h-full" />
            </div>
          )}
          {detalhe && <CartaoDetalhe className="absolute right-16 bottom-16 left-16 z-20 max-h-[60vh] lg:hidden" />}

          {!foco && <ControlesMapa
            className={cx(
              "absolute bottom-16 z-10",
              detalhe ? "right-[376px] max-lg:hidden" : "right-16",
              // some quando o card da câmera passaria por cima (larguras em que card + controles + detalhe não cabem lado a lado)
              blocos.camera !== "oculto" && (ampliada ? (detalhe ? "max-[1880px]:hidden" : "max-[1160px]:hidden") : detalhe && "max-[1600px]:hidden"),
            )}
          />}

          {/* faixa livre entre o painel da esquerda e o detalhe da direita; o card centraliza nela e encolhe se faltar
              espaço, então nunca passa por baixo das colunas laterais */}
          {(!foco || cameraNoFoco) && blocos.camera !== "oculto" && (
            <div
              data-ocupa="base"
              className={cx(
                "pointer-events-none absolute bottom-16 z-10 flex justify-center *:pointer-events-auto",
                // à direita também desvia da coluna de controles do mapa (64 px) quando ela está visível
                detalhe ? cx("right-[376px] max-lg:hidden", !foco && "min-[1600px]:right-[456px]") : ampliada ? "right-16" : "right-96",
                ampliada && !detalhe ? "left-16"
                  : detalhe ? (foco || blocos.visao === "oculto" || painelAberto === false ? "left-16" : "left-16 xl:left-[376px]")
                  // sem detalhe, as margens são sempre simétricas para o card ficar centralizado na tela; entre xl e 1440 px,
                  // com o painel aberto, os dois lados recuam 376 px e o card encolhe em vez de passar por baixo do painel
                  : foco || blocos.visao === "oculto" || painelAberto === false ? "left-96"
                  : "left-96 xl:left-[376px] xl:right-[376px] min-[1440px]:left-96 min-[1440px]:right-96",
              )}
            >
              <CardCamera Video={Video} />
            </div>
          )}

          {rodape}

          <form method="post" action="/api/auth/sair" className="absolute top-[-200px] right-16 focus-within:top-80">
            <button type="submit" className="flex h-40 items-center gap-8 vidro rounded-full bg-panel px-12 text-[13px] leading-20 text-text shadow-clay"><LogOut size={16} />Sair</button>
          </form>
        </div>
      </MapaProvider>
    </SessaoProvider>
  );
}
