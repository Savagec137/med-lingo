/**
 * Sons synthétisés en direct (Web Audio) : coups de canon, gerbes, impacts
 * dans le bois, explosions, sifflement des bombes, houle d'ambiance.
 * Aucun fichier à télécharger ; le volume baisse avec la distance.
 */

export interface NavalAudio {
  resume(): void;
  setEnabled(on: boolean): void;
  cannon(distance: number): void;
  splash(distance: number): void;
  hit(distance: number): void;
  explosion(distance: number, big: boolean): void;
  whistle(duration: number): void;
  ui(): void;
  dispose(): void;
}

function silent(): NavalAudio {
  const noop = () => {};
  return {
    resume: noop,
    setEnabled: noop,
    cannon: noop,
    splash: noop,
    hit: noop,
    explosion: noop,
    whistle: noop,
    ui: noop,
    dispose: noop,
  };
}

export function createAudio(enabled: boolean): NavalAudio {
  const Ctor =
    typeof window !== "undefined"
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return silent();
  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return silent();
  }
  const master = ctx.createGain();
  master.gain.value = enabled ? 0.8 : 0;
  master.connect(ctx.destination);
  let on = enabled;
  let voices = 0;

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // Houle : bruit brun filtré, en boucle, très bas.
  let ambience: AudioBufferSourceNode | null = null;
  const startAmbience = () => {
    if (ambience) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.value = 0.09;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(lp).connect(g).connect(master);
    src.start();
    lfo.start();
    ambience = src;
  };

  const gainFor = (distance: number) => Math.max(0.05, Math.min(1, 40 / Math.max(10, distance)));

  const burst = (opts: {
    duration: number;
    freq: number;
    q?: number;
    type?: BiquadFilterType;
    gain: number;
    attack?: number;
    thump?: number;
  }) => {
    if (!on || voices > 24) return;
    voices++;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? "lowpass";
    f.frequency.setValueAtTime(opts.freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq * 0.25), t + opts.duration);
    f.Q.value = opts.q ?? 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain, t + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random());
    src.stop(t + opts.duration + 0.05);
    src.onended = () => {
      voices--;
    };
    if (opts.thump) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(opts.thump, t);
      o.frequency.exponentialRampToValueAtTime(opts.thump * 0.4, t + 0.35);
      const og = ctx.createGain();
      og.gain.setValueAtTime(opts.gain * 1.4, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(og).connect(master);
      o.start(t);
      o.stop(t + 0.45);
    }
  };

  return {
    resume() {
      if (ctx.state === "suspended") void ctx.resume();
      startAmbience();
    },
    setEnabled(v) {
      on = v;
      master.gain.setTargetAtTime(v ? 0.8 : 0, ctx.currentTime, 0.05);
      if (v) this.resume();
    },
    cannon(d) {
      burst({ duration: 0.9, freq: 900, gain: 0.55 * gainFor(d), thump: 70 });
    },
    splash(d) {
      burst({
        duration: 0.5,
        freq: 2200,
        type: "bandpass",
        q: 0.9,
        gain: 0.25 * gainFor(d),
        attack: 0.02,
      });
    },
    hit(d) {
      burst({
        duration: 0.35,
        freq: 1400,
        type: "bandpass",
        q: 2,
        gain: 0.5 * gainFor(d),
        thump: 140,
      });
    },
    explosion(d, big) {
      burst({
        duration: big ? 1.8 : 1.1,
        freq: 600,
        gain: (big ? 0.9 : 0.6) * gainFor(d),
        thump: 48,
      });
    },
    whistle(duration) {
      if (!on) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(1500, t);
      o.frequency.exponentialRampToValueAtTime(380, t + duration);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + duration * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + duration);
    },
    ui() {
      burst({ duration: 0.08, freq: 3000, type: "bandpass", q: 4, gain: 0.15 });
    },
    dispose() {
      try {
        ambience?.stop();
      } catch {
        // déjà arrêté
      }
      void ctx.close();
    },
  };
}
