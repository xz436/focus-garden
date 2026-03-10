"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getSessions,
  getProblems,
  getSettings,
  getAllPlans,
  getAllWeeklyPlans,
  getGardenSnapshots,
  getAchievements,
  getBabyLog,
  saveSettings,
  AppSettings,
  GardenSnapshot,
  BabyDailyLog,
} from "@/lib/store";
import {
  fetchAllFromSupabase,
  syncAllToSupabase,
} from "@/lib/supabase-store";

interface DataContextType {
  syncing: boolean;
  synced: boolean;
  lastSyncAt: string | null;
}

const DataContext = createContext<DataContextType>({
  syncing: false,
  synced: false,
  lastSyncAt: null,
});

export function useData() {
  return useContext(DataContext);
}

export default function DataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // One-time cleanup: deduplicate localStorage sessions on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fg_sessions");
      if (raw) {
        const sessions = JSON.parse(raw) as { id: string; category: string; started_at: string; duration_minutes: number }[];
        // Deduplicate by content (same category + started_at + duration = same session)
        const seen = new Set<string>();
        const deduped = sessions.filter((s) => {
          const key = `${s.category}|${s.started_at}|${s.duration_minutes}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (deduped.length < sessions.length) {
          console.log(`DataProvider: Cleaned ${sessions.length - deduped.length} duplicate sessions`);
          localStorage.setItem("fg_sessions", JSON.stringify(deduped));
        }
      }
    } catch {}
  }, []);

  const hydrateFromSupabase = useCallback(async (userId: string) => {
    setSyncing(true);
    try {
      const remote = await fetchAllFromSupabase(userId);

      // Check if remote has data
      const hasRemoteData =
        remote.sessions.length > 0 ||
        Object.keys(remote.dailyPlans).length > 0 ||
        Object.keys(remote.weeklyPlans).length > 0;

      // Check if local has data
      const localSessions = getSessions();
      const hasLocalData = localSessions.length > 0;

      if (hasRemoteData) {
        // Remote is source of truth — replace localStorage with remote data
        if (remote.sessions.length > 0) {
          localStorage.setItem("fg_sessions", JSON.stringify(remote.sessions));
        }
        if (remote.problems.length > 0) {
          localStorage.setItem("fg_problems", JSON.stringify(remote.problems));
          localStorage.setItem("fg_initialized", "true");
        }
        if (Object.keys(remote.dailyPlans).length > 0) {
          localStorage.setItem("fg_plans", JSON.stringify(remote.dailyPlans));
        }
        if (Object.keys(remote.weeklyPlans).length > 0) {
          localStorage.setItem("fg_weekly_plans", JSON.stringify(remote.weeklyPlans));
        }
        if (remote.gardenSnapshots.length > 0) {
          localStorage.setItem("fg_garden_snapshots", JSON.stringify(remote.gardenSnapshots));
        }
        if (remote.achievements.length > 0) {
          // Merge with achievement definitions
          const currentAchievements = getAchievements();
          for (const remoteA of remote.achievements) {
            const local = currentAchievements.find((a) => a.id === remoteA.achievement_id);
            if (local && remoteA.unlocked_at) {
              local.unlockedAt = remoteA.unlocked_at;
            }
          }
          localStorage.setItem("fg_achievements", JSON.stringify(currentAchievements));
        }
        if (Object.keys(remote.babyLogs).length > 0) {
          localStorage.setItem("fg_baby_logs", JSON.stringify(remote.babyLogs));
        }
        // Settings from profile
        if (remote.settings && remote.settings.displayName) {
          const currentSettings = getSettings();
          const merged: AppSettings = {
            ...currentSettings,
            ...remote.settings,
            // Keep local categories if remote is empty
            categories:
              remote.settings.categories && remote.settings.categories.length > 0
                ? remote.settings.categories
                : currentSettings.categories,
          };
          saveSettings(merged);
        }
        // Onboarded flag
        if (remote.onboarded) {
          localStorage.setItem("fg_onboarded", "true");
        }
      } else if (hasLocalData) {
        // Local has data but remote is empty — push local to Supabase (first-time migration)
        console.log("DataProvider: Migrating local data to Supabase...");
        const settings = getSettings();
        const allPlans = getAllPlans();
        const weeklyPlans = getAllWeeklyPlans();
        const babyLogs: Record<string, BabyDailyLog> = {};
        // Collect baby logs from localStorage
        try {
          const raw = localStorage.getItem("fg_baby_logs");
          if (raw) Object.assign(babyLogs, JSON.parse(raw));
        } catch {}

        await syncAllToSupabase(userId, {
          sessions: localSessions,
          problems: getProblems(),
          settings,
          dailyPlans: allPlans,
          weeklyPlans,
          gardenSnapshots: getGardenSnapshots(),
          achievements: getAchievements()
            .filter((a) => a.unlockedAt)
            .map((a) => ({ achievement_id: a.id, unlocked_at: a.unlockedAt })),
          babyLogs,
          onboarded: !!localStorage.getItem("fg_onboarded"),
        });
      }

      setLastSyncAt(new Date().toISOString());
      setSynced(true);
    } catch (err) {
      console.error("DataProvider: Sync failed", err);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Sync on auth change
  useEffect(() => {
    if (authLoading || !user) return;
    hydrateFromSupabase(user.id);
  }, [user, authLoading, hydrateFromSupabase]);

  return (
    <DataContext.Provider value={{ syncing, synced, lastSyncAt }}>
      {children}
    </DataContext.Provider>
  );
}
