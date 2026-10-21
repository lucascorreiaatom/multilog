"use client";
// Perfil do ocupante da vaga: foto do motorista e placa Mercosul.
// As fotos são de pessoas fictícias geradas por IA (public/motoristas), escolhidas de forma determinística pelo id do ocupante;
// na operação real o rosto vem da câmera de face do gate.
import type { Pais } from "@/lib/patio/tipos";

const FOTOS = 6;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function AvatarMotorista({ seed, feminino }: { seed: string; feminino: boolean }) {
  const src = `/motoristas/${feminino ? "f" : "m"}-${String((hash(seed) % FOTOS) + 1).padStart(2, "0")}.webp`;
  return (
    <span className="flex size-64 shrink-0 overflow-hidden rounded-[16px] bg-card-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de 192 px já otimizada, servida direto de public */}
      <img src={src} alt="" aria-hidden width={64} height={64} className="size-64 object-cover" />
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
