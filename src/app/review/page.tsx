"use client";

import { useState, useEffect, useMemo } from "react";
import { Category, Session } from "@/types";
import { getPlantEmoji } from "@/lib/constants";
import { getSessions, getSettings, generateWeeklyReport, getCategories } from "@/lib/store";
import { formatMinutes, getWeekStart, toLocalDateString } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { showToast } from "@/components/ui/Toast";

export default function WeeklyReviewPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mounted, setMounted] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, etc.

  useEffect(() => {
    setMounted(true);
    setSessions(getSessions());
    setCategories(getCategories());
  }, []);

  const settings = useMemo(() => getSettings(), []);

  const getWeekData = (offset: number) => {
    const now = new Date();
    const weekStart = new Date(getWeekStart() + "T00:00:00");
    weekStart.setDate(weekStart.getDate() + offset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartStr = toLocalDateString(weekStart);
    const weekEndStr = toLocalDateString(weekEnd);

    const weekSessions = sessions.filter(
      (s) =>
        s.completed_at &&
        toLocalDateString(new Date(s.completed_at)) >= weekStartStr &&
        toLocalDateString(new Date(s.completed_at)) <= weekEndStr
    );

    const catCounts: Record<string, number> = Object.fromEntries(categories.map(c => [c.id, 0]));
    let totalMinutes = 0;
    const dailyCounts: Record<string, number> = {};

    for (const s of weekSessions) {
      catCounts[s.category]++;
      totalMinutes += s.duration_minutes;
      const day = toLocalDateString(new Date(s.completed_at!));
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    const activeDays = Object.keys(dailyCounts).length;
    const totalSessions = weekSessions.length;

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      weekStartDate: weekStart,
      sessions: weekSessions,
      catCounts,
      totalMinutes,
      totalSessions,
      activeDays,
      dailyCounts,
    };
  };

  const thisWeek = useMemo(() => getWeekData(weekOffset), [sessions, weekOffset, categories]);
  const prevWeek = useMemo(() => getWeekData(weekOffset - 1), [sessions, weekOffset, categories]);

  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const getDelta = (current: number, previous: number): { text: string; positive: boolean | null } => {
    if (previous === 0 && current === 0) return { text: "—", positive: null };
    if (previous === 0) return { text: `+${current}`, positive: true };
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    if (diff > 0) return { text: `+${diff} (${pct}%)`, positive: true };
    if (diff < 0) return { text: `${diff} (${pct}%)`, positive: false };
    return { text: "Same", positive: null };
  };

  const copyReport = async () => {
    const text = generateWeeklyReport();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Focus Garden - Weekly Report", text });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    navigator.clipboard.writeText(text);
    showToast({ emoji: "📋", title: "Report copied!", type: "success" });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📅</div>
      </div>
    );
  }

  const sessionsDelta = getDelta(thisWeek.totalSessions, prevWeek.totalSessions);
  const minutesDelta = getDelta(thisWeek.totalMinutes, prevWeek.totalMinutes);

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header with week navigation */}
        <div className="animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Weekly Review</h1>
            <p className="text-sm text-muted">
              {formatWeekRange(thisWeek.weekStart, thisWeek.weekEnd)}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="px-3 py-1.5 rounded-lg border border-card-border text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              ‹
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 rounded-lg border border-card-border text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Current Week
              </button>
            )}
            <button
              onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
              disabled={weekOffset >= 0}
              className={`px-3 py-1.5 rounded-lg border border-card-border text-sm ${
                weekOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              ›
            </button>
          </div>
        </div>

        {/* Week Comparison */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="text-center">
            <div className="text-3xl font-bold">{thisWeek.totalSessions}</div>
            <div className="text-xs text-muted mb-1">Sessions</div>
            <div className={`text-xs font-medium ${
              sessionsDelta.positive === true ? "text-green-600" : sessionsDelta.positive === false ? "text-red-500" : "text-muted"
            }`}>
              {sessionsDelta.positive === true ? "↑" : sessionsDelta.positive === false ? "↓" : ""} {sessionsDelta.text}
            </div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold">{formatMinutes(thisWeek.totalMinutes)}</div>
            <div className="text-xs text-muted mb-1">Focus Time</div>
            <div className={`text-xs font-medium ${
              minutesDelta.positive === true ? "text-green-600" : minutesDelta.positive === false ? "text-red-500" : "text-muted"
            }`}>
              {minutesDelta.positive === true ? "↑" : minutesDelta.positive === false ? "↓" : ""} {minutesDelta.text}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <Card className="text-center">
            <div className="text-3xl font-bold">{thisWeek.activeDays}</div>
            <div className="text-xs text-muted">Active Days</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold">
              {thisWeek.totalSessions > 0
                ? Math.round(thisWeek.totalMinutes / thisWeek.totalSessions)
                : 0}m
            </div>
            <div className="text-xs text-muted">Avg/Session</div>
          </Card>
        </div>

        {/* Garden Snapshot */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Garden</h2>
          <div className="flex justify-around py-4 bg-gradient-to-b from-sky-50 to-green-50 dark:from-sky-900/20 dark:to-green-900/20 rounded-xl">
            {categories.map((cat) => {
              const count = thisWeek.catCounts[cat.id] || 0;
              return (
                <div key={cat.id} className="flex flex-col items-center gap-1">
                  <div className={`text-3xl ${count > 0 ? "animate-sway" : "opacity-30"}`}>
                    {getPlantEmoji(cat.emoji, count)}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: count > 0 ? cat.color : "#9ca3af" }}>
                    {count} 💧
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Category Progress */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Category Progress</h2>
          <div className="space-y-2.5">
            {categories.map((cat) => {
              const current = thisWeek.catCounts[cat.id] || 0;
              const target = settings.weeklyTargets[cat.id];
              const isComplete = current >= target;
              const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-lg w-7">{cat.emoji}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isComplete ? "#22c55e" : cat.color,
                        }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs w-12 text-right ${isComplete ? "text-green-600 font-medium" : "text-muted"}`}>
                    {current}/{target}{isComplete ? " ✅" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Daily Breakdown */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Daily Breakdown</h2>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(thisWeek.weekStart + "T00:00:00");
              d.setDate(d.getDate() + i);
              const dateStr = toLocalDateString(d);
              const count = thisWeek.dailyCounts[dateStr] || 0;
              const maxCount = Math.max(...Object.values(thisWeek.dailyCounts), 1);
              const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = d.getDate();
              const isToday = dateStr === toLocalDateString(new Date());

              // Get sessions for this day by category
              const daySessions = thisWeek.sessions.filter(
                (s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === dateStr
              );
              const dayCatCounts: Record<string, number> = {};
              for (const s of daySessions) {
                dayCatCounts[s.category] = (dayCatCounts[s.category] || 0) + 1;
              }

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-12 text-right ${isToday ? "font-bold text-green-600 dark:text-green-400" : "text-muted"}`}>
                    <div className="text-xs">{dayName}</div>
                    <div className="text-[10px]">{dayNum}</div>
                  </div>
                  <div className="flex-1">
                    {count > 0 ? (
                      <div className="flex gap-0.5 h-6">
                        {categories.map((cat) => {
                          const catCount = dayCatCounts[cat.id] || 0;
                          if (catCount === 0) return null;
                          const width = (catCount / maxCount) * 100;
                          return (
                            <div
                              key={cat.id}
                              className="h-full rounded transition-all"
                              style={{
                                width: `${width}%`,
                                backgroundColor: cat.color,
                                minWidth: "16px",
                              }}
                              title={`${cat.label}: ${catCount}`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-6 flex items-center">
                        <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800" />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs w-6 text-right ${count > 0 ? "font-medium" : "text-muted"}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-card-border">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                <span className="text-[9px] text-muted">{cat.label.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Highlights */}
        <Card className="animate-fade-in bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-800" style={{ animationDelay: "0.35s" }}>
          <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Highlights</h2>
          <div className="space-y-1.5 text-sm text-green-600 dark:text-green-400">
            {(() => {
              const highlights: string[] = [];
              const completedCats = categories.filter(
                (c) => thisWeek.catCounts[c.id] >= settings.weeklyTargets[c.id]
              );
              if (completedCats.length > 0) {
                highlights.push(
                  `${completedCats.map((c) => c.emoji).join("")} ${completedCats.length} target${completedCats.length > 1 ? "s" : ""} hit!`
                );
              }
              if (thisWeek.totalSessions > prevWeek.totalSessions && prevWeek.totalSessions > 0) {
                highlights.push(`📈 ${thisWeek.totalSessions - prevWeek.totalSessions} more sessions than last week`);
              }
              if (thisWeek.activeDays >= 7) {
                highlights.push("🌟 Active every day this week!");
              } else if (thisWeek.activeDays >= 5) {
                highlights.push(`⭐ Active ${thisWeek.activeDays} out of 7 days`);
              }
              if (thisWeek.totalMinutes >= 300) {
                highlights.push(`💪 Over 5 hours of focused time!`);
              }
              if (highlights.length === 0) {
                highlights.push("Start logging sessions to see highlights!");
              }
              return highlights.map((h, i) => <p key={i}>{h}</p>);
            })()}
          </div>
        </Card>

        {/* Share */}
        {weekOffset === 0 && (
          <Button onClick={copyReport} className="w-full animate-fade-in" style={{ animationDelay: "0.4s" }}>
            📤 Share Weekly Report
          </Button>
        )}
      </div>
    </div>
  );
}
