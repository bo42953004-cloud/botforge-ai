/**
 * Synthesised "coding" sounds (mechanical key clicks, boot chirp, done chime).
 * Web Audio only — no audio files, so it starts instantly and never 404s.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let typingTimer: ReturnType<typeof setTimeout> | null = null;

const STORAGE_KEY = "aureus-sound-muted";

export function isMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMuted(next: boolean) {
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }
  if (next) stopTyping();
}

function audio() {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, master: master! };
}

/** Single mechanical key click: short noise burst + tiny pitched thock. */
function click(strength = 1) {
  const a = audio();
  if (!a) return;
  const { ctx: c, master: out } = a;
  const now = c.currentTime;

  const length = Math.floor(c.sampleRate * 0.035);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400 + Math.random() * 1600;
  bp.Q.value = 1.2;
  const ng = c.createGain();
  ng.gain.value = 0.5 * strength;
  noise.connect(bp).connect(ng).connect(out);
  noise.start(now);

  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320 + Math.random() * 180, now);
  const og = c.createGain();
  og.gain.setValueAtTime(0.22 * strength, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(og).connect(out);
  osc.start(now);
  osc.stop(now + 0.07);
}

export function playKey() {
  click(0.7);
}

/** Loop irregular typing clicks while the AI writes code. */
export function startTyping() {
  if (typingTimer || muted) return;
  const tick = () => {
    click(0.6 + Math.random() * 0.5);
    const gap = Math.random() < 0.12 ? 220 + Math.random() * 260 : 45 + Math.random() * 85;
    typingTimer = setTimeout(tick, gap);
  };
  tick();
}

export function stopTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
}

function tone(freq: number, start: number, duration: number, gain = 0.2, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const { ctx: c, master: out } = a;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(g).connect(out);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.02);
}

/** Rising chirp when the robot wakes up / starts thinking. */
export function playBoot() {
  tone(420, 0, 0.18, 0.12, "sawtooth");
  tone(660, 0.08, 0.2, 0.1, "triangle");
  tone(880, 0.17, 0.24, 0.09, "sine");
}

/** Chime when a bot file is ready. */
export function playComplete() {
  tone(784, 0, 0.16, 0.14);
  tone(1046, 0.1, 0.22, 0.12);
  tone(1568, 0.22, 0.3, 0.08);
}

export function playError() {
  tone(220, 0, 0.22, 0.14, "square");
  tone(160, 0.14, 0.3, 0.12, "square");
}

export function initSound() {
  muted = isMuted();
}
