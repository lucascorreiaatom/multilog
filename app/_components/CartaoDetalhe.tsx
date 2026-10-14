"use client";
// Card de detalhe da seleção (componente do vídeo): vaga e ocupante, gate ou prédio.
// LGPD: no modo TV nunca exibe dados pessoais (só placa, status e horários).
import { Camera, Clock, FileText, Flame, Truck, User, Video, X } from "lucide-react";
import type { ReactNode } from "react";
import { camerasFila, camerasInternas } from "@/lib/cameras/catalogo";
import { camerasQueCobrem } from "@/lib/cameras/cobertura";
import { pode } from "@/lib/auth/permissoes";
import { dataHora, duracao, horaCurta, pesoKg } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
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
      <dd className="min-w-0 break-words text-text">{children}</dd>
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
      <button type="button" aria-label="Fechar" onClick={() => useUi.getState().selecionar(null)} className="flex size-40 shrink-0 items-center justify-center rounded-full bg-card text-text shadow-card hover:bg-card-muted"><X size={16} /></button>
    </div>
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
                <Item rotulo="Parametrização"><span className="inline-flex h-20 items-center rounded-full px-8 align-top text-[12px] font-semibold leading-16 text-white" style={{ background: CANAL[oc.carga.canal].cor }}>{CANAL[oc.carga.canal].nome}</span></Item>
                <Item rotulo="Processo">{oc.carga.processo}</Item>
              </Secao>
            )}
            <Secao icone={<Clock size={16} />} titulo="Permanência e câmeras">
              <Item rotulo="Entrada">{dataHora(oc.horaEntrada)} · Gate {oc.gateEntrada}</Item>
              <Item rotulo="No pátio"><span className={cx(excedida && "font-semibold text-st-ocupada")}>{duracao(agora - oc.horaEntrada)}{excedida ? " · permanência excedida" : ""}</span></Item>
              <Item rotulo="Status desde">{horaCurta(e.desde)}</Item>
            </Secao>
            {!modoTv && (
              <Cartao className="p-16">
                <h4 className="flex items-center gap-8 text-[13px] font-semibold leading-20 text-text"><Camera size={16} />Capturas · Gate {oc.gateEntrada}</h4>
                <div className="mt-8 grid grid-cols-3 gap-8" aria-label="Capturas do gate de entrada">
                  {["Frontal", "Traseira", "Teto"].map((t) => (
                    <div key={t} className="flex h-56 items-center justify-center rounded-[12px] bg-chip text-[12px] leading-16 text-text-2" title="Disponível pela integração com o CFTV dos gates">
                      {t}
                    </div>
                  ))}
                </div>
              </Cartao>
            )}
          </>
        ) : (
          <Cartao className="p-16 text-[13px] leading-20 text-text-2">
            {STATUS[e.status].descricao}
          </Cartao>
        )}
        {cobre && (
          <button type="button" onClick={() => { useUi.getState().exibirCamera(cobre.camera.numero); useUi.getState().setSensor(cobre.sensor); }}
            className="flex h-40 items-center justify-center gap-8 rounded-full bg-card px-16 text-[13px] font-semibold leading-20 text-text shadow-card hover:bg-card-muted">
            <Video size={16} className="shrink-0" /><span className="truncate">Ver câmera da vaga · {cobre.camera.codigo}</span>
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
  const fila = camerasFila.find((c) => c.local.startsWith(`Gate ${numero} · `));
  if (!g) return null;
  return (
    <>
      <Cabeca titulo={`Gate ${numero}`} subtitulo={`${g.sentido === "entrada" ? "Entrada" : g.sentido === "saida" ? "Saída" : "Reversível"} · ${g.operacao === "importacao" ? "Importação" : "Exportação"} · balança`} status={{ nome: g.aberto ? "Aberto" : "Fechado", cor: g.aberto ? "var(--st-livre)" : "var(--inativo)" }} />
      <div className="flex flex-col gap-8 p-16">
        {/* ver a fila é o pedido principal do cliente para os gates: atalho direto para a câmera da pista */}
        {fila && (
          <button type="button" onClick={() => useUi.getState().exibirCamera(fila.numero)}
            className="flex min-h-56 items-center gap-12 rounded-[16px] bg-card px-16 py-8 text-left shadow-card outline-none hover:bg-card-muted focus-visible:ring-2 focus-visible:ring-accent">
            <span className="flex size-40 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink"><Video size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-20 text-text">Ver a {fila.local.split(" · ")[1]}</span>
              <span className="block text-[13px] leading-20 text-text-2">{fila.codigo} · posição aproximada</span>
            </span>
          </button>
        )}
        <Cartao className="p-16 text-[13px] leading-20 text-text-2">
          Câmeras dos gates: frontal (placa, cor e modelo), traseira (placa e lacre), teto (avarias), face (motorista) e guarita. 35 câmeras para as 6 pistas.
        </Cartao>
        <Cartao className="p-16">
          <h4 className="text-[13px] font-semibold leading-20 text-text">Passagens recentes</h4>
          <ul className="mt-8 flex flex-col gap-4">
            {eventos.length ? eventos.map((e) => <li key={e.id} className="grid grid-cols-[72px_1fr_auto] gap-8 text-[13px] leading-20 text-text-2"><span className="tnum truncate font-semibold text-text">{e.placa ?? "Gate"}</span><span className="truncate">{e.texto}</span><span className="tnum">{horaCurta(e.hora)}</span></li>) : <li className="text-[13px] leading-20 text-text-3">Sem passagens recentes</li>}
          </ul>
        </Cartao>
      </div>
    </>
  );
}

function DetalhePredio({ id }: { id: string }) {
  const b = planta.predios.find((p) => p.id === id);
  if (!b) return null;
  const internas = camerasInternas.filter((c) => b.paginas?.includes(c.pagina) && (b.id !== "apoio-motoristas-sala"));
  return (
    <>
      <Cabeca titulo={b.nome} subtitulo={b.confianca ? "Localização provável" : undefined} />
      <div className="p-16">
        <h4 className="text-[13px] font-semibold leading-20 text-text">Câmeras internas · {internas.length}</h4>
        <div className="mt-8 flex flex-wrap gap-4">
          {internas.map((c) => (
            <button key={c.numero} type="button" onClick={() => useUi.getState().exibirCamera(c.numero)}
              className="tnum h-28 rounded-full bg-chip px-8 text-[12px] font-semibold leading-16 text-text hover:bg-accent-soft">{c.codigo}</button>
          ))}
        </div>
      </div>
    </>
  );
}

export function CartaoDetalhe({ className }: { className?: string }) {
  const selecao = useUi((s) => s.selecao);
  if (!selecao || selecao.tipo === "setor" || selecao.tipo === "camera") return null;
  return (
    <Painel className={cx("flex flex-col overflow-hidden", className)} aria-label="Detalhes da seleção">
      <AreaRolagem className="min-h-0 flex-1">
        {selecao.tipo === "vaga" && <DetalheVaga id={selecao.id} />}
        {selecao.tipo === "gate" && <DetalheGate numero={selecao.numero} />}
        {selecao.tipo === "predio" && <DetalhePredio id={selecao.id} />}
      </AreaRolagem>
    </Painel>
  );
}
