import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Open Library cover URLs redirect to archive.org; the optimizer follows those redirects itself.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        port: "",
        pathname: "/b/id/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
