// Perfis e permissões. O provedor real (OIDC: Entra ID, Keycloak) só precisa entregar o perfil.
import type { Acao } from "../patio/maquina";

export type Perfil = "operacao" | "receita" | "admin";

export const NOME_PERFIL: Record<Perfil, string> = {
  operacao: "Operação",
  receita: "Receita Federal",
  admin: "Administrador",
};

export interface Sessao {
  usuario: string;
  nome: string;
  perfil: Perfil;
}

type Permissao = Acao | "atribuirEntrada" | "verDadosPessoais";

const MATRIZ: Record<Perfil, Permissao[]> = {
  operacao: ["iniciarConferencia", "liberarSaida", "registrarSaida", "atribuirEntrada"],
  receita: ["iniciarConferencia", "liberarSaida", "verDadosPessoais"],
  admin: ["iniciarConferencia", "liberarSaida", "registrarSaida", "atribuirEntrada", "verDadosPessoais"],
};

export function pode(perfil: Perfil, p: Permissao): boolean {
  return MATRIZ[perfil].includes(p);
}

export function motivoSemPermissao(perfil: Perfil): string {
  return `Ação não permitida para o perfil ${NOME_PERFIL[perfil]}`;
}
