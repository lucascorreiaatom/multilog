import type { Metadata } from "next";
import { Suspense } from "react";
import { SESSAO_DEMO } from "@/lib/auth/sessao";
import { Patio } from "./_components/Patio";

export const metadata: Metadata = {
  title: "Pátio Foz do Iguaçu",
};

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-bg" />}>
      <Patio sessao={SESSAO_DEMO} />
    </Suspense>
  );
}
