// Sessão de demonstração: sem tela de login, todos entram com o mesmo perfil.
// A autenticação real da Multilog (OIDC: Entra ID, Keycloak) só precisa produzir a mesma Sessao.
import type { Sessao } from "./permissoes";

export const SESSAO_DEMO: Sessao = { usuario: "admin@multilog.com.br", nome: "Paula Andrade", perfil: "admin" };
