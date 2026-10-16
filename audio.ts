let ctx: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;

export function setAmbience(on: boolean) {
  if (!on) {
    stopCurrent?.();
    stopCurrent = null;
    return;
  }
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  void ctx.resume();
  if (stopCurrent) return;

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 240;
  const gain = ctx.createGain();
  gain.gain.value = 0.03;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  stopCurrent = () => {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
    gain.disconnect();
  };
}
