// Cenário modelado no Blender (multilog_foz, export_app.py --alvo=next): chão, ruas, sinalização, canteiros,
// prédios, portaria, cerca, postes e entorno, já no referencial de lib/site/planta.json.
// O que muda com o status (vagas, cancelas, caminhões, câmeras) continua desenhado pela cena por cima.
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

/** tema escuro: cada família de material escurece numa proporção próxima à da PALETA.noite */
const FATOR_NOITE: [RegExp, number][] = [
  [/^(Grama|Lavoura|Copa_|Tronco)/, 0.26],
  [/^(Asfalto|Concreto|Calcada|Meio_Fio|Aco_Balanca)/, 0.55],
  [/^Tinta_/, 0.8],
  [/^Conteiner_/, 0.65],
];
const FATOR_NOITE_PADRAO = 0.42;
const BRILHO_NOITE: Record<string, [string, number]> = {
  Vidro: ["#f2c879", 0.55],
  Claraboia: ["#f2c879", 0.15],
  Luz_LED: ["#ffd38a", 3],
  Letreiro_Branco: ["#ffffff", 1.2],
  Azul_Multilog: ["#4a6a9e", 0.35],
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

/** troca o material entre dia e noite guardando a cor original de dia no próprio material */
export function aplicarTema(pecas: PecaCenario[], noite: boolean) {
  for (const { material: m } of pecas) {
    const dia = (m.userData.dia ??= { cor: m.color.getHex(), emissiva: m.emissive.getHex(), brilho: m.emissiveIntensity }) as {
      cor: number; emissiva: number; brilho: number;
    };
    m.color.setHex(dia.cor);
    m.emissive.setHex(dia.emissiva);
    m.emissiveIntensity = dia.brilho;
    if (!noite) continue;
    m.color.multiplyScalar(FATOR_NOITE.find(([re]) => re.test(m.name))?.[1] ?? FATOR_NOITE_PADRAO);
    const brilho = BRILHO_NOITE[m.name];
    if (brilho) {
      m.emissive.set(brilho[0]);
      m.emissiveIntensity = brilho[1];
    }
  }
}
