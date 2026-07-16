import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Medal, Flame, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/classement")({
  component: Classement,
  head: () => ({
    meta: [
      { title: "Classement — MedLingo" },
      { name: "description", content: "Classement hebdomadaire des étudiants MedLingo" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Erreur : {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Introuvable</div>,
});

type Row = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
};

function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard-weekly"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard", { _limit: 50 });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
  });
}

function useMyRank() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leaderboard-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_weekly_rank");
      if (error) throw error;
      return (data?.[0] ?? { weekly_xp: 0, rank: 0, total_players: 0 }) as {
        weekly_xp: number; rank: number; total_players: number;
      };
    },
    staleTime: 60_000,
  });
}

function daysUntilMonday(): number {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const remain = ((8 - (day === 0 ? 7 : day)) % 7) || 7;
  return remain;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-slate-300" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
  return <span className="w-6 text-center font-display text-sm font-extrabold text-muted-foreground">{rank}</span>;
}

function Classement() {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useLeaderboard();
  const { data: me } = useMyRank();
  const dLeft = daysUntilMonday();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Header season card */}
        <div className="glass-strong relative mb-5 overflow-hidden rounded-3xl border border-white/10 p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--color-primary)]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[color:var(--color-accent)]/25 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-accent)] shadow-lg">
              <Trophy className="h-7 w-7 text-white" strokeWidth={2.4} />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-extrabold text-gradient-primary">Classement</h1>
              <p className="text-xs text-muted-foreground">Ligue Interne · Semaine en cours</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs font-bold text-[color:var(--color-warning)]">
                <Flame className="h-3.5 w-3.5" /> {dLeft}j
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">reset</div>
            </div>
          </div>

          {user && me && (
            <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <RankBadge rank={me.rank || 0} />
                <div>
                  <div className="text-sm font-extrabold">Ta position</div>
                  <div className="text-[11px] text-muted-foreground">
                    {me.rank > 0 ? `${me.rank} / ${me.total_players}` : "Gagne de l'XP pour entrer au classement"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-extrabold text-[color:var(--color-primary)]">
                <Sparkles className="h-4 w-4" />
                {me.weekly_xp} XP
              </div>
            </div>
          )}

          {!user && (
            <div className="relative mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <Link to="/auth" className="font-bold text-[color:var(--color-primary)] underline">
                Connecte-toi
              </Link>{" "}
              pour entrer dans le classement hebdomadaire.
            </div>
          )}
        </div>

        {/* Podium top 3 */}
        {rows.length >= 3 && (
          <div className="mb-5 grid grid-cols-3 items-end gap-2">
            {[rows[1], rows[0], rows[2]].map((r, idx) => {
              const positions = [2, 1, 3] as const;
              const rank = positions[idx];
              const heights = { 1: "h-28", 2: "h-20", 3: "h-16" }[rank];
              const gradients = {
                1: "from-yellow-400 to-amber-500",
                2: "from-slate-300 to-slate-400",
                3: "from-amber-700 to-orange-600",
              }[rank];
              return (
                <div key={r.user_id} className="flex flex-col items-center">
                  <div className={`mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 ${rank === 1 ? "border-yellow-400" : "border-white/20"} bg-secondary`}>
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-lg font-extrabold">
                        {r.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mb-1 max-w-full truncate text-xs font-bold">{r.display_name}</div>
                  <div className="mb-1 text-[10px] font-extrabold text-[color:var(--color-primary)]">
                    {r.weekly_xp} XP
                  </div>
                  <div className={`w-full rounded-t-xl bg-gradient-to-b ${gradients} ${heights} flex items-start justify-center pt-1 shadow-lg`}>
                    <span className="font-display text-2xl font-extrabold text-white drop-shadow">
                      {rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="space-y-1.5">
          {isLoading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Chargement du classement…
            </div>
          )}
          {!isLoading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Personne n'a encore gagné d'XP cette semaine. Sois le premier !
            </div>
          )}
          {rows.map((r) => {
            const isMe = r.user_id === user?.id;
            return (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                  isMe
                    ? "border-[color:var(--color-primary)]/50 bg-[color:var(--color-primary)]/10"
                    : "border-white/5 bg-card hover:bg-white/5"
                }`}
              >
                <div className="flex w-8 shrink-0 items-center justify-center">
                  <RankBadge rank={r.rank} />
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-secondary">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-sm font-extrabold">
                      {r.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {r.display_name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-primary-foreground">
                        Toi
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-extrabold text-[color:var(--color-primary)] tabular-nums">
                  <Sparkles className="h-3.5 w-3.5" />
                  {r.weekly_xp}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
