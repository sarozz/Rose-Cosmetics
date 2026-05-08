/**
 * Tiny WebAudio chime for incoming chat messages. Generated on the fly so
 * we don't ship an audio asset; lazy-init the AudioContext on first call
 * so we don't violate browser autoplay policy until the user interacts.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function playChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume().catch(() => {});
  }
  const now = c.currentTime;
  // Two short overlapping tones (E5 → A5) — feels notification-y, not alarmy.
  for (const [freq, start, dur] of [
    [659.25, 0, 0.18],
    [880, 0.08, 0.22],
  ] as const) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  }
}
