import { ImageResponse } from "next/og";

export const alt = "MOOA Resume - 입력은 간단하게, 분석은 섬세하게";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#0d3b2b,#176b4a)", color: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 800 }}><div style={{ width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: "white", color: "#176b4a" }}>M</div>MOOA Resume</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}><div style={{ display: "flex", flexDirection: "column", fontSize: 66, fontWeight: 800, letterSpacing: -3 }}><span>입력은 간단하게.</span><span>분석은 섬세하게.</span></div><div style={{ fontSize: 27, color: "#bed9cc" }}>공고·경험·자소서를 연결하는 AI 취업 지원서 코치</div></div>
      <div style={{ fontSize: 22, color: "#9fc7b4" }}>한 번에 올리고, 제대로 분석하세요.</div>
    </div>,
    size,
  );
}
