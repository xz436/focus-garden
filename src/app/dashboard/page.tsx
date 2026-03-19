"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Category, Session } from "@/types";
import {
  getPlantEmoji,
  getPlantStage,
  getDailyQuote,
} from "@/lib/constants";
import {
  getSessions,
  getTodaySessions,
  getWeekSessions,
  getWeekCategorySessions,
  getProblems,
  getStreakData,
  getSettings,
  deleteSession,
  checkAndUnlockAchievements,
  autoSnapshotPreviousWeek,
  addSession,
  getDailyPlanWithWeekly,
  getWeeklyPlan,
  DailyPlanLocal,
  getCategories,
  getCategoryMap,
  generateDailyReport,
} from "@/lib/store";
import { getGreeting, formatMinutes, getToday, getWeekStart } from "@/lib/utils";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { showToast } from "@/components/ui/Toast";
import { triggerConfetti } from "@/components/ui/Confetti";
import MonthCalendar from "@/components/ui/MonthCalendar";
import SessionEditModal from "@/components/ui/SessionEditModal";
import DailyArtwork from "@/components/ui/DailyArtwork";
import EveningReflectionCard from "@/components/ui/EveningReflectionCard";

export default function DashboardPage() {
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [solvedCount, setSolvedCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [displayName, setDisplayName] = useState("Xiaochan");
  const [mounted, setMounted] = useState(false);
  const [todayPlan, setTodayPlan] = useState<{ intentions: string; categoryGoals: Record<string, number> } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickMinutes, setQuickMinutes] = useState(25);
  const [quickNotes, setQuickNotes] = useState("");
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  useEffect(() => {
    setMounted(true);
    const cats = getCategories();
    setCategories(cats);
    setCategoryMap(getCategoryMap());
    autoSnapshotPreviousWeek();
    loadData();
    const newlyUnlocked = checkAndUnlockAchievements();
    if (newlyUnlocked.length > 0) {
      triggerConfetti();
      for (const a of newlyUnlocked) {
        showToast({
          emoji: a.emoji,
          title: `Achievement: ${a.name}`,
          description: a.description,
          type: "achievement",
        });
      }
    }
  }, []);

  const loadData = () => {
    setTodaySessions(getTodaySessions());
    setWeekCounts(getWeekCategorySessions());
    const problems = getProblems();
    setSolvedCount(problems.filter((p) => p.status === "solved").length);
    setStreakDays(getStreakData().current);
    setDisplayName(getSettings().displayName);
    const plan = getDailyPlanWithWeekly(getToday());
    // Get weekly plan tasks for today (these are the real tasks)
    const weekStart = getWeekStart();
    const weeklyPlan = getWeeklyPlan(weekStart);
    const weeklyDay = weeklyPlan?.days?.[getToday()];
    const weeklyTasks = weeklyDay?.tasks
      ?.map((t: { text: string; done: boolean } | string) => typeof t === "object" ? t.text : t)
      .filter(Boolean)
      .join("\n") || "";

    if (plan && (weeklyTasks || plan.intentions || Object.values(plan.categoryGoals).some((v) => v > 0))) {
      setTodayPlan({
        intentions: weeklyTasks || plan.intentions,
        categoryGoals: plan.categoryGoals,
      });
    }
  };

  const handleDeleteSession = (id: string) => {
    if (confirmDelete === id) {
      deleteSession(id);
      loadData();
      setConfirmDelete(null);
      showToast({ emoji: "🗑️", title: "Session deleted", type: "info" });
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleQuickAdd = (catId: string) => {
    addSession({
      category: catId,
      duration_minutes: quickMinutes,
      notes: quickNotes || null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    setQuickNotes("");
    setShowQuickAdd(false);
    loadData();
    const cat = categoryMap[catId];
    showToast({
      emoji: cat?.emoji || "🌱",
      title: `${cat?.label || catId} session logged!`,
      description: `${quickMinutes} minutes`,
      type: "success",
    });
    setTimeout(() => {
      const newlyUnlocked = checkAndUnlockAchievements();
      if (newlyUnlocked.length > 0) {
        triggerConfetti();
        for (const a of newlyUnlocked) {
          showToast({
            emoji: a.emoji,
            title: `Achievement: ${a.name}`,
            description: a.description,
            type: "achievement",
          });
        }
      }
    }, 300);
  };

  const handleShareProgress = async () => {
    const text = generateDailyReport();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Focus Garden - Daily Progress", text });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(text);
    showToast({ emoji: "📋", title: "Progress copied!", description: "Paste it anywhere to share", type: "success" });
  };

  const handleShareLink = async () => {
    try {
      const allSessions = getSessions();
      const weekSess = getWeekSessions();
      const snapshotData = {
        garden: Object.fromEntries(
          categories.map((cat) => [
            cat.id,
            { emoji: cat.emoji, label: cat.label, sessions: weekCounts[cat.id] || 0, color: cat.color },
          ])
        ),
        streak: streakDays,
        totalSessions: allSessions.length,
        totalMinutes: allSessions.reduce((s, x) => s + x.duration_minutes, 0),
        weekSessions: weekSess.length,
        weekMinutes: weekSess.reduce((s, x) => s + x.duration_minutes, 0),
        blind75Solved: solvedCount,
      };

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, snapshotData }),
      });

      if (!res.ok) {
        showToast({ emoji: "❌", title: "Failed to create share link", type: "info" });
        return;
      }

      const { shareId } = await res.json();
      const shareUrl = `${window.location.origin}/share/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast({ emoji: "🔗", title: "Share link copied!", description: "Anyone can view your progress", type: "success" });
    } catch {
      showToast({ emoji: "❌", title: "Failed to create share link", type: "info" });
    }
  };

  // Most neglected category this week
  const mostNeglected = useMemo(() => {
    if (!mounted || categories.length === 0) return null;
    const settings = getSettings();
    let lowest = categories[0];
    let lowestPct = 1;
    for (const cat of categories) {
      const pct = (weekCounts[cat.id] || 0) / (settings.weeklyTargets[cat.id] || 1);
      if (pct < lowestPct) {
        lowestPct = pct;
        lowest = cat;
      }
    }
    return { cat: lowest, count: weekCounts[lowest.id] || 0, target: settings.weeklyTargets[lowest.id] || 1 };
  }, [mounted, weekCounts, categories]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">🌱</div>
      </div>
    );
  }

  const todayTotalMinutes = todaySessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  );

  const todayCategoryCounts: Record<string, number> = {};
  for (const s of todaySessions) {
    todayCategoryCounts[s.category] = (todayCategoryCounts[s.category] || 0) + 1;
  }

  const missingToday = categories.filter(
    (cat) => !todayCategoryCounts[cat.id] && getSettings().weeklyTargets[cat.id] >= 7
  );

  // Check if all daily goals are met (for evening reflection trigger)
  const allGoalsMet = todayPlan
    ? categories
        .filter((cat) => (todayPlan.categoryGoals[cat.id] || 0) > 0)
        .every((cat) => (todayCategoryCounts[cat.id] || 0) >= todayPlan.categoryGoals[cat.id])
    : false;

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const settings = getSettings();

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {displayName}!
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={handleShareProgress}
                className="text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Share as text"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={handleShareLink}
                className="text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Create shareable link"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-sm text-muted">
            {dayNames[today.getDay()]}, {monthNames[today.getMonth()]} {today.getDate()}
            {streakDays > 0 && ` · ${streakDays} day streak 🔥`}
          </p>
        </div>

        {/* Evening Reflection Prompt */}
        <EveningReflectionCard allGoalsMet={allGoalsMet} />

        {/* Streak Milestone Celebration */}
        {[100, 60, 30, 21, 14, 7].some((m) => streakDays === m) && (
          <Card className="animate-fade-in bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800 animate-glow" style={{ animationDelay: "0.03s" }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">
                {streakDays >= 60 ? "👑" : streakDays >= 30 ? "🏆" : streakDays >= 14 ? "⚡" : "🔥"}
              </span>
              <div>
                <div className="text-sm font-bold text-orange-700 dark:text-orange-400">
                  {streakDays}-Day Streak! 🎉
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  {streakDays >= 60 ? "Legendary dedication! You're unstoppable!" :
                   streakDays >= 30 ? "A whole month of consistency! Incredible!" :
                   streakDays >= 21 ? "21 days - a new habit is born!" :
                   streakDays >= 14 ? "Two weeks strong! Keep the momentum!" :
                   "One week down! You're building something great!"}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Daily Plan + Quote Section */}
        {todayPlan ? (
          <Card className="animate-fade-in bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-800" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-green-700 dark:text-green-400">Today&apos;s Plan</h2>
              <Link href="/weekly-plan" className="text-[10px] text-green-600 dark:text-green-400 hover:underline">
                Edit →
              </Link>
            </div>

            {/* Intentions or fallback to daily quote */}
            {todayPlan.intentions ? (
              <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed mb-3 whitespace-pre-line">
                {todayPlan.intentions}
              </p>
            ) : (
              <p className="text-sm italic text-green-800 dark:text-green-300 leading-relaxed mb-3">
                &ldquo;{getDailyQuote().text}&rdquo;
                <span className="text-xs text-green-600 dark:text-green-400 block text-right mt-1">
                  — {getDailyQuote().author}
                </span>
              </p>
            )}

            {/* Top category goals with progress */}
            {(() => {
              const topGoals = categories
                .filter((cat) => (todayPlan!.categoryGoals[cat.id] || 0) > 0)
                .sort((a, b) => (todayPlan!.categoryGoals[b.id] || 0) - (todayPlan!.categoryGoals[a.id] || 0))
                .slice(0, 3);
              if (topGoals.length === 0) return null;
              return (
                <div className="space-y-2 mb-3">
                  {topGoals.map((cat) => {
                    const planned = todayPlan!.categoryGoals[cat.id];
                    const done = todayCategoryCounts[cat.id] || 0;
                    return (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="text-sm">{cat.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{cat.label}</span>
                            <span className="text-[10px] text-green-600 dark:text-green-400">
                              {done}/{planned}{done >= planned && planned > 0 ? " ✅" : ""}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-green-100 dark:bg-green-900/40 mt-0.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min((done / planned) * 100, 100)}%`,
                                backgroundColor: done >= planned ? "#22c55e" : cat.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Action button */}
            <Link href="/timer">
              <button className="w-full py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-all active:scale-95">
                {todaySessions.length > 0 ? "Continue Focused Work →" : "Start First Session →"}
              </button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Daily Quote */}
            <Card className="animate-fade-in bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-800" style={{ animationDelay: "0.05s" }}>
              <p className="text-sm italic text-green-800 dark:text-green-300 leading-relaxed">
                &ldquo;{getDailyQuote().text}&rdquo;
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-right">
                — {getDailyQuote().author}
              </p>
            </Card>

            {/* Hero CTA / Today's Progress */}
            <Card className="animate-fade-in" style={{ animationDelay: "0.08s" }}>
              {todaySessions.length === 0 ? (
                <div className="text-center py-2">
                  <div className="text-4xl mb-3">🌱</div>
                  <h2 className="text-lg font-bold mb-1">Ready to grow?</h2>
                  <p className="text-sm text-muted mb-4">Start your first session of the day.</p>
                  <div className="flex gap-3">
                    <Link href="/timer" className="flex-1">
                      <button className="w-full py-3 rounded-xl bg-foreground text-background font-medium text-sm hover:opacity-90 transition-all active:scale-95">
                        ⏱️ Start a Focus Session
                      </button>
                    </Link>
                    <Link href="/weekly-plan" className="flex-1">
                      <button className="w-full py-3 rounded-xl border border-card-border font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95">
                        📝 Plan Your Day
                      </button>
                    </Link>
                  </div>
                  {mostNeglected && mostNeglected.count < mostNeglected.target && (
                    <p className="text-xs text-muted mt-3">
                      {mostNeglected.cat.emoji} <span className="font-medium">{mostNeglected.cat.label}</span> needs
                      the most attention ({mostNeglected.count}/{mostNeglected.target} this week)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted">Today&apos;s Progress</h2>
                    <Link href="/timer">
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-all active:scale-95">
                        Continue →
                      </button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 grid grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{todaySessions.length}</div>
                        <div className="text-[10px] text-muted">sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatMinutes(todayTotalMinutes)}</div>
                        <div className="text-[10px] text-muted">focus time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{Object.keys(todayCategoryCounts).length}/{categories.length}</div>
                        <div className="text-[10px] text-muted">categories</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{streakDays}🔥</div>
                        <div className="text-[10px] text-muted">streak</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {categories.map((cat) => {
                      const count = todayCategoryCounts[cat.id] || 0;
                      return count > 0 ? (
                        <span
                          key={cat.id}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ color: cat.color, backgroundColor: `${cat.color}15` }}
                          title={`${cat.label}: ${count} session${count > 1 ? "s" : ""}`}
                        >
                          {cat.emoji} {cat.label.split(" ")[0]} {count}
                        </span>
                      ) : null;
                    })}
                  </div>
                  {missingToday.length > 0 && missingToday.length < categories.length && (
                    <p className="text-[10px] text-muted mt-2">
                      Still to do: {missingToday.map((c) => c.emoji).join(" ")}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Quick Actions — Primary entry points */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Link href="/timer">
            <Card className="text-center hover:scale-105 transition-transform cursor-pointer">
              <span className="text-2xl">⏱️</span>
              <p className="text-xs font-medium mt-1">Start Timer</p>
            </Card>
          </Link>
          <Link href="/weekly-plan">
            <Card className="text-center hover:scale-105 transition-transform cursor-pointer">
              <span className="text-2xl">📝</span>
              <p className="text-xs font-medium mt-1">Plan Day</p>
            </Card>
          </Link>
          <Link href="/baby">
            <Card className="text-center hover:scale-105 transition-transform cursor-pointer">
              <span className="text-2xl">🌷</span>
              <p className="text-xs font-medium mt-1">Baby Time</p>
            </Card>
          </Link>
        </div>

        {/* This Week — Compact Garden */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted">This Week</h2>
            <Link href="/review" className="text-[10px] text-muted hover:text-foreground">
              Details →
            </Link>
          </div>

          {/* Garden row */}
          <div className="flex justify-around py-3 rounded-xl bg-gradient-to-b from-sky-50 to-green-50 dark:from-sky-900/20 dark:to-green-900/20">
            {categories.map((cat) => {
              const sessions = weekCounts[cat.id] || 0;
              const stage = getPlantStage(sessions);
              return (
                <div key={cat.id} className="flex flex-col items-center gap-0.5">
                  <div
                    className={`${stage.size} ${
                      sessions > 0 ? "animate-sway" : "opacity-40"
                    }`}
                  >
                    {getPlantEmoji(cat.emoji, sessions)}
                  </div>
                  <div className="text-[9px] text-muted">{cat.label.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>

          {/* One-line summary */}
          <p className="text-xs text-muted text-center mt-2">
            {Object.values(weekCounts).reduce((a, b) => a + b, 0)} sessions · {formatMinutes(
              Object.values(weekCounts).reduce((a, b) => a + b, 0) * 25
            )} focus time
          </p>
        </Card>

        {/* Today's Sessions */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Today&apos;s Sessions
          </h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              No sessions yet today. Start your first one! 🌱
            </p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session) => {
                const cat = categoryMap[session.category];
                const time = new Date(session.started_at);
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 group"
                  >
                    <span className="text-lg">{cat?.emoji || "🌱"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {cat?.label || session.category}
                      </div>
                      {session.notes && (
                        <div className="text-xs text-muted truncate">
                          {session.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="text-xs text-muted">
                          {time.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-xs font-medium">
                          {session.duration_minutes}m
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingSession(session)}
                        className="text-xs px-2 py-1 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className={`text-xs px-2 py-1 rounded-lg transition-all ${
                          confirmDelete === session.id
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium"
                            : "text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                        }`}
                      >
                        {confirmDelete === session.id ? "Confirm?" : "×"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Daily Devotional Artwork */}
        <DailyArtwork />

      </div>

      {/* Quick Add FAB */}
      <button
        onClick={() => setShowQuickAdd(!showQuickAdd)}
        className={`fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all active:scale-90 ${
          showQuickAdd
            ? "bg-red-500 text-white rotate-45"
            : "bg-green-500 text-white animate-pulse-soft"
        }`}
      >
        +
      </button>

      {/* Quick Add Panel */}
      {showQuickAdd && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowQuickAdd(false)}
          />
          <div className="fixed bottom-36 right-4 z-30 w-72 rounded-2xl bg-card border border-card-border shadow-xl p-4 animate-slide-up">
            <h3 className="font-semibold text-sm mb-3">Quick Log Session</h3>

            {/* Duration */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted w-12">Time:</span>
              <div className="flex gap-1.5 flex-1">
                {[15, 25, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setQuickMinutes(m)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                      quickMinutes === m
                        ? "border-green-400 bg-green-50 dark:bg-green-900/30 font-medium"
                        : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <input
              type="text"
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="Optional note..."
              className="w-full rounded-lg border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs mb-3 focus:outline-none focus:border-gray-400"
            />

            {/* Category buttons */}
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleQuickAdd(cat.id)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-card-border p-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[10px] font-medium">{cat.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {editingSession && (
        <SessionEditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={() => {
            loadData();
            showToast({ emoji: "✏️", title: "Session updated!", type: "success" });
          }}
        />
      )}
    </div>
  );
}
