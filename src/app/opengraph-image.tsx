import { ImageResponse } from "next/og";

// Default Open Graph image for the whole marketing site. Next looks for
// `opengraph-image` files at any segment level and uses the closest one,
// so this single file gives every page a polished social preview without
// requiring a checked-in PNG. Highest-impact SEO touch for us since
// 100% of customer traffic comes from Instagram and TikTok shares — a
// link with no preview gets ignored on those platforms.

export const runtime = "edge";
export const alt = "Rose Cosmetics — Chardobato, Bhaktapur, Nepal";
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
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #FFF8F3 0%, #FDF2F5 50%, #FBE4EA 100%)",
          fontFamily: "Georgia, serif",
          padding: 64,
          position: "relative",
        }}
      >
        {/* Decorative rose-tinted glows */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "rgba(238, 148, 170, 0.55)",
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            right: -120,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "rgba(201, 58, 99, 0.35)",
            filter: "blur(110px)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.4em",
            color: "#B03052",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Chardobato · Bhaktapur · Nepal
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 200,
            fontStyle: "italic",
            color: "#B03052",
            marginTop: 24,
            lineHeight: 1,
            textShadow: "0 4px 18px rgba(176, 48, 82, 0.18)",
          }}
        >
          Rose Cosmetics
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#44403c",
            marginTop: 32,
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: 500,
          }}
        >
          Skincare · Haircare · Makeup · Fragrance
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#78716c",
            marginTop: 20,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          Walk in, or DM us — we courier across Nepal.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            fontSize: 20,
            color: "#B03052",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: 600,
            letterSpacing: "0.15em",
          }}
        >
          rosecosmetics.live
        </div>
      </div>
    ),
    { ...size },
  );
}
