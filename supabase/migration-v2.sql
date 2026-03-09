-- Migration V2: Additional tables and profile extensions for full Supabase sync
-- Run this in your Supabase SQL editor after migration.sql

-- Extend profiles with full settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timer_durations jsonb DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pomodoro_goal int DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_break int DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS long_break int DEFAULT 15;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS baby_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS baby_birthdate text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false;

-- Weekly plans
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  overall_goals text DEFAULT '',
  sections jsonb DEFAULT '[]',
  category_targets jsonb DEFAULT '{}',
  days jsonb DEFAULT '{}',
  family_meeting_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly plans" ON public.weekly_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly plans" ON public.weekly_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly plans" ON public.weekly_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly plans" ON public.weekly_plans FOR DELETE USING (auth.uid() = user_id);

-- Achievements (only stores unlock state; definitions are in code)
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamptz,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON public.achievements FOR UPDATE USING (auth.uid() = user_id);

-- Baby daily logs
CREATE TABLE IF NOT EXISTS public.baby_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL,
  activities jsonb DEFAULT '[]',
  UNIQUE(user_id, log_date)
);

ALTER TABLE public.baby_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own baby logs" ON public.baby_daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own baby logs" ON public.baby_daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own baby logs" ON public.baby_daily_logs FOR UPDATE USING (auth.uid() = user_id);

-- Garden snapshots
CREATE TABLE IF NOT EXISTS public.garden_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  week_start text NOT NULL,
  week_end text NOT NULL,
  plants jsonb DEFAULT '{}',
  total_sessions int DEFAULT 0,
  total_minutes int DEFAULT 0,
  garden_health text DEFAULT 'empty',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.garden_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own garden snapshots" ON public.garden_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own garden snapshots" ON public.garden_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own garden snapshots" ON public.garden_snapshots FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON public.weekly_plans(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_baby_logs_user_date ON public.baby_daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_garden_snapshots_user_week ON public.garden_snapshots(user_id, week_start);
