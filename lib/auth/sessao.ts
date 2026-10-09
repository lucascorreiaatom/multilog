// Sessão simulada (MockAuthProvider): cookie httpOnly assinado com HMAC-SHA256.
// Para produção, um OidcAuthProvider (Entra ID, Keycloak) só precisa produzir a mesma Sessao.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Perfil, Sessao } from "./permissoes";

export const COOKIE_SESSAO = "multilog_sessao";
const SEGREDO = process.env.SESSION_SECRET ?? "dev-somente-local-troque-em-producao";
const VALIDADE_S = 12 * 3600;

/** usuários de demonstração (perfil define as permissões) */
export const USUARIOS_DEMO: Record<string, { nome: string; perfil: Perfil }> = {
  "operacao@multilog.com.br": { nome: "Ana Ribeiro", perfil: "operacao" },
  "receita@multilog.com.br": { nome: "Marcos Teixeira", perfil: "receita" },
  "admin@multilog.com.br": { nome: "Paula Andrade", perfil: "admin" },
};

const assinar = (dados: string) => createHmac("sha256", SEGREDO).update(dados).digest("base64url");

export function selar(s: Sessao): string {
  const dados = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + VALIDADE_S })).toString("base64url");
  return `${dados}.${assinar(dados)}`;
}

export function abrir(valor: string | undefined): Sessao | null {
  if (!valor) return null;
  const [dados, assinatura] = valor.split(".");
  if (!dados || !assinatura) return null;
  const esperado = Buffer.from(assinar(dados));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const s = JSON.parse(Buffer.from(dados, "base64url").toString()) as Sessao & { exp: number };
    if (s.exp < Date.now() / 1000) return null;
    return { usuario: s.usuario, nome: s.nome, perfil: s.perfil };
  } catch {
    return null;
  }
}

export async function lerSessao(): Promise<Sessao | null> {
  return abrir((await cookies()).get(COOKIE_SESSAO)?.value);
}

export const OPCOES_COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production", maxAge: VALIDADE_S };
