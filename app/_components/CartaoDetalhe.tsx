"use client";
// Card de detalhe da seleção (componente do vídeo): vaga e ocupante, gate ou prédio.
// LGPD: no modo TV nunca exibe dados pessoais (só placa, status e horários).
import { Camera, Flame, SquareParking, Video, VideoOff, X } from "lucide-react";
import type { ReactNode } from "react";
import { camerasFila, camerasInternas } from "@/lib/cameras/catalogo";
import { camerasQueCobrem } from "@/lib/cameras/cobertura";
import { pode } from "@/lib/auth/permissoes";
import { dataHora, duracao, horaCurta, pesoKg } from "@/lib/formato";
import { useRelogio } from "@/lib/relogio";
import { NOME_IMPLEMENTO, NOME_PAIS, PERMANENCIA_MAX_H, STATUS, type Canal } from "@/lib/patio/tipos";
import { NOMES_SETOR, planta, vagasPorId } from "@/lib/site";
import { usePatio } from "@/lib/store/patio";
import { useUi } from "@/lib/store/ui";
import { AvatarMotorista, Placa, formatarPlaca } from "./Motorista";
import { useSessao } from "./sessao";
import { AreaRolagem, Cartao, Painel, Ponto, cx } from "./ui";

const CANAL: Record<Canal, { nome: string; cor: string }> = {
  verde: { nome: "Canal verde", cor: "#2e8b57" },
  amarelo: { nome: "Canal amarelo", cor: "#b8860b" },
  vermelho: { nome: "Canal vermelho", cor: "#c0392b" },
  cinza: { nome: "Canal cinza", cor: "#6b7280" },
};

/** grupo do card: rótulo curto fora do cartão, conteúdo dentro */
function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-8">
      <h4 className="mt-8 px-4 text-[13px] font-semibold leading-20 text-text-2">{titulo}</h4>
      {children}
    </section>
  );
}

/** campo em grade: rótulo pequeno em cima, valor em destaque embaixo */
function Campo({ rotulo, children, codigo, largo }: { rotulo: string; children: ReactNode; codigo?: boolean; largo?: boolean }) {
  return (
    <div className={cx("min-w-0", largo && "col-span-2")}>
      <dt className="text-[12px] leading-16 text-text-3">{rotulo}</dt>
      <dd className={cx("mt-2 break-words text-[13px] font-semibold leading-20 text-text", codigo && "font-mono tracking-[0.02em]")}>{children}</dd>
    </div>
  );
}

const Etiqueta = ({ children }: { children: ReactNode }) => <span className="inline-flex h-24 items-center rounded-[12px] bg-chip px-8 text-[12px] font-semibold leading-16 text-text">{children}</span>;

const Grade = ({ children, className }: { children: ReactNode; className?: string }) => <dl className={cx("grid grid-cols-2 gap-x-16 gap-y-12", className)}>{children}</dl>;

/** a seleção (vaga, gate, prédio) é contexto: título compacto; o destaque fica com o conteúdo (motorista, gate) */
function Cabeca({ titulo, subtitulo, status }: { titulo: string; subtitulo?: string; status?: { nome: string; cor: string; dica?: string } }) {
  return (
    <div className="flex items-start gap-8 px-16 pt-16 pb-4">
      <div className="min-w-0 flex-1">
        {/* status ao lado do nome com o rótulo curto ("Em saída"), para o cabeçalho ficar em duas linhas; o nome completo vai na
            dica. Nunca trunca: sem espaço, a pílula desce em vez de cortar o texto */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <h3 className="min-w-0 break-words text-[16px] font-semibold leading-24 text-text">{titulo}</h3>
          {status && (
            <span title={status.dica} className="inline-flex h-24 items-center gap-8 rounded-[12px] bg-card px-8 text-[12px] font-semibold leading-16 whitespace-nowrap text-text shadow-card">
              <Ponto cor={status.cor} />{status.nome}
            </span>
          )}
        </div>
        {subtitulo && <p className="break-words text-[13px] leading-20 text-text-2">{subtitulo}</p>}
      </div>
      <button type="button" aria-label="Fechar" onClick={() => useUi.getState().selecionar(null)} className="flex size-40 shrink-0 items-center justify-center rounded-full bg-card text-text shadow-card hover:bg-card-muted"><X size={16} /></button>
    </div>
  );
}

/** corpo rolável do card; a ação, quando há, fica fixa embaixo, fora da rolagem */
function Corpo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <>
      <AreaRolagem className="flex min-h-0 flex-1 flex-col">{children}</AreaRolagem>
      {acao && <div className="shrink-0 border-t border-text-3/20 p-16">{acao}</div>}
    </>
  );
}

/** ação secundária do rodapé, neutra (fundo de cartão e texto padrão): abrir a câmera ligada à seleção */
function AcaoCamera({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-48 w-full items-center justify-center gap-8 rounded-full bg-card px-16 text-[14px] font-semibold leading-20 text-text shadow-card outline-none transition-colors hover:bg-card-muted focus-visible:ring-2 focus-visible:ring-accent">
      <Video size={16} className="shrink-0" /><span className="truncate">{rotulo}</span>
    </button>
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
  const acao = cobre && (
    <AcaoCamera rotulo={`Ver câmera da vaga · ${cobre.camera.codigo}`}
      onClick={() => { useUi.getState().exibirCamera(cobre.camera.numero); useUi.getState().setSensor(cobre.sensor); }} />
  );
  return (
    <Corpo acao={acao}>
      <Cabeca titulo={`Vaga ${id}`} subtitulo={NOMES_SETOR[v.setor]} status={{ nome: st.curto, cor: st.cor, dica: st.nome }} />
      {oc ? (
        <div className="flex flex-col gap-8 p-16 pt-12">
          {!modoTv && (
            <Cartao className="p-16">
              {/* motorista e documentos no mesmo cartão, como o veículo: identificação em cima, campos embaixo */}
              {/* topo alinhado: o avatar fica a 16 px do topo e da lateral (centralizado, descia 6 px pela coluna de texto) */}
              <div className="flex items-start gap-16">
                <AvatarMotorista seed={oc.id} feminino={oc.motorista.feminino} />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-24 text-text">{oc.motorista.nome}</p>
                  <p className="truncate text-[13px] leading-20 text-text-2">{oc.veiculo.transportadora}</p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Etiqueta>{NOME_PAIS[oc.motorista.nacionalidade]}</Etiqueta>
                    <Etiqueta>{oc.motorista.nacionalidade === "BR" ? "CNH E" : "Licencia prof. E"}</Etiqueta>
                  </div>
                </div>
              </div>
              <Grade className="mt-16">
                <Campo rotulo="Documento" codigo>{oc.motorista.cpf}</Campo>
                <Campo rotulo="CNH" codigo>{oc.motorista.cnh}</Campo>
                <Campo rotulo="Telefone" codigo={verPessoais} largo>{verPessoais ? oc.motorista.telefone : "Restrito ao perfil"}</Campo>
              </Grade>
            </Cartao>
          )}
          <Grupo titulo="Veículo">
            <Cartao className="p-16">
              <div className="flex items-center gap-16">
                <Placa placa={oc.veiculo.placa} pais={oc.motorista.nacionalidade} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-20 text-text">{oc.veiculo.modelo}</p>
                  <p className="text-[13px] leading-20 text-text-2">Ano {oc.veiculo.ano} · {oc.veiculo.eixos} eixos</p>
                </div>
              </div>
              <Grade className="mt-16">
                <Campo rotulo="Implemento">{NOME_IMPLEMENTO[oc.veiculo.implemento]}</Campo>
                <Campo rotulo="Placa da carreta" codigo>{formatarPlaca(oc.veiculo.placaCarreta, oc.motorista.nacionalidade)}</Campo>
                <Campo rotulo="Peso na entrada">{pesoKg(oc.veiculo.pesoEntradaKg)}</Campo>
              </Grade>
            </Cartao>
          </Grupo>
          {!modoTv && (
            <Grupo titulo="Operação">
              <Cartao className="p-16">
                <Grade>
                  <Campo rotulo="Processo">{oc.carga.operacao === "importacao" ? "Importação" : "Exportação"}</Campo>
                  <Campo rotulo="Declaração" codigo>{oc.carga.documento}</Campo>
                  <Campo rotulo="Carga" largo>
                    <span className="inline-flex items-center gap-4">{oc.carga.perigosa && <Flame size={14} className="text-st-ocupada" aria-label="Carga perigosa" />}{oc.carga.descricao}</span>
                  </Campo>
                  <Campo rotulo="Rota" largo>{oc.carga.origem} → {oc.carga.destino}</Campo>
                  <Campo rotulo="Parametrização">
                    <span className="inline-flex h-20 items-center rounded-full px-8 align-top text-[12px] font-semibold leading-16 text-white" style={{ background: CANAL[oc.carga.canal].cor }}>{CANAL[oc.carga.canal].nome}</span>
                  </Campo>
                  <Campo rotulo="Lacre" codigo>{oc.carga.lacre}</Campo>
                  <Campo rotulo="Situação" largo>{oc.carga.processo}</Campo>
                </Grade>
              </Cartao>
            </Grupo>
          )}
          <Grupo titulo="Permanência">
            <Cartao className="p-16">
              <Grade>
                <Campo rotulo="Entrada" largo>{dataHora(oc.horaEntrada)} · Gate {oc.gateEntrada}</Campo>
                <Campo rotulo="No pátio"><span className={cx(excedida && "text-st-ocupada")}>{duracao(agora - oc.horaEntrada)}{excedida ? " · excedida" : ""}</span></Campo>
                <Campo rotulo="Status desde">{horaCurta(e.desde)}</Campo>
              </Grade>
            </Cartao>
          </Grupo>
          {!modoTv && (
            <Grupo titulo={`Capturas · Gate ${oc.gateEntrada}`}>
              <div className="grid grid-cols-3 gap-8" aria-label="Capturas do gate de entrada">
                {["Frontal", "Traseira", "Teto"].map((t) => (
                  <div key={t} className="flex h-56 items-center justify-center gap-4 rounded-[12px] bg-card text-[12px] leading-16 text-text-2 shadow-card" title="Disponível pela integração com o CFTV dos gates">
                    <Camera size={14} className="shrink-0" />{t}
                  </div>
                ))}
              </div>
            </Grupo>
          )}
        </div>
      ) : (
        /* vaga sem ocupante: estado vazio no espaço todo do card, sem caixa */
        <div className="flex min-h-160 flex-1 flex-col items-center justify-center gap-12 px-32 py-24 text-center">
          <span className="flex size-48 items-center justify-center rounded-full bg-chip" style={{ color: st.cor }}><SquareParking size={24} /></span>
          <p className="max-w-[240px] text-[14px] leading-20 text-text-2">{st.descricao}</p>
        </div>
      )}
    </Corpo>
  );
}

function DetalheGate({ numero }: { numero: number }) {
  const g = usePatio((s) => s.gates.find((x) => x.numero === numero));
  const todos = usePatio((s) => s.eventos);
  const eventos = todos.filter((e) => e.gate === numero).slice(0, 6);
  const fila = camerasFila.find((c) => c.local.startsWith(`Gate ${numero} · `));
  if (!g) return null;
  /* ver a fila é o pedido principal do cliente para os gates: ação fixa para a câmera da pista */
  const acao = fila && <AcaoCamera rotulo={`Ver a ${fila.local.split(" · ")[1]} · ${fila.codigo}`} onClick={() => useUi.getState().exibirCamera(fila.numero)} />;
  return (
    <Corpo acao={acao}>
      <Cabeca titulo={`Gate ${numero}`} subtitulo={`${g.sentido === "entrada" ? "Entrada" : g.sentido === "saida" ? "Saída" : "Reversível"} · ${g.operacao === "importacao" ? "Importação" : "Exportação"} · balança`} status={{ nome: g.aberto ? "Aberto" : "Fechado", cor: g.aberto ? "var(--st-livre)" : "var(--inativo)" }} />
      <div className="flex flex-col gap-8 p-16">
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
    </Corpo>
  );
}

function DetalhePredio({ id }: { id: string }) {
  const b = planta.predios.find((p) => p.id === id);
  const ativa = useUi((s) => (s.blocos.camera === "oculto" ? null : s.cameraAtiva));
  const offline = usePatio((s) => s.camerasOffline);
  if (!b) return null;
  const internas = camerasInternas.filter((c) => b.paginas?.includes(c.pagina) && (b.id !== "apoio-motoristas-sala"));
  return (
    <Corpo>
      {/* subtítulo sempre presente: sem ele sobrava um vão sob o título (o botão fechar é mais alto que uma linha) */}
      <Cabeca titulo={b.nome} subtitulo={`${internas.length === 0 ? "Sem câmeras internas" : internas.length === 1 ? "1 câmera interna" : `${internas.length} câmeras internas`}`} />
      <div className="p-16">
        <p className="text-[13px] leading-20 text-text-2">
          {/* uma linha só: frase curta que cabe na largura do card */}
          {internas.length === 0 ? "Nenhuma câmera interna mapeada" : "Escolha uma para abrir a imagem"}
        </p>
        {/* quadros 16:9 como os tiles do card AO VIVO. Interna não tem cena 3D: a imagem real vem da integração com o CFTV */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          {internas.map((c) => {
            const semSinal = offline.includes(c.numero);
            return (
              <button key={c.numero} type="button" onClick={() => useUi.getState().exibirCamera(c.numero)} title={`${c.codigo} · ${c.local}${c.nivel ? ` · ${c.nivel}` : ""}`}
                className={cx("group relative flex aspect-video items-center justify-center overflow-hidden rounded-[12px] bg-[#0d1f3a] text-white/40 outline-none hover:ring-2 hover:ring-accent/70 focus-visible:ring-2 focus-visible:ring-accent",
                  ativa === c.numero && "ring-2 ring-accent")}
                style={{ backgroundImage: "radial-gradient(120% 90% at 50% 0%, rgb(78 145 237 / 0.18), transparent 70%)" }}>
                {semSinal ? <VideoOff size={20} /> : <Video size={20} />}
                <span className="tnum absolute bottom-8 left-8 inline-flex h-20 items-center rounded-full bg-[rgb(17_41_75/0.72)] px-8 text-[12px] font-semibold leading-16 text-white">{c.codigo}</span>
                {semSinal && <span className="absolute top-8 right-8 inline-flex h-20 items-center rounded-full bg-[rgb(17_41_75/0.72)] px-8 text-[11px] font-semibold leading-16 text-white">Sem sinal</span>}
              </button>
            );
          })}
        </div>
      </div>
    </Corpo>
  );
}

export function CartaoDetalhe({ className }: { className?: string }) {
  const selecao = useUi((s) => s.selecao);
  if (!selecao || selecao.tipo === "setor" || selecao.tipo === "camera") return null;
  return (
    <Painel className={cx("flex flex-col overflow-hidden", className)} aria-label="Detalhes da seleção">
      {selecao.tipo === "vaga" && <DetalheVaga id={selecao.id} />}
      {selecao.tipo === "gate" && <DetalheGate numero={selecao.numero} />}
      {selecao.tipo === "predio" && <DetalhePredio id={selecao.id} />}
    </Painel>
  );
}
