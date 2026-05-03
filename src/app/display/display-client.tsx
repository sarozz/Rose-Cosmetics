"use client";

import { useEffect, useRef, useState } from "react";
import { RoseLogo } from "@/components/rose-logo";

export type ScannedProduct = {
  name: string;
  brand: string | null;
  sellPrice: string;
  qty: number;
  lineTotal: string;
};

export type CartLine = {
  productId: string;
  name: string;
  brand: string | null;
  qty: number;
  unitPrice: string;
  lineTotal: string;
};

export type DisplayMessage =
  | { type: "scan"; product: ScannedProduct }
  | {
      type: "cart";
      lines: CartLine[];
      subtotal: string;
      discount: string;
      total: string;
      paymentMethod: "CASH" | "DIGITAL" | null;
      cashTendered: string | null;
      change: string | null;
    }
  | { type: "thank-you"; total: string; saleRef: string }
  | { type: "idle" };

type HighlightState = {
  product: ScannedProduct;
  /** Monotonic counter — used so consecutive scans of the same SKU retrigger the animation. */
  seq: number;
} | null;

const SCAN_HIGHLIGHT_MS = 3_500;
const THANKS_TIMEOUT_MS = 10_000;

export const DISPLAY_CHANNEL = "rose-pos-display";

export function DisplayClient() {
  const [cart, setCart] = useState<{
    lines: CartLine[];
    subtotal: string;
    discount: string;
    total: string;
    paymentMethod: "CASH" | "DIGITAL" | null;
    cashTendered: string | null;
    change: string | null;
  }>({
    lines: [],
    subtotal: "0.00",
    discount: "0.00",
    total: "0.00",
    paymentMethod: null,
    cashTendered: null,
    change: null,
  });
  const [highlight, setHighlight] = useState<HighlightState>(null);
  const [thankYou, setThankYou] = useState<
    { total: string; saleRef: string } | null
  >(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const channel = new BroadcastChannel(DISPLAY_CHANNEL);
    const handle = (event: MessageEvent<DisplayMessage>) => {
      const msg = event.data;
      if (msg.type === "cart") {
        setCart({
          lines: msg.lines,
          subtotal: msg.subtotal,
          discount: msg.discount,
          total: msg.total,
          paymentMethod: msg.paymentMethod,
          cashTendered: msg.cashTendered,
          change: msg.change,
        });
      } else if (msg.type === "scan") {
        seqRef.current += 1;
        setHighlight({ product: msg.product, seq: seqRef.current });
      } else if (msg.type === "thank-you") {
        setThankYou({ total: msg.total, saleRef: msg.saleRef });
        // Clear the displayed cart so when the thank-you screen times out we
        // fall back to the idle welcome, not to the previous customer's basket.
        setCart({
          lines: [],
          subtotal: "0.00",
          discount: "0.00",
          total: "0.00",
          paymentMethod: null,
          cashTendered: null,
          change: null,
        });
        setHighlight(null);
      } else if (msg.type === "idle") {
        setHighlight(null);
        setThankYou(null);
      }
    };
    channel.addEventListener("message", handle);
    return () => {
      channel.removeEventListener("message", handle);
      channel.close();
    };
  }, []);

  // Fade the scan highlight after a few seconds so the cart view takes over
  // naturally once the cashier moves to the next item.
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), SCAN_HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [highlight]);

  useEffect(() => {
    if (!thankYou) return;
    const t = setTimeout(() => setThankYou(null), THANKS_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [thankYou]);

  const hasCart = cart.lines.length > 0;

  return (
    <>
      <GlobalStyles />
      <div className="pointer-events-none relative h-full w-full">
        {thankYou ? (
          <ThankYouScreen total={thankYou.total} saleRef={thankYou.saleRef} />
        ) : hasCart ? (
          <CartScreen cart={cart} highlight={highlight} />
        ) : (
          <IdleScreen />
        )}
      </div>
    </>
  );
}

/* --------------------------------- Idle ---------------------------------- */

function IdleScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
      <BackdropGlow />
      <div
        className="relative animate-breathe"
        style={{ transform: "scale(2.5)" }}
      >
        <RoseLogo size="lg" />
      </div>
      <p className="mt-6 text-base tracking-[0.3em] text-ink-muted">
        WELCOME · PLEASE WAIT TO BE SERVED
      </p>
      <TypingDots />
    </div>
  );
}

function BackdropGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full animate-glow"
      style={{
        background:
          "radial-gradient(closest-side, rgba(233,80,125,0.22), rgba(233,80,125,0) 70%)",
      }}
    />
  );
}

function TypingDots() {
  return (
    <div className="mt-3 flex items-center gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-rose-400/60 animate-dot"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </div>
  );
}

/* --------------------------------- Cart ---------------------------------- */

function CartScreen({
  cart,
  highlight,
}: {
  cart: {
    lines: CartLine[];
    subtotal: string;
    discount: string;
    total: string;
    paymentMethod: "CASH" | "DIGITAL" | null;
    cashTendered: string | null;
    change: string | null;
  };
  highlight: HighlightState;
}) {
  const itemCount = cart.lines.reduce((n, l) => n + l.qty, 0);
  const hasDiscount = Number(cart.discount) > 0;
  return (
    <div className="absolute inset-0 flex flex-col gap-6 p-8 lg:p-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <PinkCart />
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-rose-300">
              Your basket
            </div>
            <div className="text-2xl font-semibold text-ink">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div style={{ transform: "scale(1.15)", transformOrigin: "right center" }}>
          <RoseLogo size="md" />
        </div>
      </header>

      <CartLines lines={cart.lines} highlight={highlight} />

      <footer className="mt-auto flex items-stretch justify-between gap-6 rounded-2xl border border-white/10 bg-card/70 px-8 py-6 backdrop-blur-sm">
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-ink-muted">
              Total to pay
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-ink-muted">
              <span>Subtotal Rs <span className="tabular-nums text-ink-soft">{cart.subtotal}</span></span>
              {hasDiscount ? (
                <span className="text-emerald-300">
                  Discount −Rs <span className="tabular-nums">{cart.discount}</span>
                </span>
              ) : null}
            </div>
          </div>
          {cart.paymentMethod ? (
            <PaymentMethodBadge method={cart.paymentMethod} />
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-3 text-right">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-ink-muted">
              Amount
            </div>
            <div
              key={cart.total}
              className="mt-1 flex items-baseline justify-end gap-2 animate-total"
            >
              <span className="text-2xl text-ink-muted">Rs</span>
              <span className="text-7xl font-bold tabular-nums text-emerald-300">
                {cart.total}
              </span>
            </div>
          </div>
          {cart.paymentMethod === "CASH" && cart.cashTendered ? (
            <CashSummary
              tendered={cart.cashTendered}
              change={cart.change}
            />
          ) : null}
        </div>
      </footer>

      {highlight ? <ScanOverlay highlight={highlight} /> : null}
    </div>
  );
}

function PinkCart() {
  // Pink cart icon, sized to read as a hero glyph at the top of the screen.
  // SVG rather than emoji so we can control colour & stroke weight.
  return (
    <span
      aria-hidden
      className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30 animate-cart-bob"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-9 w-9"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 4h2l2 12h12l2-8H7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="20" r="1.6" fill="currentColor" />
        <circle cx="17" cy="20" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

function CashSummary({
  tendered,
  change,
}: {
  tendered: string;
  change: string | null;
}) {
  // Two-column receipt-style strip: tendered on the left, change on the
  // right when the customer is owed any. Animates whenever the values
  // change so the customer sees the response in real time as the cashier
  // counts cash.
  return (
    <div className="flex items-stretch gap-3 text-left">
      <div
        key={`tendered-${tendered}`}
        className="rounded-xl border border-white/10 bg-card/80 px-4 py-3 backdrop-blur-sm animate-strip"
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-ink-muted">
          Tendered
        </div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
          Rs {tendered}
        </div>
      </div>
      <div
        key={`change-${change ?? "none"}`}
        className={`rounded-xl border px-4 py-3 backdrop-blur-sm animate-strip ${
          change !== null
            ? "border-emerald-400/30 bg-emerald-500/10"
            : "border-white/10 bg-card/60 opacity-60"
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-ink-muted">
          Change due
        </div>
        <div
          className={`mt-0.5 text-2xl font-semibold tabular-nums ${
            change !== null ? "text-emerald-200" : "text-ink-muted"
          }`}
        >
          Rs {change ?? "—"}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodBadge({ method }: { method: "CASH" | "DIGITAL" }) {
  const label = method === "CASH" ? "Cash" : "Digital";
  return (
    <div
      key={method}
      className="mt-3 inline-flex items-center gap-2 self-start rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 animate-badge-pop"
    >
      <span className="uppercase tracking-widest text-xs">Paying by {label}</span>
    </div>
  );
}

function CartLines({
  lines,
  highlight,
}: {
  lines: CartLine[];
  highlight: HighlightState;
}) {
  const highlightedId = highlight
    ? lines.find(
        (l) =>
          l.name === highlight.product.name &&
          l.brand === highlight.product.brand,
      )?.productId ?? null
    : null;

  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-card/50 p-2 backdrop-blur-sm">
      <ul className="flex h-full flex-col gap-1 overflow-y-auto pr-1">
        {lines.map((line) => {
          const isLatest = line.productId === highlightedId;
          return (
            <li
              key={line.productId}
              className={`flex items-center justify-between gap-6 rounded-xl px-5 py-4 transition-colors ${
                isLatest
                  ? "bg-rose-500/20 animate-row-pop"
                  : "bg-transparent"
              }`}
            >
              <div className="min-w-0 flex-1">
                {line.brand ? (
                  <div className="text-xs uppercase tracking-widest text-ink-muted">
                    {line.brand}
                  </div>
                ) : null}
                <div className="truncate text-2xl font-medium text-ink">
                  {line.name}
                </div>
                <div className="mt-0.5 text-sm text-ink-muted tabular-nums">
                  {line.qty} × Rs {line.unitPrice}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-3xl font-semibold tabular-nums text-ink">
                  Rs {line.lineTotal}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* --------------------- Scan overlay (big hero card) ---------------------- */

function ScanOverlay({ highlight }: { highlight: NonNullable<HighlightState> }) {
  return (
    <div
      key={highlight.seq}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-scan-hero"
    >
      <div className="flex max-w-3xl flex-col items-center gap-4 rounded-3xl border border-rose-400/40 bg-card/95 px-14 py-10 text-center shadow-[0_30px_80px_-20px_rgba(233,80,125,0.5)] backdrop-blur-md">
        <div className="flex items-center gap-2 text-rose-300">
          <CartIcon />
          <span className="text-xs uppercase tracking-[0.3em]">
            Added to basket
          </span>
        </div>
        {highlight.product.brand ? (
          <div className="text-sm uppercase tracking-widest text-ink-muted">
            {highlight.product.brand}
          </div>
        ) : null}
        <div className="text-4xl font-semibold text-ink">
          {highlight.product.name}
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-lg text-ink-muted">Rs</span>
          <span className="text-6xl font-bold tabular-nums text-rose-300">
            {highlight.product.sellPrice}
          </span>
        </div>
        {highlight.product.qty > 1 ? (
          <div className="text-sm text-ink-muted">
            Now × {highlight.product.qty} · Line Rs{" "}
            <span className="tabular-nums text-ink">
              {highlight.product.lineTotal}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M3 4h2l2 12h12l2-8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------- Thank you ------------------------------- */

function ThankYouScreen({
  total,
  saleRef,
}: {
  total: string;
  saleRef: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
      <BackdropGlow />
      <Confetti />
      <div className="flex items-center gap-4">
        <Sparkle delay={0} />
        <h2
          className="text-7xl font-semibold tracking-tight text-rose-300"
          style={{ animation: "thank-pop 900ms cubic-bezier(.2, 1.4, .5, 1)" }}
        >
          Thank you!
        </h2>
        <Sparkle delay={220} />
      </div>
      <p className="text-xl text-ink-soft">Please come again</p>
      <div className="mt-6 rounded-2xl border border-rose-400/30 bg-card/80 px-10 py-5 text-center backdrop-blur-sm animate-strip">
        <div className="text-xs uppercase tracking-[0.3em] text-ink-muted">
          Total
        </div>
        <div className="mt-1 text-5xl font-bold tabular-nums text-ink">
          Rs {total}
        </div>
        <div className="mt-2 font-mono text-xs text-ink-muted">
          Ref {saleRef}
        </div>
      </div>
    </div>
  );
}

function Sparkle({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden
      className="inline-block"
      style={{
        animation: `sparkle 1.6s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        fontSize: "2.5rem",
      }}
    >
      ✨
    </span>
  );
}

/* -------------------------------- Confetti ------------------------------- */

// Festive multi-colour palette — rose-led to match the brand, plus gold and
// teal accents so the storm doesn't read as monochrome on a dark backdrop.
const CONFETTI_COLORS = [
  "#E9507D", // rose-500
  "#FF7AA8", // rose-300
  "#FFD1DC", // blush
  "#FFFFFF", // white
  "#F5C518", // gold
  "#37C6A4", // mint
  "#7AB8FF", // sky
];

// Three silhouettes give the confetti shape variety without exploding the
// DOM — every piece is a single CSS-shaped span.
const SHAPES = ["rect", "square", "circle"] as const;
type Shape = (typeof SHAPES)[number];

function shapeStyle(shape: Shape, size: number): React.CSSProperties {
  if (shape === "circle") {
    return {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "9999px",
    };
  }
  if (shape === "square") {
    return {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "1px",
    };
  }
  // rectangle (streamer-style)
  return {
    width: `${size * 0.5}px`,
    height: `${size * 1.2}px`,
    borderRadius: "1px",
  };
}

function Confetti() {
  // Deterministic spread keeps SSR output stable; only the animation is
  // time-based, so the look is consistent per render.
  const pieces = Array.from({ length: 80 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const shape = SHAPES[i % SHAPES.length];
        const size = 6 + ((i * 13) % 10); // 6 .. 15
        const left = (i * 13.7) % 100;
        const delay = (i * 71) % 2200;
        const duration = 3600 + ((i * 97) % 2800);
        const drift = ((i * 19) % 120) - 60; // -60 .. +60 px sway
        const rotate = 540 + ((i * 53) % 720); // 540 .. 1260° tumble
        return (
          <span
            key={i}
            aria-hidden
            className="absolute block animate-confetti-fall"
            style={{
              left: `${left}%`,
              top: "-12%",
              backgroundColor: color,
              animationDuration: `${duration}ms`,
              animationDelay: `${delay}ms`,
              ["--drift-x" as string]: `${drift}px`,
              ["--rotate-end" as string]: `${rotate}deg`,
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
              willChange: "transform, opacity",
              ...shapeStyle(shape, size),
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------ Global CSS ------------------------------- */

function GlobalStyles() {
  return (
    <style>{`
      @keyframes breathe {
        0%, 100% { transform: scale(2.5); filter: drop-shadow(0 0 12px rgba(233,80,125,0.25)); }
        50%      { transform: scale(2.6); filter: drop-shadow(0 0 26px rgba(233,80,125,0.55)); }
      }
      .animate-breathe { animation: breathe 4.5s ease-in-out infinite; transform-origin: center; }

      @keyframes glow {
        0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
        50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.08); }
      }
      .animate-glow { animation: glow 5s ease-in-out infinite; }

      @keyframes dot {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
        30%           { transform: translateY(-6px); opacity: 1; }
      }
      .animate-dot { animation: dot 1.3s ease-in-out infinite; }

      @keyframes row-pop {
        0%   { transform: scale(0.97); opacity: 0.6; }
        60%  { transform: scale(1.015); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .animate-row-pop { animation: row-pop 520ms cubic-bezier(.2,.9,.3,1) both; }

      @keyframes total {
        0%   { transform: scale(0.96); color: #a7f3d0; }
        60%  { transform: scale(1.04); }
        100% { transform: scale(1); }
      }
      .animate-total { animation: total 360ms ease-out both; transform-origin: right center; }

      @keyframes cart-bob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-3px); }
      }
      .animate-cart-bob { animation: cart-bob 2.4s ease-in-out infinite; }

      @keyframes badge-pop {
        0%   { opacity: 0; transform: scale(0.85); }
        70%  { opacity: 1; transform: scale(1.06); }
        100% { opacity: 1; transform: scale(1); }
      }
      .animate-badge-pop { animation: badge-pop 440ms ease-out both; }

      @keyframes scan-hero {
        0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.86); }
        60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        85%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.98); }
      }
      .animate-scan-hero { animation: scan-hero 3400ms ease-in-out both; }

      @keyframes strip {
        0%   { opacity: 0; transform: translateY(14px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-strip { animation: strip 520ms ease-out both; }

      @keyframes thank-pop {
        0%   { opacity: 0; transform: scale(0.7); }
        60%  { opacity: 1; transform: scale(1.12); }
        100% { opacity: 1; transform: scale(1); }
      }

      @keyframes sparkle {
        0%, 100% { transform: scale(1) rotate(0);   opacity: 1; }
        50%      { transform: scale(1.25) rotate(25deg); opacity: 0.7; }
      }

      /*
        Falling confetti: per-piece horizontal drift + rotation supplied via
        CSS variables (--drift-x, --rotate-end), so 80 pieces share one
        keyframe but each lands at its own angle.
      */
      @keyframes confetti-fall {
        0% {
          transform: translate3d(0, -10vh, 0) rotate(0deg);
          opacity: 0;
        }
        8% { opacity: 1; }
        100% {
          transform: translate3d(var(--drift-x, 0), 120vh, 0)
            rotate(var(--rotate-end, 720deg));
          opacity: 0;
        }
      }
      .animate-confetti-fall { animation-name: confetti-fall; animation-timing-function: linear; animation-iteration-count: infinite; }

      @media (prefers-reduced-motion: reduce) {
        .animate-breathe,
        .animate-glow,
        .animate-dot,
        .animate-row-pop,
        .animate-total,
        .animate-scan-hero,
        .animate-strip,
        .animate-cart-bob,
        .animate-badge-pop {
          animation: none !important;
        }
      }
    `}</style>
  );
}
