import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" é necessário para o build rodar no Docker; na Vercel o próprio
  // builder cuida do empacotamento e esse modo quebra o processo de build.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
