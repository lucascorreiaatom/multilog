// Simulador determinístico do pátio. Mantém a ocupação entre 70% e 85% gerando entradas, progressão
// de status e saídas. Cada entrada e saída vira um Gatilho, que a cena anima do gate até a vaga.
import { planta } from "../site";
import { camerasExternas } from "../cameras/catalogo";
import type { Gatilho, Mudanca, ResultadoAcao, Snapshot, YardDataSource } from "./fonte";
import { criarRng, ocupanteFicticio, placa as gerarPlaca, type Rng } from "./ficticio";
import { proximo, type Acao } from "./maquina";
import { STATUS, type EstadoVaga, type Evento, type Gate, type Ocupante, type StatusVaga } from "./tipos";

const H = 3600_000;

export interface OpcoesSimulador {
  seed?: number;
  agora?: number;
  /** intervalo médio entre entradas (ms) */
  intervaloEntrada?: number;
  /** congela relógio e eventos (fixtures e testes visuais) */
  congelado?: boolean;
}

export class SimulatedSource implements YardDataSource {
  readonly simulada = true;
  private rng: Rng;
  private estado: Snapshot;
  private ouvintes = new Set<(m: Mudanca) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private proxEntrada = 0;
  private proxSaida = 0;
  private proxProgresso = 0;
  private seq = 0;
  private emAnimacao = new Set<string>();
  private opcoes: Required<OpcoesSimulador>;

  constructor(opcoes: OpcoesSimulador = {}) {
    this.opcoes = { seed: 20261009, agora: Date.now(), intervaloEntrada: 14_000, congelado: false, ...opcoes };
    this.rng = criarRng(this.opcoes.seed);
    this.estado = this.gerarInicial(this.opcoes.agora);
  }

  private gerarInicial(agora: number): Snapshot {
    const r = this.rng;
    const vagas: Record<string, EstadoVaga> = {};
    const ocupantes: Record<string, Ocupante> = {};
    const alvo: Record<string, number> = { EST: 0.76, PUL: 0.72, CPG: 0.48, DOC: 0.75 };
    for (const v of planta.vagas) {
      let status: StatusVaga = "livre";
      if (r() < 0.006) status = "bloqueada";
      else if (r() < alvo[v.setor]) {
        if (v.setor === "DOC") status = r() < 0.85 ? "conferencia" : "saida";
        else {
          const x = r();
          status = x < 0.66 ? "ocupada" : x < 0.8 ? "conferencia" : x < 0.86 ? "vistoria" : "saida";
        }
      }
      const desde = agora - Math.floor(r() * 30 * H);
      vagas[v.id] = { status, desde };
      if (status !== "livre" && status !== "bloqueada") {
        const id = `oc-${++this.seq}`;
        const horasNoPatio = status === "ocupada" ? r() * 20 : r() * 60;
        ocupantes[id] = ocupanteFicticio(r, id, agora, { perigosa: v.setor === "CPG", gate: 1 + Math.floor(r() * 4), horaEntrada: agora - Math.floor(horasNoPatio * H) });
        vagas[v.id].ocupanteId = id;
      }
    }
    const gates: Gate[] = planta.pistasGate.map((p) => ({
      id: p.id, numero: p.numero, sentido: p.sentido,
      operacao: p.numero === 1 || p.numero === 2 || p.numero === 5 ? "importacao" : "exportacao",
      aberto: true,
    }));
    const camerasOffline = [camerasExternas[Math.floor(r() * camerasExternas.length)].numero];
    const eventos: Evento[] = [];
    const ids = Object.keys(vagas).filter((k) => vagas[k].ocupanteId);
    for (let i = 0; i < 12; i++) {
      const vagaId = ids[Math.floor(r() * ids.length)];
      const st = vagas[vagaId].status;
      eventos.push({ id: `ev-${++this.seq}`, hora: agora - i * 47_000, tipo: "conferencia", vagaId, status: st, placa: ocupantes[vagas[vagaId].ocupanteId!].veiculo.placa, texto: STATUS[st].nome });
    }
    return { agora, vagas, ocupantes, gates, eventos, camerasOffline };
  }

  snapshot(): Snapshot {
    return this.estado;
  }

  assinar(ouvinte: (m: Mudanca) => void) {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  private emitir(m: Mudanca) {
    for (const o of this.ouvintes) o(m);
  }

  private evento(e: Omit<Evento, "id" | "hora">) {
    const ev: Evento = { id: `ev-${++this.seq}`, hora: this.estado.agora, ...e };
    this.estado.eventos = [ev, ...this.estado.eventos].slice(0, 60);
    this.emitir({ tipo: "evento", evento: ev });
  }

  private setVaga(vagaId: string, status: StatusVaga, ocupanteId?: string) {
    const atual = this.estado.vagas[vagaId];
    const estado: EstadoVaga = { status, desde: this.estado.agora, ocupanteId: ocupanteId === undefined ? atual.ocupanteId : ocupanteId || undefined };
    this.estado.vagas[vagaId] = estado;
    this.emitir({ tipo: "vaga", vagaId, estado });
  }

  iniciar() {
    if (this.timer || this.opcoes.congelado) return;
    const t0 = Date.now();
    this.proxEntrada = t0 + 2500;
    this.proxSaida = t0 + 9000;
    this.proxProgresso = t0 + 3000;
    this.timer = setInterval(() => this.tick(), 500);
  }

  parar() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private ocupacao(): number {
    const vs = Object.values(this.estado.vagas);
    return vs.filter((v) => v.status !== "livre" && v.status !== "bloqueada").length / vs.length;
  }

  private tick() {
    const agora = Date.now();
    this.estado.agora = agora;
    if (agora >= this.proxEntrada) {
      if (this.ocupacao() < 0.85) this.entradaAleatoria();
      const fator = this.ocupacao() < 0.72 ? 0.6 : 1.2;
      this.proxEntrada = agora + this.opcoes.intervaloEntrada * fator * (0.6 + this.rng() * 0.8);
    }
    if (agora >= this.proxSaida) {
      if (this.ocupacao() > 0.7) this.saidaAleatoria();
      this.proxSaida = agora + this.opcoes.intervaloEntrada * (0.7 + this.rng() * 0.8);
    }
    if (agora >= this.proxProgresso) {
      this.progressoAleatorio();
      this.proxProgresso = agora + 2500 + this.rng() * 3500;
    }
  }

  private vagaLivreAleatoria(setor?: string): string | null {
    const livres = planta.vagas.filter((v) => (!setor || v.setor === setor) && this.estado.vagas[v.id].status === "livre" && !this.emAnimacao.has(v.id));
    if (!livres.length) return null;
    return livres[Math.floor(this.rng() * livres.length)].id;
  }

  private entradaAleatoria() {
    const x = this.rng();
    const setor = x < 0.7 ? "EST" : x < 0.86 ? "PUL" : x < 0.93 ? "CPG" : "DOC";
    const vagaId = this.vagaLivreAleatoria(setor) ?? this.vagaLivreAleatoria();
    if (vagaId) this.dispararEntrada(vagaId);
  }

  private dispararEntrada(vagaId: string, placaManual?: string) {
    const v = planta.vagas.find((q) => q.id === vagaId)!;
    const pista = 1 + Math.floor(this.rng() * 4);
    const id = `oc-${++this.seq}`;
    const oc = ocupanteFicticio(this.rng, id, this.estado.agora, { perigosa: v.setor === "CPG", gate: pista });
    if (placaManual) oc.veiculo.placa = placaManual.toUpperCase();
    this.estado.ocupantes[id] = oc;
    this.emitir({ tipo: "ocupante", ocupante: oc });
    this.setVaga(vagaId, "reservada", id);
    this.emAnimacao.add(vagaId);
    const g: Gatilho = { tipo: "entrada", ocupanteId: id, vagaId, pista, hora: this.estado.agora };
    this.emitir({ tipo: "gatilho", gatilho: g });
    this.evento({ tipo: "entrada", vagaId, placa: oc.veiculo.placa, gate: pista, status: "reservada", texto: `Entrada pelo Gate ${pista}` });
  }

  private saidaAleatoria() {
    const prontas = Object.entries(this.estado.vagas).filter(([id, e]) => e.status === "saida" && !this.emAnimacao.has(id));
    if (!prontas.length) return;
    const [vagaId] = prontas[Math.floor(this.rng() * prontas.length)];
    this.dispararSaida(vagaId);
  }

  private dispararSaida(vagaId: string) {
    const e = this.estado.vagas[vagaId];
    if (!e.ocupanteId) return;
    const pista = 4 + Math.floor(this.rng() * 3);
    this.emAnimacao.add(vagaId);
    const g: Gatilho = { tipo: "saida", ocupanteId: e.ocupanteId, vagaId, pista, hora: this.estado.agora };
    this.emitir({ tipo: "gatilho", gatilho: g });
    this.evento({ tipo: "saida", vagaId, placa: this.estado.ocupantes[e.ocupanteId]?.veiculo.placa, gate: pista, status: "saida", texto: `Saindo pelo Gate ${pista}` });
  }

  private progressoAleatorio() {
    const candidatos = Object.entries(this.estado.vagas).filter(([id, e]) => ["ocupada", "vistoria", "conferencia"].includes(e.status) && !this.emAnimacao.has(id));
    if (!candidatos.length) return;
    const [vagaId, e] = candidatos[Math.floor(this.rng() * candidatos.length)];
    const oc = e.ocupanteId ? this.estado.ocupantes[e.ocupanteId] : undefined;
    let acao: Acao = "iniciarConferencia";
    if (e.status === "ocupada" && oc && (oc.carga.canal === "vermelho" || oc.carga.canal === "amarelo") && this.rng() < 0.5) acao = "iniciarVistoria";
    if (e.status === "conferencia") acao = "liberarSaida";
    this.acaoVaga(vagaId, acao);
  }

  acaoVaga(vagaId: string, acao: Acao): ResultadoAcao {
    const e = this.estado.vagas[vagaId];
    if (!e) return { ok: false, motivo: "Vaga inexistente" };
    if (this.emAnimacao.has(vagaId)) return { ok: false, motivo: "Caminhão em movimento nesta vaga" };
    if (acao === "registrarSaida") {
      if (e.status !== "saida") return { ok: false, motivo: "A saída ainda não foi liberada" };
      this.dispararSaida(vagaId);
      return { ok: true };
    }
    const novo = proximo(e.status, acao);
    if (!novo) return { ok: false, motivo: `Ação indisponível para status ${STATUS[e.status].nome}` };
    this.setVaga(vagaId, novo);
    const placa = e.ocupanteId ? this.estado.ocupantes[e.ocupanteId]?.veiculo.placa : undefined;
    const tipos: Partial<Record<Acao, Evento["tipo"]>> = { iniciarVistoria: "vistoria", iniciarConferencia: "conferencia", liberarSaida: "saida-liberada", bloquear: "bloqueio", desbloquear: "desbloqueio" };
    this.evento({ tipo: tipos[acao] ?? "conferencia", vagaId, placa, status: novo, texto: STATUS[novo].nome });
    return { ok: true };
  }

  atribuirEntrada(vagaId: string, placaManual?: string): ResultadoAcao {
    const e = this.estado.vagas[vagaId];
    if (!e || e.status !== "livre") return { ok: false, motivo: "A vaga precisa estar livre" };
    this.dispararEntrada(vagaId, placaManual || gerarPlaca(this.rng, "BR"));
    return { ok: true };
  }

  alternarGate(numero: number): ResultadoAcao {
    const g = this.estado.gates.find((x) => x.numero === numero);
    if (!g) return { ok: false, motivo: "Gate inexistente" };
    g.aberto = !g.aberto;
    this.emitir({ tipo: "gate", gate: { ...g } });
    this.evento({ tipo: g.aberto ? "gate-aberto" : "gate-fechado", gate: numero, texto: g.aberto ? "Gate aberto" : "Gate fechado" });
    return { ok: true };
  }

  animacaoConcluida(g: Gatilho, fase: "estacionou" | "deixou-vaga" | "saiu") {
    if (g.tipo === "entrada" && fase === "estacionou") {
      this.emAnimacao.delete(g.vagaId);
      if (this.estado.vagas[g.vagaId].status === "reservada") {
        this.setVaga(g.vagaId, "ocupada");
        this.evento({ tipo: "estacionou", vagaId: g.vagaId, placa: this.estado.ocupantes[g.ocupanteId]?.veiculo.placa, status: "ocupada", texto: STATUS.ocupada.nome });
      }
    }
    if (g.tipo === "saida" && fase === "deixou-vaga") {
      this.emAnimacao.delete(g.vagaId);
      this.setVaga(g.vagaId, "livre", "");
      this.evento({ tipo: "liberada", vagaId: g.vagaId, status: "livre", texto: STATUS.livre.nome });
    }
    if (g.tipo === "saida" && fase === "saiu") {
      delete this.estado.ocupantes[g.ocupanteId];
      this.emitir({ tipo: "ocupante-removido", ocupanteId: g.ocupanteId });
    }
  }
}

/** Stub da integração real: endpoints da Multilog para vagas, gates e câmeras (a criar pelo cliente). */
export class RecintoSource implements YardDataSource {
  readonly simulada = false;
  constructor(private readonly baseUrl: string) {}
  snapshot(): Snapshot {
    throw new Error(`RecintoSource: GET ${this.baseUrl}/patio/snapshot ainda não disponível`);
  }
  assinar(): () => void {
    throw new Error(`RecintoSource: stream ${this.baseUrl}/patio/eventos ainda não disponível`);
  }
  iniciar() {}
  parar() {}
  acaoVaga(): ResultadoAcao { return { ok: false, motivo: "Integração com o Recinto pendente" }; }
  atribuirEntrada(): ResultadoAcao { return { ok: false, motivo: "Integração com o Recinto pendente" }; }
  alternarGate(): ResultadoAcao { return { ok: false, motivo: "Integração com o Recinto pendente" }; }
  animacaoConcluida() {}
}
