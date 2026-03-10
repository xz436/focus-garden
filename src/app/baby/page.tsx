"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getDailyBabyTip,
  getDailyBabyActivities,
  BabyActivity,
} from "@/lib/constants";
import {
  getSettings,
  saveSettings,
  AppSettings,
  getBabyLog,
  saveBabyLog,
} from "@/lib/store";
import { getToday } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function getBabyAgeMonths(birthdate: string): number {
  if (!birthdate) return 0;
  // Handle both "YYYY-MM-DD" and "MM/DD/YYYY" formats
  let birth: Date;
  if (birthdate.includes("/")) {
    const parts = birthdate.split("/");
    birth = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  } else {
    birth = new Date(birthdate + "T00:00:00");
  }
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() < birth.getDate() ? -1 : 0)
  );
}

function formatBabyAge(birthdate: string): string {
  if (!birthdate) return "0 months old";
  let birth: Date;
  if (birthdate.includes("/")) {
    const parts = birthdate.split("/");
    birth = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  } else {
    birth = new Date(birthdate + "T00:00:00");
  }
  if (isNaN(birth.getTime())) return "0 months old";
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years > 0 && remainingMonths > 0) return `${years}y ${remainingMonths}m old`;
  if (years > 0) return `${years} year${years > 1 ? "s" : ""} old`;
  return `${months} month${months !== 1 ? "s" : ""} old`;
}

export default function BabyPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [babyName, setBabyName] = useState("");
  const [babyBirthdate, setBabyBirthdate] = useState("");
  const [activities, setActivities] = useState<BabyActivity[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const today = getToday();

  useEffect(() => {
    setMounted(true);
    const s = getSettings();
    setSettings(s);
    setBabyName(s.babyName);
    setBabyBirthdate(s.babyBirthdate);

    if (s.babyBirthdate) {
      const ageMonths = getBabyAgeMonths(s.babyBirthdate);
      setActivities(getDailyBabyActivities(ageMonths, 5));

      const log = getBabyLog(getToday());
      if (log) {
        setCompletedIds(
          new Set(log.activities.filter((a) => a.completed).map((a) => a.activityId))
        );
      }
    }
  }, []);

  const handleSaveSetup = () => {
    if (!settings || !babyName.trim() || !babyBirthdate) return;
    const updated = { ...settings, babyName: babyName.trim(), babyBirthdate };
    saveSettings(updated);
    setSettings(updated);

    const ageMonths = getBabyAgeMonths(babyBirthdate);
    setActivities(getDailyBabyActivities(ageMonths, 5));
  };

  const toggleActivity = useCallback(
    (activityId: string) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(activityId)) {
          next.delete(activityId);
        } else {
          next.add(activityId);
        }

        // Auto-save
        saveBabyLog({
          date: today,
          activities: activities.map((a) => ({
            activityId: a.id,
            completed: next.has(a.id),
          })),
        });

        return next;
      });
    },
    [activities, today]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">🌷</div>
      </div>
    );
  }

  const hasBabyInfo = settings?.babyName && settings?.babyBirthdate;
  const ageMonths = hasBabyInfo ? getBabyAgeMonths(settings!.babyBirthdate) : 0;
  const completedCount = completedIds.size;
  const totalActivities = activities.length;

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          {hasBabyInfo ? (
            <>
              <h1 className="text-2xl font-bold">{settings!.babyName}&apos;s Day</h1>
              <p className="text-sm text-muted">
                {formatBabyAge(settings!.babyBirthdate)} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Baby Activities</h1>
              <p className="text-sm text-muted">Set up your baby&apos;s info to get started</p>
            </>
          )}
        </div>

        {/* Setup prompt */}
        {!hasBabyInfo && (
          <Card className="animate-fade-in border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/20" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌷</span>
              <h2 className="text-sm font-semibold text-pink-700 dark:text-pink-400">Tell us about your baby</h2>
            </div>
            <p className="text-xs text-pink-600 dark:text-pink-400 mb-4">
              We&apos;ll suggest age-appropriate activities and parenting tips tailored to your baby&apos;s developmental stage.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Baby&apos;s Name</label>
                <input
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="e.g., Noah"
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Date of Birth</label>
                <input
                  type="date"
                  value={babyBirthdate}
                  onChange={(e) => setBabyBirthdate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <Button
                onClick={handleSaveSetup}
                disabled={!babyName.trim() || !babyBirthdate}
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          </Card>
        )}

        {/* Content only shown when baby info is set */}
        {hasBabyInfo && (
          <>
            {/* Tip of the Day */}
            <Card className="animate-fade-in bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-100 dark:border-pink-800" style={{ animationDelay: "0.05s" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <h2 className="text-sm font-semibold text-pink-700 dark:text-pink-400">Parenting Tip</h2>
              </div>
              <p className="text-sm text-pink-800 dark:text-pink-300 leading-relaxed">
                {getDailyBabyTip(ageMonths).text}
              </p>
            </Card>

            {/* Progress */}
            {totalActivities > 0 && completedCount > 0 && (
              <Card className="animate-fade-in border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20" style={{ animationDelay: "0.08s" }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <h2 className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {completedCount}/{totalActivities} activities done today!
                  </h2>
                </div>
                <div className="mt-2 h-2 rounded-full bg-green-100 dark:bg-green-900/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${(completedCount / totalActivities) * 100}%` }}
                  />
                </div>
                {completedCount === totalActivities && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center font-medium">
                    Amazing job today! 🎉
                  </p>
                )}
              </Card>
            )}

            {/* Today's Activities */}
            <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌷</span>
                  <h2 className="text-sm font-semibold">Today&apos;s Activities</h2>
                </div>
                <span className="text-[10px] text-muted">
                  {completedCount}/{totalActivities} done
                </span>
              </div>

              <div className="space-y-2">
                {activities.map((activity) => {
                  const isDone = completedIds.has(activity.id);
                  return (
                    <button
                      key={activity.id}
                      onClick={() => toggleActivity(activity.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all active:scale-[0.98] ${
                        isDone
                          ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                          : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isDone
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isDone && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{activity.emoji}</span>
                            <span className={`text-sm font-medium ${isDone ? "line-through text-muted" : ""}`}>
                              {activity.title}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 leading-relaxed ${isDone ? "text-muted line-through" : "text-muted"}`}>
                            {activity.description}
                          </p>
                          <span className="text-[10px] text-muted mt-1 inline-block">
                            ⏱ {activity.duration}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Log Session */}
            <Link href="/timer?category=baby">
              <Button size="lg" className="w-full">
                🌷 Log Baby Bonding Session
              </Button>
            </Link>

            {/* Edit info link */}
            <div className="text-center">
              <Link href="/settings" className="text-xs text-muted hover:underline">
                Edit baby info in Settings
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
