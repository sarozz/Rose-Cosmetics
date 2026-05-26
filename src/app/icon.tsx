import { ImageResponse } from "next/og";

// Browser tab favicon. A solid rose tile with a script "R" — same brand
// mark as the wordmark but compressed to 32×32. Renders crisply on
// Safari/Chrome tabs and adds a trust signal in Google search results
// (Google shows favicons next to local-pack results in Nepal).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 24,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        R
      </div>
    ),
    { ...size },
  );
}
