"use client";
// Transmissão AO VIVO renderizada: uma câmera virtual na posição, altura e óptica de cada AXIS
// renderiza a cena (12 qps, baixa resolução) numa textura; um shader aplica a projeção do modelo
// (perspectiva por sensor, panorâmica 180° via cubemap, PTZ) e o aspecto de CFTV.
// É desenhada por cima do canvas, no recorte do elemento de vídeo do card (sem segundo contexto WebGL).
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { useUi } from "@/lib/store/ui";

/** canvas 2D do card que recebe o vídeo (o card registra aqui) */
export const alvoTransmissao: { el: HTMLCanvasElement | null } = { el: null };

const QPS = 12;

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform samplerCube uCubo;
uniform int uModo; // 0 perspectiva, 1 panorâmica 180
uniform float uTempo;
uniform float uNoite;
uniform float uRumo;
uniform float uInclinacao;
uniform float uOffline;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec3 cor;
  if (uModo == 1) {
    float az = uRumo + (vUv.x - 0.5) * 3.14159265;
    float el = uInclinacao + (vUv.y - 0.5) * 1.5707963;
    vec3 dir = vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az));
    cor = textureCube(uCubo, vec3(-dir.x, dir.y, dir.z)).rgb;
  } else {
    cor = texture2D(uTex, vUv).rgb;
  }
  // aspecto de CFTV: leve dessaturação, grão, vinheta
  float l = dot(cor, vec3(0.299, 0.587, 0.114));
  cor = mix(vec3(l), cor, 0.82);
  if (uNoite > 0.5) { cor = vec3(pow(l * 1.9, 0.85)) * vec3(0.92, 0.97, 1.0); }
  float g = hash(vUv * 900.0 + uTempo * 13.0) - 0.5;
  cor += g * 0.045;
  vec2 c = vUv - 0.5;
  cor *= 1.0 - dot(c, c) * 0.55;
  if (uOffline > 0.5) { float n = hash(floor(vUv * vec2(320.0, 180.0)) + floor(uTempo * 24.0)); cor = vec3(n * 0.35 + 0.08); }
  gl_FragColor = vec4(cor, 1.0);
}`;

export function Transmissao({ noite, offline }: { noite: boolean; offline: number[] }) {
  const { gl, scene, size } = useThree();
  const fbo = useMemo(() => new THREE.WebGLRenderTarget(480, 270, { samples: 2 }), []);
  const cuboRT = useMemo(() => new THREE.WebGLCubeRenderTarget(256), []);
  const cuboCam = useMemo(() => new THREE.CubeCamera(1, 1800, cuboRT), [cuboRT]);
  const pov = useMemo(() => new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 2400), []);
  const quad = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
      uniforms: { uTex: { value: fbo.texture }, uCubo: { value: cuboRT.texture }, uModo: { value: 0 }, uTempo: { value: 0 }, uNoite: { value: 0 }, uRumo: { value: 0 }, uInclinacao: { value: 0 }, uOffline: { value: 0 } },
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.frustumCulled = false;
    const s = new THREE.Scene();
    s.add(m);
    return { s, mat };
  }, [fbo, cuboRT]);
  const ortho = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const ultimo = useRef(0);

  useEffect(() => () => { fbo.dispose(); cuboRT.dispose(); }, [fbo, cuboRT]);

  useFrame((estado) => {
    const el = alvoTransmissao.el;
    if (!el) return;
    const ui = useUi.getState();
    const cam = camerasExternas.find((c) => c.numero === ui.cameraAtiva);
    if (!cam) return;
    const mod = MODELOS[cam.modelo];
    const canvasRect = gl.domElement.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = r.left - canvasRect.left, y = canvasRect.bottom - r.bottom;
    if (r.width < 4 || r.height < 4) return;
    const t = estado.clock.elapsedTime;
    const panoramica = mod.projecao === "panoramica180";

    if (t - ultimo.current > 1 / QPS) {
      ultimo.current = t;
      const pos = new THREE.Vector3(cam.posicao[0], cam.altura - 0.4, cam.posicao[1]);
      const sombra = gl.shadowMap.autoUpdate;
      gl.shadowMap.autoUpdate = false;
      if (panoramica) {
        cuboCam.position.copy(pos);
        cuboCam.update(gl, scene);
      } else {
        let rumo = cam.rumo + ((mod.direcoes[ui.sensor] ?? 0) * Math.PI) / 180;
        let incl = cam.inclinacao;
        let fov = mod.fovV;
        if (mod.projecao === "ptz") { rumo += ui.ptz.pan; incl += ui.ptz.tilt; fov = mod.fovV / ui.ptz.zoom; }
        pov.fov = Math.max(1.2, fov);
        pov.aspect = r.width / r.height;
        pov.updateProjectionMatrix();
        pov.position.copy(pos);
        pov.lookAt(pos.x + Math.cos(rumo) * Math.cos(incl), pos.y + Math.sin(incl), pos.z + Math.sin(rumo) * Math.cos(incl));
        gl.setRenderTarget(fbo);
        gl.clear();
        gl.render(scene, pov);
        gl.setRenderTarget(null);
      }
      gl.shadowMap.autoUpdate = sombra;
    }

    const u = quad.mat.uniforms;
    u.uModo.value = panoramica ? 1 : 0;
    u.uTempo.value = t;
    u.uNoite.value = noite ? 1 : 0;
    u.uRumo.value = cam.rumo;
    u.uInclinacao.value = cam.inclinacao;
    u.uOffline.value = offline.includes(cam.numero) ? 1 : 0;
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setScissorTest(true);
    gl.setScissor(x, y, r.width, r.height);
    gl.setViewport(x, y, r.width, r.height);
    gl.render(quad.s, ortho);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.autoClear = autoClear;
    // copia o recorte para o canvas do card no mesmo quadro (o card é opaco e cobre o recorte no canvas principal)
    const dpr = gl.getPixelRatio();
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
    el.getContext("2d")?.drawImage(gl.domElement, Math.round((r.left - canvasRect.left) * dpr), Math.round((r.top - canvasRect.top) * dpr), w, h, 0, 0, w, h);
  }, 2);

  return null;
}
