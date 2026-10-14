import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "../_components/Logo";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = {
  title: "Entrar · Pátio Foz do Iguaçu",
};

export default function Login() {
  return (
    <main className="gradiente-marca flex h-full items-center justify-center p-16">
      <div className="vidro w-full max-w-[400px] rounded-[24px] bg-card-muted p-24 shadow-clay">
        <Logo altura={28} />
        <span className="mt-16 block text-[16px] font-semibold leading-24 text-text">Pátio Foz do Iguaçu</span>
        <Suspense fallback={<div className="h-[288px]" />}>
          <FormLogin />
        </Suspense>
      </div>
    </main>
  );
}
