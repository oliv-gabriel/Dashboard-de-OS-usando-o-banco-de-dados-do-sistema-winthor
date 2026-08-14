import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['oracledb'],
  allowedDevOrigins: ['192.17.1.251', '26.120.91.220'] // Adicionado para permitir acesso por outras máquinas na rede
};

export default nextConfig;
