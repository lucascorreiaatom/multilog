// Iluminação global da noite assada no Blender (bake_luz.py no projeto multilog_foz): as luminárias do render
// (pétalas dos postes, docas, portaria e arandelas) com os rebatimentos do Cycles, gravadas em mapas vistos de cima.
// Cada material lê o mapa pela posição no mundo e soma a luz como luz indireta difusa; caminhões e carros não
// entram no bake e acendem ao passar pelas poças de luz.
//   chao:   luz que chega no chão (prédios, árvores e postes fazem sombra mas não aparecem)
//   teto:   luz na primeira superfície vista de cima (telhados, cobertura da portaria, copas)
//   altura: altura dessa superfície, para saber se o fragmento está no teto ou embaixo dele
import * as THREE from "three";
import luz from "@/lib/site/luz.json";

/** os mapas guardam a radiância do Cycles e a exposição +1 do render fica na Atmosfera, como para o resto da cena;
 *  os 15% a mais cobrem a luz que as janelas acesas jogam no chão (o bake não leva emissivos) e o ACES, que escurece
 *  mais que o AgX do Blender na queda das poças */
const FORCA_NOITE = 1.15;

const U = {
  uLuzChao: { value: null as THREE.Texture | null },
  uLuzTeto: { value: null as THREE.Texture | null },
  uLuzAltura: { value: null as THREE.Texture | null },
  /** x e z do canto noroeste, 1/largura, 1/profundidade (m) */
  uLuzRet: { value: new THREE.Vector4(luz.x, luz.z, 1 / luz.largura, 1 / luz.profundidade) },
  /** escala de cada mapa (8 bits normalizados) e altura máxima do mapa de altura */
  uLuzEscala: { value: new THREE.Vector3(luz.chao, luz.teto, luz.alturaMax) },
  uLuzForca: { value: 0 },
};

function carregar(url: string, cor: boolean) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

/** os mapas só carregam no navegador, na primeira compilação de um material iluminado */
function mapas() {
  if (U.uLuzChao.value) return;
  U.uLuzChao.value = carregar("/modelos/luz-noite-chao.webp", true);
  U.uLuzTeto.value = carregar("/modelos/luz-noite-teto.webp", true);
  U.uLuzAltura.value = carregar("/modelos/luz-noite-altura.webp", false);
}

/** acende a luz assada à noite; de dia ela fica zerada (o sol e o céu já iluminam) */
export function ligarLuzAssada(noite: boolean) {
  U.uLuzForca.value = noite ? FORCA_NOITE : 0;
}

const VERTICE = /* glsl */ `#include <project_vertex>
vec4 luzMundo = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  luzMundo = batchingMatrix * luzMundo;
#endif
#ifdef USE_INSTANCING
  luzMundo = instanceMatrix * luzMundo;
#endif
vLuzMundo = (modelMatrix * luzMundo).xyz;`;

const DECLARACOES = /* glsl */ `
uniform sampler2D uLuzChao;
uniform sampler2D uLuzTeto;
uniform sampler2D uLuzAltura;
uniform vec4 uLuzRet;
uniform vec3 uLuzEscala;
uniform float uLuzForca;
varying vec3 vLuzMundo;`;

const FRAGMENTO = /* glsl */ `#include <lights_fragment_end>
if (uLuzForca > 0.0) {
  vec3 nMundo = inverseTransformDirection(normal, viewMatrix);
  // paredes e laterais leem o chão logo à frente da face
  vec2 xz = vLuzMundo.xz + nMundo.xz * 0.8;
  vec2 uvLuz = vec2((xz.x - uLuzRet.x) * uLuzRet.z, 1.0 - (xz.y - uLuzRet.y) * uLuzRet.w);
  float h = vLuzMundo.y;
  float hTeto = texture2D(uLuzAltura, uvLuz).r * uLuzEscala.z;
  vec3 noChao = texture2D(uLuzChao, uvLuz).rgb * uLuzEscala.x;
  vec3 noTeto = texture2D(uLuzTeto, uvLuz).rgb * uLuzEscala.y;
  float paraCima = smoothstep(0.35, 0.8, nMundo.y);
  float ehTeto = paraCima * step(0.6, h) * (1.0 - smoothstep(0.6, 1.6, abs(h - hTeto)));
  vec3 luzAssada = mix(noChao, noTeto, ehTeto);
  // face de lado recebe parte da luz e cai com a altura; face para baixo só o rebatimento do chão
  float face = mix(0.4, 1.0, nMundo.y * 0.5 + 0.5);
  float queda = mix(exp(-max(h, 0.0) / 12.0), 1.0, paraCima);
  reflectedLight.indirectDiffuse += luzAssada * (face * queda * uLuzForca) * material.diffuseColor;
}`;

function injetar(shader: THREE.WebGLProgramParametersWithUniforms) {
  mapas();
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vLuzMundo;")
    .replace("#include <project_vertex>", VERTICE);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${DECLARACOES}`)
    .replace("#include <lights_fragment_end>", FRAGMENTO);
}

/** material (Standard ou Physical) passa a receber a luz assada da noite, mantendo o onBeforeCompile que já tinha */
export function iluminadoPelaNoite<M extends THREE.Material>(m: M): M {
  if (m.userData.luzAssada) return m;
  const anterior = m.onBeforeCompile;
  const chave = `${anterior.toString()}|luzAssada`;
  m.onBeforeCompile = (shader, renderer) => {
    anterior.call(m, shader, renderer);
    injetar(shader);
  };
  m.customProgramCacheKey = () => chave;
  m.userData.luzAssada = true;
  return m;
}
