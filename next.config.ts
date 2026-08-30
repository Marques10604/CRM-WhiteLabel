import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Corrige a detecção incorreta de workspace root do Turbopack quando há
  // um package-lock.json em um diretório pai fora deste repositório.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Fase 13 (D-02): a rota de gestão de categorias virou `/nichos` (era
  // `/subnichos`). Redirect permanente segura bookmark/memória muscular e
  // qualquer link `/subnichos` que tenha escapado da varredura.
  async redirects() {
    return [
      { source: "/subnichos", destination: "/nichos", permanent: true },
    ];
  },
};

export default nextConfig;
