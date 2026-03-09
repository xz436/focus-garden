export type CategoryId = string;

export type ProblemStatus = "not_started" | "in_progress" | "solved";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  plant: string;
  color: string;
  colorClass: string;
  bgClass: string;
  defaultMinutes: number;
  weeklyTarget: number;
}

export interface Session {
  id: string;
  user_id: string;
  category: CategoryId;
  duration_minutes: number;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface Blind75Problem {
  id: string;
  user_id: string;
  problem_name: string;
  category: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  confidence: number | null;
  notes: string | null;
  solution_link: string | null;
  solved_at: string | null;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  intentions: string | null;
  pomodoro_goal: number;
  category_goals: Record<string, number> | null;
  reflection: string | null;
  created_at: string;
}

export interface Garden {
  id: string;
  user_id: string;
  week_start: string;
  plants: Record<string, { stage: number; sessions: number }>;
  snapshot_data: Record<string, unknown> | null;
  created_at: string;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;
  total_minutes: number;
  category_breakdown: Record<string, number>;
  highlights: string[];
  ai_suggestions: string | null;
  goals_next_week: string[];
  created_at: string;
}

export interface PlantStage {
  name: string;
  minSessions: number;
  emoji: string;
  size: string;
}

export interface Blind75ProblemSeed {
  name: string;
  category: string;
  difficulty: Difficulty;
  leetcode_number?: number;
}
