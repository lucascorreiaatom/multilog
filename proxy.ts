import { NextResponse, type NextRequest } from "next/server";

// Verificação otimista: sem cookie de sessão, vai para o login. A assinatura é validada no servidor da página.
export function proxy(req: NextRequest) {
  if (!req.cookies.get("multilog_sessao")?.value) {
    const url = new URL("/login", req.url);
    url.searchParams.set("volta", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mapa/:path*"],
};
