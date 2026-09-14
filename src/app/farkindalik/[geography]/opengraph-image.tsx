import { ImageResponse } from "next/og";
import { AWARENESS_SHARE_COPY, GEOGRAPHY_META, type Geography } from "@/lib/awareness";

export const alt = "SAH World kaynaklı farkındalık kartı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ geography: string }> }) {
  const { geography: slug } = await params;
  const geography: Geography = slug === "dogu-turkistan" ? "dogu_turkistan" : "filistin";
  const copy = AWARENESS_SHARE_COPY[geography];
  const meta = GEOGRAPHY_META[geography];
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", color: "#fff", background: "linear-gradient(135deg,#09090b,#171014 62%,#2a0b13)", padding: "68px 76px", fontFamily: "sans-serif" }}>
    <div style={{ position: "absolute", width: 430, height: 430, right: -70, top: -90, borderRadius: 999, border: `2px solid ${meta.accent}`, opacity: .42, boxShadow: `0 0 100px ${meta.accent}` }} />
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", zIndex: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, letterSpacing: 5, fontWeight: 700 }}><span>SAH WORLD</span><span style={{ color: "#d7a6af" }}>HAFIZA · HAKİKAT · SORUMLULUK</span></div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 870 }}><span style={{ color: "#e6a6b2", fontSize: 24, letterSpacing: 7, fontWeight: 800 }}>{meta.name.toLocaleUpperCase("tr-TR")}</span><h1 style={{ margin: "20px 0", fontSize: 70, lineHeight: 1.02, letterSpacing: -4 }}>{copy.title}</h1><p style={{ margin: 0, color: "#ddd4d7", fontSize: 27, lineHeight: 1.45 }}>{copy.text}</p></div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#b8aeb2", fontSize: 19 }}><span>Grafik görüntü içermez</span><span>Kaynak bağlantısı paylaşım sayfasında</span></div>
    </div>
  </div>, size);
}
