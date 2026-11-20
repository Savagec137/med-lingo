/**
 * Port-des-Alizés : tableau des missions et arsenal.
 * Le galion du joueur mouille devant le fort, en 3D, derrière les panneaux.
 */

import { useState } from "react";
import { SHIP_CLASSES, type ShipClassId } from "../sim/defs.ts";
import { MISSIONS, REGION, objectiveLabel, type MissionDef } from "../sim/missions.ts";
import { isMissionUnlocked, type NavalSave } from "../sim/save.ts";
import {
  UPGRADES,
  buildLoadout,
  describeLevel,
  nextCost,
  type UpgradeId,
} from "../sim/upgrades.ts";
import {
  AnchorIcon,
  CaptainEmblem,
  CoinIcon,
  GearIcon,
  GemIcon,
  LockIcon,
  ShipSilhouette,
  SkullIcon,
  StarIcon,
  UpgradeIcon,
} from "./icons.tsx";

export function TopBar({
  save,
  subtitle,
  onGear,
  gearLabel,
}: {
  save: NavalSave;
  subtitle: string;
  onGear(): void;
  gearLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
        <CaptainEmblem size={46} />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden leading-none">
        <div className="nb-display whitespace-nowrap text-[clamp(14px,4.2vw,24px)] font-black">
          <span className="nb-title-white">NAVAL </span>
          <span className="nb-gold-text">BATTLES</span>
        </div>
        <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9fb6d8]">
          {subtitle}
        </div>
      </div>
      <div className="nb-panel flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5">
        <span className="flex items-center gap-1 text-[13px] font-bold tabular-nums">
          <CoinIcon size={18} /> {save.gold.toLocaleString("fr-FR")}
        </span>
        <span className="h-4 w-px bg-[rgba(243,194,91,0.4)]" />
        <span className="flex items-center gap-1 text-[13px] font-bold tabular-nums">
          <GemIcon size={16} /> {save.gems}
        </span>
      </div>
      <button
        type="button"
        aria-label={gearLabel}
        onClick={onGear}
        className="nb-round flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <GearIcon size={26} />
      </button>
    </div>
  );
}

function enemyComposition(m: MissionDef): [ShipClassId, number][] {
  const counts = new Map<ShipClassId, number>();
  for (const w of m.waves) for (const s of w.ships) counts.set(s.cls, (counts.get(s.cls) ?? 0) + 1);
  return [...counts.entries()];
}

function MissionCard({
  mission,
  index,
  save,
  onLaunch,
}: {
  mission: MissionDef;
  index: number;
  save: NavalSave;
  onLaunch(id: string): void;
}) {
  const unlocked = isMissionUnlocked(save, mission.id);
  const record = save.missions[mission.id];
  const won = (record?.wins ?? 0) > 0;
  const previous = MISSIONS[index - 1];
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border ${unlocked ? "border-[rgba(243,194,91,0.6)]" : "border-white/10"} bg-[linear-gradient(160deg,rgba(26,42,74,0.95),rgba(10,16,32,0.96))] p-3 shadow-[0_8px_20px_rgba(0,0,0,0.45)]`}
    >
      <div className="flex items-start gap-3">
        <div
          className="nb-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] font-black"
          style={{
            background: unlocked
              ? "radial-gradient(circle at 40% 30%,#ffe7a3,#c58a28 70%,#6a420c)"
              : "#2a2f3a",
            color: unlocked ? "#2a1606" : "#8a8f9a",
            border: "2px solid rgba(0,0,0,0.4)",
          }}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="nb-display truncate text-[16px] font-bold text-[#f7ecd0]">
              {mission.name}
            </h3>
            <div
              className="flex shrink-0 gap-0.5"
              aria-label={`Difficulté ${mission.difficulty} sur 5`}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <SkullIcon
                  key={i}
                  size={13}
                  style={{ color: i < mission.difficulty ? "#e8dcc0" : "rgba(255,255,255,0.15)" }}
                />
              ))}
            </div>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-[#c9c0aa]">{mission.brief}</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-[rgba(243,194,91,0.14)] px-2 py-0.5 text-[11px] font-bold text-[var(--nb-gold)]">
          {objectiveLabel(mission)}
        </span>
        {enemyComposition(mission).map(([cls, n]) => (
          <span
            key={cls}
            title={SHIP_CLASSES[cls].name}
            className="flex items-center gap-0.5 rounded-full bg-black/35 py-0.5 pl-1 pr-2 text-[11px] font-semibold"
          >
            <ShipSilhouette cls={cls} size={22} />
            {n}× {SHIP_CLASSES[cls].name.split(" ")[0]}
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="text-[12px] font-semibold text-[#e9e1cc]">
          {won ? (
            <span className="flex items-center gap-1">
              Reprise : <CoinIcon size={16} /> {mission.replayGold} + butin
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              Prime : <CoinIcon size={16} /> {mission.reward.gold}
              {mission.reward.gems > 0 && (
                <>
                  <GemIcon size={15} /> {mission.reward.gems}
                </>
              )}
              <span className="text-[#9fb3c8]">+ butin</span>
            </span>
          )}
          <div className="mt-1 flex gap-0.5" aria-label={`${record?.bestStars ?? 0} étoiles sur 3`}>
            {[0, 1, 2].map((i) => (
              <StarIcon key={i} size={16} filled={i < (record?.bestStars ?? 0)} />
            ))}
          </div>
        </div>
        {unlocked ? (
          <button
            type="button"
            onClick={() => onLaunch(mission.id)}
            className="nb-btn-gold flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px]"
          >
            <AnchorIcon size={16} /> {won ? "Rejouer" : "Appareiller"}
          </button>
        ) : (
          <div className="flex max-w-[150px] items-center gap-1.5 text-right text-[11px] leading-tight text-[#9a968c]">
            <LockIcon size={22} className="shrink-0" />
            Gagnez « {previous?.name} » pour lever l'ancre
          </div>
        )}
      </div>
    </article>
  );
}

function Arsenal({ save, onBuy }: { save: NavalSave; onBuy(id: UpgradeId): void }) {
  const l = buildLoadout(save.upgrades);
  return (
    <div className="space-y-2.5">
      <div className="nb-parchment rounded-2xl p-3">
        <div className="flex items-center gap-3">
          <ShipSilhouette cls="galion" size={56} />
          <div>
            <div className="nb-display text-[16px] font-black">Votre galion</div>
            <div className="text-[12px] leading-snug">
              Coque {l.hull} · Voiles {l.sails} · 6 canons par bord
              <br />
              {l.gunDamage.toFixed(1)} dégâts/boulet · {l.reload.toFixed(2)} s ·{" "}
              {Math.round(l.range)} m
              <br />
              {l.fireStock} salves incendiaires · {l.repairKits} trousses de réparation
            </div>
          </div>
        </div>
      </div>
      {UPGRADES.map((u) => {
        const level = save.upgrades[u.id];
        const cost = nextCost(u.id, level);
        const affordable = cost !== null && save.gold >= cost;
        return (
          <div
            key={u.id}
            className="rounded-2xl border border-[rgba(243,194,91,0.45)] bg-[linear-gradient(160deg,rgba(26,42,74,0.95),rgba(10,16,32,0.96))] p-3"
          >
            <div className="flex items-center gap-3">
              <div className="nb-round flex h-12 w-12 shrink-0 items-center justify-center">
                <UpgradeIcon id={u.id} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="nb-display truncate text-[15px] font-bold text-[#f7ecd0]">
                    {u.name}
                  </div>
                  <div className="flex gap-1" aria-label={`Niveau ${level} sur ${u.costs.length}`}>
                    {u.costs.map((_, i) => (
                      <span
                        key={i}
                        className="h-2.5 w-2.5 rotate-45 border border-black/50"
                        style={{
                          background:
                            i < level
                              ? "linear-gradient(#ffe7a3,#c58a28)"
                              : "rgba(255,255,255,0.1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-[#c9c0aa]">{u.description}</div>
                <div className="mt-1 text-[12px] font-semibold text-[#e9e1cc]">
                  {describeLevel(u.id, level)}
                  {cost !== null && (
                    <span className="text-[var(--nb-gold)]">
                      {" "}
                      → {describeLevel(u.id, level + 1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              {cost === null ? (
                <span className="nb-display text-[12px] font-bold text-[var(--nb-gold)]">
                  Niveau maximal
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => onBuy(u.id)}
                  className="nb-btn-gold flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px]"
                  aria-label={`Améliorer ${u.name} pour ${cost} pièces d'or`}
                >
                  <CoinIcon size={16} /> {cost}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PortScreen({
  save,
  onLaunch,
  onBuy,
  onSettings,
}: {
  save: NavalSave;
  onLaunch(id: string): void;
  onBuy(id: UpgradeId): void;
  onSettings(): void;
}) {
  const [tab, setTab] = useState<"missions" | "arsenal">("missions");
  const done = MISSIONS.filter((m) => (save.missions[m.id]?.wins ?? 0) > 0).length;
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="nb-vignette pointer-events-none absolute inset-0" />
      <div className="relative">
        <TopBar save={save} subtitle={REGION.name} onGear={onSettings} gearLabel="Réglages" />
      </div>
      <div className="relative mt-3 px-4 text-center">
        <div className="nb-display text-[clamp(26px,8vw,36px)] font-black leading-none">
          <span className="nb-gold-text">Port-des-Alizés</span>
        </div>
        <div className="mt-1 text-[12px] font-semibold text-[#d6e2f2] drop-shadow">
          {done} / {MISSIONS.length} missions accomplies · {save.stats.shipsSunk} navires envoyés
          par le fond
        </div>
      </div>
      <div className="flex-1" />
      <section className="nb-wood relative mx-2 mb-[max(8px,env(safe-area-inset-bottom))] flex max-h-[62vh] min-h-0 flex-col rounded-3xl p-2.5">
        <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/35 p-1" role="tablist">
          {(
            [
              ["missions", "Missions"],
              ["arsenal", "Arsenal"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`nb-display rounded-xl py-2 text-[14px] font-bold transition ${tab === id ? "nb-btn-gold" : "text-[#e9dcc0]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="nb-scroll min-h-0 flex-1 space-y-2.5 px-0.5 pb-1">
          {tab === "missions" ? (
            MISSIONS.map((m, i) => (
              <MissionCard key={m.id} mission={m} index={i} save={save} onLaunch={onLaunch} />
            ))
          ) : (
            <Arsenal save={save} onBuy={onBuy} />
          )}
        </div>
      </section>
    </div>
  );
}
