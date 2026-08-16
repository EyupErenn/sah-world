// Web Audio API — Simple Synth Feedback Tones
// Used across the app for button feedback, XP chimes, tespih clicks.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  return audioCtx;
}

export function playTone(freq = 540, duration = 0.05, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

export function playSuccessChime() {
  playTone(523, 0.08);
  setTimeout(() => playTone(659, 0.08), 70);
  setTimeout(() => playTone(784, 0.13), 140);
}

export function playClickTone() {
  playTone(480 + Math.random() * 60, 0.03);
}

export function playTespihTone(count: number) {
  const base = 440 + (count % 33) * 8;
  playTone(base, 0.035, 'sine');
}

export function playMilestoneTone() {
  playTone(784, 0.1);
  setTimeout(() => playTone(988, 0.1), 100);
  setTimeout(() => playTone(1175, 0.18), 200);
}
