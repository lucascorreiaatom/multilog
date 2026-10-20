"use client";
// Carros nas vagas leves (estacionamento do administrativo e coberturas), como no app Vite do mapa: ocupação fixa
// sorteada, sedan ou SUV, o bico apontando para o fundo da vaga.
import { Suspense, useMemo } from "react";
import { criarRng } from "@/lib/patio/ficticio";
import { planta } from "@/lib/site";
import { CarrosInstanciados, useModelosCarro, VARIANTES_CARRO, type CarroParado } from "./carrosModelo";

const OCUPACAO = 0.68;
const CORES = ["#f2f3f4", "#f2f3f4", "#c4c8cc", "#9aa0a6", "#2b2f35", "#14171b", "#7a1f22", "#1f3f73", "#d8d8d8"];

function Carros() {
  const modelos = useModelosCarro();
  const lotes = useMemo(() => {
    const r = criarRng(404);
    const out: CarroParado[][] = VARIANTES_CARRO.map(() => []);
    for (const v of planta.vagasLeves) {
      const parado = r() < OCUPACAO, variante = r() < 0.4 ? 1 : 0, cor = CORES[Math.floor(r() * CORES.length)];
      if (!parado) continue;
      // rumo: da vaga para o corredor; o carro entra de frente
      const [rx, rz] = v.rumo ?? (v.giro ? [1, 0] : [0, 1]);
      out[variante].push({ x: v.centro[0], z: v.centro[1], giro: Math.atan2(rz, -rx), cor });
    }
    return out;
  }, []);
  return (
    <group>
      {modelos.map((pecas, k) => <CarrosInstanciados key={k} pecas={pecas} itens={lotes[k]} />)}
    </group>
  );
}

export function CarrosEstacionados() {
  return (
    <Suspense fallback={null}>
      <Carros />
    </Suspense>
  );
}
