import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o selo do Next (só em dev) cobria o rodapé do painel; erros de compilação e execução continuam aparecendo
  devIndicators: false,
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
