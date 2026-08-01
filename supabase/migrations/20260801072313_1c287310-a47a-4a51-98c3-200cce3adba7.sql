-- Lecture agrégée et sécurisée des données non critiques de l'accueil.
-- SECURITY INVOKER conserve les politiques RLS de chaque table.
CREATE OR REPLACE FUNCTION public.get_home_dashboard(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH params AS (
    SELECT
      auth.uid() AS user_id,
      CURRENT_DATE AS today,
      date_trunc('week', CURRENT_DATE)::date AS monday,
      greatest(1, least(coalesce(_days, 7), 31)) AS days
  ),
  recent_badges AS (
    SELECT
      ub.badge_code,
      ub.earned_at,
      jsonb_build_object(
        'code', b.code,
        'title', b.title,
        'description', b.description,
        'icon', b.icon,
        'rarity', b.rarity,
        'threshold', b.threshold
      ) AS badge
    FROM public.user_badges ub
    JOIN public.badges b ON b.code = ub.badge_code
    CROSS JOIN params p
    WHERE ub.user_id = p.user_id
    ORDER BY ub.earned_at DESC
    LIMIT 5
  ),
  daily_missions AS (
    SELECT
      m.code,
      m.title,
      m.description,
      m.icon,
      m.period,
      m.metric,
      m.target,
      m.xp_reward,
      coalesce(um.progress, 0) AS progress,
      coalesce(um.completed, false) AS completed
    FROM public.missions m
    CROSS JOIN params p
    LEFT JOIN public.user_missions um
      ON um.user_id = p.user_id
     AND um.mission_code = m.code
     AND um.period_start = CASE WHEN m.period = 'weekly' THEN p.monday ELSE p.today END
    WHERE m.active = true
      AND m.period = 'daily'
    ORDER BY m.created_at, m.code
    LIMIT 3
  ),
  xp_days AS (
    SELECT
      day::date AS date,
      coalesce(sum(x.amount), 0)::integer AS xp
    FROM params p
    CROSS JOIN LATERAL generate_series(
      p.today - (p.days - 1),
      p.today,
      interval '1 day'
    ) AS day
    LEFT JOIN public.xp_transactions x
      ON x.user_id = p.user_id
     AND x.created_at >= day
     AND x.created_at < day + interval '1 day'
    GROUP BY day
    ORDER BY day
  )
  SELECT jsonb_build_object(
    'wallet',
      (
        SELECT to_jsonb(w) - 'id' - 'user_id' - 'created_at' - 'updated_at'
        FROM public.wallets w
        CROSS JOIN params p
        WHERE w.user_id = p.user_id
        LIMIT 1
      ),
    'badgeCount',
      (
        SELECT count(*)::integer
        FROM public.user_badges ub
        CROSS JOIN params p
        WHERE ub.user_id = p.user_id
      ),
    'recentBadges',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'badge_code', rb.badge_code,
              'earned_at', rb.earned_at,
              'badge', rb.badge
            )
            ORDER BY rb.earned_at DESC
          )
          FROM recent_badges rb
        ),
        '[]'::jsonb
      ),
    'dailyMissions',
      coalesce((SELECT jsonb_agg(to_jsonb(dm) ORDER BY dm.code) FROM daily_missions dm), '[]'::jsonb),
    'xpHistory',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('date', xd.date::text, 'xp', xd.xp)
            ORDER BY xd.date
          )
          FROM xp_days xd
        ),
        '[]'::jsonb
      )
  );
$$;

REVOKE ALL ON FUNCTION public.get_home_dashboard(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_home_dashboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_home_dashboard(integer) TO authenticated;