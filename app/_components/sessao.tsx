"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Sessao } from "@/lib/auth/permissoes";

const Ctx = createContext<Sessao>({ usuario: "demo", nome: "Operador Demo", perfil: "operacao" });

export function SessaoProvider({ sessao, children }: { sessao: Sessao; children: ReactNode }) {
  return <Ctx.Provider value={sessao}>{children}</Ctx.Provider>;
}

export const useSessao = () => useContext(Ctx);
