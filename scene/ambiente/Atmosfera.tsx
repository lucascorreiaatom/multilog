"use client";
// Céu, luz ambiente e sol (ou lua) da cena, iguais aos do app Vite do mapa (multilog_foz): céu físico com
// reflexo de ambiente de dia; à noite céu azul-escuro, estrelas, ambiente frio e lua. A sombra do sol é calculada
// uma vez e refeita quando o pátio muda (SombraEstatica), não a cada quadro.
import { Environment, Sky, Stars } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { usePatio } from "@/lib/store/patio";

const SOL = new THREE.Vector3(0.52, 0.72, -0.46).normalize();
const LUA = new THREE.Vector3(-0.35, 0.8, 0.45).normalize();
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
  if (noite) {
    return (
      <>
        <color attach="background" args={["#04070d"]} />
        <fogExp2 attach="fog" args={["#05080f", 0.00055]} />
        <Stars radius={2400} depth={400} count={5000} factor={7} saturation={0} fade />
        <Environment resolution={64} frames={1} environmentIntensity={0.55}>
          <color attach="background" args={["#2c4166"]} />
        </Environment>
        <hemisphereLight args={["#4a6796", "#141a24", 0.9]} />
        <LuzDirecional direcao={LUA} intensidade={0.85} cor="#a9c1ee" mapa={mapaSombra} />
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
