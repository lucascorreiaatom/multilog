import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lerSessao } from "@/lib/auth/sessao";
import { Patio } from "./_components/Patio";

export const metadata: Metadata = {
  title: "Pátio Foz do Iguaçu",
};

async function ComSessao() {
  // sessão é dado de requisição (validade comparada com o relógio): nunca entra no shell estático
  await connection();
  const sessao = await lerSessao();
  if (!sessao) redirect("/login?volta=/mapa");
  return <Patio sessao={sessao} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-bg" />}>
      <ComSessao />
    </Suspense>
  );
}
