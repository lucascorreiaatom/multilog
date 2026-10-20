// Gerador determinístico de dados fictícios do simulador (placas, motoristas, cargas).
// Tudo aqui é simulado e claramente fictício; CPF e telefone já nascem mascarados.
import type { Canal, Implemento, Ocupante, Operacao, Pais } from "./tipos";

export type Rng = () => number;

/** mulberry32: gerador pseudoaleatório pequeno e determinístico */
export function criarRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escolher = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const digito = (r: Rng) => String(Math.floor(r() * 10));
const letra = (r: Rng) => "ABCDEFGHJKLMNPRSTUVWXYZ"[Math.floor(r() * 23)];

/** placa Mercosul brasileira (ABC1D23) ou paraguaia/argentina (ABCD123 / AB123CD) */
export function placa(r: Rng, pais: Pais): string {
  if (pais === "PY") return `${letra(r)}${letra(r)}${letra(r)}${letra(r)}${digito(r)}${digito(r)}${digito(r)}`;
  if (pais === "AR") return `${letra(r)}${letra(r)}${digito(r)}${digito(r)}${digito(r)}${letra(r)}${letra(r)}`;
  return `${letra(r)}${letra(r)}${letra(r)}${digito(r)}${letra(r)}${digito(r)}${digito(r)}`;
}

const NOMES_BR = ["Carlos", "José", "Marcos", "Paulo", "Rafael", "Anderson", "Luiz", "Márcio", "Fábio", "Edson", "Rodrigo", "Sérgio", "Valdir", "Adriana", "Cláudia", "Juliano", "Ivan", "Gilmar", "Diego", "Rogério"];
const SOBRENOMES_BR = ["Silva", "Souza", "Oliveira", "Pereira", "Lima", "Ferreira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Gomes", "Martins", "Rocha", "Ribeiro", "Barbosa", "Schmidt", "Kunz", "Zanella", "Bortolini"];
const NOMES_ES = ["Juan", "Carlos", "Luis", "Ramón", "Hugo", "Néstor", "Víctor", "Ricardo", "Fernando", "Óscar", "Rubén", "Gustavo"];
const SOBRENOMES_ES = ["González", "Benítez", "Ramírez", "Giménez", "Martínez", "Duarte", "Cabrera", "Villalba", "Ortiz", "Fernández", "Acosta", "Sosa"];
const TRANSPORTADORAS = ["Transportadora Oeste Sul", "Rodoviário Três Fronteiras", "Logística Vale do Paraná", "Cargas Ponte Amizade", "Transportes Alto Paraná", "Rodo Integração Mercosul", "Expresso Iguaçu Cargas", "TransChaco Logística"];
const DESCRICOES = ["Soja em grãos", "Peças automotivas", "Eletrônicos", "Tecidos e confecções", "Máquinas agrícolas", "Farinha de trigo", "Produtos químicos", "Combustível (GLP)", "Pneus", "Madeira processada", "Papel e celulose", "Alimentos industrializados"];
const FEMININOS = new Set(["Adriana", "Cláudia"]);
const MODELOS = ["Scania R 450", "Volvo FH 540", "Mercedes-Benz Actros 2651", "Iveco S-Way 540", "DAF XF 530", "Volkswagen Meteor 29.520", "Scania R 540", "Volvo FH 460"];
const CIDADES: Record<Pais, string[]> = {
  BR: ["Cascavel/PR", "Curitiba/PR", "Maringá/PR", "Chapecó/SC", "São Paulo/SP", "Campinas/SP", "Porto Alegre/RS", "Foz do Iguaçu/PR"],
  PY: ["Ciudad del Este (PY)", "Asunción (PY)", "Encarnación (PY)", "Hernandarias (PY)"],
  AR: ["Buenos Aires (AR)", "Rosario (AR)", "Posadas (AR)", "Córdoba (AR)"],
};
/** semente estável a partir do id: os campos extras do perfil não deslocam a sequência do gerador principal */
function sementeDe(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

const CORES_CAVALO = ["#f4f5f7", "#e9edf2", "#c9332f", "#1f4fa3", "#2e3440", "#e8b21f", "#0f7a5c", "#8a8f99", "#f4f5f7", "#f4f5f7"];
const CORES_CARGA: Record<Implemento, string[]> = {
  bau: ["#f2f3f5", "#e8eaee", "#dfe3e8"],
  sider: ["#2b5fad", "#3a7d44", "#7a8597", "#b8432f", "#d9dde3"],
  container20: ["#2f6db5", "#c4472f", "#2d8a63", "#d48a1e", "#7f8895", "#5a3f8f"],
  container40: ["#2f6db5", "#c4472f", "#2d8a63", "#d48a1e", "#7f8895", "#1f3d6b"],
  graneleiro: ["#6b717d", "#8a6d45", "#5b6b4d"],
  tanque: ["#d9dde3", "#c9ced6"],
};

export function ocupanteFicticio(r: Rng, id: string, agora: number, opcoes: { perigosa?: boolean; gate: number; horaEntrada?: number }): Ocupante {
  const pais: Pais = r() < 0.68 ? "BR" : r() < 0.75 ? "PY" : "AR";
  const nome = pais === "BR" ? `${escolher(r, NOMES_BR)} ${escolher(r, SOBRENOMES_BR)}` : `${escolher(r, NOMES_ES)} ${escolher(r, SOBRENOMES_ES)}`;
  const implemento: Implemento = opcoes.perigosa ? "tanque" : escolher(r, ["bau", "bau", "sider", "sider", "container40", "container20", "graneleiro"] as const);
  const operacao: Operacao = r() < 0.55 ? "importacao" : "exportacao";
  const canal: Canal = operacao === "importacao" ? (r() < 0.62 ? "verde" : r() < 0.6 ? "amarelo" : r() < 0.8 ? "vermelho" : "cinza") : r() < 0.85 ? "verde" : "amarelo";
  const ano = 26;
  const documento = operacao === "importacao"
    ? `DI ${ano}/${Array.from({ length: 7 }, () => digito(r)).join("")}-${digito(r)}`
    : `DUE ${ano}BR${Array.from({ length: 10 }, () => digito(r)).join("")}`;
  const placaCavalo = placa(r, pais);
  const x = criarRng(sementeDe(id));
  const exterior: Pais = pais !== "BR" ? pais : x() < 0.7 ? "PY" : "AR";
  const [cidadeBr, cidadeFora] = [escolher(x, CIDADES.BR), escolher(x, CIDADES[exterior])];
  return {
    id,
    motorista: {
      nome,
      feminino: FEMININOS.has(nome.split(" ")[0]),
      cpf: pais === "BR" ? `***.${digito(r)}${digito(r)}${digito(r)}.${digito(r)}${digito(r)}${digito(r)}-**` : `Doc. estrangeiro ***${digito(r)}${digito(r)}${digito(r)}`,
      cnh: `*****${digito(r)}${digito(r)}${digito(r)}${digito(r)}`,
      telefone: pais === "BR" ? `(45) 9****-${digito(r)}${digito(r)}${digito(r)}${digito(r)}` : `+595 9** *** ${digito(r)}${digito(r)}${digito(r)}`,
      nacionalidade: pais,
    },
    veiculo: {
      placa: placaCavalo,
      placaCarreta: placa(r, pais),
      implemento,
      modelo: escolher(x, MODELOS),
      ano: 2015 + Math.floor(x() * 11),
      eixos: implemento === "container20" ? 5 : escolher(x, [5, 6, 6, 7, 9]),
      corCavalo: escolher(r, CORES_CAVALO),
      corCarga: escolher(r, CORES_CARGA[implemento]),
      transportadora: escolher(r, TRANSPORTADORAS),
      pesoEntradaKg: Math.round((implemento === "tanque" ? 38000 : 22000 + r() * 24000) / 10) * 10,
    },
    carga: {
      operacao,
      documento,
      lacre: `ML ${Math.floor(100000 + r() * 899999)}`,
      descricao: opcoes.perigosa ? escolher(r, ["Combustível (GLP)", "Produtos químicos", "Solventes industriais"]) : escolher(r, DESCRICOES.filter((d) => d !== "Combustível (GLP)" && d !== "Produtos químicos")),
      perigosa: !!opcoes.perigosa,
      canal,
      processo: canal === "verde" ? "Desembaraço automático" : canal === "amarelo" ? "Análise documental" : canal === "vermelho" ? "Conferência física" : "Procedimento especial",
      origem: operacao === "importacao" ? cidadeFora : cidadeBr,
      destino: operacao === "importacao" ? cidadeBr : cidadeFora,
    },
    gateEntrada: opcoes.gate,
    horaEntrada: opcoes.horaEntrada ?? agora,
  };
}
