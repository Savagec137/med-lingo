/**
 * Sons synthétisés avec Web Audio — aucun fichier à charger.
 */

type Ctx = AudioContext;

export class Sfx {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<string, number>();
  muted = false;

  /** À appeler depuis un geste utilisateur (exigence des navigateurs). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  private gate(key: string, minGap: number) {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    const prev = this.last.get(key) ?? -1;
    if (now - prev < minGap) return false;
    this.last.set(key, now);
    return true;
  }

  private tone(
    freq: number,
    end: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
  ) {
    const ctx = this.ctx as Ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master as GainNode);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, freq: number, q = 1, delay = 0) {
    const ctx = this.ctx as Ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src
      .connect(f)
      .connect(g)
      .connect(this.master as GainNode);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  fire() {
    if (!this.gate("fire", 0.07)) return;
    this.tone(320 + Math.random() * 40, 110, 0.09, "sine", 0.18);
    this.hiss(0.05, 0.06, 1800, 0.8);
  }

  gate_(kind: "mul" | "gold" | "div") {
    if (!this.gate("gate-" + kind, kind === "gold" ? 0.12 : 0.09)) return;
    if (kind === "div") {
      this.tone(300, 160, 0.14, "square", 0.05);
    } else {
      const base = kind === "gold" ? 1046 : 784;
      this.tone(base, base * 1.5, 0.1, "triangle", 0.09);
      if (kind === "gold") this.tone(base * 1.5, base * 2, 0.12, "triangle", 0.06, 0.05);
    }
  }

  clash() {
    if (!this.gate("clash", 0.06)) return;
    this.hiss(0.06, 0.05, 900 + Math.random() * 900, 2);
  }

  baseHit(big = false) {
    if (!this.gate("base", big ? 0.05 : 0.1)) return;
    this.tone(big ? 120 : 180, 50, big ? 0.4 : 0.15, "sine", big ? 0.4 : 0.14);
    this.hiss(big ? 0.35 : 0.1, big ? 0.2 : 0.06, 400, 0.7);
  }

  playerHit() {
    if (!this.gate("player", 0.12)) return;
    this.tone(220, 90, 0.22, "sawtooth", 0.09);
  }

  champion() {
    if (!this.gate("champion", 0.3)) return;
    this.tone(196, 392, 0.35, "sawtooth", 0.08);
    this.tone(294, 588, 0.35, "triangle", 0.1, 0.05);
    this.hiss(0.4, 0.12, 600, 0.5);
  }

  ready() {
    if (!this.gate("ready", 0.5)) return;
    this.tone(880, 1320, 0.12, "triangle", 0.08);
    this.tone(1320, 1760, 0.15, "triangle", 0.07, 0.1);
  }

  eruption() {
    if (!this.gate("erupt", 0.3)) return;
    this.hiss(0.7, 0.18, 250, 0.6);
    this.tone(90, 40, 0.6, "sine", 0.2);
  }

  chop() {
    if (!this.gate("chop", 0.12)) return;
    this.tone(160, 60, 0.12, "square", 0.05);
  }

  click() {
    if (!this.gate("click", 0.05)) return;
    this.tone(660, 990, 0.06, "triangle", 0.08);
  }

  mortar() {
    if (!this.gate("mortar", 0.15)) return;
    this.tone(140, 60, 0.25, "sine", 0.22);
    this.hiss(0.18, 0.12, 700, 0.8);
  }

  explosion() {
    if (!this.gate("boom", 0.1)) return;
    this.tone(90, 35, 0.45, "sine", 0.3);
    this.hiss(0.5, 0.2, 350, 0.5);
  }

  build() {
    if (!this.gate("build", 0.3)) return;
    this.tone(523, 784, 0.12, "triangle", 0.1);
    this.tone(784, 1046, 0.16, "triangle", 0.09, 0.09);
    this.tone(110, 70, 0.3, "sawtooth", 0.05, 0.2);
  }

  surge() {
    if (!this.gate("surge", 1)) return;
    this.tone(98, 147, 0.7, "sawtooth", 0.12);
    this.tone(147, 196, 0.7, "sawtooth", 0.09, 0.12);
    this.hiss(0.9, 0.1, 220, 0.5);
  }

  win() {
    if (!this.ctx || this.muted) return;
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => this.tone(f, f * 1.01, 0.3, "triangle", 0.12, i * 0.11));
    this.hiss(1.2, 0.12, 300, 0.4);
  }

  lose() {
    if (!this.ctx || this.muted) return;
    [392, 330, 262, 196].forEach((f, i) =>
      this.tone(f, f * 0.97, 0.35, "sawtooth", 0.07, i * 0.18),
    );
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
