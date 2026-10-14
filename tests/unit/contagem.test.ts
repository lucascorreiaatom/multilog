import { describe, expect, it } from "vitest";
import { criarRng } from "@/lib/patio/ficticio";
import type { EstadoVaga, StatusVaga } from "@/lib/patio/tipos";
import { planta } from "@/lib/site";
import { contar, recontar } from "@/lib/store/patio";

const STATUS: StatusVaga[] = ["livre", "reservada", "ocupada", "vistoria", "conferencia", "saida", "bloqueada"];

describe("contagem incremental das vagas", () => {
  it("bate com a recontagem completa depois de muitas trocas de status", () => {
    const rng = criarRng(5);
    const vagas: Record<string, EstadoVaga> = Object.fromEntries(planta.vagas.map((v) => [v.id, { status: "livre", desde: 0 }]));
    let estado = contar(vagas);
    for (let i = 0; i < 3000; i++) {
      const id = planta.vagas[Math.floor(rng() * planta.vagas.length)].id;
      const para = STATUS[Math.floor(rng() * STATUS.length)];
      const antes = estado;
      estado = { ...estado, ...recontar(estado, id, vagas[id].status, para) };
      // setores que não mudaram mantêm o mesmo objeto (quem assina outro setor não re-renderiza)
      const setor = planta.vagas.find((v) => v.id === id)!.setor;
      for (const s of Object.keys(estado.porSetor)) if (s !== setor) expect(estado.porSetor[s as never]).toBe(antes.porSetor[s as never]);
      vagas[id] = { status: para, desde: 0 };
    }
    expect(estado).toEqual(contar(vagas));
  });
});
