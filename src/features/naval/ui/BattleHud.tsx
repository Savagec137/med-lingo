/**
 * Interface de combat (portrait, pensée pour le pouce) :
 * gouvernail à gauche, TIRER à droite, munitions en arc au-dessus,
 * état du navire au centre, objectif en haut.
 */

import { useEffect, useRef, useState } from "react";
import { AMMO, AMMO_IDS, BATTERY_LABEL, type AmmoId } from "../sim/defs.ts";
import { REPAIR } from "../sim/defs.ts";
import type { HudState } from "../render/engine.ts";
import type { FireResult } from "../sim/world.ts";
import {
  AmmoIcon,
  FlameIcon,
  HammerIcon,
  HelmIcon,
  CannonIcon,
  SailIcon,
  ScrollIcon,
} from "./icons.tsx";

export interface HudActions {
  setRudder(v: number): void;
  setThrottle(v: number): void;
  fire(): FireResult | null;
  setAmmo(a: AmmoId): boolean;
  repair(): { ok: boolean; reason?: string };
  cycleTarget(): void;
}

function Helm({ onRudder }: { onRudder(v: number): void }) {
  const pad = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const apply = (clientX: number) => {
    const el = pad.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const v = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (r.width * 0.36)));
    onRudder(v);
    if (wheel.current) wheel.current.style.transform = `rotate(${v * 120}deg)`;
  };
  const release = () => {
    pointer.current = null;
    onRudder(0);
    if (wheel.current) wheel.current.style.transform = "rotate(0deg)";
  };

  return (
    <div
      ref={pad}
      className="nb-helm-pad relative flex h-[150px] w-[150px] items-center justify-center"
      role="slider"
      aria-label="Gouvernail : glissez à gauche pour bâbord, à droite pour tribord"
      aria-valuemin={-1}
      aria-valuemax={1}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = e.pointerId;
        apply(e.clientX);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) apply(e.clientX);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <span className="nb-display absolute left-4 text-3xl font-black text-[var(--nb-gold)] drop-shadow">
        ‹
      </span>
      <span className="nb-display absolute right-4 text-3xl font-black text-[var(--nb-gold)] drop-shadow">
        ›
      </span>
      <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-2 border-[rgba(243,194,91,0.7)] bg-[rgba(10,18,34,0.85)] shadow-[inset_0_0_14px_rgba(0,0,0,0.6)]">
        <div ref={wheel} className="transition-transform duration-75">
          <HelmIcon size={64} />
        </div>
      </div>
    </div>
  );
}

function Ring({
  progress,
  size,
  stroke,
  color,
}: {
  progress: number;
  size: number;
  stroke: number;
  color: string;
}) {
  const r = size / 2 - stroke / 2;
  return (
    <svg width={size} height={size} className="pointer-events-none absolute inset-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(0, Math.min(1, progress)) * 100} 100`}
      />
    </svg>
  );
}

function FireButton({ hud, onFire }: { hud: HudState; onFire(): FireResult | null }) {
  const [denied, setDenied] = useState(0);
  const planned = hud.planned;
  const progress = planned ? hud.reload[planned] : Math.max(hud.reload.babord, hud.reload.tribord);
  const ready = progress >= 1 && hud.repairing === null;
  const label =
    hud.repairing !== null ? "Réparation" : planned ? BATTERY_LABEL[planned] : "Deux bordées";
  useEffect(() => {
    if (!denied) return;
    const t = setTimeout(() => setDenied(0), 320);
    return () => clearTimeout(t);
  }, [denied]);
  return (
    <div className="relative h-[132px] w-[132px]">
      <button
        type="button"
        aria-label={`Tirer (${label})`}
        className={`nb-fire-btn absolute inset-0 flex flex-col items-center justify-center ${ready ? "nb-glow-pulse" : "nb-not-ready"} ${denied ? "nb-denied" : ""}`}
        onPointerDown={(e) => {
          e.preventDefault();
          const res = onFire();
          if (res && !res.ok) setDenied(Date.now());
        }}
      >
        <CannonIcon size={58} />
        <span className="nb-display -mt-1 text-[19px] font-black text-[var(--nb-gold-light)] drop-shadow">
          TIRER
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,231,163,0.75)]">
          {label}
        </span>
      </button>
      <Ring progress={progress} size={132} stroke={5} color={ready ? "#ffe7a3" : "#d08a2a"} />
      {/* Témoins des deux bordées : bâbord à gauche, tribord à droite. */}
      {(["babord", "tribord"] as const).map((b) => (
        <span
          key={b}
          title={`${BATTERY_LABEL[b]} : ${hud.reload[b] >= 1 ? "prête" : "en rechargement"}`}
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-black/60 ${b === "babord" ? "-left-5" : "-right-5"}`}
          style={{
            background:
              hud.reload[b] >= 1 ? "radial-gradient(circle,#fff3b0,#f3a92b)" : "rgba(40,30,20,0.9)",
            boxShadow: hud.reload[b] >= 1 ? "0 0 8px #f3c25b" : "none",
          }}
        />
      ))}
    </div>
  );
}

const AMMO_ANGLES = [100, 127, 154, 181];

function AmmoSelector({ hud, onAmmo }: { hud: HudState; onAmmo(a: AmmoId): boolean }) {
  const [hint, setHint] = useState<AmmoId | null>(null);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);
  return (
    <>
      {AMMO_IDS.map((a, i) => {
        const ang = (AMMO_ANGLES[i] * Math.PI) / 180;
        const r = 104;
        const active = hud.ammo === a;
        const empty = a === "feu" && hud.fireStock <= 0;
        return (
          <button
            key={a}
            type="button"
            aria-label={`${AMMO[a].name}${a === "feu" ? ` (${hud.fireStock})` : ""}`}
            aria-pressed={active}
            className="nb-round absolute flex h-[46px] w-[46px] items-center justify-center"
            style={{
              left: 66 + Math.cos(ang) * r - 23,
              top: 66 - Math.sin(ang) * r - 23,
              borderColor: active ? "#ffe7a3" : "rgba(243,194,91,0.45)",
              boxShadow: active ? "0 0 0 2px #f3c25b, 0 0 16px rgba(243,194,91,0.6)" : undefined,
              opacity: empty ? 0.4 : 1,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              if (onAmmo(a)) setHint(a);
            }}
          >
            <AmmoIcon ammo={a} size={30} />
            {a === "feu" && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full border border-black/50 bg-[#c8301a] px-1 text-center text-[10px] font-bold leading-[16px]">
                {hud.fireStock}
              </span>
            )}
          </button>
        );
      })}
      {hint && (
        <div className="nb-panel nb-pop absolute bottom-[236px] right-0 w-[210px] rounded-xl px-3 py-2 text-left">
          <div className="nb-display text-[13px] font-bold text-[var(--nb-gold)]">
            {AMMO[hint].name}
          </div>
          <div className="text-[11px] leading-snug text-[#e9e1cc]">{AMMO[hint].effect}</div>
        </div>
      )}
    </>
  );
}

function hullColor(ratio: number): string {
  if (ratio > 0.5) return "linear-gradient(180deg,#8df07a,#3fae3a)";
  if (ratio > 0.25) return "linear-gradient(180deg,#ffd36b,#d98a1a)";
  return "linear-gradient(180deg,#ff7a6a,#c3241a)";
}

function StatusBar({ hud }: { hud: HudState }) {
  const ratio = hud.hull / hud.hullMax;
  const pct = (v: number, m: number) => `${Math.round((100 * v) / m)} %`;
  return (
    <div className="mx-auto w-[min(66vw,320px)]">
      <div className="nb-bar">
        <i style={{ width: `${ratio * 100}%`, background: hullColor(ratio) }} />
        <span className="absolute inset-0 flex items-center justify-center text-[14px] font-extrabold tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {Math.ceil(hud.hull)} / {Math.round(hud.hullMax)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#e9e1cc]">
        <span
          className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5"
          title="État de la voilure : vitesse et manœuvre"
        >
          <SailIcon size={14} /> {pct(hud.sails, hud.sailsMax)}
        </span>
        <span
          className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5"
          title="Canons et servants : pièces disponibles et cadence"
        >
          <CannonIcon size={14} /> {pct(hud.cannons, hud.cannonsMax)}
        </span>
        <span className="rounded-full bg-black/40 px-2 py-0.5 tabular-nums">
          {hud.speedKnots} nœuds
        </span>
        {hud.fire > 0.02 && (
          <span className="flex items-center gap-1 rounded-full bg-[#7a1a10]/80 px-2 py-0.5 text-[#ffd9a0]">
            <FlameIcon size={14} /> Incendie
          </span>
        )}
      </div>
    </div>
  );
}

export function MissionBanner({ hud, onCycleTarget }: { hud: HudState; onCycleTarget(): void }) {
  return (
    <div className="mx-auto w-[min(92vw,420px)]">
      <div className="nb-panel flex items-center gap-3 rounded-2xl px-3 py-2">
        <ScrollIcon size={44} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-bold text-[#f7f1e3]">{hud.objective.label}</div>
          {hud.loot > 0 && (
            <div className="text-[11px] font-semibold text-[var(--nb-gold)]">
              Butin : +{hud.loot} or
            </div>
          )}
        </div>
        <div className="nb-display shrink-0 text-right tabular-nums">
          <span className="text-[30px] font-black text-white">{hud.objective.done}</span>
          <span className="text-[18px] font-bold text-[#c9bfa6]"> / {hud.objective.total}</span>
        </div>
      </div>
      {hud.target && (
        <button
          type="button"
          onClick={onCycleTarget}
          className="mx-auto mt-1.5 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-[#f3e6c4]"
        >
          <span className="text-[var(--nb-gold)]">Cible</span> {hud.target.name} ·{" "}
          {hud.target.distance} m
          {!hud.inRange && <span className="text-[#ff9a7a]">· hors de portée</span>}
          <span className="text-[#9fb3c8]">— changer</span>
        </button>
      )}
    </div>
  );
}

export function BattleControls({ hud, actions }: { hud: HudState; actions: HudActions }) {
  const halfSail = hud.throttle < 0.9;
  const repairProgress =
    hud.repairing ?? (hud.repairCooldown > 0 ? 1 - hud.repairCooldown / REPAIR.cooldown : 1);
  const repairUrgent =
    hud.repairKits > 0 &&
    hud.repairing === null &&
    hud.repairCooldown <= 0 &&
    (hud.hull / hud.hullMax < 0.45 || hud.fire > 0.3);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-[max(14px,env(safe-area-inset-bottom))]">
      {/* En paysage (écran bas), la barre d'état descend entre le gouvernail et TIRER. */}
      <div className="pointer-events-auto mb-3 [@media(max-height:520px)]:absolute [@media(max-height:520px)]:bottom-[max(14px,env(safe-area-inset-bottom))] [@media(max-height:520px)]:left-1/2 [@media(max-height:520px)]:mb-0 [@media(max-height:520px)]:-translate-x-1/2">
        <StatusBar hud={hud} />
      </div>
      <div className="flex items-end justify-between">
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          <div className="flex gap-2 pl-1">
            <button
              type="button"
              aria-label={`Réparer (${hud.repairKits} trousses)`}
              disabled={hud.repairKits <= 0 || hud.repairing !== null}
              className={`nb-round relative flex h-[52px] w-[52px] items-center justify-center disabled:opacity-45 ${repairUrgent ? "nb-repair-urgent" : ""}`}
              onPointerDown={(e) => {
                e.preventDefault();
                actions.repair();
              }}
            >
              <HammerIcon size={28} />
              <Ring
                progress={repairProgress}
                size={52}
                stroke={3}
                color={hud.repairing !== null ? "#7ee081" : "#f3c25b"}
              />
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full border border-black/50 bg-[#2f7a34] px-1 text-center text-[10px] font-bold leading-[16px]">
                {hud.repairKits}
              </span>
            </button>
            <button
              type="button"
              aria-label={
                halfSail
                  ? "Voilure réduite : passer à pleines voiles"
                  : "Pleines voiles : réduire la voilure"
              }
              className="nb-round flex h-[52px] items-center gap-1 px-3"
              onPointerDown={(e) => {
                e.preventDefault();
                actions.setThrottle(halfSail ? 1 : 0.5);
              }}
            >
              <SailIcon size={24} />
              <span className="text-[11px] font-bold leading-tight text-[#f3e6c4]">
                {halfSail ? "Demi" : "Pleines"}
                <br />
                voiles
              </span>
            </button>
          </div>
          <Helm onRudder={actions.setRudder} />
        </div>
        <div className="pointer-events-auto relative mr-1 h-[132px] w-[132px]">
          <AmmoSelector hud={hud} onAmmo={actions.setAmmo} />
          <FireButton hud={hud} onFire={actions.fire} />
        </div>
      </div>
    </div>
  );
}
