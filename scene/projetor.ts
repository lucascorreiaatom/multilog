// Projeção 3D para DOM num único loop de quadro: marcadores e callouts registram aqui o elemento
// e o ponto no mundo; a cena atualiza o transform de todos de uma vez, sem re-render do React.
import * as THREE from "three";

export interface ItemProjetado {
  el: HTMLElement;
  pos: THREE.Vector3;
  /** deslocamento em pixels aplicado após a projeção */
  dx?: number;
  dy?: number;
  /** oculta além desta distância da câmera (m) */
  distMax?: number;
}

export const projetados = new Map<string, ItemProjetado>();

export function registrarProjetado(chave: string, item: ItemProjetado) {
  projetados.set(chave, item);
  return () => {
    if (projetados.get(chave)?.el === item.el) projetados.delete(chave);
  };
}

const v = new THREE.Vector3();

export function projetarTodos(camera: THREE.Camera, largura: number, altura: number) {
  for (const item of projetados.values()) {
    v.copy(item.pos).project(camera);
    const atras = v.z > 1;
    const dist = camera.position.distanceTo(item.pos);
    const oculto = atras || (item.distMax !== undefined && dist > item.distMax);
    const x = Math.round((v.x * 0.5 + 0.5) * largura + (item.dx ?? 0));
    const y = Math.round((-v.y * 0.5 + 0.5) * altura + (item.dy ?? 0));
    item.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    item.el.style.visibility = oculto ? "hidden" : "visible";
  }
}
