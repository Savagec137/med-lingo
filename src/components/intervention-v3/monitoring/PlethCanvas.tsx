import { useEffect, useRef } from "react";
import type { SignalQuality, WaveformTrace } from "@/features/intervention-v3/ui/vitals-screen";

/**
 * L'onde pléthysmographique du saturomètre, dessinée sur un canevas.
 *
 * **Origine.** La routine de tracé vient du prototype Bolt
 * (`WaveformDisplay.tsx`) : grille de fond, montée systolique, incisure
 * dicrote, couleur du trait qui suit la qualité du signal. C'est le meilleur
 * apport visuel du prototype, et il est repris tel quel dans son principe.
 *
 * **Trois adaptations, et chacune répond à une règle de Medoca.**
 *
 * 1. *La cadence vient du moteur, pas d'une valeur par défaut.* Le prototype
 *    écrivait `const hr = heartRate ?? 80` : sans mesure, l'onde battait quand
 *    même, à quatre-vingts. C'est exactement la fuite que le mode interdit —
 *    une onde qui bat révèle une fréquence. Ici, sans cadence relevée, il n'y a
 *    pas de tracé du tout.
 *
 * 2. *L'animation se coupe.* Le prototype lance une boucle `requestAnimationFrame`
 *    sans condition. Medoca respecte `prefers-reduced-motion` : le tracé est
 *    alors dessiné une fois, lisible et immobile.
 *
 * 3. *Le canevas se redimensionne à sa boîte.* Le prototype fixait 280 × 70
 *    pixels et redéfinissait `canvas.width` à chaque exécution de l'effet, ce
 *    qui multipliait l'échelle par le rapport de pixels à chaque rendu et
 *    finissait par déformer le tracé. La taille est lue sur l'élément.
 */

interface Props {
  /** Tracé calculé par le moteur. Sa cadence est nulle tant que rien n'est relevé. */
  trace: WaveformTrace | null;
  reducedMotion: boolean;
  /** Libellé de l'absence, quand il n'y a rien à animer. */
  placeholder?: string;
  height?: number;
}

/** Bornes de tracé. Au-delà, l'onde devient illisible plutôt qu'informative. */
const MIN_BPM = 30;
const MAX_BPM = 200;

/**
 * Couleur et libellé par qualité de signal.
 *
 * Les teintes viennent du prototype ; les cinq états sont ceux de Medoca, qui
 * distingue l'acquisition en cours du signal simplement faible — un capteur qui
 * cherche et un capteur mal placé n'appellent pas le même geste.
 */
const QUALITY: Record<
  SignalQuality,
  { stroke: string; alpha: number; label: string; tone: string }
> = {
  good: { stroke: "#3ce6c4", alpha: 0.9, label: "Signal correct", tone: "text-emerald-300" },
  weak: {
    stroke: "#fb923c",
    alpha: 0.55,
    label: "Repositionner le capteur",
    tone: "text-amber-300",
  },
  artifact: { stroke: "#a3e635", alpha: 0.7, label: "Mouvement du patient", tone: "text-lime-300" },
  measuring: { stroke: "#38bdf8", alpha: 0.5, label: "Acquisition…", tone: "text-sky-300" },
  lost: { stroke: "#ff6a67", alpha: 0.4, label: "Signal perdu", tone: "text-red-300" },
};

/**
 * Forme d'un cycle, phase dans [0, 1).
 *
 * Reprise du prototype : montée systolique rapide sur les dix premiers pour
 * cent, incisure dicrote, puis retour à la ligne de base. Une sinusoïde aurait
 * été plus simple et n'aurait ressemblé à rien de ce qu'affiche un saturomètre.
 */
function cycleOffset(phase: number, height: number): number {
  if (phase < 0.1) return -Math.sin((phase * Math.PI) / 0.1) * height * 0.35;
  if (phase < 0.2) return -Math.sin(((phase - 0.1) * Math.PI) / 0.1) * height * 0.12;
  return Math.sin((phase - 0.2) * Math.PI * 2) * 2;
}

export function PlethCanvas({ trace, reducedMotion, placeholder, height = 70 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);

  const rate = trace?.ratePerMinute ?? null;
  const quality = trace?.quality ?? "lost";

  useEffect(() => {
    const canvas = canvasRef.current;
    // Le premier verrou est le plus important : sans cadence relevée, on ne
    // dessine rien. Une onde qui bat à une fréquence que personne n'a mesurée
    // la révèle aussi sûrement qu'un chiffre.
    if (!canvas || rate === null) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 280;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, rate));
    // Le prototype fixait trente pixels par battement, ce qui donne une dizaine
    // de cycles sur un canevas de 280 pixels et près de trente sur toute la
    // largeur d'un téléphone : illisible. La vitesse de balayage suit donc la
    // largeur, tout en restant proportionnelle à la fréquence — un cœur plus
    // rapide montre plus de cycles, comme sur un vrai moniteur.
    const beatsVisible = Math.min(14, Math.max(4, bpm / 12));
    const pixelsPerBeat = width / beatsVisible;
    const style = QUALITY[quality];

    const draw = () => {
      context.clearRect(0, 0, width, height);

      context.strokeStyle = "rgba(36, 221, 210, 0.08)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.strokeStyle = style.stroke;
      context.globalAlpha = style.alpha;
      context.lineWidth = 2;
      context.beginPath();
      for (let x = 0; x < width; x += 1) {
        const phase = (((x + phaseRef.current) % pixelsPerBeat) + pixelsPerBeat) % pixelsPerBeat;
        const y = height / 2 + cycleOffset(phase / pixelsPerBeat, height);
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.globalAlpha = 1;

      if (reducedMotion) return;
      phaseRef.current += (bpm / 60) * 2;
      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [rate, quality, reducedMotion, height]);

  if (rate === null) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg bg-slate-950/40 px-3"
        style={{ height }}
        role="img"
        aria-label={placeholder ?? "Aucune surveillance"}
      >
        <span className="h-0.5 flex-1 bg-slate-700" aria-hidden="true" />
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {placeholder ?? "Saturomètre non posé"}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative"
      role="img"
      aria-label={`Onde de pouls, ${rate} battements par minute`}
    >
      <canvas ref={canvasRef} className="w-full rounded-lg bg-slate-950/40" style={{ height }} />
      <span
        className={`absolute right-2 top-1 rounded px-1.5 py-0.5 text-[10px] font-black ${QUALITY[quality].tone} bg-slate-950/70`}
      >
        {QUALITY[quality].label}
      </span>
    </div>
  );
}
