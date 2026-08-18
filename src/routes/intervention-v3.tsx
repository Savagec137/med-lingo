import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { MissionListScreen } from "@/components/intervention-v3/MissionListScreen";
import { ArrivalScreen } from "@/components/intervention-v3/ArrivalScreen";
import { Centre15Screen } from "@/components/intervention-v3/Centre15Screen";
import { DebriefScreen } from "@/components/intervention-v3/DebriefScreen";
import { NewCallScreen } from "@/components/intervention-v3/NewCallScreen";
import { PriorityActionsScreen } from "@/components/intervention-v3/PriorityActionsScreen";
import { ReevaluationScreen } from "@/components/intervention-v3/ReevaluationScreen";
import { VitalsScreen } from "@/components/intervention-v3/VitalsScreen";
import { useInterventionV3 } from "@/features/intervention-v3/use-intervention-v3";
import { nextPhaseBlocker, nextPhaseLabel } from "@/features/intervention-v3/engine/queries";
import { arrivalScreenModel } from "@/features/intervention-v3/ui/arrival-screen";
import { centre15ScreenModel } from "@/features/intervention-v3/ui/centre15-screen";
import { debriefScreenModel } from "@/features/intervention-v3/ui/debrief-screen";
import { newCallScreenModel } from "@/features/intervention-v3/ui/new-call-screen";
import { priorityActionsScreenModel } from "@/features/intervention-v3/ui/priority-actions-screen";
import { reevaluationScreenModel } from "@/features/intervention-v3/ui/reevaluation-screen";
import { missionListScreenModel } from "@/features/intervention-v3/ui/mission-list-screen";
import { vitalsScreenModel } from "@/features/intervention-v3/ui/vitals-screen";
import { findV3Scenario } from "@/features/intervention-v3/scenarios/v3-catalog";

/**
 * Le Mode Intervention V3, sur sa propre route.
 *
 * Séparée de `/intervention` à dessein : les quinze missions historiques tournent
 * sur un autre moteur, et les faire cohabiter dans une même page les exposerait à
 * se casser l'une l'autre. Cette route ne touche à rien de l'existant.
 *
 * Elle n'a qu'un rôle : choisir l'écran d'après la phase, et brancher les
 * commandes du hook. Aucune règle de jeu n'y figure — pas même le choix de ce qui
 * est cliquable, qui vient des modèles.
 */

/**
 * La mission choisie voyage dans l'URL.
 *
 * Deux raisons. Elle devient partageable et rejouable — un formateur peut
 * envoyer un lien vers l'exercice exact. Et surtout, elle sépare proprement deux
 * états qui n'ont rien à voir : « aucune mission engagée », qui montre la liste,
 * et « cette mission-là », qui démarre à l'appel du 15.
 */
export const Route = createFileRoute("/intervention-v3")({
  component: InterventionV3Route,
  // La clé est **absente** quand aucune mission n'est engagée, et non présente
  // à `undefined` : un lien vers la liste ne doit pas avoir à nommer un
  // paramètre qu'il ne porte pas.
  validateSearch: (search: Record<string, unknown>): { scenario?: string } =>
    typeof search.scenario === "string" ? { scenario: search.scenario } : {},
});

/** Nombre d'étapes affiché par la barre de progression de l'écran d'arrivée. */
const TOTAL_STEPS = 12;

/**
 * Le passage à l'étape suivante, là où aucune action ne le porte.
 *
 * Quatre transitions découlent d'une action — joindre le 15, transmettre,
 * valider les gestes, préparer le transport — et se font toutes seules. Les
 * autres sont une décision du joueur : « j'ai fini d'observer la scène »,
 * « je passe au relevé des constantes ». Le bouton dit ce qui manque quand il
 * est bloqué, plutôt que de rester inerte sans expliquer.
 */
function PhaseAdvance({ game }: { game: ReturnType<typeof useInterventionV3> }) {
  const { session } = game;
  // Sur ces phases, l'avance est portée par une action de l'écran lui-même.
  const ACTION_DRIVEN = ["new_call", "centre15_call", "priority_actions", "debrief"];
  if (ACTION_DRIVEN.includes(session.phase)) return null;

  const blocker = nextPhaseBlocker(session);
  const label = nextPhaseLabel(session);
  if (!label) return null;

  return (
    <div className="mt-5 flex flex-col gap-1.5">
      <button
        type="button"
        disabled={blocker !== null}
        onClick={game.advance}
        className="press rounded-2xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-slate-500"
      >
        Continuer → {label}
      </button>
      {blocker && <p className="px-1 text-[11px] text-amber-300/80">{blocker}</p>}
    </div>
  );
}

/**
 * La route : elle choisit entre la liste et la mission, et rien d'autre.
 *
 * Le jeu est monté avec la mission pour **clé**. Changer de mission remonte donc
 * le composant, ce qui repart d'une session neuve — la sémantique exacte de
 * « choisir une autre mission ». Sans cette clé, l'état interne du hook
 * survivrait au changement et le joueur reprendrait la nouvelle intervention au
 * milieu de la précédente.
 */
function InterventionV3Route() {
  const { scenario } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const chooseMission = (scenarioId: string) => navigate({ search: { scenario: scenarioId } });

  if (!scenario || !findV3Scenario(scenario)) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <TopBar />
        <main className="mx-auto max-w-3xl px-4 py-4">
          <MissionListScreen model={missionListScreenModel()} onChoose={chooseMission} />
        </main>
      </div>
    );
  }

  return (
    <InterventionV3Game
      key={scenario}
      scenarioId={scenario}
      onLeaveMission={() => navigate({ search: {} })}
    />
  );
}

function InterventionV3Game({
  scenarioId,
  onLeaveMission,
}: {
  scenarioId: string;
  onLeaveMission: () => void;
}) {
  const game = useInterventionV3({ scenarioId });
  const { session } = game;

  // Sélection de l'appel au 15 : un état d'interface, pas un état de jeu. Le
  // joueur coche et décoche librement, et rien n'est engagé avant la transmission.
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);

  const toggle = useCallback((list: string[], setList: (next: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);
  }, []);

  const screen = () => {
    switch (session.phase) {
      case "new_call":
        return (
          <NewCallScreen
            model={newCallScreenModel(session)}
            onAction={(id) => {
              // Accepter fait **avancer la phase**, et ne joue aucune action : le
              // premier geste de terrain n'existe qu'à partir de l'arrivée, et le
              // jouer ici serait refusé — la mission ne démarrerait jamais.
              if (id === "accept") game.advance();
            }}
          />
        );

      case "arrival":
      case "scene_assessment":
        return (
          <ArrivalScreen
            model={arrivalScreenModel(session, { totalSteps: TOTAL_STEPS })}
            onAction={game.play}
          />
        );

      case "patient_assessment":
      case "vitals":
      case "transport":
        return (
          <VitalsScreen
            // L'instantané de surveillance vient du hook, seul endroit où la
            // session complète existe. Le modèle d'écran le reçoit, il ne va pas
            // le chercher — c'est ce qui interdit à la couche présentation
            // d'atteindre le moteur physiologique.
            model={vitalsScreenModel(session, game.monitoring)}
            pendingMeasure={null}
            onMeasure={game.play}
            onEvaluate={game.play}
          />
        );

      case "centre15_call":
        return (
          <Centre15Screen
            model={centre15ScreenModel(session, selectedItems, selectedAdditions)}
            onToggleItem={(itemId) => toggle(selectedItems, setSelectedItems, itemId)}
            onToggleAddition={(text) => toggle(selectedAdditions, setSelectedAdditions, text)}
            onTransmit={() => game.transmit(selectedItems, selectedAdditions)}
            onAnswer={game.answerRegulator}
          />
        );

      case "priority_actions": {
        const model = priorityActionsScreenModel(session);
        return (
          <PriorityActionsScreen
            model={model}
            onSelect={(gestureId) => game.chooseGesture(model.roundId, gestureId)}
            onDeselect={(gestureId) => game.dropGesture(model.roundId, gestureId)}
            onResolve={() => game.commitGestures(model.roundId)}
            onAttemptOutOfScope={game.play}
          />
        );
      }

      case "reevaluation":
        return (
          <ReevaluationScreen
            model={reevaluationScreenModel(session)}
            onRefresh={game.play}
            onValidate={() => game.closeReevaluation()}
            onPrepareTransport={() => game.play("action.preparer-transport")}
          />
        );

      case "debrief":
        // Le rapport n'existe qu'à cette phase. Le hook le calcule alors, et
        // seulement alors : plus tôt, il décrirait une mission inachevée.
        return game.debrief ? (
          <DebriefScreen
            model={debriefScreenModel(game.debrief)}
            onReplay={game.restart}
            onChooseAnotherMission={onLeaveMission}
            onOpenKnowledge={() => undefined}
          />
        ) : null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-4">
        {game.feedback && game.feedback.message.length > 0 && (
          <button
            type="button"
            onClick={game.clearFeedback}
            className={`press mb-4 w-full rounded-2xl border px-3 py-2.5 text-left text-xs leading-relaxed ${
              game.feedback.kind === "refused"
                ? "border-red-400/30 bg-red-400/[0.07] text-red-200"
                : game.feedback.kind === "fault"
                  ? "border-amber-400/30 bg-amber-400/[0.06] text-amber-200"
                  : "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200"
            }`}
          >
            {game.feedback.message}
          </button>
        )}
        {screen()}
        <PhaseAdvance game={game} />
      </main>
    </div>
  );
}
