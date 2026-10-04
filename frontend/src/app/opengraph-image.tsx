import { ImageResponse } from "next/og";

export const alt = "EduAlto — Nền tảng học tập trực tuyến";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #f5fbf9 0%, #eaf7f3 55%, #d7f3e9 100%)",
        color: "#101a2c",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 970 }}>
        <div style={{ alignItems: "center", display: "flex", gap: 24 }}>
          <div
            style={{
              alignItems: "center",
              background: "#20b486",
              borderRadius: 28,
              color: "white",
              display: "flex",
              fontSize: 68,
              fontWeight: 800,
              height: 104,
              justifyContent: "center",
              width: 104,
            }}
          >
            E
          </div>
          <span style={{ color: "#101a2c", fontSize: 62, fontWeight: 700 }}>EduAlto</span>
        </div>
        <div style={{ color: "#168f6c", fontSize: 44, fontWeight: 700 }}>
          Nền tảng học tập trực tuyến
        </div>
        <div style={{ color: "#667085", fontSize: 28, lineHeight: 1.5 }}>
          Khám phá khóa học, học theo lộ trình và tiến bộ mỗi ngày.
        </div>
      </div>
    </div>,
    size,
  );
}
