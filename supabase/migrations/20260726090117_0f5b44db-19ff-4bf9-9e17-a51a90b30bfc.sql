-- 1. Fix mutable search_path on the only remaining function
CREATE OR REPLACE FUNCTION public.game_level_from_xp(total_xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT GREATEST(1, FLOOR((1 + SQRT(1 + GREATEST(total_xp, 0)::numeric / 12.5)) / 2)::integer);
$function$;

-- 2. Revoke EXECUTE from PUBLIC and anon on all SECURITY DEFINER functions.
--    All of them require auth.uid(); none is meant to be callable anonymously.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- 3. Internal-only definer functions must not be callable by app users either.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.sync_user_currency_from_wallet() FROM authenticated;
REVOKE ALL ON FUNCTION public.sync_legacy_item_to_inventory() FROM authenticated;
REVOKE ALL ON FUNCTION public.grant_game_reward(jsonb, text, text) FROM authenticated;

-- 4. Tighten table privileges: game state is written only by trusted server-side logic.
REVOKE ALL ON TABLE public.inventory FROM anon;
REVOKE ALL ON TABLE public.inventory FROM authenticated;
GRANT SELECT ON TABLE public.inventory TO authenticated;
GRANT ALL ON TABLE public.inventory TO service_role;

REVOKE ALL ON TABLE public.user_currency FROM anon;
REVOKE ALL ON TABLE public.user_currency FROM authenticated;
GRANT SELECT ON TABLE public.user_currency TO authenticated;
GRANT ALL ON TABLE public.user_currency TO service_role;

REVOKE ALL ON TABLE public.coin_transactions FROM anon;
REVOKE ALL ON TABLE public.coin_transactions FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.coin_transactions TO authenticated;
GRANT ALL ON TABLE public.coin_transactions TO service_role;

-- 5. Explicit deny-by-default documentation policies are unnecessary; no UPDATE/DELETE
--    policies exist on these tables and the privileges above are now removed.
