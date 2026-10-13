// Filtro de status do mapa aplicado no shader: cada instância (vaga, faixa, caminhão) tem a flag
// "fora do filtro" e colapsa no vertex shader. Trocar o filtro só reescreve as flags, sem tocar em matrizes.
import * as THREE from "three";

/** 1 = filtro aplicado; 0 = cena completa */
export const uFiltro = { value: 1 };

type Shader = THREE.WebGLProgramParametersWithUniforms;

/** atributo por instância com a flag (0 visível, 1 fora do filtro) */
export function atributoFiltro(geo: THREE.BufferGeometry, nome: "aOculto", n: number) {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute(nome, a);
  return a;
}

/** instância fora do filtro colapsa num ponto (some do desenho e da sombra) */
export function ocultavel(shader: Shader) {
  shader.uniforms.uFiltro = uFiltro;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float aOculto;\nuniform float uFiltro;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nif (aOculto * uFiltro > 0.5) transformed = vec3(0.0);");
}

/** material de sombra que respeita o filtro (senão o caminhão oculto ainda projetaria sombra) */
export function profundidadeOcultavel() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = ocultavel;
  return m;
}
