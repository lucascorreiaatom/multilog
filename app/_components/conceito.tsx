"use client";
// Qual mapa está na tela: os painéis são os mesmos nos dois conceitos e só escondem o que não existe no mapa plano
// (girar, cobertura das câmeras, Modo foco e Modo TV).
import { createContext, useContext } from "react";

export type TipoMapa = "3d" | "plano";

const Ctx = createContext<TipoMapa>("3d");

export const MapaProvider = Ctx.Provider;
export const useTipoMapa = () => useContext(Ctx);
