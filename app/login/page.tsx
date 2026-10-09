import type { Metadata } from "next";
import { Suspense } from "react";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = {
  title: "Entrar · Pátio Foz do Iguaçu",
};

export default function Login() {
  return (
    <main className="flex h-full items-center justify-center bg-bg p-16">
      <div className="w-full max-w-[400px] rounded-[24px] bg-panel p-24 shadow-clay">
        <div className="flex items-center gap-12">
          <span className="flex size-40 items-center justify-center rounded-[12px] bg-dark text-[16px] font-bold leading-24 text-on-dark">M</span>
          <span>
            <span className="block text-[12px] leading-16 text-text-3">Portal Multilog</span>
            <span className="block text-[16px] font-semibold leading-24 text-text">Pátio Foz do Iguaçu</span>
          </span>
        </div>
        <Suspense fallback={<div className="h-[288px]" />}>
          <FormLogin />
        </Suspense>
      </div>
    </main>
  );
}
