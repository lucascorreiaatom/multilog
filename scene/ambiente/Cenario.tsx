"use client";
// Cenário do Blender (patio.glb + entorno.glb). A cena desenha por cima as vagas, cancelas, caminhões e câmeras.
// À noite liga a luz assada das luminárias (luzAssada.ts), que ilumina o cenário e tudo que anda por ele.
import { useLayoutEffect } from "react";
import { aplicarTema, URL_ENTORNO, URL_PATIO, useCenario } from "./cenarioModelo";
import { ligarLuzAssada } from "./luzAssada";

function Modelo({ url, noite }: { url: string; noite: boolean }) {
  const pecas = useCenario(url);
  useLayoutEffect(() => aplicarTema(pecas, noite), [pecas, noite]);
  return (
    <group>
      {pecas.map((p) => (
        <mesh key={p.chave} geometry={p.geometria} material={p.material} castShadow={p.sombra} receiveShadow dispose={null} />
      ))}
    </group>
  );
}

/** semEntorno: depuração de desempenho (?sem=mata) tira a mata, a lavoura e os contêineres */
export function Cenario({ noite, semEntorno = false }: { noite: boolean; semEntorno?: boolean }) {
  useLayoutEffect(() => ligarLuzAssada(noite), [noite]);
  return (
    <group>
      <Modelo url={URL_PATIO} noite={noite} />
      {!semEntorno && <Modelo url={URL_ENTORNO} noite={noite} />}
    </group>
  );
}
