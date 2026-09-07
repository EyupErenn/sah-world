import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://sah-world.vercel.app"
  ).replace(/\/$/, "");
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/gizlilik`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${base}/kullanim-kosullari`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
