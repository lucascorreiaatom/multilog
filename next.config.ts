import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o selo do Next (só em dev) cobria o rodapé do painel; erros de compilação e execução continuam aparecendo
  devIndicators: false,
  // os dois conceitos viraram uma tela só, com seletor 2D/3D; os endereços antigos continuam funcionando
  async redirects() {
    return [
      { source: "/", destination: "/mapa", permanent: false },
      { source: "/conceito-1", destination: "/mapa?modo=3d", permanent: false },
      { source: "/conceito-2", destination: "/mapa?modo=2d", permanent: false },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
