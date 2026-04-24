"use client";

import { useEffect, useState } from "react";
import { RoseLogo } from "@/components/rose-logo";

export type ScannedProduct = {
  name: string;
  brand: string | null;
  sellPrice: string;
  qty: number;
  lineTotal: string;
};

export type DisplayMessage =
  | { type: "scan"; product: ScannedProduct }
  | { type: "cart-total"; subtotal: string; itemCount: number }
  | { type: "thank-you"; total: string; saleRef: string }
  | { type: "idle" };

type DisplayState =
  | { kind: "idle" }
  | { kind: "product"; product: ScannedProduct }
  | { kind: "thank-you"; total: string; saleRef: string };

/** How long a product/thank-you view lingers before returning to idle. */
const PRODUCT_TIMEOUT_MS = 5_000;
const THANKS_TIMEOUT_MS = 9_000;

export const DISPLAY_CHANNEL = "rose-pos-display";

export function DisplayClient() {
  const [state, setState] = useState<DisplayState>({ kind: "idle" });
  const [runningTotal, setRunningTotal] = useState<{
    subtotal: string;
    itemCount: number;
  } | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(DISPLAY_CHANNEL);
    const handle = (event: MessageEvent<DisplayMessage>) => {
      const msg = event.data;
      if (msg.type === "scan") {
        setState({ kind: "product", product: msg.product });
      } else if (msg.type === "thank-you") {
        setState({ kind: "thank-you", total: msg.total, saleRef: msg.saleRef });
        setRunningTotal(null);
      } else if (msg.type === "cart-total") {
        setRunningTotal({ subtotal: msg.subtotal, itemCount: msg.itemCount });
      } else if (msg.type === "idle") {
        setState({ kind: "idle" });
        setRunningTotal(null);
      }
    };
    channel.addEventListener("message", handle);
    return () => {
      channel.removeEventListener("message", handle);
      channel.close();
    };
  }, []);

  // Auto-return to idle after the timeout so the screen doesn't get stuck
  // on the last scan when the cashier walks away between customers.
  useEffect(() => {
    if (state.kind === "idle") return;
    const ms =
      state.kind === "thank-you" ? THANKS_TIMEOUT_MS : PRODUCT_TIMEOUT_MS;
    const timer = setTimeout(() => {
      setState({ kind: "idle" });
      if (state.kind === "thank-you") setRunningTotal(null);
    }, ms);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <>
      <GlobalStyles />
      <div className="pointer-events-none relative h-full w-full">
        {state.kind === "idle" ? <IdleScreen /> : null}
        {state.kind === "product" ? (
          <ProductScreen
            product={state.product}
            runningTotal={runningTotal}
          />
        ) : null}
        {state.kind === "thank-you" ? (
          <ThankYouScreen total={state.total} saleRef={state.saleRef} />
        ) : null}
      </div>
    </>
  );
}

function IdleScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
      <BackdropGlow />
      <div className="relative animate-breathe" style={{ transform: "scale(2.5)" }}>
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
  // A soft radial pulse behind the logo for a premium store-display feel.
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full animate-glow"
      style={{
        background:
          "radial-gradient(closest-side, rgba(233,80,125,0.25), rgba(233,80,125,0) 70%)",
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

function ProductScreen({
  product,
  runningTotal,
}: {
  product: ScannedProduct;
  runningTotal: { subtotal: string; itemCount: number } | null;
}) {
  return (
    <div
      key={`${product.name}-${product.qty}`}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8"
    >
      <div className="flex items-center gap-3 text-rose-300 animate-chip">
        <CartIcon />
        <span className="text-sm uppercase tracking-[0.3em]">Added to cart</span>
      </div>

      <div className="max-w-4xl text-center animate-card">
        {product.brand ? (
          <div className="text-xl font-medium uppercase tracking-widest text-ink-muted">
            {product.brand}
          </div>
        ) : null}
        <h2 className="mt-2 text-5xl font-semibold leading-tight text-ink">
          {product.name}
        </h2>
        <div className="mt-8 flex items-baseline justify-center gap-4">
          <span className="text-2xl text-ink-muted">Rs</span>
          <span className="text-8xl font-bold tabular-nums text-rose-300">
            {product.sellPrice}
          </span>
        </div>
        {product.qty > 1 ? (
          <div className="mt-2 text-lg text-ink-muted">
            × {product.qty} · Line total Rs{" "}
            <span className="tabular-nums text-ink">{product.lineTotal}</span>
          </div>
        ) : null}
      </div>

      {runningTotal && runningTotal.itemCount > 0 ? (
        <RunningTotalStrip
          subtotal={runningTotal.subtotal}
          itemCount={runningTotal.itemCount}
        />
      ) : null}
    </div>
  );
}

function RunningTotalStrip({
  subtotal,
  itemCount,
}: {
  subtotal: string;
  itemCount: number;
}) {
  return (
    <div className="mt-8 flex gap-10 rounded-2xl border border-white/10 bg-card/80 px-8 py-4 text-base backdrop-blur-sm animate-strip">
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-muted">
          Items
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          {itemCount}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-muted">
          Subtotal
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          Rs {subtotal}
        </div>
      </div>
    </div>
  );
}

function ThankYouScreen({ total, saleRef }: { total: string; saleRef: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
      <BackdropGlow />
      <Confetti />
      <div className="flex items-center gap-4">
        <Sparkle delay={0} />
        <h2
          className="text-7xl font-semibold tracking-tight text-rose-300"
          style={{
            animation: "thank-pop 900ms cubic-bezier(.2, 1.4, .5, 1)",
          }}
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

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
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

function Confetti() {
  // Deterministic positions so the SSR output and hydration match; only the
  // animation itself is time-based.
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i * 97) % 1800;
        const duration = 2600 + ((i * 131) % 2200);
        const size = 14 + ((i * 7) % 16);
        const hue = i % 3 === 0 ? "#E9507D" : i % 3 === 1 ? "#FFD1DC" : "#FFFFFF";
        return (
          <span
            key={i}
            aria-hidden
            className="absolute block rounded-sm"
            style={{
              left: `${left}%`,
              top: `-10%`,
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: hue,
              animation: `confetti-fall ${duration}ms linear ${delay}ms infinite`,
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
}

function GlobalStyles() {
  // One inline <style> keeps the animation CSS co-located with the screen
  // that owns it, and avoids polluting globals.css with one-off keyframes.
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

      @keyframes card {
        0%   { opacity: 0; transform: translateY(30px) scale(0.96); }
        60%  { transform: translateY(-4px) scale(1.02); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .animate-card { animation: card 560ms cubic-bezier(.2,.9,.3,1) both; }

      @keyframes chip {
        0%   { opacity: 0; transform: translateY(-14px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-chip { animation: chip 420ms ease-out both; }

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

      @keyframes confetti-fall {
        0%   { transform: translateY(-10vh) rotate(0); opacity: 0; }
        10%  { opacity: 1; }
        100% { transform: translateY(120vh) rotate(540deg); opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .animate-breathe,
        .animate-glow,
        .animate-dot,
        .animate-card,
        .animate-chip,
        .animate-strip {
          animation: none !important;
        }
      }
    `}</style>
  );
}
