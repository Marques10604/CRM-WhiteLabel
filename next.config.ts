import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Corrige a detecção incorreta de workspace root do Turbopack quando há
  // um package-lock.json em um diretório pai fora deste repositório.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
