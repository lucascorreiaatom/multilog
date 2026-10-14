// Modo gráfico do 3D: "alta" mantém o visual completo (vidro com desfoque, AO, dpr 1,25); "desempenho" troca o que
// pesa em GPU integrada por equivalentes mais leves, mirando 60 qps em notebook Intel 1080p.
// Ordem de decisão: ?grafico= na URL, escolha salva do usuário, e por fim a GPU detectada.

export type ModoGrafico = "alta" | "desempenho";

/** GPUs com folga para o modo alta (o M1 base faz 60 qps no alta); o resto (Intel, software, móveis) vai para
 *  desempenho. Sem nome de GPU (navegador esconde), desempenho: errar para o lado fluido */
const GPU_FORTE = /nvidia|geforce|quadro|rtx|radeon|apple/i;
const GPU_FRACA = /intel|swiftshader|llvmpipe|software|mali|adreno|powervr/i;

export function rendererGpu(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const nome = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return nome;
  } catch {
    return "";
  }
}

export function modoGraficoInicial(): ModoGrafico {
  const url = new URLSearchParams(window.location.search).get("grafico");
  if (url === "alta" || url === "desempenho") return url;
  try {
    const salvo = localStorage.getItem("grafico");
    if (salvo === "alta" || salvo === "desempenho") return salvo;
  } catch {}
  const gpu = rendererGpu();
  return GPU_FORTE.test(gpu) && !GPU_FRACA.test(gpu) ? "alta" : "desempenho";
}
