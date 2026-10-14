"use client";
// Transmissão AO VIVO renderizada: uma câmera virtual na posição, altura e óptica de cada AXIS renderiza a cena
// numa textura (na resolução do quadro no card); um shader aplica o aspecto de CFTV.
// Câmeras multissensor mostram uma visão por sensor (tiles do card, data-tile): um sensor por passo, em rodízio,
// com o mesmo orçamento de antes (12 renderizações por segundo no total), então a grade não pesa mais que uma visão.
// É desenhada por cima do canvas, no recorte de cada tile, e copiada para o canvas do card (sem segundo contexto WebGL).
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { camerasExternas } from "@/lib/cameras/catalogo";
import { MODELOS } from "@/lib/cameras/modelos";
import { useUi } from "@/lib/store/ui";

/** canvas 2D do card que recebe o vídeo (o card registra aqui) */
export const alvoTransmissao: { el: HTMLCanvasElement | null } = { el: null };

const rad = (g: number) => (g * Math.PI) / 180;

/** renderizações da cena por segundo, somando todos os sensores da câmera em exibição */
const QPS = 12;
/** raio dos tiles da grade, em px CSS (igual ao rounded-[12px] do card) */
const RAIO_TILE = 12;

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTempo;
uniform float uNoite;
uniform float uOffline;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec3 cor = texture2D(uTex, vUv).rgb;
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

/** leve (modo desempenho): vídeo sem MSAA (o grão e a vinheta de CFTV disfarçam) */
export function Transmissao({ noite, offline, leve }: { noite: boolean; offline: number[]; leve: boolean }) {
  const { gl, scene, size } = useThree();
  const fbo = useMemo(() => new THREE.WebGLRenderTarget(480, 270, { samples: leve ? 0 : 4 }), [leve]);
  const pov = useMemo(() => new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 2400), []);
  const quad = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
      uniforms: { uTex: { value: fbo.texture }, uTempo: { value: 0 }, uNoite: { value: 0 }, uOffline: { value: 0 } },
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.frustumCulled = false;
    const s = new THREE.Scene();
    s.add(m);
    return { s, mat };
  }, [fbo]);
  const ortho = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const ultimo = useRef(-1);
  /** próximo tile do rodízio e o layout desenhado (muda: limpa o canvas do card) */
  const rodizio = useRef({ passo: 0, layout: "" });
  const posicao = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => { fbo.dispose(); }, [fbo]);

  useFrame((estado) => {
    const el = alvoTransmissao.el;
    if (!el) return;
    // tudo só no quadro do vídeo: o canvas do card guarda a última imagem de cada tile entre um passo e outro, então
    // o quad, a cópia e a leitura dos retângulos não precisam rodar a cada quadro da cena
    const t = estado.clock.elapsedTime;
    if (t - ultimo.current < 1 / QPS) return;
    const ui = useUi.getState();
    const cam = camerasExternas.find((c) => c.numero === ui.cameraAtiva);
    if (!cam) return;
    const mod = MODELOS[cam.modelo];
    const tiles = el.parentElement ? [...el.parentElement.querySelectorAll<HTMLElement>("[data-tile]")] : [];
    if (!tiles.length) return;
    const canvasRect = gl.domElement.getBoundingClientRect();
    const re = el.getBoundingClientRect();
    if (re.width < 4 || re.height < 4) return;
    ultimo.current = t;

    const dpr = gl.getPixelRatio();
    const w = Math.round(re.width * dpr), h = Math.round(re.height * dpr);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const layout = `${cam.numero}:${w}x${h}:${tiles.map((d) => d.dataset.sensor).join(",")}`;
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
    if (rodizio.current.layout !== layout) { ctx.clearRect(0, 0, w, h); rodizio.current = { passo: 0, layout }; }
    const tile = tiles[rodizio.current.passo++ % tiles.length];
    const r = tile.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const sensor = Number(tile.dataset.sensor) || 0;

    const pos = posicao.set(cam.posicao[0], cam.altura - 0.4, cam.posicao[1]);
    const sombra = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    let rumo = cam.rumo + rad(mod.direcoes[sensor] ?? 0);
    let incl = cam.inclinacao;
    pov.aspect = r.width / r.height;
    // a cobertura horizontal do sensor é a do PDF em qualquer formato de tile; o vertical sai do aspecto
    let fov = (2 * Math.atan(Math.tan(rad(mod.fovH) / 2) / pov.aspect) * 180) / Math.PI;
    if (mod.projecao === "ptz") { rumo += ui.ptz.pan; incl += ui.ptz.tilt; fov = mod.fovV / ui.ptz.zoom; }
    pov.fov = Math.max(1.2, Math.min(120, fov));
    pov.updateProjectionMatrix();
    // textura na resolução real do tile (limitada): 480×270 fixos ficavam borrados no card ampliado
    const k = Math.min(dpr, 1600 / r.width);
    const fw = Math.round(r.width * k), fh = Math.round(r.height * k);
    if (fbo.width !== fw || fbo.height !== fh) fbo.setSize(fw, fh);
    pov.position.copy(pos);
    pov.lookAt(pos.x + Math.cos(rumo) * Math.cos(incl), pos.y + Math.sin(incl), pos.z + Math.sin(rumo) * Math.cos(incl));
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, pov);
    gl.setRenderTarget(null);
    gl.shadowMap.autoUpdate = sombra;

    const u = quad.mat.uniforms;
    u.uTempo.value = t;
    u.uNoite.value = noite ? 1 : 0;
    u.uOffline.value = offline.includes(cam.numero) ? 1 : 0;
    const x = r.left - canvasRect.left, y = canvasRect.bottom - r.bottom;
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setScissorTest(true);
    gl.setScissor(x, y, r.width, r.height);
    gl.setViewport(x, y, r.width, r.height);
    gl.render(quad.s, ortho);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.autoClear = autoClear;
    // copia o tile para o canvas do card no mesmo quadro (o card é opaco e cobre o recorte no canvas principal);
    // na grade cada tile tem cantos arredondados e o vão entre eles fica transparente
    const tw = Math.round(r.width * dpr), th = Math.round(r.height * dpr);
    const dx = Math.round((r.left - re.left) * dpr), dy = Math.round((r.top - re.top) * dpr);
    ctx.save();
    if (tiles.length > 1) { ctx.beginPath(); ctx.roundRect(dx, dy, tw, th, RAIO_TILE * dpr); ctx.clip(); }
    ctx.drawImage(gl.domElement, Math.round((r.left - canvasRect.left) * dpr), Math.round((r.top - canvasRect.top) * dpr), tw, th, dx, dy, tw, th);
    ctx.restore();
  }, 2);

  return null;
}
