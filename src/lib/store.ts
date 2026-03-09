"use client";

import { Session, Blind75Problem, ProblemStatus, Category } from "@/types";
import { BLIND75_PROBLEMS, DEFAULT_CATEGORIES } from "@/lib/constants";
import { getWeekStart, getToday, toLocalDateString } from "@/lib/utils";
import * as supabaseStore from "@/lib/supabase-store";

const STORAGE_KEYS = {
  sessions: "fg_sessions",
  problems: "fg_problems",
  initialized: "fg_initialized",
  plans: "fg_plans",
  settings: "fg_settings",
  gardenSnapshots: "fg_garden_snapshots",
  achievements: "fg_achievements",
  babyLogs: "fg_baby_logs",
  weeklyPlans: "fg_weekly_plans",
};

// Current authenticated user ID (set by AuthProvider)
let currentUserId = "local";

export function setCurrentUserId(id: string) {
  currentUserId = id;
}

export function getCurrentUserId(): string {
  return currentUserId;
}

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Sessions
export function getSessions(): Session[] {
  const sessions = getStorage<Session[]>(STORAGE_KEYS.sessions, []);
  // Deduplicate by content (category + completed_at + duration)
  const seen = new Set<string>();
  return sessions.filter((s) => {
    const key = `${s.category}|${s.completed_at}|${s.duration_minutes}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function addSession(session: Omit<Session, "id" | "user_id" | "created_at">): Session {
  const sessions = getSessions();
  const newSession: Session = {
    ...session,
    id: crypto.randomUUID(),
    user_id: currentUserId,
    created_at: new Date().toISOString(),
  };
  sessions.push(newSession);
  setStorage(STORAGE_KEYS.sessions, sessions);
  // Sync to Supabase
  if (currentUserId !== "local") {
    supabaseStore.pushSession(newSession).catch(console.error);
  }
  return newSession;
}

export function getTodaySessions(): Session[] {
  const today = getToday();
  return getSessions().filter(
    (s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === today
  );
}

export function getWeekSessions(): Session[] {
  const weekStart = getWeekStart();
  return getSessions().filter(
    (s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) >= weekStart
  );
}

export function getSessionsByCategory(
  sessions: Session[]
): Record<string, Session[]> {
  const categories = getCategories();
  const result: Record<string, Session[]> = Object.fromEntries(categories.map(c => [c.id, []]));
  for (const s of sessions) {
    if (!result[s.category]) result[s.category] = [];
    result[s.category].push(s);
  }
  return result;
}

export function getCategoryMinutes(
  sessions: Session[]
): Record<string, number> {
  const byCategory = getSessionsByCategory(sessions);
  const result: Record<string, number> = {};
  for (const [cat, catSessions] of Object.entries(byCategory)) {
    result[cat] = catSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  }
  return result;
}

// Blind 75 Problems
export function getProblems(): Blind75Problem[] {
  const existing = getStorage<Blind75Problem[]>(STORAGE_KEYS.problems, []);
  if (existing.length === 0) {
    initializeProblems();
    return getStorage<Blind75Problem[]>(STORAGE_KEYS.problems, []);
  }
  return existing;
}

export function initializeProblems() {
  const problems: Blind75Problem[] = BLIND75_PROBLEMS.map((p) => ({
    id: crypto.randomUUID(),
    user_id: currentUserId,
    problem_name: p.name,
    category: p.category,
    difficulty: p.difficulty,
    status: "not_started" as ProblemStatus,
    confidence: null,
    notes: null,
    solution_link: null,
    solved_at: null,
    created_at: new Date().toISOString(),
  }));
  setStorage(STORAGE_KEYS.problems, problems);
  setStorage(STORAGE_KEYS.initialized, true);
}

export function updateProblem(
  id: string,
  updates: Partial<Blind75Problem>
): Blind75Problem | null {
  const problems = getProblems();
  const idx = problems.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  problems[idx] = { ...problems[idx], ...updates };
  if (updates.status === "solved" && !problems[idx].solved_at) {
    problems[idx].solved_at = new Date().toISOString();
  }
  setStorage(STORAGE_KEYS.problems, problems);
  if (currentUserId !== "local") {
    supabaseStore.updateProblemRemote(id, problems[idx]).catch(console.error);
  }
  return problems[idx];
}

export function getProblemsByCategory(): Record<string, Blind75Problem[]> {
  const problems = getProblems();
  const result: Record<string, Blind75Problem[]> = {};
  for (const p of problems) {
    if (!result[p.category]) result[p.category] = [];
    result[p.category].push(p);
  }
  return result;
}

export function getWeekCategorySessions(): Record<string, number> {
  const weekSessions = getWeekSessions();
  const categories = getCategories();
  const result: Record<string, number> = Object.fromEntries(categories.map(c => [c.id, 0]));
  for (const s of weekSessions) {
    if (result[s.category] !== undefined) {
      result[s.category]++;
    } else {
      result[s.category] = 1;
    }
  }
  return result;
}

export function getWeekCategorySessionsForWeek(weekStartDate: string): Record<string, number> {
  const categories = getCategories();
  const result: Record<string, number> = Object.fromEntries(categories.map(c => [c.id, 0]));
  const weekEnd = new Date(weekStartDate + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = toLocalDateString(weekEnd);
  const allSessions = getSessions();
  for (const s of allSessions) {
    if (!s.completed_at) continue;
    const d = toLocalDateString(new Date(s.completed_at));
    if (d >= weekStartDate && d <= weekEndStr) {
      if (result[s.category] !== undefined) {
        result[s.category]++;
      } else {
        result[s.category] = 1;
      }
    }
  }
  return result;
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter((s) => s.id !== id);
  setStorage(STORAGE_KEYS.sessions, sessions);
  if (currentUserId !== "local") {
    supabaseStore.removeSession(id).catch(console.error);
  }
}

// Daily Plans
export interface DailyPlanLocal {
  date: string;
  intentions: string;
  categoryGoals: Record<string, number>;
  reflection: string;
  pomodoroGoal: number;
}

export function getDailyPlan(date: string): DailyPlanLocal | null {
  const plans = getStorage<Record<string, DailyPlanLocal>>(STORAGE_KEYS.plans, {});
  return plans[date] || null;
}

export function saveDailyPlan(plan: DailyPlanLocal) {
  const plans = getStorage<Record<string, DailyPlanLocal>>(STORAGE_KEYS.plans, {});
  plans[plan.date] = plan;
  setStorage(STORAGE_KEYS.plans, plans);
  if (currentUserId !== "local") {
    supabaseStore.pushDailyPlan(currentUserId, plan).catch(console.error);
  }
}

// Get daily plan with weekly plan tasks merged in
export function getDailyPlanWithWeekly(date: string): DailyPlanLocal | null {
  const dailyPlan = getDailyPlan(date);
  const weekStart = getWeekStart(new Date(date + "T00:00:00"));
  const weeklyPlan = getWeeklyPlan(weekStart);
  const weeklyDay = weeklyPlan?.days?.[date];

  if (!dailyPlan && !weeklyDay && !weeklyPlan) return null;

  const weeklyIntentions = weeklyDay?.tasks?.filter((t) => typeof t === 'object' ? t.text : t).map((t) => typeof t === 'object' ? t.text : t).join("\n") || "";

  // Calculate daily category goals from weekly targets
  const weeklyGoals: Record<string, number> = {};
  if (weeklyPlan?.categoryTargets) {
    for (const [catId, weeklyTarget] of Object.entries(weeklyPlan.categoryTargets)) {
      if (weeklyTarget > 0) {
        // If this category is a focus for this day, give it a proportional daily target
        const isFocusDay = weeklyDay?.categoryFocus?.includes(catId);
        if (isFocusDay) {
          // Count how many days this category is focused on
          const focusDays = Object.values(weeklyPlan.days).filter(
            (d) => d.categoryFocus?.includes(catId)
          ).length;
          weeklyGoals[catId] = focusDays > 0 ? Math.ceil(weeklyTarget / focusDays) : Math.ceil(weeklyTarget / 7);
        } else {
          // Not a focus day but category has a target — give a base daily amount
          weeklyGoals[catId] = Math.ceil(weeklyTarget / 7);
        }
      }
    }
  }

  if (dailyPlan) {
    // Daily plan exists — merge weekly data
    // Weekly targets always take priority for category goals
    const mergedGoals = Object.keys(weeklyGoals).length > 0
      ? { ...dailyPlan.categoryGoals, ...weeklyGoals }
      : dailyPlan.categoryGoals;
    return {
      ...dailyPlan,
      intentions: dailyPlan.intentions || weeklyIntentions,
      categoryGoals: mergedGoals,
    };
  }

  // No daily plan — create one from weekly data
  const settings = getSettings();
  const cats = getCategories();
  return {
    date,
    intentions: weeklyIntentions,
    categoryGoals: {
      ...Object.fromEntries(cats.map((c) => [c.id, 0])),
      ...weeklyGoals,
    },
    reflection: "",
    pomodoroGoal: settings.pomodoroGoal,
  };
}

export function getAllPlans(): Record<string, DailyPlanLocal> {
  return getStorage<Record<string, DailyPlanLocal>>(STORAGE_KEYS.plans, {});
}

// Baby Daily Logs
export interface BabyDailyLog {
  date: string;
  activities: { activityId: string; completed: boolean }[];
}

export function getBabyLog(date: string): BabyDailyLog | null {
  const logs = getStorage<Record<string, BabyDailyLog>>(STORAGE_KEYS.babyLogs, {});
  return logs[date] || null;
}

export function saveBabyLog(log: BabyDailyLog) {
  const logs = getStorage<Record<string, BabyDailyLog>>(STORAGE_KEYS.babyLogs, {});
  logs[log.date] = log;
  setStorage(STORAGE_KEYS.babyLogs, logs);
  if (currentUserId !== "local") {
    supabaseStore.pushBabyLog(currentUserId, log).catch(console.error);
  }
}

// Settings
export interface AppSettings {
  displayName: string;
  weeklyTargets: Record<string, number>;
  timerDurations: Record<string, number>;
  pomodoroGoal: number;
  shortBreak: number;
  longBreak: number;
  babyName: string;
  babyBirthdate: string;
  categories: Category[];
}

const DEFAULT_SETTINGS: AppSettings = {
  displayName: "Xiaochan",
  weeklyTargets: Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.weeklyTarget])),
  timerDurations: Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.defaultMinutes])),
  pomodoroGoal: 5,
  shortBreak: 5,
  longBreak: 15,
  babyName: "",
  babyBirthdate: "",
  categories: DEFAULT_CATEGORIES,
};

export function getSettings(): AppSettings {
  const stored = getStorage<Partial<AppSettings>>(STORAGE_KEYS.settings, {});
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  // Migration: existing users without categories get defaults
  if (!stored.categories || !Array.isArray(stored.categories) || stored.categories.length === 0) {
    settings.categories = DEFAULT_CATEGORIES;
  }
  return settings;
}

export function saveSettings(settings: AppSettings) {
  setStorage(STORAGE_KEYS.settings, settings);
  if (currentUserId !== "local") {
    supabaseStore.pushSettings(currentUserId, settings).catch(console.error);
  }
}

// Dynamic category helpers
export function getCategories(): Category[] {
  return getSettings().categories;
}

export function getCategoryMap(): Record<string, Category> {
  const categories = getCategories();
  return Object.fromEntries(categories.map(c => [c.id, c]));
}

// Streaks
export function getStreakData(): { current: number; longest: number; activeDays: Record<string, number> } {
  const sessions = getSessions();
  const dayMap: Record<string, number> = {};

  for (const s of sessions) {
    if (!s.completed_at) continue;
    const day = toLocalDateString(new Date(s.completed_at));
    dayMap[day] = (dayMap[day] || 0) + 1;
  }

  // Calculate streak
  const today = getToday();
  let current = 0;
  let longest = 0;
  let tempStreak = 0;
  const date = new Date();

  // Check current streak from today backwards
  for (let i = 0; i < 365; i++) {
    const dateStr = toLocalDateString(date);
    if (dayMap[dateStr]) {
      current++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak across all dates
  const sortedDays = Object.keys(dayMap).sort();
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longest = Math.max(longest, tempStreak);
  }

  return { current, longest, activeDays: dayMap };
}

// Activity data for heatmap (last 90 days)
export function getHeatmapData(): { date: string; count: number; categories: Record<string, number> }[] {
  const sessions = getSessions();
  const dayMap: Record<string, { count: number; categories: Record<string, number> }> = {};

  for (const s of sessions) {
    if (!s.completed_at) continue;
    const day = toLocalDateString(new Date(s.completed_at));
    if (!dayMap[day]) dayMap[day] = { count: 0, categories: {} };
    dayMap[day].count++;
    dayMap[day].categories[s.category] = (dayMap[day].categories[s.category] || 0) + 1;
  }

  const result: { date: string; count: number; categories: Record<string, number> }[] = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateString(d);
    result.push({
      date: dateStr,
      count: dayMap[dateStr]?.count || 0,
      categories: dayMap[dateStr]?.categories || {},
    });
  }

  return result;
}

// Export data
export function exportData(): string {
  return JSON.stringify({
    sessions: getSessions(),
    problems: getProblems(),
    plans: getAllPlans(),
    settings: getSettings(),
    gardenSnapshots: getGardenSnapshots(),
    achievements: getAchievements(),
    babyLogs: getStorage<Record<string, BabyDailyLog>>(STORAGE_KEYS.babyLogs, {}),
    weeklyPlans: getAllWeeklyPlans(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// Import data
export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.sessions) setStorage(STORAGE_KEYS.sessions, data.sessions);
    if (data.problems) {
      setStorage(STORAGE_KEYS.problems, data.problems);
      setStorage(STORAGE_KEYS.initialized, true);
    }
    if (data.plans) setStorage(STORAGE_KEYS.plans, data.plans);
    if (data.settings) setStorage(STORAGE_KEYS.settings, data.settings);
    if (data.gardenSnapshots) setStorage(STORAGE_KEYS.gardenSnapshots, data.gardenSnapshots);
    if (data.achievements) setStorage(STORAGE_KEYS.achievements, data.achievements);
    if (data.babyLogs) setStorage(STORAGE_KEYS.babyLogs, data.babyLogs);
    if (data.weeklyPlans) setStorage(STORAGE_KEYS.weeklyPlans, data.weeklyPlans);
    return true;
  } catch {
    return false;
  }
}

// Garden Snapshots
export interface GardenSnapshot {
  weekStart: string;
  weekEnd: string;
  plants: Record<string, number>;
  totalSessions: number;
  totalMinutes: number;
  gardenHealth: string;
  createdAt: string;
}

export function getGardenSnapshots(): GardenSnapshot[] {
  return getStorage<GardenSnapshot[]>(STORAGE_KEYS.gardenSnapshots, []);
}

export function saveGardenSnapshot(): GardenSnapshot | null {
  const weekStart = getWeekStart();
  const snapshots = getGardenSnapshots();

  // Don't save duplicate for same week
  if (snapshots.find((s) => s.weekStart === weekStart)) return null;

  const weekSessions = getWeekSessions();
  const categories = getCategories();
  const plants: Record<string, number> = Object.fromEntries(categories.map(c => [c.id, 0]));
  let totalMinutes = 0;
  for (const s of weekSessions) {
    plants[s.category] = (plants[s.category] || 0) + 1;
    totalMinutes += s.duration_minutes;
  }

  const totalSessions = weekSessions.length;
  const gardenHealth =
    totalSessions === 0 ? "empty"
    : totalSessions < 5 ? "starting"
    : totalSessions < 15 ? "growing"
    : totalSessions < 30 ? "flourishing"
    : "paradise";

  // Calculate week end
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const snapshot: GardenSnapshot = {
    weekStart,
    weekEnd: toLocalDateString(weekEnd),
    plants,
    totalSessions,
    totalMinutes,
    gardenHealth,
    createdAt: new Date().toISOString(),
  };

  snapshots.push(snapshot);
  setStorage(STORAGE_KEYS.gardenSnapshots, snapshots);
  return snapshot;
}

// Auto-snapshot: call this on app load to snapshot the previous week if needed
export function autoSnapshotPreviousWeek() {
  const currentWeekStart = getWeekStart();
  const snapshots = getGardenSnapshots();

  // Check if we already have a snapshot for last week
  const lastWeek = new Date(currentWeekStart);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStart = toLocalDateString(lastWeek);

  if (snapshots.find((s) => s.weekStart === lastWeekStart)) return;

  // Get sessions from last week
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
  const lastWeekEndStr = toLocalDateString(lastWeekEnd);

  const allSessions = getSessions();
  const lastWeekSessions = allSessions.filter(
    (s) => {
      if (!s.completed_at) return false;
      const localDate = toLocalDateString(new Date(s.completed_at));
      return localDate >= lastWeekStart && localDate <= lastWeekEndStr;
    }
  );

  if (lastWeekSessions.length === 0) return;

  const categories = getCategories();
  const plants: Record<string, number> = Object.fromEntries(categories.map(c => [c.id, 0]));
  let totalMinutes = 0;
  for (const s of lastWeekSessions) {
    plants[s.category] = (plants[s.category] || 0) + 1;
    totalMinutes += s.duration_minutes;
  }

  const totalSessions = lastWeekSessions.length;
  const gardenHealth =
    totalSessions === 0 ? "empty"
    : totalSessions < 5 ? "starting"
    : totalSessions < 15 ? "growing"
    : totalSessions < 30 ? "flourishing"
    : "paradise";

  const snapshot: GardenSnapshot = {
    weekStart: lastWeekStart,
    weekEnd: lastWeekEndStr,
    plants,
    totalSessions,
    totalMinutes,
    gardenHealth,
    createdAt: new Date().toISOString(),
  };

  snapshots.push(snapshot);
  snapshots.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  setStorage(STORAGE_KEYS.gardenSnapshots, snapshots);
}

// Achievements
export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt: string | null;
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlockedAt">[] = [
  { id: "first_session", name: "First Seed", description: "Complete your first session", emoji: "🌱" },
  { id: "ten_sessions", name: "Growing Strong", description: "Complete 10 sessions", emoji: "💪" },
  { id: "twentyfive_sessions", name: "Quarter Century", description: "Complete 25 sessions", emoji: "🎯" },
  { id: "fifty_sessions", name: "Half Century", description: "Complete 50 sessions", emoji: "🌟" },
  { id: "hundred_sessions", name: "Centurion", description: "Complete 100 sessions", emoji: "💯" },
  { id: "streak_3", name: "Three's a Charm", description: "Maintain a 3-day streak", emoji: "🔥" },
  { id: "streak_7", name: "Week Warrior", description: "Maintain a 7-day streak", emoji: "⚡" },
  { id: "streak_14", name: "Fortnight Fighter", description: "Maintain a 14-day streak", emoji: "🏆" },
  { id: "streak_30", name: "Monthly Master", description: "Maintain a 30-day streak", emoji: "👑" },
  { id: "all_categories", name: "Renaissance Soul", description: "Log a session in all 6 categories in one day", emoji: "🌈" },
  { id: "five_in_day", name: "Pomodoro Pro", description: "Complete 5 sessions in one day", emoji: "🍅" },
  { id: "ten_in_day", name: "Unstoppable", description: "Complete 10 sessions in one day", emoji: "🚀" },
  { id: "blind75_25", name: "Quarter Done", description: "Solve 25% of Blind 75", emoji: "📊" },
  { id: "blind75_50", name: "Halfway There", description: "Solve 50% of Blind 75", emoji: "🎮" },
  { id: "blind75_75", name: "Almost There", description: "Solve 75% of Blind 75", emoji: "💎" },
  { id: "blind75_100", name: "Blind 75 Master", description: "Solve all 75 problems", emoji: "🏅" },
  { id: "early_bird", name: "Early Bird", description: "Start a session before 6 AM", emoji: "🌅" },
  { id: "night_owl", name: "Night Owl", description: "Complete a session after 10 PM", emoji: "🦉" },
  { id: "weekend_warrior", name: "Weekend Warrior", description: "Log sessions both Saturday and Sunday", emoji: "🎪" },
  { id: "full_bloom", name: "Full Bloom", description: "Reach Full Flower stage on any plant", emoji: "🌺" },
  { id: "garden_paradise", name: "Paradise Garden", description: "Reach paradise garden status (30+ sessions/week)", emoji: "🏝️" },
  { id: "baby_love", name: "Loving Parent", description: "Log 10 baby bonding sessions", emoji: "💕" },
  { id: "focus_hour", name: "Deep Focus", description: "Accumulate 60 minutes in a single day", emoji: "🧘" },
  { id: "focus_marathon", name: "Focus Marathon", description: "Accumulate 3 hours in a single day", emoji: "🏃" },
];

export function getAchievements(): Achievement[] {
  const stored = getStorage<Achievement[]>(STORAGE_KEYS.achievements, []);
  // Merge with definitions to handle new achievements
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const existing = stored.find((a) => a.id === def.id);
    return existing || { ...def, unlockedAt: null };
  });
}

export function checkAndUnlockAchievements(): Achievement[] {
  const achievements = getAchievements();
  const sessions = getSessions();
  const todaySess = getTodaySessions();
  const { current: streak } = getStreakData();
  const problems = getProblems();
  const solvedCount = problems.filter((p) => p.status === "solved").length;
  const weekCounts = getWeekCategorySessions();
  const totalWeekSessions = Object.values(weekCounts).reduce((a, b) => a + b, 0);

  const newlyUnlocked: Achievement[] = [];

  const tryUnlock = (id: string) => {
    const a = achievements.find((x) => x.id === id);
    if (a && !a.unlockedAt) {
      a.unlockedAt = new Date().toISOString();
      newlyUnlocked.push(a);
    }
  };

  // Session count achievements
  if (sessions.length >= 1) tryUnlock("first_session");
  if (sessions.length >= 10) tryUnlock("ten_sessions");
  if (sessions.length >= 25) tryUnlock("twentyfive_sessions");
  if (sessions.length >= 50) tryUnlock("fifty_sessions");
  if (sessions.length >= 100) tryUnlock("hundred_sessions");

  // Streak achievements
  if (streak >= 3) tryUnlock("streak_3");
  if (streak >= 7) tryUnlock("streak_7");
  if (streak >= 14) tryUnlock("streak_14");
  if (streak >= 30) tryUnlock("streak_30");

  // Daily achievements
  const todayCategories = new Set(todaySess.map((s) => s.category));
  const categories = getCategories();
  if (todayCategories.size >= categories.length) tryUnlock("all_categories");
  if (todaySess.length >= 5) tryUnlock("five_in_day");
  if (todaySess.length >= 10) tryUnlock("ten_in_day");

  const todayMinutes = todaySess.reduce((sum, s) => sum + s.duration_minutes, 0);
  if (todayMinutes >= 60) tryUnlock("focus_hour");
  if (todayMinutes >= 180) tryUnlock("focus_marathon");

  // Blind 75 achievements
  if (solvedCount >= 19) tryUnlock("blind75_25");
  if (solvedCount >= 38) tryUnlock("blind75_50");
  if (solvedCount >= 57) tryUnlock("blind75_75");
  if (solvedCount >= 75) tryUnlock("blind75_100");

  // Time-based achievements
  const now = new Date();
  if (now.getHours() < 6 && todaySess.length > 0) tryUnlock("early_bird");
  if (now.getHours() >= 22 && todaySess.length > 0) tryUnlock("night_owl");

  // Weekend warrior
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const saturday = new Date(now);
    const sunday = new Date(now);
    if (dayOfWeek === 0) {
      saturday.setDate(saturday.getDate() - 1);
    } else {
      sunday.setDate(sunday.getDate() + 1);
    }
    const satStr = toLocalDateString(saturday);
    const sunStr = toLocalDateString(sunday);
    const hasSat = sessions.some((s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === satStr);
    const hasSun = sessions.some((s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === sunStr);
    if (hasSat && hasSun) tryUnlock("weekend_warrior");
  }

  // Garden achievements
  if (Object.values(weekCounts).some((c) => c >= 16)) tryUnlock("full_bloom");
  if (totalWeekSessions >= 30) tryUnlock("garden_paradise");

  // Baby love
  const babySessions = sessions.filter((s) => s.category === "baby");
  if (babySessions.length >= 10) tryUnlock("baby_love");

  if (newlyUnlocked.length > 0) {
    setStorage(STORAGE_KEYS.achievements, achievements);
    if (currentUserId !== "local") {
      supabaseStore.pushAchievements(
        currentUserId,
        achievements.filter((a) => a.unlockedAt).map((a) => ({ id: a.id, unlockedAt: a.unlockedAt }))
      ).catch(console.error);
    }
  }

  return newlyUnlocked;
}

// Edit a session
export function editSession(id: string, updates: Partial<Pick<Session, "duration_minutes" | "notes" | "category">>): Session | null {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...updates };
  setStorage(STORAGE_KEYS.sessions, sessions);
  if (currentUserId !== "local") {
    supabaseStore.updateSession(id, sessions[idx]).catch(console.error);
  }
  return sessions[idx];
}

// Generate shareable weekly report text
export function generateWeeklyReport(): string {
  const settings = getSettings();
  const weekSessions = getWeekSessions();
  const weekCounts = getWeekCategorySessions();
  const { current: streak } = getStreakData();
  const problems = getProblems();
  const solvedCount = problems.filter((p) => p.status === "solved").length;
  const totalMinutes = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalSessions = weekSessions.length;

  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const catLines = getCategories();

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  let report = `🌱 Focus Garden Weekly Report\n`;
  report += `📅 ${formatDate(weekStart)} - ${formatDate(toLocalDateString(weekEnd))}\n`;
  report += `👤 ${settings.displayName}\n\n`;
  report += `📊 Overview\n`;
  report += `   ${totalSessions} sessions · ${timeStr} total focus time\n`;
  report += `   🔥 ${streak} day streak\n\n`;
  report += `🌿 Garden Progress\n`;

  for (const cat of catLines) {
    const count = weekCounts[cat.id] || 0;
    const target = settings.weeklyTargets[cat.id] || cat.weeklyTarget;
    const bar = "█".repeat(Math.min(count, target)) + "░".repeat(Math.max(0, target - count));
    const status = count >= target ? " ✅" : "";
    report += `   ${cat.emoji} ${bar} ${count}/${target}${status}\n`;
  }

  report += `\n💻 Blind 75: ${solvedCount}/75 (${Math.round((solvedCount / 75) * 100)}%)\n`;

  // Highlights
  const highlights: string[] = [];
  if (totalSessions >= 30) highlights.push("🏝️ Paradise garden achieved!");
  else if (totalSessions >= 15) highlights.push("🌸 Garden is flourishing!");
  const completedCats = catLines.filter((c) => weekCounts[c.id] >= settings.weeklyTargets[c.id]);
  if (completedCats.length > 0) {
    highlights.push(`${completedCats.map((c) => c.emoji).join("")} ${completedCats.length} target${completedCats.length > 1 ? "s" : ""} hit!`);
  }
  if (streak >= 7) highlights.push(`⚡ ${streak}-day streak!`);

  if (highlights.length > 0) {
    report += `\n✨ Highlights\n`;
    for (const h of highlights) {
      report += `   ${h}\n`;
    }
  }

  report += `\n— Sent from Focus Garden 🌱`;
  return report;
}

// Weekly Plans
export interface WeeklyPlanSection {
  title: string;
  content: string;
}

export interface WeeklyPlanTask {
  text: string;
  done: boolean;
}

export interface WeeklyPlanLocal {
  weekStart: string;
  overallGoals: string;
  sections: WeeklyPlanSection[];
  categoryTargets: Record<string, number>;
  days: Record<string, {
    goals: string;
    categoryFocus: string[];
    tasks: WeeklyPlanTask[];
    reflection: string;
  }>;
  familyMeetingNotes: string;
  createdAt: string;
  updatedAt: string;
}

export function getWeeklyPlan(weekStart: string): WeeklyPlanLocal | null {
  const plans = getStorage<Record<string, WeeklyPlanLocal>>(STORAGE_KEYS.weeklyPlans, {});
  return plans[weekStart] || null;
}

export function saveWeeklyPlan(plan: WeeklyPlanLocal) {
  const plans = getStorage<Record<string, WeeklyPlanLocal>>(STORAGE_KEYS.weeklyPlans, {});
  plans[plan.weekStart] = { ...plan, updatedAt: new Date().toISOString() };
  setStorage(STORAGE_KEYS.weeklyPlans, plans);
  if (currentUserId !== "local") {
    supabaseStore.pushWeeklyPlan(currentUserId, plan).catch(console.error);
  }
}

export function getAllWeeklyPlans(): Record<string, WeeklyPlanLocal> {
  return getStorage<Record<string, WeeklyPlanLocal>>(STORAGE_KEYS.weeklyPlans, {});
}

export function generateDailyReport(): string {
  const settings = getSettings();
  const todaySessions = getTodaySessions();
  const { current: streak } = getStreakData();
  const totalMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const categories = getCategories();

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const categoryCounts: Record<string, number> = {};
  for (const s of todaySessions) {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  }

  let report = `🌱 Focus Garden Daily Progress\n`;
  report += `📅 ${dateStr}\n`;
  report += `👤 ${settings.displayName}\n\n`;
  report += `📊 Today's Stats\n`;
  report += `   ${todaySessions.length} sessions · ${timeStr} focus time\n`;
  if (streak > 0) report += `   🔥 ${streak} day streak\n`;
  report += `\n`;

  report += `🌿 Sessions by Category\n`;
  for (const cat of categories) {
    const count = categoryCounts[cat.id] || 0;
    if (count > 0) {
      report += `   ${cat.emoji} ${cat.label}: ${count} session${count > 1 ? "s" : ""}\n`;
    }
  }

  const inactive = categories.filter((c) => !categoryCounts[c.id]);
  if (inactive.length > 0 && inactive.length < categories.length) {
    report += `\n   Still to do: ${inactive.map((c) => c.emoji).join(" ")}\n`;
  }

  report += `\n— Sent from Focus Garden 🌱`;
  return report;
}
