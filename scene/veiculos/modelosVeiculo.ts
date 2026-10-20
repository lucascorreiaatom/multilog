"use client";
// Caminhões e carros modelados no Blender (public/modelos/veiculos.glb, multilog_foz/export_app.py --alvo=next):
//   CAVALO com origem no eixo traseiro; CARRETA_<implemento> com origem no pino-rei; CARRO_sedan e CARRO_suv no centro.
// Cada modelo vira duas geometrias: "corpo" (pintura da cabine, da carreta ou do contêiner, tingida pela cor da
// instância) e "neutro" (rodas, chassi, vidros, faróis), com as cores dos materiais do Blender em cores de vértice.
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Implemento } from "@/lib/patio/tipos";

export const URL_VEICULOS = "/modelos/veiculos.glb";
const DRACO = "/draco/";
useGLTF.preload(URL_VEICULOS, DRACO);

export interface PecasCaminhao {
  corpo: THREE.BufferGeometry;
  neutro: THREE.BufferGeometry;
}

export interface ModelosVeiculo {
  cavalo: PecasCaminhao;
  carretas: Record<Implemento, PecasCaminhao>;
  carros: PecasCaminhao[];
}

export const IMPLEMENTOS: Implemento[] = ["bau", "sider", "container20", "container40", "graneleiro", "tanque"];

/** pintura que recebe a cor da instância (o tanque fica sempre no aço do modelo) */
const PINTURA = /^(Cabine_|Carro_|Conteiner_|Carreta_(?!Tanque))/;
/** o Blender exporta a frente para -Z; a cena usa X para a frente */
const FRENTE_X = new THREE.Matrix4().makeRotationY(-Math.PI / 2);

function pecas(raiz: THREE.Object3D): PecasCaminhao {
  raiz.updateMatrixWorld(true);
  const corpo: THREE.BufferGeometry[] = [], neutro: THREE.BufferGeometry[] = [];
  const cor = new THREE.Color();
  raiz.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    const g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(FRENTE_X, m.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    const nao = g.index ? g.toNonIndexed() : g;
    const tinta = PINTURA.test(mat.name);
    cor.copy(tinta ? new THREE.Color(1, 1, 1) : mat.color);
    const n = nao.getAttribute("position").count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([cor.r, cor.g, cor.b], i * 3);
    nao.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    (tinta ? corpo : neutro).push(nao);
  });
  const juntar = (gs: THREE.BufferGeometry[]) => {
    const g = gs.length ? mergeGeometries(gs) : new THREE.BufferGeometry();
    g.computeBoundingSphere();
    return g;
  };
  return { corpo: juntar(corpo), neutro: juntar(neutro) };
}

const cache = new WeakMap<THREE.Object3D, ModelosVeiculo>();

/** suspende até o .glb carregar; envolva em <Suspense> */
export function useModelosVeiculo(): ModelosVeiculo {
  const { scene } = useGLTF(URL_VEICULOS, DRACO);
  const pronto = cache.get(scene);
  if (pronto) return pronto;
  const no = (nome: string) => scene.getObjectByName(nome)!;
  const modelos: ModelosVeiculo = {
    cavalo: pecas(no("CAVALO")),
    carretas: Object.fromEntries(IMPLEMENTOS.map((t) => [t, pecas(no(`CARRETA_${t}`))])) as Record<Implemento, PecasCaminhao>,
    carros: ["CARRO_sedan", "CARRO_suv"].map((n) => pecas(no(n))),
  };
  cache.set(scene, modelos);
  return modelos;
}
