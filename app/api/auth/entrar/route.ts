import { NextResponse, type NextRequest } from "next/server";
import type { Perfil } from "@/lib/auth/permissoes";
import { COOKIE_SESSAO, OPCOES_COOKIE, USUARIOS_DEMO, selar } from "@/lib/auth/sessao";

// Login simulado: cria a sessão do perfil escolhido, sem credenciais.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const perfil = String(form.get("perfil") ?? "admin") as Perfil;
  const entrada = Object.entries(USUARIOS_DEMO).find(([, u]) => u.perfil === perfil) ?? Object.entries(USUARIOS_DEMO)[2];
  const [email, u] = entrada;
  // volta à página que pediu o login; só caminhos internos dos conceitos (nada de redirecionamento aberto)
  const volta = String(form.get("volta") ?? "");
  const destino = /^\/conceito-\d+(\/[\w-]*)*$/.test(volta) ? volta : "/conceito-1";
  const res = NextResponse.redirect(new URL(destino, req.url), 303);
  res.cookies.set(COOKIE_SESSAO, selar({ usuario: email, nome: u.nome, perfil: u.perfil }), OPCOES_COOKIE);
  return res;
}
