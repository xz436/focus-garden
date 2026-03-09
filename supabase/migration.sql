-- Supabase SQL Migration
-- Run this in your Supabase SQL editor

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  weekly_targets jsonb default '{"coding": 15, "ai": 8, "baby": 14, "fitness": 5, "reading": 5, "spiritual": 7}',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  duration_minutes int not null,
  notes text,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;
create policy "Users can view own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.sessions for delete using (auth.uid() = user_id);

-- Blind 75 problems table
create table if not exists public.blind75_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  problem_name text not null,
  category text not null,
  difficulty text not null,
  status text default 'not_started',
  confidence int,
  notes text,
  solution_link text,
  leetcode_number int,
  solved_at timestamptz,
  created_at timestamptz default now()
);

alter table public.blind75_problems enable row level security;
create policy "Users can view own problems" on public.blind75_problems for select using (auth.uid() = user_id);
create policy "Users can insert own problems" on public.blind75_problems for insert with check (auth.uid() = user_id);
create policy "Users can update own problems" on public.blind75_problems for update using (auth.uid() = user_id);

-- Daily plans table
create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_date date not null,
  intentions text,
  pomodoro_goal int default 5,
  category_goals jsonb,
  reflection text,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

alter table public.daily_plans enable row level security;
create policy "Users can view own plans" on public.daily_plans for select using (auth.uid() = user_id);
create policy "Users can insert own plans" on public.daily_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own plans" on public.daily_plans for update using (auth.uid() = user_id);

-- Gardens table (weekly plant tracking)
create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  plants jsonb default '{}',
  snapshot_data jsonb,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table public.gardens enable row level security;
create policy "Users can view own gardens" on public.gardens for select using (auth.uid() = user_id);
create policy "Users can insert own gardens" on public.gardens for insert with check (auth.uid() = user_id);
create policy "Users can update own gardens" on public.gardens for update using (auth.uid() = user_id);

-- Weekly summaries table
create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  total_minutes int,
  category_breakdown jsonb,
  highlights text[],
  ai_suggestions text,
  goals_next_week text[],
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table public.weekly_summaries enable row level security;
create policy "Users can view own summaries" on public.weekly_summaries for select using (auth.uid() = user_id);
create policy "Users can insert own summaries" on public.weekly_summaries for insert with check (auth.uid() = user_id);
create policy "Users can update own summaries" on public.weekly_summaries for update using (auth.uid() = user_id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-creating profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_started_at on public.sessions(started_at);
create index if not exists idx_sessions_category on public.sessions(category);
create index if not exists idx_blind75_user_id on public.blind75_problems(user_id);
create index if not exists idx_daily_plans_user_date on public.daily_plans(user_id, plan_date);
create index if not exists idx_gardens_user_week on public.gardens(user_id, week_start);

-- Shared snapshots table (for shareable progress links)
create table if not exists public.shared_snapshots (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  display_name text,
  snapshot_data jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table public.shared_snapshots enable row level security;
-- Anyone can view shared snapshots (public read)
create policy "Anyone can view shared snapshots" on public.shared_snapshots for select using (true);
-- Only authenticated owner can create
create policy "Users can insert own snapshots" on public.shared_snapshots for insert with check (auth.uid() = user_id);
-- Only owner can delete
create policy "Users can delete own snapshots" on public.shared_snapshots for delete using (auth.uid() = user_id);
