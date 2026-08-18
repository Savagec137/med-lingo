import { Activity, ClipboardList, HeartPulse, MapPin, UserRound } from "lucide-react";
import type {
  MissionStationId,
  MissionStationModel,
} from "@/features/intervention-v3/ui/mission-nav";

/**
 * La barre de mission, en bas de l'écran.
 *
 * Reprise de la maquette et du prototype Bolt, avec une différence assumée :
 * elle **n'est pas cliquable**. Chez Bolt, ses onglets sautent d'un écran à
 * l'autre ; chez Medoca les phases s'enchaînent, et sauter au patient depuis
 * l'appel du 15 ferait manquer le bilan circonstanciel. C'est un repère de
 * progression, et il le dit — aucun bouton, aucun curseur de main.
 */

const STATION_ICONS: Record<MissionStationId, typeof MapPin> = {
  mission: MapPin,
  patient: UserRound,
  surveillance: Activity,
  gestes: HeartPulse,
  bilan: ClipboardList,
};

export function MissionNav({ stations }: { stations: MissionStationModel[] }) {
  return (
    <nav
      aria-label="Progression de l'intervention"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-300/15 bg-slate-950/95 backdrop-blur"
    >
      <ol className="mx-auto flex max-w-3xl">
        {stations.map((station) => {
          const Icon = STATION_ICONS[station.id];
          return (
            <li
              key={station.id}
              aria-current={station.current ? "step" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-black uppercase tracking-wide ${
                station.current
                  ? "text-cyan-300"
                  : station.done
                    ? "text-emerald-400/70"
                    : "text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {station.label}
              <span
                aria-hidden="true"
                className={`h-0.5 w-8 rounded-full ${
                  station.current
                    ? "bg-cyan-300"
                    : station.done
                      ? "bg-emerald-400/60"
                      : "bg-transparent"
                }`}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
