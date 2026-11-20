/**
 * Naval Battles — application mobile : port, combat, bilan.
 *
 * Le moteur 3D est créé une seule fois et reste vivant d'un écran à l'autre ;
 * la sauvegarde est lue et écrite dans le stockage local du navigateur.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import "./naval.css";
import { createNavalEngine, type HudState, type NavalEngine } from "../render/engine.ts";
import { SHIP_CLASSES, type ShipClassId } from "../sim/defs.ts";
import { MISSIONS, REGION, getMission } from "../sim/missions.ts";
import {
  SAVE_KEY,
  applyBattle,
  buyUpgrade,
  isMissionUnlocked,
  parseSave,
  serializeSave,
  type NavalSave,
  type RewardBreakdown,
} from "../sim/save.ts";
import { getUpgrade, type UpgradeId } from "../sim/upgrades.ts";
import type { BattleReport } from "../sim/world.ts";
import { BattleControls, MissionBanner, type HudActions } from "./BattleHud.tsx";
import {
  AmmoIcon,
  CannonIcon,
  CoinIcon,
  GemIcon,
  HammerIcon,
  HelmIcon,
  ShipSilhouette,
  StarIcon,
} from "./icons.tsx";
import { PortScreen, TopBar } from "./PortScreen.tsx";

type Screen = "port" | "battle" | "result";

interface Toast {
  id: number;
  text: string;
  tone: "info" | "danger" | "success";
}

function loadSave(): NavalSave {
  try {
    return parseSave(window.localStorage.getItem(SAVE_KEY));
  } catch {
    return parseSave(null);
  }
}

function storeSave(save: NavalSave): void {
  try {
    window.localStorage.setItem(SAVE_KEY, serializeSave(save));
  } catch {
    // Stockage indisponible (navigation privée) : la partie continue sans sauvegarde.
  }
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(4,8,18,0.62)] p-4 backdrop-blur-[2px]">
      <div className="nb-wood nb-pop w-full max-w-[380px] rounded-3xl p-4">{children}</div>
    </div>
  );
}

function Tutorial({ onClose }: { onClose(): void }) {
  const tips: [React.ReactNode, string, string][] = [
    [
      <HelmIcon key="h" size={34} />,
      "Gouvernail",
      "Glissez le doigt à gauche ou à droite sur la roue pour virer de bord.",
    ],
    [
      <CannonIcon key="c" size={34} />,
      "Les canons sont sur les flancs",
      "Présentez votre côté à l'ennemi : TIRER choisit tout seul la batterie qui fait face à la cible.",
    ],
    [
      <AmmoIcon key="a" ammo="chaine" size={34} />,
      "Munitions",
      "Boulet pour la coque, ramé pour les voiles, mitraille pour les canons, feu pour l'incendie.",
    ],
    [
      <HammerIcon key="r" size={34} />,
      "Réparer",
      "Le marteau éteint l'incendie et rapièce coque, voiles et canons — mais les canons se taisent 4 secondes.",
    ],
    [
      <ShipSilhouette key="s" cls="brulot" size={34} />,
      "Dangers",
      "Touchez un navire pour le cibler. Sortez des cercles rouges : une bombe va tomber.",
    ],
  ];
  return (
    <Modal>
      <h2 className="nb-display text-center text-[22px] font-black">
        <span className="nb-gold-text">Ordres du capitaine</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {tips.map(([icon, title, text]) => (
          <li key={title} className="nb-parchment flex items-center gap-3 rounded-xl p-2.5">
            <span className="nb-round flex h-12 w-12 shrink-0 items-center justify-center">
              {icon}
            </span>
            <span>
              <span className="nb-display block text-[13px] font-black">{title}</span>
              <span className="block text-[12px] leading-snug">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="nb-btn-gold mt-4 w-full rounded-2xl py-3 text-[16px]"
      >
        À l'abordage !
      </button>
    </Modal>
  );
}

function ResultScreen({
  report,
  rewards,
  onPort,
  onRetry,
  onNext,
}: {
  report: BattleReport;
  rewards: RewardBreakdown;
  onPort(): void;
  onRetry(): void;
  onNext: (() => void) | null;
}) {
  const victory = report.outcome === "victoire";
  const mission = getMission(report.missionId);
  const accuracy = report.shots > 0 ? Math.round((100 * report.hits) / report.shots) : 0;
  const minutes = Math.floor(report.duration / 60);
  const seconds = Math.round(report.duration % 60);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(4,8,18,0.6)] p-4">
      <div className="nb-wood nb-pop w-full max-w-[390px] rounded-3xl p-4">
        <div className="text-center">
          <div className="nb-display text-[13px] font-bold uppercase tracking-[0.3em] text-[#e9dcc0]">
            {mission.name}
          </div>
          <h2 className="nb-display mt-1 text-[38px] font-black leading-none">
            {victory ? (
              <span className="nb-gold-text">Victoire !</span>
            ) : (
              <span className="text-[#ff8a7a] drop-shadow">Naufrage</span>
            )}
          </h2>
          {victory ? (
            <div className="mt-2 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <StarIcon
                  key={i}
                  size={40}
                  filled={i < report.stars}
                  className={i < report.stars ? "nb-pop" : ""}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-[#e9dcc0]">
              Votre galion a sombré. L'équipage a sauvé la moitié du butin.
            </p>
          )}
        </div>
        <div className="nb-parchment mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-2xl p-3 text-[13px]">
          <span>Navires coulés</span>
          <b className="text-right">{report.kills}</b>
          <span>Précision</span>
          <b className="text-right">
            {accuracy} %{" "}
            <span className="font-normal">
              ({report.hits}/{report.shots})
            </span>
          </b>
          <span>Dégâts infligés</span>
          <b className="text-right">{report.damageDealt}</b>
          <span>Dégâts subis</span>
          <b className="text-right">{report.damageTaken}</b>
          <span>Coque restante</span>
          <b className="text-right">{Math.ceil(report.hullRatio * 100)} %</b>
          <span>Durée</span>
          <b className="text-right">
            {minutes} min {seconds.toString().padStart(2, "0")}
          </b>
        </div>
        {Object.keys(report.killsByClass).length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {(Object.entries(report.killsByClass) as [ShipClassId, number][]).map(([cls, n]) => (
              <span
                key={cls}
                className="flex items-center gap-1 rounded-full bg-black/35 py-0.5 pl-1 pr-2 text-[11px] font-semibold"
              >
                <ShipSilhouette cls={cls} size={22} /> {n}× {SHIP_CLASSES[cls].name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 rounded-2xl bg-black/35 p-3">
          <div className="nb-display mb-1.5 text-center text-[13px] font-bold text-[var(--nb-gold)]">
            Récompenses
          </div>
          <div className="space-y-1 text-[13px]">
            <div className="flex justify-between">
              <span>Butin des navires coulés{victory ? "" : " (moitié)"}</span>
              <b className="flex items-center gap-1">
                <CoinIcon size={16} /> {rewards.loot}
              </b>
            </div>
            {victory && (
              <div className="flex justify-between">
                <span>{rewards.firstClear ? "Prime de mission" : "Prime de reprise"}</span>
                <b className="flex items-center gap-1">
                  <CoinIcon size={16} /> {rewards.missionGold}
                </b>
              </div>
            )}
            {rewards.gems > 0 && (
              <div className="flex justify-between">
                <span>Première victoire</span>
                <b className="flex items-center gap-1">
                  <GemIcon size={16} /> {rewards.gems}
                </b>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-[rgba(243,194,91,0.3)] pt-1 text-[15px]">
              <span className="font-bold">Total</span>
              <b className="flex items-center gap-1 text-[var(--nb-gold)]">
                <CoinIcon size={18} /> +{rewards.total}
              </b>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="nb-btn-gold rounded-2xl py-3 text-[15px]"
            >
              Mission suivante
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Rejouer
            </button>
            <button
              type="button"
              onClick={onPort}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Retour au port
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NavalBattlesApp({ onExit }: { onExit(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<NavalEngine | null>(null);
  const [save, setSave] = useState<NavalSave>(() => loadSave());
  const saveRef = useRef(save);
  const [screen, setScreen] = useState<Screen>("port");
  const [hud, setHud] = useState<HudState | null>(null);
  const [missionId, setMissionId] = useState<string>(MISSIONS[0].id);
  const [result, setResult] = useState<{ report: BattleReport; rewards: RewardBreakdown } | null>(
    null,
  );
  const [paused, setPaused] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [settings, setSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hurt, setHurt] = useState(0);
  const lastHull = useRef<number | null>(null);
  const missionRef = useRef(missionId);
  missionRef.current = missionId;

  const commit = useCallback((next: NavalSave) => {
    saveRef.current = next;
    setSave(next);
    storeSave(next);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2900);
  }, []);

  useEffect(() => {
    if (!host.current) return;
    const e = createNavalEngine(
      host.current,
      {
        onHud: (h) => {
          if (lastHull.current !== null && h.hull < lastHull.current - 0.5) setHurt(Date.now());
          lastHull.current = h.hull;
          setHud(h);
        },
        onBattleEnd: (report) => {
          const { save: next, rewards } = applyBattle(saveRef.current, report);
          commit(next);
          setResult({ report, rewards });
          setScreen("result");
        },
        onToast: toast,
        onAutoPause: () => setPaused(true),
      },
      { sound: saveRef.current.settings.sound },
    );
    engine.current = e;
    // Accès de test (développement uniquement) : les tests de bout en bout lisent l'état de la bataille.
    if (import.meta.env.DEV) (window as unknown as { __naval?: NavalEngine }).__naval = e;
    return () => {
      e.dispose();
      engine.current = null;
      if (import.meta.env.DEV) delete (window as unknown as { __naval?: NavalEngine }).__naval;
    };
  }, [commit, toast]);

  useEffect(() => {
    engine.current?.setPaused(paused || tutorial);
  }, [paused, tutorial]);

  const launch = useCallback((id: string) => {
    if (!isMissionUnlocked(saveRef.current, id)) return;
    setMissionId(id);
    setResult(null);
    setHud(null);
    lastHull.current = null;
    setPaused(false);
    setSettings(false);
    engine.current?.unlockAudio();
    engine.current?.startBattle(id, saveRef.current);
    setScreen("battle");
    if (saveRef.current.stats.battles === 0) setTutorial(true);
  }, []);

  const backToPort = useCallback(() => {
    engine.current?.showPort();
    setScreen("port");
    setResult(null);
    setHud(null);
    setPaused(false);
  }, []);

  const buy = useCallback(
    (id: UpgradeId) => {
      const res = buyUpgrade(saveRef.current, id);
      if (res.ok) {
        commit(res.save);
        toast(`${getUpgrade(id).name} : niveau ${res.save.upgrades[id]}`, "success");
      } else if (res.reason) {
        toast(res.reason, "info");
      }
    },
    [commit, toast],
  );

  const toggleSound = () => {
    const next = {
      ...saveRef.current,
      settings: { ...saveRef.current.settings, sound: !saveRef.current.settings.sound },
    };
    commit(next);
    engine.current?.setSound(next.settings.sound);
  };

  const actions: HudActions = {
    setRudder: (v) => engine.current?.setRudder(v),
    setThrottle: (v) => engine.current?.setThrottle(v),
    fire: () => engine.current?.fire() ?? null,
    setAmmo: (a) => engine.current?.setAmmo(a) ?? false,
    repair: () => engine.current?.repair() ?? { ok: false },
    cycleTarget: () => engine.current?.cycleTarget(),
  };

  const nextMission = (() => {
    if (!result || result.report.outcome !== "victoire") return null;
    const i = MISSIONS.findIndex((m) => m.id === result.report.missionId);
    const next = MISSIONS[i + 1];
    return next && isMissionUnlocked(save, next.id) ? next.id : null;
  })();

  return (
    <div className="nb-root" data-screen={screen}>
      <div ref={host} className="absolute inset-0" />

      {screen === "port" && (
        <PortScreen
          save={save}
          onLaunch={launch}
          onBuy={buy}
          onSettings={() => setSettings(true)}
        />
      )}

      {screen === "battle" && hurt > 0 && (
        <div key={hurt} className="nb-hurt pointer-events-none absolute inset-0" />
      )}

      {screen !== "port" && hud && (
        <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
          <div className="pointer-events-auto">
            <TopBar
              save={save}
              subtitle={`${REGION.name} · ${getMission(missionId).name}`}
              onGear={() => setPaused(true)}
              gearLabel="Pause"
            />
          </div>
          <div className="pointer-events-auto mt-2">
            <MissionBanner hud={hud} onCycleTarget={actions.cycleTarget} />
          </div>
          {screen === "battle" && <BattleControls hud={hud} actions={actions} />}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-[150px] z-10 flex flex-col items-center gap-1.5 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`nb-toast rounded-full px-4 py-1.5 text-center text-[13px] font-bold shadow-lg ${
              t.tone === "danger"
                ? "bg-[#7a1a10]/90 text-[#ffe1c4]"
                : t.tone === "success"
                  ? "bg-[#1c4a2a]/90 text-[#e2ffd8]"
                  : "bg-[#12223f]/90 text-[#f3e6c4]"
            } border border-[rgba(243,194,91,0.45)]`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {screen === "result" && result && (
        <ResultScreen
          report={result.report}
          rewards={result.rewards}
          onPort={backToPort}
          onRetry={() => launch(result.report.missionId)}
          onNext={nextMission ? () => launch(nextMission) : null}
        />
      )}

      {tutorial && screen === "battle" && <Tutorial onClose={() => setTutorial(false)} />}

      {paused && screen === "battle" && !tutorial && (
        <Modal>
          <h2 className="nb-display text-center text-[26px] font-black">
            <span className="nb-gold-text">Pause</span>
          </h2>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="nb-btn-gold rounded-2xl py-3 text-[16px]"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={() => setTutorial(true)}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Ordres du capitaine
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Son : {save.settings.sound ? "activé" : "coupé"}
            </button>
            <button
              type="button"
              onClick={() => launch(missionId)}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Recommencer la mission
            </button>
            <button
              type="button"
              onClick={backToPort}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold text-[#ffb4a6]"
            >
              Abandonner (sans récompense)
            </button>
          </div>
        </Modal>
      )}

      {settings && screen === "port" && (
        <Modal>
          <h2 className="nb-display text-center text-[24px] font-black">
            <span className="nb-gold-text">Réglages</span>
          </h2>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Son : {save.settings.sound ? "activé" : "coupé"}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="nb-btn-ghost nb-display rounded-2xl py-3 text-[14px] font-bold"
            >
              Quitter le jeu
            </button>
            <button
              type="button"
              onClick={() => setSettings(false)}
              className="nb-btn-gold rounded-2xl py-3 text-[16px]"
            >
              Fermer
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#d9cba8]">
            {save.stats.battles} batailles · {save.stats.victories} victoires ·{" "}
            {save.stats.shipsSunk} navires coulés
          </p>
        </Modal>
      )}
    </div>
  );
}
