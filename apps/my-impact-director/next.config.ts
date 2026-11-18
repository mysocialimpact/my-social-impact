import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg", "unpdf", "@napi-rs/canvas"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://m.stripe.network; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.stripe.com; font-src 'self'; connect-src 'self' https://api.stripe.com https://*.stripe.com https://m.stripe.network; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
