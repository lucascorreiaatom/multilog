"use client";
// Relógio compartilhado (1 s) seguro para hidratação: no servidor retorna null.
import { useSyncExternalStore } from "react";

// 0 até a primeira leitura no cliente (Date.now() fora do render do servidor, exigência do Next 16)
let agora = 0;
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function assinar(fn: () => void) {
  ouvintes.add(fn);
  if (!timer) timer = setInterval(() => { agora = Date.now(); ouvintes.forEach((o) => o()); }, 1000);
  return () => {
    ouvintes.delete(fn);
    if (!ouvintes.size && timer) { clearInterval(timer); timer = null; }
  };
}

export function useRelogio(): number | null {
  return useSyncExternalStore(assinar, () => agora || (agora = Date.now()), () => null);
}
