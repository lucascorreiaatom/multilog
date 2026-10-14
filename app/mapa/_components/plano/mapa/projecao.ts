// Sobreposições HTML do mapa plano (rótulos, marcadores): cada uma registra o elemento e o ponto do desenho, e o mapa
// atualiza o transform de todas de uma vez quando a vista muda, sem re-render do React (mesma ideia de scene/projetor).
import type { Ponto, Vista } from "@/lib/mapa/vista";

const itens = new Map<string, { el: HTMLElement; p: Ponto }>();
let vistaAtual: Vista | null = null;

function posicionar(el: HTMLElement, [x, y]: Ponto, v: Vista) {
  el.style.transform = `translate3d(${Math.round(x * v.k + v.x)}px, ${Math.round(y * v.k + v.y)}px, 0)`;
}

export function registrar(chave: string, el: HTMLElement, p: Ponto) {
  itens.set(chave, { el, p });
  if (vistaAtual) posicionar(el, p, vistaAtual);
  return () => { if (itens.get(chave)?.el === el) itens.delete(chave); };
}

export function projetarTodos(v: Vista) {
  vistaAtual = v;
  for (const { el, p } of itens.values()) posicionar(el, p, v);
}
