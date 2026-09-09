import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://carters-red-wagon-farm.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/till"], // staff tools — keep out of search
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
