import { ImageResponse } from "next/og";

// Apple touch icon — shown when an iPhone user adds rosecosmetics.live
// to their home screen. Larger than the favicon and rendered without
// rounded corners so iOS can mask it with its own rounded square.

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#B03052",
          color: "#FFF8F3",
          fontSize: 130,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
        }}
      >
        R
      </div>
    ),
    { ...size },
  );
}
