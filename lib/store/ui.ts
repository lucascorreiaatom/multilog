"use client";
// Estado da interface: seleção, câmera em exibição, camadas e modo de exibição.
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { StatusVaga } from "../patio/tipos";
import type { SetorVagas } from "../site";

export type Selecao =
  | { tipo: "vaga"; id: string }
  | { tipo: "camera"; numero: number }
  | { tipo: "gate"; numero: number }
  | { tipo: "predio"; id: string }
  | { tipo: "setor"; id: SetorVagas }
  | null;

export type AlvoCamera3D =
  | { tipo: "home" }
  | { tipo: "setor"; id: SetorVagas }
  | { tipo: "vaga"; id: string }
  | { tipo: "camera"; numero: number }
  | { tipo: "gate"; numero: number }
  | { tipo: "gates" }
  | { tipo: "predio"; id: string }
  | { tipo: "ponto"; x: number; z: number; dist: number };

export type Bloco = "visao" | "gates" | "camera" | "controles" | "callouts" | "marcadores" | "predios";
/** abas do painel de informações (esquerda) */
export type AbaInfo = "patio" | "gates";
export type EstadoBloco = "aberto" | "recolhido" | "oculto";
const BLOCOS_PADRAO: Record<Bloco, EstadoBloco> = { visao: "aberto", gates: "aberto", camera: "aberto", controles: "aberto", callouts: "aberto", marcadores: "aberto", predios: "aberto" };

function blocosSalvos(): Record<Bloco, EstadoBloco> {
  try { return { ...BLOCOS_PADRAO, ...JSON.parse(localStorage.getItem("blocos") ?? "{}") }; } catch { return { ...BLOCOS_PADRAO }; }
}

export interface UiState {
  /** visibilidade de cada bloco da tela (aberto, recolhido no título ou oculto) */
  blocos: Record<Bloco, EstadoBloco>;
  setBloco: (b: Bloco, e: EstadoBloco) => void;
  carregarBlocos: () => void;
  selecao: Selecao;
  /** câmera exibida no card AO VIVO */
  cameraAtiva: number;
  sensor: number;
  /** controle PTZ da câmera em exibição (radianos e zoom óptico) */
  ptz: { pan: number; tilt: number; zoom: number };
  cameraAmpliada: boolean;
  cobertura: boolean;
  busca: boolean;
  modoTv: boolean;
  tour: boolean;
  tema: "claro" | "escuro";
  /** Modo foco: cena quase monocromática, só o essencial em cor */
  foco: boolean;
  /** status visíveis no mapa (vazio = todos); vagas fora do filtro ficam neutras e sem caminhão */
  filtroStatus: StatusVaga[];
  abaInfo: AbaInfo;
  setAbaInfo: (a: AbaInfo) => void;
  alternarFiltro: (s: StatusVaga) => void;
  limparFiltro: () => void;
  /** pedido de fly-to para a cena (incrementa a cada pedido) */
  alvo: { alvo: AlvoCamera3D; seq: number };
  /** pedido de giro/zoom da barra de controles */
  comando: { tipo: "zoom-in" | "zoom-out" | "girar-esq" | "girar-dir"; seq: number } | null;
  selecionar: (s: Selecao) => void;
  focar: (a: AlvoCamera3D) => void;
  comandar: (tipo: "zoom-in" | "zoom-out" | "girar-esq" | "girar-dir") => void;
  exibirCamera: (numero: number) => void;
  setSensor: (i: number) => void;
  setPtz: (p: Partial<{ pan: number; tilt: number; zoom: number }>) => void;
  setAmpliada: (v: boolean) => void;
  setCobertura: (v: boolean) => void;
  setBusca: (v: boolean) => void;
  setModoTv: (v: boolean) => void;
  setTour: (v: boolean) => void;
  setTema: (t: "claro" | "escuro") => void;
  setFoco: (v: boolean) => void;
}

/** o painel Pátio/Gates foi recolhido pela câmera ampliada (e não pelo usuário) */
let painelRecolhidoPelaCamera = false;

export const useUi = create<UiState>()(
  subscribeWithSelector((set, get) => ({
    blocos: { ...BLOCOS_PADRAO },
    setBloco: (b, e) => {
      if (b === "visao") painelRecolhidoPelaCamera = false; // o usuário assumiu o painel
      const blocos = { ...get().blocos, [b]: e };
      const salvar = painelRecolhidoPelaCamera ? { ...blocos, visao: "aberto" } : blocos;
      try { localStorage.setItem("blocos", JSON.stringify(salvar)); } catch {}
      set({ blocos });
    },
    carregarBlocos: () => set({ blocos: blocosSalvos() }),
    selecao: null,
    cameraAtiva: 5,
    sensor: 0,
    ptz: { pan: 0, tilt: 0, zoom: 1 },
    cameraAmpliada: false,
    cobertura: false,
    busca: false,
    modoTv: false,
    tour: false,
    tema: "claro",
    foco: false,
    filtroStatus: [],
    abaInfo: "patio",
    setAbaInfo: (abaInfo) => set({ abaInfo }),
    alternarFiltro: (s) => {
      const f = get().filtroStatus;
      set({ filtroStatus: f.includes(s) ? f.filter((x) => x !== s) : [...f, s] });
    },
    limparFiltro: () => set({ filtroStatus: [] }),
    alvo: { alvo: { tipo: "home" }, seq: 0 },
    comando: null,
    selecionar: (selecao) => set({ selecao }),
    focar: (alvo) => set({ alvo: { alvo, seq: get().alvo.seq + 1 } }),
    comandar: (tipo) => set({ comando: { tipo, seq: (get().comando?.seq ?? 0) + 1 } }),
    exibirCamera: (numero) => {
      // escolher uma câmera reabre o card se ele estiver fechado
      if (get().blocos.camera !== "aberto") get().setBloco("camera", "aberto");
      set({ cameraAtiva: numero, sensor: 0, ptz: { pan: 0, tilt: 0, zoom: 1 } });
    },
    setSensor: (sensor) => set({ sensor }),
    setPtz: (p) => set({ ptz: { ...get().ptz, ...p } }),
    setAmpliada: (cameraAmpliada) => {
      // ampliar recolhe o painel Pátio/Gates para dar espaço ao vídeo; reduzir devolve como estava.
      // Não grava em localStorage: é um estado temporário, não uma escolha do usuário.
      const { blocos } = get();
      if (cameraAmpliada && blocos.visao === "aberto") {
        painelRecolhidoPelaCamera = true;
        set({ cameraAmpliada, blocos: { ...blocos, visao: "recolhido" } });
      } else if (!cameraAmpliada && painelRecolhidoPelaCamera) {
        painelRecolhidoPelaCamera = false;
        set({ cameraAmpliada, blocos: blocos.visao === "recolhido" ? { ...blocos, visao: "aberto" } : blocos });
      } else set({ cameraAmpliada });
    },
    setCobertura: (cobertura) => set({ cobertura }),
    setBusca: (busca) => set({ busca }),
    setModoTv: (modoTv) => set({ modoTv }),
    setTour: (tour) => set({ tour }),
    setFoco: (foco) => {
      try { localStorage.setItem("foco", foco ? "1" : "0"); } catch {}
      set({ foco });
    },
    setTema: (tema) => {
      try { localStorage.setItem("tema", tema); } catch {}
      document.documentElement.dataset.theme = tema === "escuro" ? "dark" : "light";
      set({ tema });
    },
  })),
);
