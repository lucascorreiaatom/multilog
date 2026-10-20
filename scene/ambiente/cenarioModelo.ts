// Cenário modelado no Blender (multilog_foz, export_app.py --alvo=next): chão, ruas, sinalização, canteiros,
// prédios, portaria, cerca, postes e entorno, já no referencial de lib/site/planta.json.
// O que muda com o status (vagas, cancelas, caminhões, câmeras) é desenhado pela cena por cima, a partir de
// lib/site/planta.json, gerado pelo mesmo projeto Blender.
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const DRACO = "/draco/";
export const URL_PATIO = "/modelos/patio.glb";
export const URL_ENTORNO = "/modelos/entorno.glb";
useGLTF.preload(URL_PATIO, DRACO);
useGLTF.preload(URL_ENTORNO, DRACO);

/** pisos e pinturas rentes ao chão não projetam sombra */
const SEM_SOMBRA = /^(Grama|Asfalto|Concreto_Piso|Calcada|Meio_Fio|Tinta_|Lavoura|Tela_)/;

/** à noite (como no app Vite): a luz do ambiente cai e acendem vidros, LEDs dos postes, letreiros e a faixa azul */
const BRILHO_NOITE: Record<string, [string, number]> = {
  Vidro: ["#ffcf8f", 0.85],
  Claraboia: ["#ffe2b0", 0.3],
  Luz_LED: ["#fff3dc", 7],
  Letreiro_Branco: ["#ffffff", 2],
  Azul_Multilog: ["#2f6fe8", 0.6],
};

export interface PecaCenario {
  chave: string;
  geometria: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  sombra: boolean;
}

const unidas = new WeakMap<THREE.Object3D, PecaCenario[]>();

function assinatura(g: THREE.BufferGeometry) {
  return [g.index ? "i" : "n", ...Object.keys(g.attributes).sort()].join(",");
}

/** o cenário não se mexe: tudo que divide material vira uma malha só (dezenas de draw calls em vez de centenas) */
function unirPorMaterial(cena: THREE.Object3D): PecaCenario[] {
  const pronta = unidas.get(cena);
  if (pronta) return pronta;
  cena.updateMatrixWorld(true);
  const grupos = new Map<string, { material: THREE.MeshStandardMaterial; geos: THREE.BufferGeometry[] }>();
  cena.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const material = m.material as THREE.MeshStandardMaterial;
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const chave = `${material.uuid}|${assinatura(g)}`;
    if (!grupos.has(chave)) grupos.set(chave, { material, geos: [] });
    grupos.get(chave)!.geos.push(g);
  });
  const pecas = [...grupos.entries()].map(([chave, { material, geos }]) => ({
    chave,
    material,
    geometria: mergeGeometries(geos),
    sombra: !SEM_SOMBRA.test(material.name),
  }));
  unidas.set(cena, pecas);
  return pecas;
}

export function useCenario(url: string) {
  const { scene } = useGLTF(url, DRACO);
  return unirPorMaterial(scene);
}

/** acende ou apaga os materiais que brilham à noite, guardando o brilho de dia no próprio material */
export function aplicarTema(pecas: PecaCenario[], noite: boolean) {
  for (const { material: m } of pecas) {
    const brilho = BRILHO_NOITE[m.name];
    if (!brilho) continue;
    const dia = (m.userData.dia ??= { emissiva: m.emissive.getHex(), intensidade: m.emissiveIntensity }) as { emissiva: number; intensidade: number };
    if (noite) {
      m.emissive.set(brilho[0]);
      m.emissiveIntensity = brilho[1];
    } else {
      m.emissive.setHex(dia.emissiva);
      m.emissiveIntensity = dia.intensidade;
    }
  }
}
