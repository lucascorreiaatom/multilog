import { describe, expect, it } from "vitest";
import { planta } from "@/lib/site";
import { caminho, comprimento, rotaEntrada, rotaSaida } from "@/lib/patio/rotas";

describe("grafo de vias", () => {
  it("liga a rodovia a todas as pistas de entrada e o pátio a todas as pistas de saída", () => {
    for (const p of [1, 2, 3, 4]) expect(caminho("rod-o", `gate${p}-n`)).not.toBeNull();
    for (const p of [4, 5, 6]) expect(caminho("n325", `gate${p}-s`)).not.toBeNull();
  });

  it("gera rota de entrada e de saída para todas as vagas", () => {
    const falhas: string[] = [];
    for (const v of planta.vagas) {
      try {
        const e = rotaEntrada(v.id, 1 + (v.numero % 4));
        const s = rotaSaida(v.id, 4 + (v.numero % 3));
        const le = e.trechos.reduce((a, t) => a + comprimento(t.pontos), 0);
        const ls = s.trechos.reduce((a, t) => a + comprimento(t.pontos), 0);
        if (!(le > 50 && le < 3000 && ls > 50 && ls < 3000)) falhas.push(`${v.id} ${le.toFixed(0)} ${ls.toFixed(0)}`);
      } catch (err) {
        falhas.push(`${v.id} ${(err as Error).message}`);
      }
    }
    expect(falhas).toEqual([]);
  });
});
