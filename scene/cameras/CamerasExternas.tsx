"use client";
// Câmeras externas no estilo do app Vite do mapa: poste e cabeça (domo, bullet ou PTZ conforme o modelo AXIS),
// ampliada para ler de longe e virada para o rumo da câmera. Leques de cobertura no chão por modelo.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { useUi } from "@/lib/store/ui";
import { CAMADA, sobre } from "../camadas";

const ESCALA_CABECA = 1.8;
const BRANCO: [number, number, number] = [0.95, 0.96, 0.97];
const ESCURO: [number, number, number] = [0.08, 0.09, 0.1];

function pintada(g: THREE.BufferGeometry, [r, gr, b]: [number, number, number], m?: THREE.Matrix4) {
  const p = g.toNonIndexed();
  if (m) p.applyMatrix4(m);
  const n = p.getAttribute("position").count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([r, gr, b], i * 3);
  p.setAttribute("color", new THREE.BufferAttribute(c, 3));
  for (const k of Object.keys(p.attributes)) if (!["position", "normal", "color"].includes(k)) p.deleteAttribute(k);
  return p;
}

const em = (x = 0, y = 0, z = 0, rx = 0) => new THREE.Matrix4().makeRotationX(rx).setPosition(x, y, z);

/** cabeças com a lente principal para +Z (convertidas para o rumo da câmera na matriz de cada instância) */
function cabecas() {
  return {
    domo: mergeGeometries([
      pintada(new THREE.CylinderGeometry(0.24, 0.26, 0.16, 20), BRANCO),
      pintada(new THREE.SphereGeometry(0.21, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ESCURO, em(0, -0.06)),
    ]),
    bullet: mergeGeometries([
      pintada(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 14), BRANCO, em(0, 0, 0.1, Math.PI / 2)),
      pintada(new THREE.BoxGeometry(0.24, 0.03, 0.5), BRANCO, em(0, 0.11, 0.12)),
      pintada(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), ESCURO, em(0, 0, 0.32, Math.PI / 2)),
      pintada(new THREE.BoxGeometry(0.06, 0.06, 0.22), BRANCO, em(0, 0, -0.12)),
    ]),
    ptz: mergeGeometries([
      pintada(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 16), BRANCO),
      pintada(new THREE.BoxGeometry(0.34, 0.3, 0.32), BRANCO, em(0, -0.24)),
      pintada(new THREE.BoxGeometry(0.2, 0.14, 0.02), ESCURO, em(0, -0.24, 0.165)),
    ]),
  };
}

const FORMA: Record<string, "domo" | "bullet" | "ptz"> = { "P1487-LE": "bullet", "Q6225-LE": "ptz" };

export function CamerasExternas() {
  const poste = useRef<THREE.InstancedMesh>(null!);
  const refs = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const geos = useMemo(() => ({ ...cabecas(), poste: new THREE.CylinderGeometry(0.11, 0.16, 1, 8) }), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2 }), []);
  const lotes = useMemo(() => {
    const out: Record<"domo" | "bullet" | "ptz", typeof camerasExternas> = { domo: [], bullet: [], ptz: [] };
    for (const c of camerasExternas) out[FORMA[c.modelo] ?? "domo"].push(c);
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), y = new THREE.Vector3(0, 1, 0);
    camerasExternas.forEach((c, i) => {
      poste.current.setMatrixAt(i, m.compose(new THREE.Vector3(c.posicao[0], c.altura / 2, c.posicao[1]), q.identity(), s.set(1, c.altura, 1)));
    });
    poste.current.instanceMatrix.needsUpdate = true;
    for (const [forma, lista] of Object.entries(lotes)) {
      const malha = refs.current[forma];
      if (!malha) continue;
      lista.forEach((c, i) => {
        // rumo: ângulo no plano XZ a partir de +X; a lente da cabeça olha para +Z
        q.setFromAxisAngle(y, Math.PI / 2 - c.rumo);
        malha.setMatrixAt(i, m.compose(new THREE.Vector3(c.posicao[0], c.altura, c.posicao[1]), q, s.setScalar(ESCALA_CABECA)));
      });
      malha.instanceMatrix.needsUpdate = true;
      malha.computeBoundingSphere();
    }
    poste.current.computeBoundingSphere();
  }, [lotes]);
  return (
    <group>
      <instancedMesh ref={poste} args={[geos.poste, undefined, camerasExternas.length]} castShadow>
        <meshStandardMaterial color="#8e959c" roughness={0.4} metalness={0.7} />
      </instancedMesh>
      {(Object.keys(lotes) as ("domo" | "bullet" | "ptz")[]).map((f) => lotes[f].length > 0 && (
        <instancedMesh key={f} ref={(r) => { refs.current[f] = r; }} args={[geos[f], material, lotes[f].length]} castShadow />
      ))}
    </group>
  );
}

/** leques de cobertura de todas as câmeras externas (camada opcional) e destaque da selecionada */
export function Cobertura() {
  const ligada = useUi((s) => s.cobertura);
  // card da câmera fechado = nenhuma câmera em destaque
  const ativa = useUi((s) => (s.blocos.camera === "oculto" ? null : s.cameraAtiva));
  // em grade todas as visões estão na tela: todos os leques com o mesmo destaque
  const sensor = useUi((s) => (s.grade ? -1 : s.sensor));
  const geos = useMemo(() => camerasExternas.map((c) => {
    const mod = MODELOS[c.modelo];
    const alcance = c.modelo === "Q6225-LE" ? 140 : c.modelo === "P1487-LE" ? 70 : c.modelo === "P3827-PVE" ? 45 : 60;
    const fatias: THREE.BufferGeometry[] = [];
    for (const d of mod.direcoes) {
      const abertura = (Math.min(mod.fovH, 359) * Math.PI) / 180;
      const g = new THREE.CircleGeometry(alcance, 24, -abertura / 2, abertura);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-(c.rumo + (d * Math.PI) / 180));
      fatias.push(g);
    }
    return { c, fatias };
  }), []);
  return (
    <group>
      {geos.map(({ c, fatias }) => {
        const destaque = c.numero === ativa;
        if (!ligada && !destaque) return null;
        return (
          <group key={c.numero} position={[c.posicao[0], 0.12, c.posicao[1]]}>
            {fatias.map((g, i) => (
              <mesh key={i} geometry={g} renderOrder={2}>
                <meshBasicMaterial color={destaque ? "#4e91ed" : "#909ca6"} transparent opacity={destaque ? (sensor < 0 || i === sensor || fatias.length === 1 ? 0.26 : 0.12) : 0.08} depthWrite={false} {...sobre(CAMADA.sobreposicao)} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
