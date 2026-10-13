"use client";
// Login simulado (mock): um clique em Entrar cria a sessão do perfil escolhido. Sem e-mail ou senha.
import { useState } from "react";

const PERFIS = [
  { id: "operacao", nome: "Operação", descricao: "Vagas, gates e liberações" },
  { id: "receita", nome: "Receita Federal", descricao: "Vistoria e consulta" },
  { id: "admin", nome: "Administrador", descricao: "Todas as permissões" },
] as const;

export function FormLogin() {
  const [perfil, setPerfil] = useState<(typeof PERFIS)[number]["id"]>("admin");
  return (
    <form method="post" action="/api/auth/entrar" className="mt-24 flex flex-col gap-12">
      <input type="hidden" name="perfil" value={perfil} />
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
      <button type="submit" className="mt-4 h-48 rounded-full bg-accent text-[14px] font-semibold leading-20 text-white transition-colors hover:bg-accent-hover">Entrar</button>
      <p className="text-[12px] leading-16 text-text-3">Acesso de demonstração. A autenticação real da Multilog será conectada na integração.</p>
    </form>
  );
}
