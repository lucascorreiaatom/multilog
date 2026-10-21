// Navegação do mapa plano, fora do React: roda do mouse aproxima no cursor, arrastar move, pinça no toque, teclado
// (+, -, setas, Home) e voos animados para os alvos do store (os mesmos do 3D: setor, vaga, gate, câmera, prédio).
//
// Leveza em máquina fraca: durante o gesto, o SVG inteiro é escalado como imagem (transform CSS, composto na GPU), um
// quadro por vez. O SVG é maior que a tela (SOBRA em cada lado), então arrastar e afastar mostram desenho já pronto; ele
// é refeito no meio do gesto só quando a borda da sobra se aproxima, a escala borraria ou o nível de detalhe muda, e de
// novo ao fim do gesto. Nos voos animados o desenho acompanha quadro a quadro, para não borrar.
import { caixaDoAlvo, encaixar, interpolar, limitar, nivelDetalhe, zoomNoPonto, type Detalhe, type Folga, type Vista } from "@/lib/mapa/vista";
import { vagasPorId } from "@/lib/site";
import { useUi, type AlvoCamera3D } from "@/lib/store/ui";
import { projetarTodos } from "./projecao";

/** faixas da tela cobertas pelos painéis (marcados com data-ocupa na Tela), mais um respiro */
export function medirFolga(raiz: HTMLElement): Folga {
  const r = raiz.getBoundingClientRect();
  const f = { esq: 16, dir: 96, topo: 88, base: 16 };
  for (const el of document.querySelectorAll<HTMLElement>("[data-ocupa]")) {
    const q = el.getBoundingClientRect();
    // painel recolhido para fora da tela ou escondido não conta
    if (q.width < 1 || q.height < 1 || q.right <= r.left + 4 || q.left >= r.right - 4) continue;
    const lado = el.dataset.ocupa;
    if (lado === "esq") {
      // recolhido no título, o painel vira uma barra no topo
      if (q.height > r.height * 0.5) f.esq = Math.max(f.esq, q.right - r.left + 16);
      else f.topo = Math.max(f.topo, q.bottom - r.top + 16);
    } else if (lado === "dir") f.dir = Math.max(f.dir, r.right - q.left + 16);
    else if (lado === "base") f.base = Math.max(f.base, r.bottom - q.top + 16);
    else if (lado === "topo") f.topo = Math.max(f.topo, q.bottom - r.top + 12);
  }
  return f;
}

/** fração da largura e da altura do mapa desenhada além de cada borda */
const SOBRA = 0.5;
/** no gesto, refaz o desenho antes que falte sobra (fração dela que ainda resta) ou que a imagem amplie demais */
const RESPIRO = 0.25, AMPLIACAO_MAX = 1.33;

/** alvos pontuais: se já estiver mais perto, só centraliza (não afasta) */
const PONTUAIS = new Set<AlvoCamera3D["tipo"]>(["vaga", "camera", "gate"]);

export function criarMotor({ raiz, svg, grupo, aoDica }: {
  raiz: HTMLDivElement;
  svg: SVGSVGElement;
  grupo: SVGGElement;
  /** vaga sob o cursor (ou null), com a posição na tela */
  aoDica: (d: { id: string; x: number; y: number } | null) => void;
}) {
  let largura = 0, altura = 0, sx = 0, sy = 0;
  let base: Vista = { k: 1, x: 0, y: 0 };
  let atual: Vista = base;
  let kMin = 0.5;
  let lod: Detalhe | null = null;
  let animacao = 0, commit = 0, quadro = 0;
  let interagiu = false;
  const reduzido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const inicio = () => encaixar(caixaDoAlvo({ tipo: "home" }), largura, altura, medirFolga(raiz));
  const recalcularLimites = () => { kMin = encaixar(caixaDoAlvo({ tipo: "home" }), largura, altura, { esq: 0, dir: 0, topo: 0, base: 0 }).k * 0.6; };
  const ajustar = (v: Vista) => limitar(v, largura, altura, kMin);

  /** tamanho do mapa e a sobra: o SVG começa SOBRA antes da borda e a origem do transform fica no canto do mapa */
  function medir() {
    largura = raiz.clientWidth; altura = raiz.clientHeight;
    sx = Math.round(largura * SOBRA); sy = Math.round(altura * SOBRA);
    Object.assign(svg.style, {
      left: `${-sx}px`, top: `${-sy}px`, width: `${largura + 2 * sx}px`, height: `${altura + 2 * sy}px`,
      transformOrigin: `${sx}px ${sy}px`,
    });
  }

  /** a imagem provisória ainda cobre o mapa com folga, sem ampliar demais nem pedir outro nível de detalhe */
  function cobre(v: Vista, f: number, tx: number, ty: number) {
    const mx = sx * RESPIRO, my = sy * RESPIRO;
    return f <= AMPLIACAO_MAX && nivelDetalhe(v.k) === lod
      && tx - sx * f <= -mx && tx + (largura + sx) * f >= largura + mx
      && ty - sy * f <= -my && ty + (altura + sy) * f >= altura + my;
  }

  function pintar(v: Vista, provisoria = false) {
    atual = v;
    if (provisoria) {
      const f = v.k / base.k, tx = v.x - base.x * f, ty = v.y - base.y * f;
      clearTimeout(commit);
      if (cobre(v, f, tx, ty)) {
        svg.style.transform = `translate(${tx}px, ${ty}px) scale(${f})`;
        projetarTodos(v);
        commit = window.setTimeout(() => pintar(atual), 140);
        return;
      }
    }
    // desenho de verdade: fim do gesto, voo, ou a imagem provisória já não cobre o mapa
    clearTimeout(commit);
    cancelAnimationFrame(quadro); quadro = 0;
    base = v;
    grupo.setAttribute("transform", `matrix(${v.k} 0 0 ${v.k} ${v.x + sx} ${v.y + sy})`);
    svg.style.transform = "";
    projetarTodos(v);
    const n = nivelDetalhe(v.k);
    if (n !== lod) { lod = n; raiz.dataset.lod = n; }
  }

  /** gesto: guarda a vista na hora (o próximo evento parte dela) e mostra uma vez por quadro */
  function gesto(v: Vista) {
    atual = v;
    if (!quadro) quadro = requestAnimationFrame(() => { quadro = 0; pintar(atual, true); });
  }

  function voar(destino: Vista, ms = 560) {
    cancelAnimationFrame(animacao);
    destino = ajustar(destino);
    if (reduzido() || ms === 0) { pintar(destino); return; }
    const origem = atual, t0 = performance.now();
    const passo = (t: number) => {
      const u = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - u, 3);
      pintar(interpolar(origem, destino, e, largura, altura));
      if (u < 1) animacao = requestAnimationFrame(passo);
    };
    animacao = requestAnimationFrame(passo);
  }

  function irPara(alvo: AlvoCamera3D) {
    interagiu = alvo.tipo !== "home";
    // espera o React montar o painel que a seleção abre (ex.: detalhe da vaga) antes de medir a área livre
    requestAnimationFrame(() => {
      const c = caixaDoAlvo(alvo);
      let v = encaixar(c, largura, altura, medirFolga(raiz));
      if (PONTUAIS.has(alvo.tipo) && atual.k > v.k) {
        const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
        v = { k: atual.k, x: v.x + cx * (v.k - atual.k), y: v.y + cy * (v.k - atual.k) };
      }
      voar(v);
    });
  }

  const centroLivre = (): [number, number] => {
    const f = medirFolga(raiz);
    return [(f.esq + largura - f.dir) / 2, (f.topo + altura - f.base) / 2];
  };
  const aproximar = (fator: number) => { interagiu = true; const [cx, cy] = centroLivre(); voar(zoomNoPonto(atual, fator, cx, cy, kMin), 320); };

  // clique (sem arrasto) numa vaga, prédio ou no fundo
  function clicar(alvo: Element) {
    const ui = useUi.getState();
    const vaga = alvo.closest("[data-id]")?.getAttribute("data-id");
    const predio = alvo.closest("[data-predio]")?.getAttribute("data-predio");
    if (vaga) {
      const setor = vagasPorId.get(vaga)?.setor;
      // na visão geral o primeiro clique aproxima o setor; com o setor já em foco, escolhe a vaga
      if (setor && lod === "geral" && !(ui.selecao?.tipo === "setor" && ui.selecao.id === setor)) {
        ui.selecionar({ tipo: "setor", id: setor }); ui.focar({ tipo: "setor", id: setor });
      } else {
        ui.selecionar({ tipo: "vaga", id: vaga });
        if (lod !== "vaga") ui.focar({ tipo: "vaga", id: vaga });
      }
    } else if (predio) {
      ui.selecionar({ tipo: "predio", id: predio }); ui.focar({ tipo: "predio", id: predio });
    } else ui.selecionar(null);
  }

  const posicao = (e: PointerEvent | MouseEvent) => { const r = raiz.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const ponteiros = new Map<number, { x: number; y: number }>();
  let arrasto: { x: number; y: number; v: Vista; moveu: boolean; alvo: Element } | null = null;
  let pinca: { d: number; c: { x: number; y: number }; v: Vista } | null = null;
  const dois = () => { const [a, b] = [...ponteiros.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; };

  function aoRoda(e: WheelEvent) {
    e.preventDefault();
    cancelAnimationFrame(animacao);
    interagiu = true;
    const p = posicao(e);
    // trackpad (pixels) aproxima aos poucos; roda (linhas) em degraus
    const fator = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.06 : e.ctrlKey ? 0.012 : 0.0022));
    gesto(ajustar(zoomNoPonto(atual, fator, p.x, p.y, kMin)));
    aoDica(null);
  }

  function aoApertar(e: PointerEvent) {
    const alvo = e.target as Element;
    if (alvo.closest("button, a, input")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    raiz.setPointerCapture(e.pointerId);
    // mão fechada desde o aperto do esquerdo até soltar, como no 3D (globals.css, .mapa-plano)
    if (e.pointerType === "mouse") raiz.dataset.segurando = "";
    ponteiros.set(e.pointerId, posicao(e));
    cancelAnimationFrame(animacao);
    if (ponteiros.size === 1) arrasto = { ...posicao(e), v: atual, moveu: false, alvo };
    else if (ponteiros.size === 2) { pinca = { ...dois(), v: atual }; if (arrasto) arrasto.moveu = true; }
  }

  function aoMover(e: PointerEvent) {
    if (!ponteiros.has(e.pointerId)) {
      if (e.pointerType !== "mouse") return;
      const id = (e.target as Element).closest?.("[data-id]")?.getAttribute("data-id");
      aoDica(id ? { id, ...posicao(e) } : null);
      return;
    }
    ponteiros.set(e.pointerId, posicao(e));
    if (pinca && ponteiros.size >= 2) {
      const { d, c } = dois();
      const v = zoomNoPonto(pinca.v, d / pinca.d, pinca.c.x, pinca.c.y, kMin);
      gesto(ajustar({ ...v, x: v.x + c.x - pinca.c.x, y: v.y + c.y - pinca.c.y }));
    } else if (arrasto) {
      const p = posicao(e), dx = p.x - arrasto.x, dy = p.y - arrasto.y;
      if (!arrasto.moveu && Math.hypot(dx, dy) < 5) return;
      if (!arrasto.moveu) { arrasto.moveu = true; interagiu = true; raiz.dataset.arrastando = ""; aoDica(null); }
      gesto(ajustar({ ...arrasto.v, x: arrasto.v.x + dx, y: arrasto.v.y + dy }));
    }
  }

  function aoSoltar(e: PointerEvent) {
    if (!ponteiros.has(e.pointerId)) return;
    const clique = e.type === "pointerup" && arrasto && !arrasto.moveu && ponteiros.size === 1 ? arrasto.alvo : null;
    ponteiros.delete(e.pointerId);
    if (ponteiros.size < 2) pinca = null;
    if (ponteiros.size === 1) {
      // sobrou um dedo da pinça: continua como arrasto a partir dele
      const [p] = [...ponteiros.values()];
      arrasto = { ...p, v: atual, moveu: true, alvo: raiz };
    } else if (ponteiros.size === 0) {
      arrasto = null;
      delete raiz.dataset.arrastando;
      delete raiz.dataset.segurando;
      if (clique) clicar(clique);
    }
  }

  function aoDuploClique(e: MouseEvent) {
    if ((e.target as Element).closest("button, [data-id], [data-predio]")) return;
    interagiu = true;
    const p = posicao(e);
    voar(zoomNoPonto(atual, 2, p.x, p.y, kMin), 320);
  }

  function aoTeclar(e: KeyboardEvent) {
    if (e.target !== raiz) return;
    const passo = 120;
    const mover = (dx: number, dy: number) => { interagiu = true; voar({ ...atual, x: atual.x + dx, y: atual.y + dy }, 200); };
    switch (e.key) {
      case "+": case "=": aproximar(1.6); break;
      case "-": case "_": aproximar(1 / 1.6); break;
      case "ArrowLeft": mover(passo, 0); break;
      case "ArrowRight": mover(-passo, 0); break;
      case "ArrowUp": mover(0, passo); break;
      case "ArrowDown": mover(0, -passo); break;
      case "Home": case "0": useUi.getState().focar({ tipo: "home" }); break;
      case "Escape": useUi.getState().selecionar(null); break;
      default: return;
    }
    e.preventDefault();
  }

  const aoSair = () => aoDica(null);

  const tamanho = new ResizeObserver(() => {
    medir();
    recalcularLimites();
    pintar(interagiu ? ajustar(atual) : inicio());
  });

  medir();
  recalcularLimites();
  pintar(inicio());
  tamanho.observe(raiz);
  raiz.addEventListener("wheel", aoRoda, { passive: false });
  raiz.addEventListener("pointerdown", aoApertar);
  raiz.addEventListener("pointermove", aoMover);
  raiz.addEventListener("pointerup", aoSoltar);
  raiz.addEventListener("pointercancel", aoSoltar);
  raiz.addEventListener("pointerleave", aoSair);
  raiz.addEventListener("dblclick", aoDuploClique);
  raiz.addEventListener("keydown", aoTeclar);
  const desAlvo = useUi.subscribe((s) => s.alvo, (a) => irPara(a.alvo));
  const desComando = useUi.subscribe((s) => s.comando, (c) => {
    if (c?.tipo === "zoom-in") aproximar(1.8);
    if (c?.tipo === "zoom-out") aproximar(1 / 1.8);
  });

  return () => {
    cancelAnimationFrame(animacao);
    cancelAnimationFrame(quadro);
    clearTimeout(commit);
    tamanho.disconnect();
    raiz.removeEventListener("wheel", aoRoda);
    raiz.removeEventListener("pointerdown", aoApertar);
    raiz.removeEventListener("pointermove", aoMover);
    raiz.removeEventListener("pointerup", aoSoltar);
    raiz.removeEventListener("pointercancel", aoSoltar);
    raiz.removeEventListener("pointerleave", aoSair);
    raiz.removeEventListener("dblclick", aoDuploClique);
    raiz.removeEventListener("keydown", aoTeclar);
    desAlvo();
    desComando();
  };
}
