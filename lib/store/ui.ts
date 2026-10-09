"use client";
// Estado da interface: seleção, câmera em exibição, camadas e modo de exibição.
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
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
  | { tipo: "predio"; id: string }
  | { tipo: "ponto"; x: number; z: number; dist: number };

export type Bloco = "visao" | "gates" | "camera" | "controles" | "callouts" | "marcadores";
export type EstadoBloco = "aberto" | "recolhido" | "oculto";
const BLOCOS_PADRAO: Record<Bloco, EstadoBloco> = { visao: "aberto", gates: "aberto", camera: "aberto", controles: "aberto", callouts: "aberto", marcadores: "aberto" };

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

export const useUi = create<UiState>()(
  subscribeWithSelector((set, get) => ({
    blocos: { ...BLOCOS_PADRAO },
    setBloco: (b, e) => {
      const blocos = { ...get().blocos, [b]: e };
      try { localStorage.setItem("blocos", JSON.stringify(blocos)); } catch {}
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
    alvo: { alvo: { tipo: "home" }, seq: 0 },
    comando: null,
    selecionar: (selecao) => set({ selecao }),
    focar: (alvo) => set({ alvo: { alvo, seq: get().alvo.seq + 1 } }),
    comandar: (tipo) => set({ comando: { tipo, seq: (get().comando?.seq ?? 0) + 1 } }),
    exibirCamera: (numero) => set({ cameraAtiva: numero, sensor: 0, ptz: { pan: 0, tilt: 0, zoom: 1 } }),
    setSensor: (sensor) => set({ sensor }),
    setPtz: (p) => set({ ptz: { ...get().ptz, ...p } }),
    setAmpliada: (cameraAmpliada) => set({ cameraAmpliada }),
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
