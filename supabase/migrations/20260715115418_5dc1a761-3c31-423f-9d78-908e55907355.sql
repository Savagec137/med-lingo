
-- Extend user_progress with gamification fields
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS daily_goal_xp integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS xp_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_today_date date NOT NULL DEFAULT CURRENT_DATE;

-- 1. BADGES catalog
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏅',
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  threshold integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_read_all ON public.badges FOR SELECT TO authenticated USING (true);

-- 2. USER_BADGES
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
GRANT SELECT, INSERT, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY ub_own ON public.user_badges FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges(user_id);

-- 3. XP_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  source text NOT NULL,
  lesson_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_own ON public.xp_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS xp_tx_user_created_idx ON public.xp_transactions(user_id, created_at DESC);

-- 4. MISSIONS catalog
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🎯',
  period text NOT NULL DEFAULT 'daily' CHECK (period IN ('daily','weekly')),
  metric text NOT NULL,
  target integer NOT NULL,
  xp_reward integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY missions_read_all ON public.missions FOR SELECT TO authenticated USING (active = true);

-- 5. USER_MISSIONS
CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_code text NOT NULL REFERENCES public.missions(code) ON DELETE CASCADE,
  period_start date NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_code, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_missions TO authenticated;
GRANT ALL ON public.user_missions TO service_role;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY um_own ON public.user_missions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS user_missions_user_period_idx ON public.user_missions(user_id, period_start);

-- Seed badges catalog
INSERT INTO public.badges (code, title, description, icon, rarity, threshold) VALUES
  ('first_lesson',     'Premier pas',          'Termine ta première leçon',                    '🎓', 'common',    1),
  ('streak_3',         '3 jours de suite',     'Étudie 3 jours consécutifs',                   '🔥', 'common',    3),
  ('streak_7',         'Semaine parfaite',     'Étudie 7 jours consécutifs',                   '🔥', 'rare',      7),
  ('streak_30',        'Mois d''or',           'Étudie 30 jours consécutifs',                  '🏆', 'epic',     30),
  ('streak_100',       'Centenaire',           '100 jours de série',                            '👑', 'legendary',100),
  ('xp_100',           'Apprenti',             'Gagne 100 XP',                                  '⭐', 'common',  100),
  ('xp_1000',          'Studieux',             'Gagne 1 000 XP',                                '🌟', 'rare',   1000),
  ('xp_10000',         'Érudit',               'Gagne 10 000 XP',                               '💫', 'epic',  10000),
  ('level_10',         'Niveau 10',            'Atteins le niveau 10',                          '🥉', 'common',   10),
  ('level_25',         'Niveau 25',            'Atteins le niveau 25',                          '🥈', 'rare',     25),
  ('level_50',         'Niveau 50',            'Atteins le niveau 50',                          '🥇', 'epic',     50),
  ('perfect_lesson',   'Sans faute',           'Termine une leçon avec 3 étoiles',             '💯', 'rare',      1),
  ('anatomy_expert',   'Expert Anatomie',      'Termine toutes les leçons d''anatomie',         '🦴', 'epic',      1),
  ('vocab_master',     'Maître du vocabulaire','Termine préfixes, suffixes et radicaux',        '🔤', 'rare',      1),
  ('first_aid',        'Premier secours',      'Termine ta première leçon de gestes d''urgence','🚑', 'rare',      1)
ON CONFLICT (code) DO NOTHING;

-- Seed daily missions
INSERT INTO public.missions (code, title, description, icon, period, metric, target, xp_reward) VALUES
  ('daily_xp_20',      'Objectif du jour',     'Gagne 20 XP aujourd''hui',      '⚡', 'daily', 'xp',              20, 10),
  ('daily_lesson_1',   'Une leçon par jour',   'Termine 1 leçon aujourd''hui',  '📚', 'daily', 'lessons',          1, 10),
  ('daily_perfect_1',  'Précision',            'Réussis 1 leçon sans erreur',   '🎯', 'daily', 'perfect_lessons',  1, 15),
  ('weekly_lessons_5', 'Marathon',             'Termine 5 leçons cette semaine','🏃', 'weekly','lessons',          5, 50),
  ('weekly_streak_5',  'Régularité',           'Étudie 5 jours cette semaine',  '🔥', 'weekly','study_days',       5, 40)
ON CONFLICT (code) DO NOTHING;
