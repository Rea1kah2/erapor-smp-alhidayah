import type { NextConfig } from "next";

// Backend (Render) tujuan proxy. Browser hanya memanggil /api/* pada domain frontend
// sehingga cookie sesi menjadi first-party dan tidak diblokir Safari/Brave/Incognito.
const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
