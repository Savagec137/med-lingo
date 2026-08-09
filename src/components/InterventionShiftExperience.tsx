import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Ambulance,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  CloudRain,
  Coins,
  Gauge,
  HeartPulse,
  MapPin,
  Navigation,
  PackageOpen,
  PhoneCall,
  Radio,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrafficCone,
  UsersRound,
  Zap,
} from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { InterventionScenario } from "@/features/intervention-domain";
import {
  DISPATCH_ACTIONS,
  SHIFT_ENVIRONMENT_LABELS,
  SHIFT_TRAFFIC_LABELS,
  SHIFT_WEATHER_LABELS,
  TRAVEL_DECISIONS,
} from "@/features/intervention-shift-catalog";
import {
  calculateShiftSummary,
  canDepartToCall,
  formatShiftMinute,
} from "@/features/intervention-shift-engine";
import type {
  DynamicShiftCall,
  InterventionShiftSession,
  ShiftCompletedIntervention,
} from "@/features/intervention-shift-domain";
import { useInterventionShift } from "@/hooks/use-intervention-shift";
import { InterventionDecisionScreen } from "@/components/InterventionDecisionScreen";
import { InterventionShiftHud } from "@/components/InterventionShiftHud";

interface Props {
  scenarios: readonly InterventionScenario[];
  reducedMotion: boolean;
  onOpenTraining: () => void;
}

export function InterventionShiftExperience({ scenarios, reducedMotion, onOpenTraining }: Props) {
  const shift = useInterventionShift(scenarios);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [shift.session?.status, shift.session?.activeCall?.id]);

  if (!shift.hydrated || !shift.session) {
    return (
      <div
        role="status"
        className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center text-slate-300"
      >
        Préparation du centre opérationnel…
      </div>
    );
  }

  const { session } = shift;
  const activeCall = session.activeCall;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${session.status}:${activeCall?.id ?? "none"}`}
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
        transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {session.status === "briefing" && (
          <BriefingScreen
            titleRef={titleRef}
            session={session}
            onStart={shift.startShift}
            onOpenTraining={onOpenTraining}
          />
        )}
        {session.status === "ringing" && activeCall && (
          <IncomingCallScreen
            titleRef={titleRef}
            session={session}
            call={activeCall}
            reducedMotion={reducedMotion}
            onAnswer={shift.answerCall}
          />
        )}
        {session.status === "dispatch" && activeCall && (
          <DispatchScreen
            titleRef={titleRef}
            session={session}
            call={activeCall}
            onSelect={shift.selectDispatchAction}
            onDepart={shift.depart}
          />
        )}
        {session.status === "travel" && activeCall && (
          <TravelScreen
            titleRef={titleRef}
            session={session}
            call={activeCall}
            reducedMotion={reducedMotion}
            onSelect={shift.chooseTravelDecision}
            onArrive={shift.arrive}
          />
        )}
        {session.status === "mission" &&
          activeCall &&
          activeCall.missionSession &&
          shift.activeScenario &&
          shift.currentStep && (
            <MissionScreen
              titleRef={titleRef}
              session={session}
              call={activeCall}
              stepTitle={shift.currentStep.title}
              isHandover={shift.currentStep.format === "handover"}
              reducedMotion={reducedMotion}
              elapsedSeconds={shift.elapsedSeconds}
            >
              <InterventionDecisionScreen
                step={shift.currentStep}
                session={activeCall.missionSession}
                elapsedSeconds={shift.elapsedSeconds}
                reducedMotion={reducedMotion}
                onSubmit={shift.submitMissionAnswers}
                onContinue={shift.continueMission}
              />
            </MissionScreen>
          )}
        {session.status === "intervention-summary" && session.lastResult && (
          <InterventionSummaryScreen
            titleRef={titleRef}
            session={session}
            completed={session.completedInterventions.at(-1)}
            onNext={shift.nextCall}
            onFinish={shift.finishShift}
          />
        )}
        {session.status === "shift-summary" && (
          <ShiftSummaryScreen
            titleRef={titleRef}
            session={session}
            onRestart={shift.resetShift}
            onOpenTraining={onOpenTraining}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

type TitleRef = RefObject<HTMLHeadingElement | null>;

function BriefingScreen({
  titleRef,
  session,
  onStart,
  onOpenTraining,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  onStart: () => void;
  onOpenTraining: () => void;
}) {
  const checks = [
    { Icon: Ambulance, label: "Véhicule", value: session.vehicleReady ? "Prêt" : "À contrôler" },
    { Icon: Radio, label: "Radio", value: session.radioConnected ? "Connectée" : "Hors ligne" },
    { Icon: UsersRound, label: "Équipage", value: session.crewComplete ? "Complet" : "Incomplet" },
    { Icon: Activity, label: "Vigilance", value: `${session.vigilance}%` },
  ];
  return (
    <section aria-labelledby="guard-briefing-title" className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-cyan-300/15 bg-slate-950/85 p-6 shadow-[0_30px_100px_rgba(8,145,178,.13)] sm:p-9">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.18),transparent_68%)]"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            <Radio className="h-3.5 w-3.5" /> Centre 15 · Simulation multi-rôle
          </div>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="guard-briefing-title"
            className="mt-5 font-display text-4xl font-black text-white outline-none sm:text-5xl"
          >
            Début de garde
          </h2>
          <p className="mt-2 text-lg font-bold text-cyan-100">
            {formatShiftMinute(session.startMinute)} → {formatShiftMinute(session.endMinute)}
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-400">
            Cette garde pédagogique alterne qualification de l’appel et rôle d’équipage. Les
            décisions médicales restent celles des scénarios validés ; le moteur ne crée aucun
            protocole clinique.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {checks.map(({ Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-cyan-300" />
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                </div>
                <div className="mt-1 font-black text-white">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onStart} className={primaryButtonClass}>
              Prendre la garde <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onOpenTraining} className={secondaryButtonClass}>
              Missions guidées
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function IncomingCallScreen({
  titleRef,
  session,
  call,
  reducedMotion,
  onAnswer,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  call: DynamicShiftCall;
  reducedMotion: boolean;
  onAnswer: () => void;
}) {
  return (
    <section aria-labelledby="incoming-call-title" className="mx-auto max-w-4xl">
      <InterventionShiftHud session={session} />
      <div className="overflow-hidden rounded-[2.25rem] border border-rose-400/20 bg-slate-950/90 shadow-[0_30px_100px_rgba(244,63,94,.16)]">
        <div className="relative bg-gradient-to-br from-rose-500/25 via-red-500/10 to-transparent p-7 text-center sm:p-10">
          <motion.div
            animate={reducedMotion ? undefined : { rotate: [-5, 5, -5], scale: [1, 1.06, 1] }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-rose-300/25 bg-rose-500/20 text-rose-200"
          >
            <PhoneCall className="h-9 w-9" />
          </motion.div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-rose-300">
            Appel {call.index + 1} · {formatShiftMinute(call.receivedAtMinute)}
          </p>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="incoming-call-title"
            className="mt-2 font-display text-3xl font-black text-white outline-none sm:text-4xl"
          >
            Le téléphone sonne
          </h2>
          <blockquote className="mx-auto mt-5 max-w-2xl text-lg font-bold leading-relaxed text-rose-50">
            {call.callerQuote}
          </blockquote>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
          <InfoCard Icon={Stethoscope} label="Motif signalé" value={call.reason} />
          <InfoCard Icon={UsersRound} label="Patient" value={call.patientLabel} />
          <InfoCard Icon={Radio} label="Priorité" value={call.priority} />
          <InfoCard Icon={MapPin} label="Localisation initiale" value={call.context.address} />
          <button
            type="button"
            onClick={onAnswer}
            className={`${primaryButtonClass} sm:col-span-2`}
          >
            Décrocher et qualifier l’appel <PhoneCall className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function DispatchScreen({
  titleRef,
  session,
  call,
  onSelect,
  onDepart,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  call: DynamicShiftCall;
  onSelect: (id: (typeof DISPATCH_ACTIONS)[number]["id"]) => void;
  onDepart: () => void;
}) {
  const selectedIds = new Set(call.dispatchRecords.map((record) => record.actionId));
  return (
    <section aria-labelledby="dispatch-title" className="mx-auto max-w-5xl">
      <InterventionShiftHud session={session} />
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-5 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Qualification de l’appel
          </p>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="dispatch-title"
            className="mt-2 font-display text-3xl font-black text-white outline-none"
          >
            Quelle action réalises-tu maintenant ?
          </h2>
          <p className="mt-3 leading-relaxed text-slate-400">
            Toutes les actions sont utiles. Leur ordre influence le délai, la coordination et la
            préparation de l’équipage.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {DISPATCH_ACTIONS.map((action) => {
              const record = call.dispatchRecords.find((item) => item.actionId === action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={selectedIds.has(action.id)}
                  onClick={() => onSelect(action.id)}
                  className="min-h-28 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left outline-none transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.07] focus-visible:ring-4 focus-visible:ring-cyan-300/25 disabled:border-emerald-300/20 disabled:bg-emerald-300/[0.07]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-black text-white">{action.label}</span>
                    {record && (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300 font-black text-slate-950">
                        {record.sequence}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 block text-xs leading-relaxed text-slate-400">
                    {record?.feedback ?? action.detail}
                  </span>
                </button>
              );
            })}
          </div>
          {canDepartToCall(session) && (
            <button
              type="button"
              onClick={onDepart}
              className={`${primaryButtonClass} mt-6 w-full`}
            >
              Départ de l’ambulance <Ambulance className="h-5 w-5" />
            </button>
          )}
        </div>
        <aside className="space-y-3" aria-label="Synthèse de l'appel">
          <InfoCard Icon={MapPin} label="Adresse" value={call.context.address} />
          <InfoCard Icon={Navigation} label="Distance" value={`${call.context.distanceKm} km`} />
          <InfoCard Icon={Clock3} label="Temps estimé" value={`${call.context.etaMinutes} min`} />
          <InfoCard
            Icon={Gauge}
            label="Score opérationnel"
            value={`${session.operationalScore}/100`}
          />
        </aside>
      </div>
    </section>
  );
}

function TravelScreen({
  titleRef,
  session,
  call,
  reducedMotion,
  onSelect,
  onArrive,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  call: DynamicShiftCall;
  reducedMotion: boolean;
  onSelect: (id: (typeof TRAVEL_DECISIONS)[number]["id"]) => void;
  onArrive: () => void;
}) {
  return (
    <section aria-labelledby="travel-title" className="mx-auto max-w-5xl">
      <InterventionShiftHud session={session} />
      <div className="overflow-hidden rounded-[2.25rem] border border-blue-300/15 bg-slate-950/90">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600/20 via-slate-900 to-cyan-500/10">
          <div className="absolute inset-x-0 bottom-8 h-1 bg-white/10" />
          <div className="absolute inset-x-0 bottom-[1.85rem] border-t-2 border-dashed border-cyan-200/30" />
          <motion.div
            aria-hidden="true"
            animate={reducedMotion ? undefined : { x: ["-15%", "70%", "-15%"] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 left-1/4 flex h-16 w-24 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-300 text-slate-950 shadow-[0_0_35px_rgba(34,211,238,.35)]"
          >
            <Ambulance className="h-9 w-9" />
          </motion.div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
            En route · Appel {call.index + 1}
          </p>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="travel-title"
            className="mt-2 font-display text-3xl font-black text-white outline-none"
          >
            Direction {call.context.address}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <InfoCard Icon={Clock3} label="ETA" value={`${call.context.etaMinutes} min`} />
            <InfoCard
              Icon={TrafficCone}
              label="Trafic"
              value={SHIFT_TRAFFIC_LABELS[call.context.traffic]}
            />
            <InfoCard
              Icon={CloudRain}
              label="Météo"
              value={SHIFT_WEATHER_LABELS[call.context.weather]}
            />
            <InfoCard
              Icon={Building2}
              label="Environnement"
              value={SHIFT_ENVIRONMENT_LABELS[call.context.environment]}
            />
          </div>
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-5">
            <div className="flex items-center gap-2 font-black text-amber-100">
              <PhoneCall className="h-5 w-5 text-amber-300" /> Nouvel appel pendant le trajet
            </div>
            <p className="mt-2 leading-relaxed text-amber-50/80">{call.travelUpdate}</p>
          </div>
          {!call.travelDecision ? (
            <div className="mt-4 grid gap-3">
              {TRAVEL_DECISIONS.map((decision) => (
                <button
                  key={decision.id}
                  type="button"
                  onClick={() => onSelect(decision.id)}
                  className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left outline-none hover:border-cyan-300/35 hover:bg-white/[0.07] focus-visible:ring-4 focus-visible:ring-cyan-300/25"
                >
                  <span className="block font-black text-white">{decision.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    {decision.detail}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div
              role="status"
              className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <p className="text-sm leading-relaxed text-slate-200">
                  {call.travelDecision.feedback}
                </p>
              </div>
              <button
                type="button"
                onClick={onArrive}
                className={`${primaryButtonClass} mt-5 w-full`}
              >
                Arrivée sur les lieux <MapPin className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MissionScreen({
  titleRef,
  session,
  call,
  stepTitle,
  isHandover,
  reducedMotion,
  elapsedSeconds,
  children,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  call: DynamicShiftCall;
  stepTitle: string;
  isHandover: boolean;
  reducedMotion: boolean;
  elapsedSeconds: number;
  children: ReactNode;
}) {
  return (
    <section aria-label="Intervention en cours">
      <h2 ref={titleRef} tabIndex={-1} className="sr-only outline-none">
        {stepTitle}
      </h2>
      <InterventionShiftHud session={session} elapsedSeconds={elapsedSeconds} />
      <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/75 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Appel {call.index + 1} · {call.specialty}
          </p>
          <div className="mt-1 font-black text-white">{call.title}</div>
          <p className="mt-1 text-xs text-slate-400">
            {SHIFT_ENVIRONMENT_LABELS[call.context.environment]} · {call.context.address}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-xs font-bold text-emerald-200">
          <HeartPulse className="h-4 w-4" /> Patient suivi en continu
        </div>
      </div>
      {isHandover && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 rounded-2xl border border-violet-300/20 bg-violet-300/[0.07] p-4"
        >
          <div className="flex items-center gap-2 font-black text-violet-100">
            <Radio className="h-5 w-5 text-violet-300" /> Le médecin régulateur demande ton bilan
          </div>
          <p className="mt-1 text-sm text-violet-100/70">
            Structure les informations disponibles. Une transmission incomplète déclenchera des
            questions ciblées dans le feedback.
          </p>
        </motion.div>
      )}
      {children}
    </section>
  );
}

function InterventionSummaryScreen({
  titleRef,
  session,
  completed,
  onNext,
  onFinish,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  completed?: ShiftCompletedIntervention;
  onNext: () => void;
  onFinish: () => void;
}) {
  if (!completed) return null;
  const canContinue = session.currentMinute < session.endMinute;
  return (
    <section aria-labelledby="call-summary-title" className="mx-auto max-w-5xl">
      <InterventionShiftHud session={session} />
      <div className="rounded-[2.25rem] border border-cyan-300/15 bg-slate-950/90 p-6 sm:p-9">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-cyan-300 to-blue-600 font-display text-3xl font-black text-slate-950">
            {completed.grade}
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
            Intervention {completed.callId.split("-").at(-1)} terminée
          </p>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="call-summary-title"
            className="mt-2 font-display text-3xl font-black text-white outline-none"
          >
            {completed.title}
          </h2>
          <p className="mt-2 text-slate-400">Score {completed.score}/100 · patient transmis</p>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryMetric
            Icon={CheckCircle2}
            label="Décisions"
            value={`${completed.correctDecisions}/${completed.totalDecisions}`}
          />
          <SummaryMetric Icon={Zap} label="XP" value={`+${completed.xp}`} />
          <SummaryMetric Icon={Coins} label="Pièces" value={String(completed.coins)} />
          <SummaryMetric Icon={PackageOpen} label="Coffre" value={completed.chest ?? "Aucun"} />
        </div>
        {(completed.badge || completed.chest) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {completed.badge && (
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
                Badge : {completed.badge}
              </span>
            )}
            {completed.chest && (
              <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-black text-violet-100">
                {completed.chest}
              </span>
            )}
          </div>
        )}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onFinish} className={secondaryButtonClass}>
            Terminer la garde
          </button>
          {canContinue && (
            <button type="button" onClick={onNext} className={primaryButtonClass}>
              Se rendre disponible <Radio className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ShiftSummaryScreen({
  titleRef,
  session,
  onRestart,
  onOpenTraining,
}: {
  titleRef: TitleRef;
  session: InterventionShiftSession;
  onRestart: () => void;
  onOpenTraining: () => void;
}) {
  const summary = calculateShiftSummary(session);
  const metrics = [
    { Icon: Ambulance, label: "Interventions", value: session.stats.interventions },
    { Icon: UsersRound, label: "Patients", value: session.stats.patients },
    { Icon: HeartPulse, label: "ACR", value: session.stats.cardiacArrests },
    { Icon: ShieldCheck, label: "Traumatismes", value: session.stats.traumas },
    { Icon: Activity, label: "AVC", value: session.stats.strokes },
    { Icon: Sparkles, label: "Naissances", value: session.stats.births },
    { Icon: Clock3, label: "Temps moyen", value: `${summary.averageResponseMinutes} min` },
    { Icon: BadgeCheck, label: "Décisions correctes", value: `${summary.accuracy}%` },
  ];
  return (
    <section aria-labelledby="shift-summary-title" className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-violet-300/15 bg-slate-950/90 p-6 sm:p-9">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(139,92,246,.2),transparent_68%)]"
        />
        <div className="relative text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-violet-200/25 bg-gradient-to-br from-violet-300 to-cyan-400 font-display text-4xl font-black text-slate-950">
            {summary.grade}
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-violet-300">
            Fin de garde · {formatShiftMinute(session.startMinute)} →{" "}
            {formatShiftMinute(session.currentMinute)}
          </p>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="shift-summary-title"
            className="mt-2 font-display text-4xl font-black text-white outline-none"
          >
            {summary.rank}
          </h2>
          <p className="mt-2 text-slate-400">
            {session.stats.xp} XP gagnés · {session.stats.coins} pièces · {session.stats.chests}{" "}
            coffre(s)
          </p>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ Icon, label, value }) => (
            <SummaryMetric key={label} Icon={Icon} label={label} value={String(value)} />
          ))}
        </div>
        <div className="relative mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onOpenTraining} className={secondaryButtonClass}>
            Missions guidées
          </button>
          <button type="button" onClick={onRestart} className={primaryButtonClass}>
            Nouvelle garde <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ Icon, label, value }: { Icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-black leading-snug text-white">{value}</div>
    </div>
  );
}

function SummaryMetric({
  Icon,
  label,
  value,
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-left">
      <Icon className="h-5 w-5 text-cyan-300" />
      <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-black text-white">{value}</div>
    </div>
  );
}

const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 font-black text-slate-950 outline-none transition hover:bg-cyan-200 focus-visible:ring-4 focus-visible:ring-cyan-200/35";

const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-6 font-bold text-slate-200 outline-none transition hover:bg-white/[0.08] focus-visible:ring-4 focus-visible:ring-white/15";

