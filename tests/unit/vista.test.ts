import { describe, expect, it } from "vitest";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { caixaDoAlvo, encaixar, interpolar, limitar, paraTela, paraTelaVista, TERRENO, zoomNoPonto, type Caixa } from "@/lib/mapa/vista";
import { planta, SETORES_VAGAS } from "@/lib/site";
import type { AlvoCamera3D } from "@/lib/store/ui";

const valida = (c: Caixa) => c.x1 > c.x0 && c.y1 > c.y0 && [c.x0, c.x1, c.y0, c.y1].every(Number.isFinite);
// caixa dentro do terreno, com a folga das margens de enquadramento (a PTZ 68 fica uns 10 m fora da cerca)
const noTerreno = (c: Caixa) => c.x0 >= TERRENO.x0 - 80 && c.x1 <= TERRENO.x1 + 80 && c.y0 >= TERRENO.y0 - 80 && c.y1 <= TERRENO.y1 + 80;

describe("mapa plano: orientação", () => {
  it("deixa a rodovia (norte da planta) embaixo e o oeste à direita, como a vista inicial do 3D", () => {
    const rodovia = paraTela(planta.vias.nos["rod-gate"]);
    expect(rodovia[1]).toBeGreaterThan(TERRENO.y1);
    const gate = planta.pistasGate[0];
    expect(paraTela([gate.x, gate.zNorte])[1]).toBeGreaterThan(paraTela([gate.x, gate.zSul])[1]);
    expect(paraTela([-100, 0])[0]).toBeGreaterThan(paraTela([100, 0])[0]);
  });
});

describe("mapa plano: caixa de cada alvo", () => {
  const sorteio = Array.from({ length: 20 }, (_, i) => planta.vagas[(i * 97) % planta.vagas.length]);
  const alvos: AlvoCamera3D[] = [
    { tipo: "home" },
    { tipo: "gates" },
    ...SETORES_VAGAS.map((id) => ({ tipo: "setor" as const, id })),
    ...sorteio.map((v) => ({ tipo: "vaga" as const, id: v.id })),
    ...planta.pistasGate.map((g) => ({ tipo: "gate" as const, numero: g.numero })),
    ...camerasExternas.map((c) => ({ tipo: "camera" as const, numero: c.numero })),
    ...planta.predios.map((b) => ({ tipo: "predio" as const, id: b.id })),
    { tipo: "predio", id: "reservatorio" },
  ];
  it.each(alvos.map((a) => [JSON.stringify(a), a] as const))("%s é válida e fica no recinto", (_, a) => {
    const c = caixaDoAlvo(a);
    expect(valida(c)).toBe(true);
    expect(noTerreno(c)).toBe(true);
  });

  it("a vaga enquadrada fica mais perto que o setor, e o setor mais perto que o pátio inteiro", () => {
    const f = { esq: 376, dir: 96, topo: 80, base: 264 };
    const k = (a: AlvoCamera3D) => encaixar(caixaDoAlvo(a), 1440, 900, f).k;
    expect(k({ tipo: "vaga", id: "PUL-A01" })).toBeGreaterThan(k({ tipo: "setor", id: "PUL" }));
    expect(k({ tipo: "setor", id: "PUL" })).toBeGreaterThan(k({ tipo: "home" }));
  });
});

describe("mapa plano: vista", () => {
  it("encaixar centraliza a caixa na área livre entre os painéis", () => {
    const c = caixaDoAlvo({ tipo: "setor", id: "CPG" });
    const f = { esq: 376, dir: 96, topo: 80, base: 264 };
    const v = encaixar(c, 1440, 900, f);
    const [x0, y0] = paraTelaVista(v, [c.x0, c.y0]), [x1, y1] = paraTelaVista(v, [c.x1, c.y1]);
    expect(x0).toBeGreaterThanOrEqual(f.esq - 0.5);
    expect(x1).toBeLessThanOrEqual(1440 - f.dir + 0.5);
    expect(y0).toBeGreaterThanOrEqual(f.topo - 0.5);
    expect(y1).toBeLessThanOrEqual(900 - f.base + 0.5);
  });

  it("zoomNoPonto mantém fixo o ponto sob o cursor", () => {
    const v = { k: 1.3, x: 500, y: 420 };
    const antes = [(700 - v.x) / v.k, (300 - v.y) / v.k];
    const z = zoomNoPonto(v, 2.5, 700, 300, 0.5);
    expect((700 - z.x) / z.k).toBeCloseTo(antes[0], 6);
    expect((300 - z.y) / z.k).toBeCloseTo(antes[1], 6);
  });

  it("limitar respeita a escala mínima e não deixa o recinto sair da tela", () => {
    const v = limitar({ k: 0.1, x: 99999, y: -99999 }, 1440, 900, 0.8);
    expect(v.k).toBe(0.8);
    const centro = [(720 - v.x) / v.k, (450 - v.y) / v.k];
    expect(centro[0]).toBeGreaterThanOrEqual(TERRENO.x0 - 61);
    expect(centro[0]).toBeLessThanOrEqual(TERRENO.x1 + 61);
    expect(centro[1]).toBeGreaterThanOrEqual(TERRENO.y0 - 61);
    expect(centro[1]).toBeLessThanOrEqual(TERRENO.y1 + 61);
  });

  it("interpolar começa na vista de origem e termina na de destino", () => {
    const a = { k: 1.2, x: 600, y: 400 }, b = { k: 9, x: -2000, y: 3000 };
    const i0 = interpolar(a, b, 0, 1440, 900), i1 = interpolar(a, b, 1, 1440, 900);
    expect(i0.k).toBeCloseTo(a.k); expect(i0.x).toBeCloseTo(a.x); expect(i0.y).toBeCloseTo(a.y);
    expect(i1.k).toBeCloseTo(b.k); expect(i1.x).toBeCloseTo(b.x); expect(i1.y).toBeCloseTo(b.y);
  });
});
