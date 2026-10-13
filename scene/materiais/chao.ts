"use client";
// Textura de chão leve, a partir de 3 texturas CC0 do Poly Haven (aerial_grass_rock, aerial_asphalt_01, brushed_concrete):
// public/modelos/chao-detalhe.jpg (512×512, ~150 KB) guarda só o relevo de luz de cada uma, um canal por superfície
// (R grama, G asfalto, B concreto; 128 = 1,0). O shader lê 2 vezes por pixel em coordenadas de mundo: uma na escala de
// metros (grão) e outra em centenas de metros (manchas), o que quebra a repetição vista do alto. Só multiplica a cor da
// paleta, então tema noturno e Modo foco continuam valendo (no Modo foco a variação é zerada para a maquete ficar limpa).
// Gerada por scripts/modelos-chao.py. Créditos em public/modelos/CREDITOS.txt.
import { useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useUi } from "@/lib/store/ui";

export const URL_CHAO = "/modelos/chao-detalhe.jpg";

let textura: THREE.Texture | null = null;
let carregada = false;
const aoCarregar = new Set<() => void>();
function texturaChao() {
  if (textura) return textura;
  textura = new THREE.TextureLoader().load(URL_CHAO, () => {
    carregada = true;
    aoCarregar.forEach((f) => f());
    aoCarregar.clear();
  });
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.colorSpace = THREE.NoColorSpace; // dado, não cor: o fator já está linear
  textura.anisotropy = 4;
  return textura;
}

/** canal (R grama, G asfalto, B concreto), m por repetição do grão, m das manchas, tom amarelado nas manchas, força */
const PERFIS = {
  grama: { canal: [1, 0, 0], grao: 14, mancha: 260, tom: 1, forca: 0.9 },
  campo: { canal: [1, 0, 0], grao: 9, mancha: 180, tom: 0.6, forca: 0.8 },
  asfalto: { canal: [0, 1, 0], grao: 10, mancha: 150, tom: 0, forca: 0.7 },
  concreto: { canal: [0, 0, 1], grao: 6, mancha: 110, tom: 0, forca: 0.55 },
} as const;
export type PerfilChao = keyof typeof PERFIS;

/** onBeforeCompile para um meshStandardMaterial de chão (malha sem instâncias) */
export function useDetalheChao(perfil: PerfilChao) {
  const foco = useUi((s) => s.foco);
  const u = useMemo(() => {
    const c = PERFIS[perfil];
    return {
      uChao: { value: texturaChao() },
      uChaoCanal: { value: new THREE.Vector3(...c.canal) },
      uChaoA: { value: new THREE.Vector3(c.grao, c.mancha, c.tom) },
      uChaoForca: { value: 0 },
    };
  }, [perfil]);
  useEffect(() => {
    const aplicar = () => { u.uChaoForca.value = foco ? 0 : PERFIS[perfil].forca; };
    // até a textura chegar a força fica em 0 (sem isso o chão piscaria preto no primeiro quadro)
    if (carregada) aplicar(); else aoCarregar.add(aplicar);
    return () => { aoCarregar.delete(aplicar); };
  }, [u, foco, perfil]);
  return useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vChaoXZ;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvChaoXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uChao;\nuniform vec3 uChaoCanal;\nuniform vec3 uChaoA;\nuniform float uChaoForca;\nvarying vec2 vChaoXZ;")
      .replace("#include <map_fragment>", `#include <map_fragment>
      {
        float chaoG = 2.0 * dot(texture2D(uChao, vChaoXZ / uChaoA.x).rgb, uChaoCanal);
        float chaoM = 2.0 * dot(texture2D(uChao, vChaoXZ / uChaoA.y + vec2(0.37, 0.61)).rgb, uChaoCanal);
        float chaoV = chaoG * mix(1.0, chaoM, 0.45);
        vec3 chaoTom = mix(vec3(1.0), vec3(1.08, 1.04, 0.85), smoothstep(1.05, 1.4, chaoM) * uChaoA.z);
        diffuseColor.rgb *= mix(vec3(1.0), chaoV * chaoTom, uChaoForca);
      }`);
  }, [u]);
}
