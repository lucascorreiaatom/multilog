"use client";
// Tela única do pátio: cabeçalho, painel Pátio/Gates, cartão de detalhe, controles do mapa (com o seletor 2D/3D) e
// card AO VIVO. Só o mapa muda entre 3D e plano; o resto é idêntico. Layout desktop em grid de 4 px (base 1440 x 900);
// tablet com painéis recolhíveis.
//
// data-ocupa marca o que cobre o mapa (esq, dir, base): o mapa plano desconta essas faixas ao enquadrar um alvo.
import { PanelLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NOME_PERFIL, type Sessao } from "@/lib/auth/permissoes";
import { modoGraficoInicial } from "@/lib/grafico";
import { SimulatedSource } from "@/lib/patio/simulador";
import { usePatio } from "@/lib/store/patio";
import { useUi, type TipoMapa } from "@/lib/store/ui";
import { Cabecalho } from "./Cabecalho";
import { CardCamera, type VideoCamera } from "./CardCamera";
import { CartaoDetalhe } from "./CartaoDetalhe";
import { ControlesMapa } from "./ControlesMapa";
import { PainelInfo } from "./PainelInfo";
import { SessaoProvider } from "./sessao";
import { cx } from "./ui";

/** mapa pedido no endereço (?modo=2d, 3d ou tv), senão a última escolha; o padrão é o 3D */
function mapaInicial(p: URLSearchParams): TipoMapa {
  const modo = p.get("modo");
  if (modo === "2d") return "plano";
  if (modo === "3d" || modo === "tv") return "3d";
  try { if (localStorage.getItem("mapa") === "plano") return "plano"; } catch {}
  return "3d";
}

export function Tela({ sessao, mapa, video, rodape }: {
  sessao: Sessao;
  /** cada mapa e o que é desenhado sobre ele (marcadores, rótulos) */
  mapa: Record<TipoMapa, ReactNode>;
  /** vídeo do card AO VIVO por mapa; sem ele, o card mostra o aviso da integração */
  video?: Partial<Record<TipoMapa, VideoCamera>>;
  rodape?: ReactNode;
}) {
  const selecao = useUi((s) => s.selecao);
  const ampliada = useUi((s) => s.cameraAmpliada);
  const modoTv = useUi((s) => s.modoTv);
  const blocos = useUi((s) => s.blocos);
  const tipo = useUi((s) => s.mapa);
  const pronto = useUi((s) => s.mapaPronto);
  /** null: padrão por largura (aberto no desktop, recolhido no tablet via CSS) */
  const [painelAberto, setPainelAberto] = useState<boolean | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tema = document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
    const inicial = mapaInicial(p);
    // Modo TV só existe no 3D
    useUi.setState({ tema, mapa: inicial, mapaPronto: true, modoTv: inicial === "3d" && p.get("modo") === "tv", selecao: null });
    useUi.getState().carregarBlocos();
    const fixture = p.get("fixture");
    return usePatio.getState().iniciar(new SimulatedSource({ congelado: fixture !== null }));
  }, []);

  useEffect(() => {
    if (!pronto) return;
    // superfícies opacas e sem desfoque no mapa plano (inclusive popovers, que ficam fora desta árvore)
    document.documentElement.classList.toggle("plano", tipo === "plano");
    // modo gráfico só pesa no 3D; sem salvar, para o padrão (desempenho) não virar escolha do usuário
    const grafico = tipo === "3d" ? modoGraficoInicial() : "alta";
    document.documentElement.classList.toggle("desempenho", grafico === "desempenho");
    useUi.setState({ grafico });
    return () => { document.documentElement.classList.remove("plano", "desempenho"); };
  }, [tipo, pronto]);

  const detalhe = !!selecao && selecao.tipo !== "setor" && selecao.tipo !== "camera";

  return (
    <SessaoProvider sessao={sessao}>
      <div className={cx("relative h-full w-full overflow-hidden bg-bg", modoTv && "modo-tv")} data-testid="mapa" data-mapa={tipo}>
        {pronto && mapa[tipo]}

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
            data-ocupa="base"
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
            <CardCamera Video={video?.[tipo]} />
          </div>
        )}

        {rodape}
      </div>
    </SessaoProvider>
  );
}
