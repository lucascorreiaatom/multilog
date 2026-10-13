"use client";
// Card de detalhe da seleção (componente do vídeo): vaga e ocupante, gate ou prédio.
// LGPD: no modo TV nunca exibe dados pessoais (só placa, status e horários).
import { Camera, Clock, FileText, Flame, Truck, User, Video, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { camerasInternas } from "@/lib/cameras/catalogo";
import { camerasQueCobrem } from "@/lib/cameras/cobertura";
import { motivoSemPermissao, pode } from "@/lib/auth/permissoes";
import { dataHora, duracao, horaCurta, pesoKg } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { ACOES_OPERADOR, acoesPermitidas, type Acao } from "@/lib/patio/maquina";
import { NOME_IMPLEMENTO, PERMANENCIA_MAX_H, STATUS, type Canal } from "@/lib/patio/tipos";
import { NOMES_SETOR, planta, vagasPorId } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { useSessao } from "./sessao";
import { AreaRolagem, Cartao, Painel, Ponto, cx } from "./ui";

const CANAL: Record<Canal, { nome: string; cor: string }> = {
  verde: { nome: "Canal verde", cor: "#2e8b57" },
  amarelo: { nome: "Canal amarelo", cor: "#b8860b" },
  vermelho: { nome: "Canal vermelho", cor: "#c0392b" },
  cinza: { nome: "Canal cinza", cor: "#6b7280" },
};

function Secao({ icone, titulo, children }: { icone: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <Cartao className="p-16">
      <h4 className="flex items-center gap-8 text-[13px] font-semibold leading-20 text-text">{icone}{titulo}</h4>
      <dl className="mt-8 grid grid-cols-[112px_1fr] gap-x-12 gap-y-4 text-[13px] leading-20">{children}</dl>
    </Cartao>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-3">{rotulo}</dt>
      <dd className="min-w-0 truncate text-text">{children}</dd>
    </>
  );
}

function Cabeca({ titulo, subtitulo, status }: { titulo: string; subtitulo?: string; status?: { nome: string; cor: string } }) {
  return (
    <div className="flex items-start justify-between gap-12 px-16 pt-16">
      <div className="min-w-0">
        {status && <span className="inline-flex h-24 items-center gap-8 rounded-[12px] bg-card px-8 text-[12px] font-semibold leading-16 text-text shadow-card"><Ponto cor={status.cor} />{status.nome}</span>}
        <h3 className="mt-8 truncate text-[20px] font-semibold leading-28 tracking-[-0.01em] text-text">{titulo}</h3>
        {subtitulo && <p className="truncate text-[13px] leading-20 text-text-2">{subtitulo}</p>}
      </div>
      <button type="button" aria-label="Fechar" onClick={() => useUi.getState().selecionar(null)} className="flex size-32 shrink-0 items-center justify-center rounded-full bg-card text-text shadow-card hover:bg-card-muted"><X size={16} /></button>
    </div>
  );
}

const ESTILO_ACAO = {
  saida: "bg-dark text-on-dark hover:opacity-90",
  principal: "bg-accent text-white hover:bg-accent-hover",
  secundaria: "bg-card text-text shadow-card hover:bg-card-muted",
};
const tom = (a: Acao, principal: boolean): keyof typeof ESTILO_ACAO =>
  a === "liberarSaida" || a === "registrarSaida" ? "saida" : principal ? "principal" : "secundaria";

/** rodapé fixo do cartão: as ações ficam fora da rolagem e separadas das informações */
function Rodape({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-col gap-8 border-t border-line/70 p-16">{children}</div>;
}

function Acoes({ vagaId }: { vagaId: string }) {
  const { perfil } = useSessao();
  const e = usePatio((s) => s.vagas[vagaId]);
  const [msg, setMsg] = useState<string | null>(null);
  const [placa, setPlaca] = useState("");
  if (!e) return null;
  const acoes = acoesPermitidas(e.status).filter((a) => ACOES_OPERADOR[a]) as Acao[];
  if (e.status === "saida") acoes.push("registrarSaida");
  // a primeira ação do fluxo é a principal; bloquear/desbloquear nunca é destaque
  const principal = acoes.find((a) => a !== "bloquear" && a !== "desbloquear");
  const executar = (a: Acao) => {
    if (!pode(perfil, a)) return setMsg(motivoSemPermissao(perfil));
    const r = usePatio.getState().acaoVaga(vagaId, a);
    setMsg(r.ok ? null : r.motivo ?? "Não foi possível executar");
  };
  if (!acoes.length && e.status !== "livre") return null;
  return (
    <Rodape>
      {e.status === "livre" && (
        <form className="flex gap-8" onSubmit={(ev) => { ev.preventDefault(); if (!pode(perfil, "atribuirEntrada")) return setMsg(motivoSemPermissao(perfil)); const r = usePatio.getState().atribuirEntrada(vagaId, placa.trim() || undefined); setMsg(r.ok ? null : r.motivo ?? ""); setPlaca(""); }}>
          <input value={placa} onChange={(ev) => setPlaca(ev.target.value.toUpperCase().slice(0, 7))} placeholder="Placa (opcional)" aria-label="Placa do caminhão"
            className="h-48 min-w-0 flex-1 rounded-[12px] bg-card px-12 text-[13px] leading-20 text-text uppercase shadow-card outline-none placeholder:normal-case placeholder:text-text-3 focus-visible:ring-2 focus-visible:ring-accent" />
          <button type="submit" disabled={!pode(perfil, "atribuirEntrada")} title={pode(perfil, "atribuirEntrada") ? undefined : motivoSemPermissao(perfil)}
            className="h-48 rounded-full bg-accent px-16 text-[14px] font-semibold leading-20 text-white hover:bg-accent-hover disabled:opacity-40">Registrar entrada</button>
        </form>
      )}
      {[...new Set(acoes)].map((a) => {
        const permitido = pode(perfil, a);
        return (
          <button key={a} type="button" onClick={() => executar(a)} disabled={!permitido} title={permitido ? undefined : motivoSemPermissao(perfil)}
            className={cx("h-48 w-full rounded-full px-16 text-[14px] font-semibold leading-20 transition-colors disabled:opacity-40", ESTILO_ACAO[tom(a, a === principal)])}>
            {ACOES_OPERADOR[a]}
          </button>
        );
      })}
      {msg && <p role="alert" className="text-[12px] leading-16 text-st-ocupada">{msg}</p>}
    </Rodape>
  );
}

function DetalheVaga({ id }: { id: string }) {
  const v = vagasPorId.get(id)!;
  const e = usePatio((s) => s.vagas[id]);
  const oc = usePatio((s) => (e?.ocupanteId ? s.ocupantes[e.ocupanteId] : undefined));
  const modoTv = useUi((s) => s.modoTv);
  const { perfil } = useSessao();
  const agora = useRelogio() ?? 0;
  if (!e) return null;
  const st = STATUS[e.status];
  const cobre = camerasQueCobrem(v.centro)[0];
  const verPessoais = pode(perfil, "verDadosPessoais");
  const excedida = oc ? agora - oc.horaEntrada > PERMANENCIA_MAX_H * 3600_000 : false;
  return (
    <>
      <Cabeca titulo={`Vaga ${id}`} subtitulo={`${NOMES_SETOR[v.setor]} · fila ${v.fila} · ${v.tipo === "doca" ? "doca" : `vaga ${v.numero}`}`} status={{ nome: st.nome, cor: st.cor }} />
      <div className="flex flex-col gap-8 p-16">
        {oc ? (
          <>
            {!modoTv && (
              <Secao icone={<User size={16} />} titulo="Motorista">
                <Item rotulo="Nome">{oc.motorista.nome}</Item>
                <Item rotulo="Documento">{oc.motorista.cpf}</Item>
                <Item rotulo="CNH">{oc.motorista.cnh}</Item>
                <Item rotulo="Telefone">{verPessoais ? oc.motorista.telefone : "Restrito ao perfil"}</Item>
              </Secao>
            )}
            <Secao icone={<Truck size={16} />} titulo="Veículo">
              <Item rotulo="Placas"><span className="tnum font-semibold">{oc.veiculo.placa}</span> · {oc.veiculo.placaCarreta}</Item>
              <Item rotulo="Implemento">{NOME_IMPLEMENTO[oc.veiculo.implemento]}</Item>
              {!modoTv && <Item rotulo="Transportadora">{oc.veiculo.transportadora}</Item>}
              <Item rotulo="Peso na entrada">{pesoKg(oc.veiculo.pesoEntradaKg)}</Item>
            </Secao>
            {!modoTv && (
              <Secao icone={<FileText size={16} />} titulo="Carga e processo">
                <Item rotulo="Operação">{oc.carga.operacao === "importacao" ? "Importação" : "Exportação"}</Item>
                <Item rotulo="Documento"><span className="tnum">{oc.carga.documento}</span></Item>
                <Item rotulo="Lacre"><span className="tnum">{oc.carga.lacre}</span></Item>
                <Item rotulo="Carga">
                  <span className="inline-flex items-center gap-4">{oc.carga.perigosa && <Flame size={14} className="text-st-ocupada" aria-label="Carga perigosa" />}{oc.carga.descricao}</span>
                </Item>
                <Item rotulo="Parametrização"><span className="inline-flex h-24 items-center rounded-[12px] px-8 text-[12px] font-semibold leading-16 text-white" style={{ background: CANAL[oc.carga.canal].cor }}>{CANAL[oc.carga.canal].nome}</span></Item>
                <Item rotulo="Processo">{oc.carga.processo}</Item>
              </Secao>
            )}
            <Secao icone={<Clock size={16} />} titulo="Permanência e câmeras">
              <Item rotulo="Entrada">{dataHora(oc.horaEntrada)} · Gate {oc.gateEntrada}</Item>
              <Item rotulo="No pátio"><span className={cx(excedida && "font-semibold text-st-ocupada")}>{duracao(agora - oc.horaEntrada)}{excedida ? " · permanência excedida" : ""}</span></Item>
              <Item rotulo="Status desde">{horaCurta(e.desde)}</Item>
            </Secao>
            {!modoTv && (
              <div className="grid grid-cols-3 gap-8" aria-label="Capturas do gate de entrada">
                {["Frontal", "Traseira", "Teto"].map((t) => (
                  <div key={t} className="flex h-64 flex-col items-center justify-center gap-4 rounded-[12px] bg-chip text-[12px] leading-16 text-text-2" title="Disponível pela integração com o CFTV dos gates">
                    <Camera size={16} />{t} · Gate {oc.gateEntrada}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <Cartao className="p-16 text-[13px] leading-20 text-text-2">
            {e.status === "livre" ? "Vaga livre. Registre a entrada de um caminhão para direcioná-lo do gate até esta vaga." : e.status === "bloqueada" ? "Vaga bloqueada para uso." : "Caminhão a caminho desta vaga."}
          </Cartao>
        )}
        {cobre && (
          <button type="button" onClick={() => { useUi.getState().exibirCamera(cobre.camera.numero); useUi.getState().setSensor(cobre.sensor); }}
            className="flex h-40 items-center justify-center gap-8 rounded-full bg-card text-[13px] font-semibold leading-20 text-text shadow-card hover:bg-card-muted">
            <Video size={16} />Ver câmera que cobre a vaga · {cobre.camera.codigo}
          </button>
        )}
      </div>
    </>
  );
}

function DetalheGate({ numero }: { numero: number }) {
  const g = usePatio((s) => s.gates.find((x) => x.numero === numero));
  const todos = usePatio((s) => s.eventos);
  const eventos = todos.filter((e) => e.gate === numero).slice(0, 6);
  if (!g) return null;
  return (
    <>
      <Cabeca titulo={`Gate ${numero}`} subtitulo={`${g.sentido === "entrada" ? "Entrada" : g.sentido === "saida" ? "Saída" : "Reversível"} · ${g.operacao === "importacao" ? "Importação" : "Exportação"} · balança`} status={{ nome: g.aberto ? "Aberto" : "Fechado", cor: g.aberto ? "var(--st-livre)" : "var(--st-bloqueada)" }} />
      <div className="flex flex-col gap-8 p-16">
        <Cartao className="p-16 text-[13px] leading-20 text-text-2">
          Câmeras dos gates: frontal (placa, cor e modelo), traseira (placa e lacre), teto (avarias), face (motorista) e guarita. 35 câmeras para as 6 pistas.
        </Cartao>
        <Cartao className="p-16">
          <h4 className="text-[13px] font-semibold leading-20 text-text">Passagens recentes</h4>
          <ul className="mt-8 flex flex-col gap-4">
            {eventos.length ? eventos.map((e) => <li key={e.id} className="flex justify-between text-[13px] leading-20 text-text-2"><span className="tnum font-semibold text-text">{e.placa ?? "Gate"}</span><span>{e.texto}</span><span className="tnum">{horaCurta(e.hora)}</span></li>) : <li className="text-[13px] leading-20 text-text-3">Sem passagens recentes</li>}
          </ul>
        </Cartao>
      </div>
    </>
  );
}

function AcoesGate({ numero }: { numero: number }) {
  const aberto = usePatio((s) => s.gates.find((x) => x.numero === numero)?.aberto);
  const { perfil } = useSessao();
  if (aberto === undefined) return null;
  const permitido = pode(perfil, "alternarGate");
  return (
    <Rodape>
      <button type="button" disabled={!permitido} title={permitido ? undefined : motivoSemPermissao(perfil)} onClick={() => usePatio.getState().alternarGate(numero)}
        className={cx("h-48 w-full rounded-full text-[14px] font-semibold leading-20 transition-colors disabled:opacity-40", ESTILO_ACAO.principal)}>{aberto ? "Fechar gate" : "Abrir gate"}</button>
    </Rodape>
  );
}

function DetalhePredio({ id }: { id: string }) {
  const b = planta.predios.find((p) => p.id === id);
  if (!b) return null;
  const internas = camerasInternas.filter((c) => b.paginas?.includes(c.pagina) && (b.id !== "apoio-motoristas-sala"));
  return (
    <>
      <Cabeca titulo={b.nome} subtitulo={b.confianca ? "Localização provável" : undefined} />
      <div className="flex flex-col gap-8 p-16">
        <Cartao className="p-16">
          <h4 className="text-[13px] font-semibold leading-20 text-text">Câmeras internas · {internas.length}</h4>
          <div className="mt-8 flex flex-wrap gap-4">
            {internas.map((c) => (
              <button key={c.numero} type="button" onClick={() => useUi.getState().exibirCamera(c.numero)}
                className="tnum h-28 rounded-full bg-chip px-8 text-[12px] font-semibold leading-16 text-text hover:bg-accent-soft">{c.codigo}</button>
            ))}
          </div>
        </Cartao>
      </div>
    </>
  );
}

export function CartaoDetalhe({ className }: { className?: string }) {
  const selecao = useUi((s) => s.selecao);
  const modoTv = useUi((s) => s.modoTv);
  const statusVaga = usePatio((s) => (selecao?.tipo === "vaga" ? s.vagas[selecao.id]?.status : undefined));
  if (!selecao || selecao.tipo === "setor" || selecao.tipo === "camera") return null;
  return (
    <Painel className={cx("flex flex-col overflow-hidden", className)} aria-label="Detalhes da seleção">
      <AreaRolagem className="min-h-0 flex-1">
        {selecao.tipo === "vaga" && <DetalheVaga id={selecao.id} />}
        {selecao.tipo === "gate" && <DetalheGate numero={selecao.numero} />}
        {selecao.tipo === "predio" && <DetalhePredio id={selecao.id} />}
      </AreaRolagem>
      {!modoTv && selecao.tipo === "vaga" && <Acoes key={`${selecao.id}-${statusVaga}`} vagaId={selecao.id} />}
      {selecao.tipo === "gate" && <AcoesGate numero={selecao.numero} />}
    </Painel>
  );
}
