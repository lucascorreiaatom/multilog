"use client";
// Login simulado (mock): um clique em Entrar cria a sessão do perfil escolhido. Sem e-mail ou senha.
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const PERFIS = [
  { id: "operacao", nome: "Operação", descricao: "Vagas, gates e liberações" },
  { id: "receita", nome: "Receita Federal", descricao: "Vistoria e consulta" },
  { id: "admin", nome: "Administrador", descricao: "Todas as permissões" },
] as const;

export function FormLogin() {
  const [perfil, setPerfil] = useState<(typeof PERFIS)[number]["id"]>("admin");
  // página que pediu o login (o proxy manda em ?volta=); o servidor só aceita caminhos internos
  const volta = useSearchParams().get("volta") ?? "";
  return (
    <form method="post" action="/api/auth/entrar" className="mt-24 flex flex-col gap-12">
      <input type="hidden" name="perfil" value={perfil} />
      <input type="hidden" name="volta" value={volta} />
      <fieldset className="flex flex-col gap-8">
        <legend className="mb-8 text-[13px] font-semibold leading-20 text-text">Perfil de acesso</legend>
        {PERFIS.map((p) => (
          <label key={p.id} className="flex h-56 cursor-pointer items-center gap-12 rounded-[16px] bg-card px-16 shadow-card has-[:checked]:ring-2 has-[:checked]:ring-accent">
            <input type="radio" name="perfil-opcao" value={p.id} checked={perfil === p.id} onChange={() => setPerfil(p.id)} className="size-16 accent-[var(--accent)]" />
            <span>
              <span className="block text-[14px] font-semibold leading-20 text-text">{p.nome}</span>
              <span className="block text-[12px] leading-16 text-text-2">{p.descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="submit" className="mt-4 h-48 rounded-full bg-dark text-[14px] font-semibold leading-20 text-on-dark transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Entrar</button>
      <p className="text-[13px] leading-20 text-text-2">Acesso de demonstração. A autenticação real da Multilog será conectada na integração.</p>
    </form>
  );
}
