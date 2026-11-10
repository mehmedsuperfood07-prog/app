import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The app is never meant to be embedded in another site, so refuse
          // framing outright (clickjacking) and stop browsers from guessing
          // content types.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Camera and location: only this app, only for marking attendance.
            value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
