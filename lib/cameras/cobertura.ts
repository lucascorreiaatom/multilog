// Qual câmera externa cobre um ponto do pátio, pelo alcance e campo de visão de cada modelo.
import type { Vec2 } from "../site/tipos";
import { camerasExternas, type CameraExterna } from "./catalogo";
import { MODELOS } from "./modelos";

export const ALCANCE: Record<string, number> = { "Q6225-LE": 140, "P1487-LE": 70, "P3827-PVE": 45, "P3738-PLE": 60, "P4707-PLVE": 60 };

export function camerasQueCobrem(p: Vec2): { camera: CameraExterna; sensor: number; distancia: number }[] {
  const out: { camera: CameraExterna; sensor: number; distancia: number }[] = [];
  for (const c of camerasExternas) {
    const dx = p[0] - c.posicao[0], dz = p[1] - c.posicao[1];
    const d = Math.hypot(dx, dz);
    if (d > (ALCANCE[c.modelo] ?? 60)) continue;
    const ang = Math.atan2(dz, dx);
    const mod = MODELOS[c.modelo];
    const dirs = mod.projecao === "panoramica180" ? [0] : mod.direcoes;
    dirs.forEach((dg, sensor) => {
      const centro = c.rumo + (dg * Math.PI) / 180;
      const diff = Math.atan2(Math.sin(ang - centro), Math.cos(ang - centro));
      if (Math.abs(diff) <= (Math.min(mod.fovH, 359) * Math.PI) / 360) out.push({ camera: c, sensor, distancia: d });
    });
  }
  return out.sort((a, b) => a.distancia - b.distancia);
}
