
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, weekly_xp bigint, rank bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_xp AS (
    SELECT xt.user_id, SUM(xt.amount)::bigint AS xp
    FROM public.xp_transactions xt
    WHERE xt.created_at >= date_trunc('week', now())
      AND xt.amount > 0
    GROUP BY xt.user_id
  )
  SELECT
    w.user_id,
    COALESCE(p.display_name, 'Anonyme') AS display_name,
    p.avatar_url,
    w.xp AS weekly_xp,
    ROW_NUMBER() OVER (ORDER BY w.xp DESC)::bigint AS rank
  FROM week_xp w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  ORDER BY w.xp DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_weekly_rank()
RETURNS TABLE(weekly_xp bigint, rank bigint, total_players bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_xp AS (
    SELECT xt.user_id, SUM(xt.amount)::bigint AS xp
    FROM public.xp_transactions xt
    WHERE xt.created_at >= date_trunc('week', now())
      AND xt.amount > 0
    GROUP BY xt.user_id
  ), ranked AS (
    SELECT user_id, xp, ROW_NUMBER() OVER (ORDER BY xp DESC)::bigint AS rnk
    FROM week_xp
  )
  SELECT
    COALESCE((SELECT xp FROM ranked WHERE user_id = auth.uid()), 0) AS weekly_xp,
    COALESCE((SELECT rnk FROM ranked WHERE user_id = auth.uid()), 0) AS rank,
    (SELECT COUNT(*)::bigint FROM ranked) AS total_players;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_weekly_rank() TO authenticated;
