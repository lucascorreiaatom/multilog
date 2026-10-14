// Busca de câmeras: a mesma regra na busca global (cabeçalho) e nas listas de câmeras das abas Pátio e Gates.
import type { Camera } from "./catalogo";
import { MODELOS } from "./modelos";

/** maiúsculas sem acento, para "armazem" achar "Armazém" */
export const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

/** termo já normalizado: código (CAM-005), número sem zeros ("5"), modelo (P3738) ou local ("gate", "armazem") */
export function cameraCombina(c: Camera, termo: string) {
  if (!termo) return true;
  const semZeros = termo.replace(/^0+/, "");
  return c.codigo.includes(termo) || (semZeros !== "" && String(c.numero) === semZeros) || MODELOS[c.modelo].nome.toUpperCase().includes(termo) || normalizar(c.local).includes(termo);
}
