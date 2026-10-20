"use client";
// Ilustrações do perfil do ocupante da vaga: rosto do motorista e placa Mercosul.
// O rosto é ilustrativo e determinístico pelo id do ocupante; na operação real ele vem da câmera de face do gate.
import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";
import { useMemo } from "react";
import type { Pais } from "@/lib/patio/tipos";

const COMUM: avataaars.Options = {
  style: ["default"],
  // só tons de pele humanos (o estilo traz também amarelo e laranja de desenho)
  skinColor: ["614335", "ae5d29", "d08b5b", "edb98a", "ffdbb4"],
  mouth: ["default", "smile", "serious", "twinkle"],
  eyes: ["default", "happy", "squint", "side"],
  eyebrows: ["defaultNatural", "flatNatural", "raisedExcitedNatural", "upDownNatural"],
  clothing: ["shirtCrewNeck", "collarAndSweater", "hoodie", "overall", "shirtVNeck", "blazerAndShirt"],
  accessories: ["prescription01", "prescription02", "round", "wayfarers"],
  accessoriesProbability: 20,
};
const MASCULINO: avataaars.Options = {
  top: ["shortFlat", "shortRound", "shortWaved", "shortCurly", "theCaesar", "theCaesarAndSidePart", "sides", "hat", "winterHat02"],
  facialHair: ["beardLight", "beardMedium", "moustacheFancy"],
  facialHairProbability: 45,
};
const FEMININO: avataaars.Options = {
  top: ["bob", "bun", "curly", "longButNotTooLong", "straight01", "straight02", "straightAndStrand", "miaWallace"],
  facialHairProbability: 0,
};

export function AvatarMotorista({ seed, feminino }: { seed: string; feminino: boolean }) {
  const uri = useMemo(
    () => createAvatar(avataaars, { seed, ...COMUM, ...(feminino ? FEMININO : MASCULINO) }).toDataUri(),
    [seed, feminino],
  );
  return (
    <span className="flex size-64 shrink-0 items-end justify-center overflow-hidden rounded-[16px]"
      style={{ background: "linear-gradient(160deg, var(--accent-soft), color-mix(in srgb, var(--accent) 32%, var(--accent-soft)))" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado em memória, sem otimização a fazer */}
      <img src={uri} alt="" aria-hidden className="size-64 translate-y-4" />
    </span>
  );
}

const NOME_FAIXA: Record<Pais, string> = { BR: "Brasil", PY: "Paraguay", AR: "Argentina" };

/** espaçamento de leitura de cada país: BR ABC1D23 corrido, PY ABCD 123, AR AB 123 CD */
export function formatarPlaca(placa: string, pais: Pais) {
  if (pais === "PY") return `${placa.slice(0, 4)} ${placa.slice(4)}`;
  if (pais === "AR") return `${placa.slice(0, 2)} ${placa.slice(2, 5)} ${placa.slice(5)}`;
  return placa;
}

/** placa Mercosul: faixa azul com o país e caracteres em destaque */
export function Placa({ placa, pais }: { placa: string; pais: Pais }) {
  return (
    <span className="flex w-128 shrink-0 flex-col overflow-hidden rounded-[8px] border-2 border-[#11294b] bg-white" aria-label={`Placa ${placa}`}>
      <span className="flex h-16 items-center justify-center bg-[#1f4fa3] text-[10px] font-bold uppercase leading-12 tracking-[0.12em] text-white">{NOME_FAIXA[pais]}</span>
      <span className="flex h-36 items-center justify-center font-mono text-[20px] font-bold leading-24 tracking-[0.04em] whitespace-nowrap text-[#11294b]">{formatarPlaca(placa, pais)}</span>
    </span>
  );
}
