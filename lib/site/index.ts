import dados from "./planta.json";
import type { Planta, SetorId, VagaGeo } from "./tipos";

export const planta = dados as unknown as Planta;

export const NOMES_SETOR: Record<SetorId, string> = {
  EST: "Pátio Estacionamento",
  PUL: "Pátio Pulmão",
  CPG: "Cargas Perigosas",
  DOC: "Docas do Armazém",
  CTN: "Pátio Container",
};

/** setores com vagas de caminhão, na ordem exibida no painel */
export const SETORES_VAGAS = ["EST", "PUL", "CPG", "DOC"] as const;
export type SetorVagas = (typeof SETORES_VAGAS)[number];

export const vagasPorId: Map<string, VagaGeo> = new Map(planta.vagas.map((v) => [v.id, v]));

export const vagasPorSetor: Record<SetorVagas, VagaGeo[]> = {
  EST: planta.vagas.filter((v) => v.setor === "EST"),
  PUL: planta.vagas.filter((v) => v.setor === "PUL"),
  CPG: planta.vagas.filter((v) => v.setor === "CPG"),
  DOC: planta.vagas.filter((v) => v.setor === "DOC"),
};

/** centro geométrico de um setor (para callouts e fly-to) */
export function centroSetor(setor: SetorVagas): [number, number] {
  const vs = vagasPorSetor[setor];
  const x = vs.reduce((a, v) => a + v.centro[0], 0) / vs.length;
  const z = vs.reduce((a, v) => a + v.centro[1], 0) / vs.length;
  return [x, z];
}
