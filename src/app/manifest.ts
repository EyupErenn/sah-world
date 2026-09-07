import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SAH World — Niyetini Hayata Taşı",
    short_name: "SAH World",
    description:
      "Odaklanma, günlük, Kur’an yolculuğu ve manevi farkındalık için kişisel gelişim alanı.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8fc",
    theme_color: "#4f46e5",
    lang: "tr",
    categories: ["productivity", "lifestyle", "education"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
