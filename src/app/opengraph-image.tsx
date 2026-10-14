import { ImageResponse } from "next/og";
import { site } from "@/lib/data";

export const alt = `${site.name} — ${site.tagline}`;
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#F2F2F0",
          color: "#121212",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#6b6b6b", letterSpacing: 3 }}>
          <span>MONU RAJ</span>
          <span>AI SOFTWARE & ROBOTICS · 2026</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 220, fontWeight: 300, letterSpacing: -12, lineHeight: 0.9 }}>Hello</div>
          <div style={{ marginTop: 24, fontSize: 30, color: "#121212" }}>
            — It&apos;s Monu Raj. Engineer by training, builder by instinct.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#6b6b6b" }}>
          <span>Co-Founder &amp; CEO, CodeMasti · Drone R&amp;D, UUPL</span>
          <span style={{ color: "#121212" }}>{site.email}</span>
        </div>
      </div>
    ),
    size,
  );
}
