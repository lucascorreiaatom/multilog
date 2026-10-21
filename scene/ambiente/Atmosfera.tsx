"use client";
// Céu, luz ambiente e sol (ou lua) da cena. De dia, céu físico com reflexo de ambiente, como no app Vite do mapa.
// À noite, a mesma noite do render do Blender (luzes_noite.py no projeto multilog_foz): mundo azul #2C4166 com
// força 1,6 como céu e luz ambiente, luar frio vindo do nordeste e exposição +1; as luminárias entram pela luz
// assada (luzAssada.ts). A sombra do sol é calculada uma vez e refeita quando o pátio muda (SombraEstatica).
import { Environment, Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { usePatio } from "@/lib/store/patio";

const SOL = new THREE.Vector3(0.52, 0.72, -0.46).normalize();
/** direção do luar do render (objeto Sol do Blender girado 38°, 0, 140° na noite), no referencial do app */
const LUA = new THREE.Vector3(0.396, 0.788, -0.472).normalize();
/** cor do mundo da noite no Blender, em linear, com a força 1,6 */
const CEU_NOITE = new THREE.Color("#2c4166").multiplyScalar(1.6);
/** a noite do render tem exposição +1 (2x) com AgX; o ACES escurece mais as sombras, então aqui vai a 2,5x
 *  (o ACES do three divide por 0,6), calibrado lado a lado com o render na vista inicial */
const EXPOSICAO_NOITE = 1.5;
const ALCANCE_SOMBRA = 470;

function LuzDirecional({ direcao, intensidade, cor, mapa }: { direcao: THREE.Vector3; intensidade: number; cor: string; mapa: number }) {
  return (
    <directionalLight
      position={direcao.clone().multiplyScalar(700).toArray()}
      intensity={intensidade}
      color={cor}
      castShadow
      shadow-mapSize={[mapa, mapa]}
      shadow-camera-left={-ALCANCE_SOMBRA}
      shadow-camera-right={ALCANCE_SOMBRA}
      shadow-camera-top={ALCANCE_SOMBRA}
      shadow-camera-bottom={-ALCANCE_SOMBRA}
      shadow-camera-near={100}
      shadow-camera-far={1500}
      shadow-bias={-0.0003}
      shadow-normalBias={0.6}
    />
  );
}

function CeuDia() {
  return (
    <Sky distance={6000} sunPosition={SOL.clone().multiplyScalar(1000).toArray()} turbidity={5.5} rayleigh={1.1} mieCoefficient={0.004} mieDirectionalG={0.86} />
  );
}

export function Atmosfera({ noite, mapaSombra = 4096 }: { noite: boolean; mapaSombra?: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = noite ? EXPOSICAO_NOITE : 1;
  }, [gl, noite]);
  if (noite) {
    return (
      <>
        <color attach="background" args={[CEU_NOITE]} />
        <fogExp2 attach="fog" args={[CEU_NOITE, 0.00022]} />
        <Environment resolution={64} frames={1} environmentIntensity={1.6}>
          <color attach="background" args={["#2c4166"]} />
        </Environment>
        <LuzDirecional direcao={LUA} intensidade={0.9} cor="#a9c1ee" mapa={mapaSombra} />
      </>
    );
  }
  return (
    <>
      <CeuDia />
      <fogExp2 attach="fog" args={["#cdd9e6", 0.00024]} />
      <Environment resolution={256} frames={1} environmentIntensity={0.75}>
        <CeuDia />
      </Environment>
      <hemisphereLight args={["#d7e6ff", "#4f5c3c", 0.45]} />
      <LuzDirecional direcao={SOL} intensidade={3.1} cor="#fff2df" mapa={mapaSombra} />
    </>
  );
}

/** o pátio só muda quando o status das vagas muda: a sombra é recalculada nesses momentos (e quando os modelos
 *  terminam de carregar). Com `dinamica` (qualidade máxima) a sombra acompanha também os caminhões em movimento. */
export function SombraEstatica({ dinamica, versao }: { dinamica: boolean; versao: string }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = dinamica;
    if (dinamica) return;
    const refazer = () => { gl.shadowMap.needsUpdate = true; };
    refazer();
    const atrasos = [300, 1500, 4000].map((ms) => setTimeout(refazer, ms));
    const des = usePatio.subscribe((s) => s.vagas, refazer);
    return () => { atrasos.forEach(clearTimeout); des(); gl.shadowMap.autoUpdate = true; };
  }, [gl, dinamica, versao]);
  return null;
}
