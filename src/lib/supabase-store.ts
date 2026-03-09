import { createClient } from "@/lib/supabase";
import { Session, Blind75Problem } from "@/types";
import type {
  DailyPlanLocal,
  AppSettings,
  WeeklyPlanLocal,
  GardenSnapshot,
  BabyDailyLog,
  Achievement,
} from "@/lib/store";

// ---------------------------------------------------------------------------
// Sessions → `sessions` table
// ---------------------------------------------------------------------------

export async function fetchSessions(userId: string): Promise<Session[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("fetchSessions error:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("fetchSessions exception:", err);
    return [];
  }
}

export async function pushSession(session: Session): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("sessions").upsert(session);
    if (error) console.error("pushSession error:", error);
  } catch (err) {
    console.error("pushSession exception:", err);
  }
}

export async function removeSession(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) console.error("removeSession error:", error);
  } catch (err) {
    console.error("removeSession exception:", err);
  }
}

export async function updateSession(
  id: string,
  updates: Partial<Session>
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", id);
    if (error) console.error("updateSession error:", error);
  } catch (err) {
    console.error("updateSession exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Blind75Problems → `blind75_problems` table
// ---------------------------------------------------------------------------

export async function fetchProblems(userId: string): Promise<Blind75Problem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blind75_problems")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchProblems error:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("fetchProblems exception:", err);
    return [];
  }
}

export async function pushProblems(problems: Blind75Problem[]): Promise<void> {
  try {
    if (problems.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase.from("blind75_problems").upsert(problems);
    if (error) console.error("pushProblems error:", error);
  } catch (err) {
    console.error("pushProblems exception:", err);
  }
}

export async function updateProblemRemote(
  id: string,
  updates: Partial<Blind75Problem>
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("blind75_problems")
      .update(updates)
      .eq("id", id);
    if (error) console.error("updateProblemRemote error:", error);
  } catch (err) {
    console.error("updateProblemRemote exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Daily Plans → `daily_plans` table
// ---------------------------------------------------------------------------

export async function fetchDailyPlans(
  userId: string
): Promise<Record<string, DailyPlanLocal>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("fetchDailyPlans error:", error);
      return {};
    }

    const result: Record<string, DailyPlanLocal> = {};
    for (const row of data ?? []) {
      result[row.plan_date] = {
        date: row.plan_date,
        intentions: row.intentions ?? "",
        categoryGoals: row.category_goals ?? {},
        reflection: row.reflection ?? "",
        pomodoroGoal: row.pomodoro_goal ?? 5,
      };
    }
    return result;
  } catch (err) {
    console.error("fetchDailyPlans exception:", err);
    return {};
  }
}

export async function pushDailyPlan(
  userId: string,
  plan: DailyPlanLocal
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("daily_plans").upsert(
      {
        user_id: userId,
        plan_date: plan.date,
        intentions: plan.intentions,
        category_goals: plan.categoryGoals,
        reflection: plan.reflection,
        pomodoro_goal: plan.pomodoroGoal,
      },
      { onConflict: "user_id,plan_date" }
    );
    if (error) console.error("pushDailyPlan error:", error);
  } catch (err) {
    console.error("pushDailyPlan exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Settings → `profiles` table
// ---------------------------------------------------------------------------

export async function fetchSettings(
  userId: string
): Promise<Partial<AppSettings>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "timer_durations, pomodoro_goal, short_break, long_break, baby_name, baby_birthdate, categories, onboarded, display_name, weekly_targets"
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error("fetchSettings error:", error);
      return {};
    }
    if (!data) return {};

    const settings: Partial<AppSettings> = {};
    if (data.display_name != null) settings.displayName = data.display_name;
    if (data.weekly_targets != null) settings.weeklyTargets = data.weekly_targets;
    if (data.timer_durations != null) settings.timerDurations = data.timer_durations;
    if (data.pomodoro_goal != null) settings.pomodoroGoal = data.pomodoro_goal;
    if (data.short_break != null) settings.shortBreak = data.short_break;
    if (data.long_break != null) settings.longBreak = data.long_break;
    if (data.baby_name != null) settings.babyName = data.baby_name;
    if (data.baby_birthdate != null) settings.babyBirthdate = data.baby_birthdate;
    if (data.categories != null) settings.categories = data.categories;

    return settings;
  } catch (err) {
    console.error("fetchSettings exception:", err);
    return {};
  }
}

export async function pushSettings(
  userId: string,
  settings: AppSettings
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: settings.displayName,
      weekly_targets: settings.weeklyTargets,
      timer_durations: settings.timerDurations,
      pomodoro_goal: settings.pomodoroGoal,
      short_break: settings.shortBreak,
      long_break: settings.longBreak,
      baby_name: settings.babyName,
      baby_birthdate: settings.babyBirthdate,
      categories: settings.categories,
    });
    if (error) console.error("pushSettings error:", error);
  } catch (err) {
    console.error("pushSettings exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Weekly Plans → `weekly_plans` table
// ---------------------------------------------------------------------------

export async function fetchWeeklyPlans(
  userId: string
): Promise<Record<string, WeeklyPlanLocal>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("fetchWeeklyPlans error:", error);
      return {};
    }

    const result: Record<string, WeeklyPlanLocal> = {};
    for (const row of data ?? []) {
      result[row.week_start] = {
        weekStart: row.week_start,
        overallGoals: row.overall_goals ?? "",
        sections: row.sections ?? [],
        categoryTargets: row.category_targets ?? {},
        days: row.days ?? {},
        familyMeetingNotes: row.family_meeting_notes ?? "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return result;
  } catch (err) {
    console.error("fetchWeeklyPlans exception:", err);
    return {};
  }
}

export async function pushWeeklyPlan(
  userId: string,
  plan: WeeklyPlanLocal
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("weekly_plans").upsert(
      {
        user_id: userId,
        week_start: plan.weekStart,
        overall_goals: plan.overallGoals,
        sections: plan.sections,
        category_targets: plan.categoryTargets,
        days: plan.days,
        family_meeting_notes: plan.familyMeetingNotes,
        created_at: plan.createdAt,
        updated_at: plan.updatedAt,
      },
      { onConflict: "user_id,week_start" }
    );
    if (error) console.error("pushWeeklyPlan error:", error);
  } catch (err) {
    console.error("pushWeeklyPlan exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Garden Snapshots → `garden_snapshots` table
// ---------------------------------------------------------------------------

export async function fetchGardenSnapshots(
  userId: string
): Promise<GardenSnapshot[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("garden_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false });

    if (error) {
      console.error("fetchGardenSnapshots error:", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      weekStart: row.week_start,
      weekEnd: row.week_end,
      plants: row.plants ?? {},
      totalSessions: row.total_sessions ?? 0,
      totalMinutes: row.total_minutes ?? 0,
      gardenHealth: row.garden_health ?? "empty",
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error("fetchGardenSnapshots exception:", err);
    return [];
  }
}

export async function pushGardenSnapshot(
  userId: string,
  snapshot: GardenSnapshot
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("garden_snapshots").upsert(
      {
        user_id: userId,
        week_start: snapshot.weekStart,
        week_end: snapshot.weekEnd,
        plants: snapshot.plants,
        total_sessions: snapshot.totalSessions,
        total_minutes: snapshot.totalMinutes,
        garden_health: snapshot.gardenHealth,
        created_at: snapshot.createdAt,
      },
      { onConflict: "user_id,week_start" }
    );
    if (error) console.error("pushGardenSnapshot error:", error);
  } catch (err) {
    console.error("pushGardenSnapshot exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Achievements → `achievements` table
// ---------------------------------------------------------------------------

export async function fetchAchievements(
  userId: string
): Promise<{ achievement_id: string; unlocked_at: string | null }[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId);

    if (error) {
      console.error("fetchAchievements error:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("fetchAchievements exception:", err);
    return [];
  }
}

export async function pushAchievements(
  userId: string,
  achievements: { id: string; unlockedAt: string | null }[]
): Promise<void> {
  try {
    if (achievements.length === 0) return;
    const supabase = createClient();
    const rows = achievements.map((a) => ({
      user_id: userId,
      achievement_id: a.id,
      unlocked_at: a.unlockedAt,
    }));
    const { error } = await supabase
      .from("achievements")
      .upsert(rows, { onConflict: "user_id,achievement_id" });
    if (error) console.error("pushAchievements error:", error);
  } catch (err) {
    console.error("pushAchievements exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Baby Logs → `baby_daily_logs` table
// ---------------------------------------------------------------------------

export async function fetchBabyLogs(
  userId: string
): Promise<Record<string, BabyDailyLog>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("baby_daily_logs")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("fetchBabyLogs error:", error);
      return {};
    }

    const result: Record<string, BabyDailyLog> = {};
    for (const row of data ?? []) {
      result[row.log_date] = {
        date: row.log_date,
        activities: row.activities ?? [],
      };
    }
    return result;
  } catch (err) {
    console.error("fetchBabyLogs exception:", err);
    return {};
  }
}

export async function pushBabyLog(
  userId: string,
  log: BabyDailyLog
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("baby_daily_logs").upsert(
      {
        user_id: userId,
        log_date: log.date,
        activities: log.activities,
      },
      { onConflict: "user_id,log_date" }
    );
    if (error) console.error("pushBabyLog error:", error);
  } catch (err) {
    console.error("pushBabyLog exception:", err);
  }
}

// ---------------------------------------------------------------------------
// Full Sync Helpers
// ---------------------------------------------------------------------------

interface AllData {
  sessions: Session[];
  problems: Blind75Problem[];
  dailyPlans: Record<string, DailyPlanLocal>;
  settings: Partial<AppSettings>;
  weeklyPlans: Record<string, WeeklyPlanLocal>;
  gardenSnapshots: GardenSnapshot[];
  achievements: { achievement_id: string; unlocked_at: string | null }[];
  babyLogs: Record<string, BabyDailyLog>;
  onboarded: boolean;
}

/**
 * Push all localStorage data to Supabase (first-time migration).
 */
export async function syncAllToSupabase(
  userId: string,
  data: AllData
): Promise<void> {
  try {
    await Promise.all([
      // Sessions — upsert all at once
      (async () => {
        if (data.sessions.length > 0) {
          const supabase = createClient();
          const { error } = await supabase.from("sessions").upsert(data.sessions);
          if (error) console.error("syncAll sessions error:", error);
        }
      })(),

      // Problems
      pushProblems(data.problems),

      // Daily plans
      (async () => {
        for (const plan of Object.values(data.dailyPlans)) {
          await pushDailyPlan(userId, plan);
        }
      })(),

      // Settings
      pushSettings(userId, data.settings as AppSettings),

      // Weekly plans
      (async () => {
        for (const plan of Object.values(data.weeklyPlans)) {
          await pushWeeklyPlan(userId, plan);
        }
      })(),

      // Garden snapshots
      (async () => {
        for (const snapshot of data.gardenSnapshots) {
          await pushGardenSnapshot(userId, snapshot);
        }
      })(),

      // Achievements
      pushAchievements(
        userId,
        data.achievements.map((a) => ({
          id: "achievement_id" in a ? a.achievement_id : (a as unknown as { id: string }).id,
          unlockedAt: "unlocked_at" in a ? a.unlocked_at : (a as unknown as { unlockedAt: string | null }).unlockedAt,
        }))
      ),

      // Baby logs
      (async () => {
        for (const log of Object.values(data.babyLogs)) {
          await pushBabyLog(userId, log);
        }
      })(),
    ]);
  } catch (err) {
    console.error("syncAllToSupabase exception:", err);
  }
}

/**
 * Fetch everything from Supabase (for hydrating localStorage on login).
 */
export async function fetchAllFromSupabase(
  userId: string
): Promise<AllData> {
  const [
    sessions,
    problems,
    dailyPlans,
    settings,
    weeklyPlans,
    gardenSnapshots,
    achievementRows,
    babyLogs,
  ] = await Promise.all([
    fetchSessions(userId),
    fetchProblems(userId),
    fetchDailyPlans(userId),
    fetchSettings(userId),
    fetchWeeklyPlans(userId),
    fetchGardenSnapshots(userId),
    fetchAchievements(userId),
    fetchBabyLogs(userId),
  ]);

  return {
    sessions,
    problems,
    dailyPlans,
    settings: settings as Partial<AppSettings>,
    weeklyPlans,
    gardenSnapshots,
    achievements: achievementRows,
    babyLogs,
    onboarded: !!(settings as Record<string, unknown>)?.onboarded,
  };
}
