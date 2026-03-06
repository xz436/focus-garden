"use client";

import { useState, useEffect } from "react";
import { CategoryId } from "@/types";
import { CATEGORY_LIST, CATEGORIES } from "@/lib/constants";
import {
  getStreakData,
  getHeatmapData,
  getProblems,
  getSessions,
  getAchievements,
  Achievement,
  generateWeeklyReport,
} from "@/lib/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export default function StatsPage() {
  const [mounted, setMounted] = useState(false);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0, activeDays: {} as Record<string, number> });
  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number; categories: Record<string, number> }[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; categories: Record<string, number> } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState("");

  useEffect(() => {
    setMounted(true);
    setStreakData(getStreakData());
    setHeatmapData(getHeatmapData());
    const sessions = getSessions();
    setTotalSessions(sessions.length);
    setTotalMinutes(sessions.reduce((sum, s) => sum + s.duration_minutes, 0));
    setSolvedCount(getProblems().filter((p) => p.status === "solved").length);
    setAchievements(getAchievements());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📈</div>
      </div>
    );
  }

  const getHeatColor = (count: number): string => {
    if (count === 0) return "var(--card-border)";
    if (count === 1) return "#9be9a8";
    if (count <= 3) return "#40c463";
    if (count <= 5) return "#30a14e";
    return "#216e39";
  };

  // Compute lifetime stats
  const allSessions = getSessions();
  const firstSession = allSessions.length > 0
    ? allSessions.reduce((oldest, s) => {
        if (!s.completed_at) return oldest;
        return !oldest || s.completed_at < oldest ? s.completed_at : oldest;
      }, "" as string)
    : null;
  const daysSinceStart = firstSession
    ? Math.max(1, Math.floor((Date.now() - new Date(firstSession).getTime()) / 86400000))
    : 0;
  const avgPerDay = daysSinceStart > 0 ? (totalSessions / daysSinceStart).toFixed(1) : "0";
  const activeDaysCount = Object.keys(streakData.activeDays).length;

  const weeks: typeof heatmapData[] = [];
  let currentWeek: typeof heatmapData = [];
  for (let i = 0; i < heatmapData.length; i++) {
    const dayOfWeek = new Date(heatmapData[i].date).getDay();
    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(heatmapData[i]);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const lockedAchievements = achievements.filter((a) => !a.unlockedAt);
  const displayAchievements = showAllAchievements
    ? [...unlockedAchievements, ...lockedAchievements]
    : unlockedAchievements.slice(0, 6);

  const handleShareReport = () => {
    const text = generateWeeklyReport();
    setReport(text);
    setShowReport(true);
  };

  const copyReport = () => {
    navigator.clipboard.writeText(report);
    showToast({ emoji: "📋", title: "Report copied!", type: "success" });
  };

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Stats & Streaks</h1>
          <p className="text-sm text-muted">Your all-time progress</p>
        </div>

        {/* Streak Cards */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="text-center">
            <div className="text-4xl font-bold text-green-600">{streakData.current}</div>
            <div className="text-xs text-muted mt-1">Day Streak 🔥</div>
          </Card>
          <Card className="text-center">
            <div className="text-4xl font-bold text-amber-500">{streakData.longest}</div>
            <div className="text-xs text-muted mt-1">Best Streak 🏆</div>
          </Card>
        </div>

        {/* Lifetime Stats */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.13s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Lifetime Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-2xl font-bold">{totalSessions}</div>
              <div className="text-[10px] text-muted">Total Sessions</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-2xl font-bold">{hours}h {mins}m</div>
              <div className="text-[10px] text-muted">Total Focus Time</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-2xl font-bold">{activeDaysCount}</div>
              <div className="text-[10px] text-muted">Active Days</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-2xl font-bold">{avgPerDay}</div>
              <div className="text-[10px] text-muted">Avg Sessions/Day</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-2xl font-bold">{solvedCount}/75</div>
              <div className="text-[10px] text-muted">Problems Solved</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-2xl font-bold">{daysSinceStart}</div>
              <div className="text-[10px] text-muted">Days Since Start</div>
            </div>
          </div>
        </Card>

        {/* Achievements */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.18s" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted">
              🏅 Achievements ({unlockedAchievements.length}/{achievements.length})
            </h2>
            {achievements.length > 6 && (
              <button
                onClick={() => setShowAllAchievements(!showAllAchievements)}
                className="text-xs text-muted hover:text-foreground"
              >
                {showAllAchievements ? "Show less" : "Show all"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {displayAchievements.map((a) => (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all ${
                  a.unlockedAt
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"
                    : "bg-gray-50 dark:bg-gray-800 opacity-40"
                }`}
              >
                <span className={`text-2xl ${a.unlockedAt ? "" : "grayscale"}`}>
                  {a.emoji}
                </span>
                <span className="text-[10px] font-medium leading-tight">
                  {a.name}
                </span>
                {a.unlockedAt ? (
                  <span className="text-[8px] text-amber-600">
                    {new Date(a.unlockedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-[8px] text-muted">Locked</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Heatmap */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Activity (Last 90 Days)
          </h2>

          <div className="flex gap-1">
            <div className="flex flex-col gap-1 text-[9px] text-muted mr-1 pt-0">
              <span className="h-[14px] flex items-center">M</span>
              <span className="h-[14px] flex items-center">T</span>
              <span className="h-[14px] flex items-center">W</span>
              <span className="h-[14px] flex items-center">T</span>
              <span className="h-[14px] flex items-center">F</span>
              <span className="h-[14px] flex items-center">S</span>
              <span className="h-[14px] flex items-center">S</span>
            </div>

            <div className="flex gap-[3px] flex-1 overflow-x-auto">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {weekIdx === 0 &&
                    Array.from({
                      length: (new Date(week[0]?.date).getDay() + 6) % 7,
                    }).map((_, i) => (
                      <div key={`pad-${i}`} className="w-[14px] h-[14px]" />
                    ))}
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className="w-[14px] h-[14px] rounded-sm cursor-pointer transition-all hover:scale-150 hover:z-10 relative"
                      style={{ backgroundColor: getHeatColor(day.count) }}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={`${day.date}: ${day.count} sessions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-[9px] text-muted mr-1">Less</span>
            {[0, 1, 2, 4, 6].map((count) => (
              <div
                key={count}
                className="w-[12px] h-[12px] rounded-sm"
                style={{ backgroundColor: getHeatColor(count) }}
              />
            ))}
            <span className="text-[9px] text-muted ml-1">More</span>
          </div>

          {hoveredDay && (
            <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs animate-fade-in">
              <div className="font-medium">
                {new Date(hoveredDay.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-muted">
                {hoveredDay.count} session{hoveredDay.count !== 1 ? "s" : ""}
              </div>
              {Object.entries(hoveredDay.categories).length > 0 && (
                <div className="flex gap-2 mt-1">
                  {Object.entries(hoveredDay.categories).map(([cat, count]) => (
                    <span key={cat} className="flex items-center gap-0.5">
                      {CATEGORIES[cat as CategoryId]?.emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Category Breakdown */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            All-Time by Category
          </h2>
          <div className="space-y-2">
            {CATEGORY_LIST.map((cat) => {
              const catSessions = heatmapData.reduce(
                (sum, d) => sum + (d.categories[cat.id] || 0),
                0
              );
              const maxSessions = Math.max(
                ...CATEGORY_LIST.map((c) =>
                  heatmapData.reduce(
                    (sum, d) => sum + (d.categories[c.id] || 0),
                    0
                  )
                ),
                1
              );
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-lg w-7">{cat.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium">{cat.label}</span>
                      <span className="text-xs text-muted">{catSessions} sessions</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(catSessions / maxSessions) * 100}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weekly Report */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            📋 Weekly Report
          </h2>
          {!showReport ? (
            <Button onClick={handleShareReport} className="w-full" variant="secondary">
              Generate Shareable Report
            </Button>
          ) : (
            <div className="space-y-3">
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded-xl p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                {report}
              </pre>
              <div className="flex gap-2">
                <Button onClick={copyReport} className="flex-1" size="sm">
                  📋 Copy
                </Button>
                <Button
                  onClick={() => setShowReport(false)}
                  variant="secondary"
                  className="flex-1"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Milestones */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Milestones
          </h2>
          <div className="space-y-2">
            {[
              { label: "First session", target: 1, icon: "🌱" },
              { label: "10 sessions", target: 10, icon: "🌿" },
              { label: "25 sessions", target: 25, icon: "🌸" },
              { label: "50 sessions", target: 50, icon: "💐" },
              { label: "100 sessions", target: 100, icon: "🌳" },
              { label: "7-day streak", target: 7, icon: "🔥", isStreak: true },
              { label: "30-day streak", target: 30, icon: "⚡", isStreak: true },
              { label: "25% Blind 75", target: 19, icon: "💻", isSolved: true },
              { label: "50% Blind 75", target: 38, icon: "🧠", isSolved: true },
              { label: "75/75 Complete", target: 75, icon: "🏆", isSolved: true },
            ].map((milestone) => {
              const current = milestone.isStreak
                ? streakData.longest
                : milestone.isSolved
                ? solvedCount
                : totalSessions;
              const achieved = current >= milestone.target;
              return (
                <div
                  key={milestone.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    achieved ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-gray-800 opacity-50"
                  }`}
                >
                  <span className="text-lg">{milestone.icon}</span>
                  <span className={`flex-1 text-sm ${achieved ? "font-medium" : ""}`}>
                    {milestone.label}
                  </span>
                  {achieved ? (
                    <span className="text-green-600 text-sm">✅</span>
                  ) : (
                    <span className="text-xs text-muted">
                      {current}/{milestone.target}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
