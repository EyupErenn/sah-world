import { ImageResponse } from "next/og";

export const alt = "SAH World — Niyetini hayata taşı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#172033",
          background:
            "linear-gradient(135deg,#f8f9ff 0%,#eef0ff 52%,#f7efff 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -100,
            top: -140,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            opacity: 0.16,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -120,
            bottom: -210,
            width: 560,
            height: 560,
            borderRadius: 999,
            background: "#10b981",
            opacity: 0.09,
          }}
        />
        <div
          style={{
            padding: "76px 86px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                fontSize: 42,
                fontWeight: 800,
              }}
            >
              S
            </span>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
              SAH WORLD
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                color: "#4f46e5",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
              }}
            >
              KİŞİSEL GELİŞİM ALANIN
            </span>
            <h1
              style={{
                maxWidth: 860,
                margin: "16px 0 20px",
                fontSize: 74,
                lineHeight: 1.02,
                letterSpacing: -4,
              }}
            >
              Niyetini küçük adımlarla hayata taşı.
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 28 }}>
              Odaklan · Yaz · Öğren · Fark et
            </p>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
