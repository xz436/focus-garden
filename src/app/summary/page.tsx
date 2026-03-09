"use client";

import { useState, useEffect, useMemo } from "react";
import { Category, Session } from "@/types";
import {
  getPlantEmoji,
  getDailyBabyActivities,
  BabyActivity,
} from "@/lib/constants";
import {
  getTodaySessions,
  getWeekSessions,
  getWeekCategorySessions,
  getProblems,
  getCategoryMinutes,
  getStreakData,
  generateWeeklyReport,
  generateDailyReport,
  deleteSession,
  getSessions,
  getSettings,
  getCategories,
  getCategoryMap,
  getBabyLog,
} from "@/lib/store";
import { formatMinutes, toLocalDateString, getToday, getWeekStart } from "@/lib/utils";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type RangePreset = "today" | "week" | "last_week" | "month" | "last_30" | "custom";

function getPresetRange(preset: RangePreset): { start: string; end: string; label: string } {
  const today = getToday();
  const todayDate = new Date();

  switch (preset) {
    case "today":
      return { start: today, end: today, label: "Today" };
    case "week": {
      const ws = getWeekStart();
      const we = new Date(ws + "T00:00:00");
      we.setDate(we.getDate() + 6);
      return { start: ws, end: toLocalDateString(we), label: "This Week" };
    }
    case "last_week": {
      const ws = getWeekStart();
      const lws = new Date(ws + "T00:00:00");
      lws.setDate(lws.getDate() - 7);
      const lwe = new Date(lws);
      lwe.setDate(lwe.getDate() + 6);
      return { start: toLocalDateString(lws), end: toLocalDateString(lwe), label: "Last Week" };
    }
    case "month": {
      const ms = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
      return { start: toLocalDateString(ms), end: today, label: "This Month" };
    }
    case "last_30": {
      const d30 = new Date(todayDate);
      d30.setDate(d30.getDate() - 29);
      return { start: toLocalDateString(d30), end: today, label: "Last 30 Days" };
    }
    default:
      return { start: today, end: today, label: "Custom" };
  }
}

export default function SummaryPage() {
  const [rangePreset, setRangePreset] = useState<RangePreset>("week");
  const [customStart, setCustomStart] = useState(getToday());
  const [customEnd, setCustomEnd] = useState(getToday());
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [solvedCount, setSolvedCount] = useState(0);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [babyActivities, setBabyActivities] = useState<BabyActivity[]>([]);
  const [babyCompletedIds, setBabyCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    const cats = getCategories();
    setCategories(cats);
    setCategoryMap(getCategoryMap());
    setAllSessions(getSessions());
    const problems = getProblems();
    setSolvedCount(problems.filter((p) => p.status === "solved").length);
    setStreakCurrent(getStreakData().current);

    // Load baby activity data
    const settings = getSettings();
    if (settings.babyBirthdate) {
      const birth = new Date(settings.babyBirthdate + "T00:00:00");
      const now = new Date();
      const ageMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth()) +
        (now.getDate() < birth.getDate() ? -1 : 0);
      const acts = getDailyBabyActivities(ageMonths, 5);
      setBabyActivities(acts);

      const log = getBabyLog(getToday());
      if (log) {
        setBabyCompletedIds(
          new Set(log.activities.filter((a) => a.completed).map((a) => a.activityId))
        );
      }
    }
  }, []);

  const loadData = () => {
    setAllSessions(getSessions());
    const problems = getProblems();
    setSolvedCount(problems.filter((p) => p.status === "solved").length);
    setStreakCurrent(getStreakData().current);
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

  const handleShareReport = async () => {
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
    showToast({ emoji: "📋", title: "Weekly report copied!", description: "Paste it anywhere to share", type: "success" });
  };

  const handleShareDaily = async () => {
    const text = generateDailyReport();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Focus Garden - Daily Progress", text });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    navigator.clipboard.writeText(text);
    showToast({ emoji: "📋", title: "Daily progress copied!", description: "Paste it anywhere to share", type: "success" });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📊</div>
      </div>
    );
  }

  // Compute date range
  const range = rangePreset === "custom"
    ? { start: customStart, end: customEnd, label: `${customStart} – ${customEnd}` }
    : getPresetRange(rangePreset);

  // Filter sessions by range
  const sessions = allSessions.filter((s) => {
    if (!s.completed_at) return false;
    const d = toLocalDateString(new Date(s.completed_at));
    return d >= range.start && d <= range.end;
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const categoryMinutes = getCategoryMinutes(sessions);

  const categoryCounts: Record<string, number> = {};
  for (const s of sessions) {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  }

  let topCategory = "";
  let topCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > topCount) { topCategory = cat; topCount = count; }
  }

  const missingCategories = categories.filter((cat) => !categoryCounts[cat.id]);

  // Suggestions
  const suggestions: string[] = [];
  if (rangePreset === "today") {
    if (sessions.length === 0) {
      suggestions.push("🌱 You haven't started any sessions today. Every journey begins with one step!");
    } else {
      if (!categoryCounts["baby"]) suggestions.push("🌷 Don't forget to spend some quality time with your little one today!");
      if (!categoryCounts["spiritual"]) suggestions.push("🪻 A moment of reflection and Bible reading can set a peaceful tone for your day.");
      if (!categoryCounts["fitness"]) suggestions.push("🌿 A short workout or walk can boost your energy for coding sessions!");
      if ((categoryCounts["coding"] || 0) >= 3) suggestions.push("🌵 Great coding focus today! Consider mixing in some AI learning for variety.");
      if (sessions.length >= 5) suggestions.push("🎉 Amazing productivity! You've completed 5+ sessions today. Remember to rest well!");
    }
  } else {
    const settings = getSettings();
    for (const cat of categories) {
      const count = categoryCounts[cat.id] || 0;
      const target = settings.weeklyTargets[cat.id];
      if (count >= target) suggestions.push(`${cat.emoji} ${cat.label} target reached! (${count}/${target})`);
      else if (count < target * 0.3) suggestions.push(`${cat.emoji} ${cat.label} needs attention - only ${count}/${target} sessions this week.`);
    }
    if (solvedCount > 0) suggestions.push(`💻 Blind 75 progress: ${solvedCount}/75 (${Math.round((solvedCount / 75) * 100)}%) - keep going!`);
  }

  // Chart data
  const pieData = categories
    .filter((cat) => (categoryMinutes[cat.id] || 0) > 0)
    .map((cat) => ({
      name: cat.label,
      value: categoryMinutes[cat.id] || 0,
      color: cat.color,
      emoji: cat.emoji,
    }));

  const barSettings = getSettings();
  const barData = categories.map((cat) => ({
    name: cat.emoji,
    sessions: categoryCounts[cat.id] || 0,
    target: barSettings.weeklyTargets[cat.id],
    fill: cat.color,
    targetFill: `${cat.color}30`,
  }));

  const maxMinutes = Math.max(...Object.values(categoryMinutes), 1);

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Summary</h1>
          <p className="text-sm text-muted">Review your progress</p>
        </div>

        {/* Date Range Selector */}
        <div className="space-y-2 animate-fade-in">
          <div className="flex flex-wrap gap-1.5">
            {([
              { key: "today" as RangePreset, label: "Today" },
              { key: "week" as RangePreset, label: "This Week" },
              { key: "last_week" as RangePreset, label: "Last Week" },
              { key: "month" as RangePreset, label: "This Month" },
              { key: "last_30" as RangePreset, label: "Last 30 Days" },
              { key: "custom" as RangePreset, label: "Custom" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangePreset(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  rangePreset === opt.key
                    ? "bg-foreground text-background"
                    : "bg-gray-100 dark:bg-gray-800 text-muted hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {rangePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-card-border bg-background text-xs focus:outline-none focus:border-green-400"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-card-border bg-background text-xs focus:outline-none focus:border-green-400"
              />
            </div>
          )}
          {rangePreset !== "today" && rangePreset !== "custom" && (
            <p className="text-[10px] text-muted">
              {(() => {
                const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return range.start === range.end ? fmt(range.start) : `${fmt(range.start)} – ${fmt(range.end)}`;
              })()} · {sessions.length} sessions
            </p>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="text-center p-3">
            <div className="text-xl font-bold">{sessions.length}</div>
            <div className="text-[10px] text-muted">Sessions</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xl font-bold">{formatMinutes(totalMinutes)}</div>
            <div className="text-[10px] text-muted">Focus</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xl font-bold">{Object.keys(categoryCounts).length}/{categories.length}</div>
            <div className="text-[10px] text-muted">Categories</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xl font-bold">{streakCurrent}🔥</div>
            <div className="text-[10px] text-muted">Streak</div>
          </Card>
        </div>

        {/* Baby Activities Progress (today view) */}
        {rangePreset === "today" && babyActivities.length > 0 && (
          <Card className="animate-fade-in border-pink-100 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/20" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌷</span>
                <h2 className="text-sm font-semibold text-pink-700 dark:text-pink-400">Baby Activities</h2>
              </div>
              <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                {babyCompletedIds.size}/{babyActivities.length} done
              </span>
            </div>
            <div className="h-2 rounded-full bg-pink-100 dark:bg-pink-900/40 overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-pink-500 transition-all duration-500"
                style={{ width: `${(babyCompletedIds.size / babyActivities.length) * 100}%` }}
              />
            </div>
            <div className="space-y-1">
              {babyActivities.map((activity) => {
                const isDone = babyCompletedIds.has(activity.id);
                return (
                  <div key={activity.id} className="flex items-center gap-2 text-sm">
                    <span className={isDone ? "text-green-500" : "text-gray-300 dark:text-gray-600"}>
                      {isDone ? "✓" : "○"}
                    </span>
                    <span className="text-xs">{activity.emoji}</span>
                    <span className={`text-xs ${isDone ? "line-through text-muted" : ""}`}>
                      {activity.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Pie Chart - Time Distribution */}
        {totalMinutes > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-sm font-semibold text-muted mb-2">
              Time Distribution
            </h2>
            <div className="flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMinutes(Number(value))}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--card-border)",
                        fontSize: "12px",
                        backgroundColor: "var(--card)",
                        color: "var(--foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs flex-1 truncate">
                      {item.emoji} {item.name}
                    </span>
                    <span className="text-xs text-muted">
                      {formatMinutes(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Bar Chart - Sessions by Category (week view) */}
        {rangePreset !== "today" && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <h2 className="text-sm font-semibold text-muted mb-2">
              Sessions vs Targets
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={2}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 16 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--card-border)",
                    fontSize: "12px",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="target"
                  radius={[4, 4, 0, 0]}
                  name="Target"
                >
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.targetFill} />
                  ))}
                </Bar>
                <Bar
                  dataKey="sessions"
                  radius={[4, 4, 0, 0]}
                  name="Actual"
                >
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Time bars fallback / always show */}
        {totalMinutes > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-sm font-semibold text-muted mb-3">
              Detailed Breakdown
            </h2>
            <div className="space-y-3">
              {categories.map((cat) => {
                const mins = categoryMinutes[cat.id] || 0;
                const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{cat.emoji} {cat.label}</span>
                      <span className="text-xs text-muted">{formatMinutes(mins)} ({pct}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(mins / maxMinutes) * 100}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Garden Preview */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            {range.label} Garden
          </h2>
          <div className="flex justify-around py-4 bg-gradient-to-b from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-xl">
            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              return (
                <div key={cat.id} className="flex flex-col items-center gap-1">
                  <div className={`text-3xl ${count > 0 ? "animate-sway" : "opacity-40"}`}>
                    {getPlantEmoji(cat.emoji, count)}
                  </div>
                  <div className="text-[10px] font-medium">{cat.label.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weekly Targets */}
        {rangePreset !== "today" && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <h2 className="text-sm font-semibold text-muted mb-3">Weekly Targets</h2>
            <div className="space-y-2">
              {categories.map((cat) => {
                const count = categoryCounts[cat.id];
                const target = barSettings.weeklyTargets[cat.id];
                const isComplete = count >= target;
                return (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-sm w-5">{cat.emoji}</span>
                    <div className="flex-1">
                      <ProgressBar value={count} max={target} color={isComplete ? "#22c55e" : cat.color} size="sm" />
                    </div>
                    {isComplete && <span className="text-xs">✅</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Card className="animate-fade-in border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800" style={{ animationDelay: "0.45s" }}>
            <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">💡 Suggestions</h2>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <p key={idx} className="text-sm text-blue-600 dark:text-blue-400">{suggestion}</p>
              ))}
            </div>
          </Card>
        )}

        {/* Smart Insights */}
        {rangePreset !== "today" && sessions.length > 0 && (
          <SmartInsights sessions={sessions} weekCounts={categoryCounts} categories={categories} />
        )}

        {/* Session Log */}
        {sessions.length > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <h2 className="text-sm font-semibold text-muted mb-3">Session Log</h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {[...sessions].reverse().map((session) => {
                const cat = categoryMap[session.category];
                const time = new Date(session.completed_at!);
                return (
                  <div key={session.id} className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm group">
                    <span>{cat?.emoji}</span>
                    <span className="flex-1 truncate">{session.notes || cat?.label}</span>
                    <span className="text-xs text-muted">{session.duration_minutes}m</span>
                    <span className="text-xs text-muted">
                      {time.toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className={`text-xs px-1.5 py-0.5 rounded-lg transition-all ${
                        confirmDelete === session.id
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium"
                          : "text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                      }`}
                    >
                      {confirmDelete === session.id ? "Confirm?" : "×"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Share Today's Progress */}
        {rangePreset === "today" && sessions.length > 0 && (
          <Button onClick={handleShareDaily} className="w-full animate-fade-in" size="sm" variant="secondary" style={{ animationDelay: "0.55s" }}>
            📤 Share Today&apos;s Progress
          </Button>
        )}

        {/* Family Meeting Report (week view) */}
        {rangePreset !== "today" && sessions.length > 0 && (
          <Card className="animate-fade-in border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30" style={{ animationDelay: "0.6s" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📋</span>
              <div>
                <h2 className="text-base font-bold text-purple-800 dark:text-purple-300">Family Meeting Report</h2>
                <p className="text-xs text-purple-500 dark:text-purple-400">
                  Week of {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {/* Pie chart in report */}
              {pieData.length > 0 && (
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3">
                  <h3 className="font-medium text-purple-700 dark:text-purple-400 text-xs mb-2">TIME DISTRIBUTION</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                        label={false}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3">
                <h3 className="font-medium text-purple-700 dark:text-purple-400 text-xs mb-2">HIGHLIGHTS</h3>
                <ul className="space-y-1.5">
                  {topCategory && (
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">●</span>
                      Most focused on: {categoryMap[topCategory]?.emoji}{" "}
                      {categoryMap[topCategory]?.label} ({topCount} sessions)
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">●</span>
                    Total focus time: {formatMinutes(totalMinutes)}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">●</span>
                    Blind 75: {solvedCount}/75 ({Math.round((solvedCount / 75) * 100)}%)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">●</span>
                    {Object.keys(categoryCounts).length}/{categories.length} life categories active
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500">●</span>
                    Current streak: {streakCurrent} days 🔥
                  </li>
                </ul>
              </div>

              {missingCategories.length > 0 && (
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3">
                  <h3 className="font-medium text-purple-700 dark:text-purple-400 text-xs mb-2">NEEDS ATTENTION</h3>
                  <ul className="space-y-1">
                    {missingCategories.map((cat) => (
                      <li key={cat.id} className="flex items-center gap-2">
                        <span className="text-red-400">●</span>
                        {cat.emoji} {cat.label} - no sessions this week
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3">
                <h3 className="font-medium text-purple-700 dark:text-purple-400 text-xs mb-2">THIS WEEK&apos;S GARDEN</h3>
                <div className="flex justify-around py-3">
                  {categories.map((cat) => {
                    const count = categoryCounts[cat.id];
                    return (
                      <div key={cat.id} className="flex flex-col items-center gap-0.5">
                        <span className={`text-2xl ${count > 0 ? "animate-sway" : "opacity-30"}`}>
                          {getPlantEmoji(cat.emoji, count)}
                        </span>
                        <span className="text-[9px] text-muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Share button */}
              <Button onClick={handleShareReport} className="w-full" size="sm">
                📤 Share Weekly Report
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Smart Insights Component
function SmartInsights({
  sessions,
  weekCounts,
  categories,
}: {
  sessions: Session[];
  weekCounts: Record<string, number>;
  categories: Category[];
}) {
  const insights = useMemo(() => {
    const result: { icon: string; title: string; detail: string; type: "positive" | "neutral" | "action" }[] = [];
    const settings = getSettings();
    const allSessions = getSessions();

    // Consistency analysis
    const dayMap: Record<string, number> = {};
    for (const s of sessions) {
      if (!s.completed_at) continue;
      const day = toLocalDateString(new Date(s.completed_at));
      dayMap[day] = (dayMap[day] || 0) + 1;
    }
    const activeDays = Object.keys(dayMap).length;

    if (activeDays >= 7) {
      result.push({ icon: "🌟", title: "Perfect Consistency", detail: "You were active every day this week! Consistency is the key to growth.", type: "positive" });
    } else if (activeDays >= 5) {
      result.push({ icon: "⭐", title: "Strong Consistency", detail: `Active ${activeDays}/7 days. Just ${7 - activeDays} more for a perfect week!`, type: "positive" });
    } else if (activeDays > 0) {
      result.push({ icon: "📅", title: "Room to Grow", detail: `Active ${activeDays}/7 days. Try to log at least one session each day.`, type: "action" });
    }

    // Time distribution balance
    const catMinutes: Record<string, number> = {};
    for (const s of sessions) {
      catMinutes[s.category] = (catMinutes[s.category] || 0) + s.duration_minutes;
    }
    const totalMin = Object.values(catMinutes).reduce((a, b) => a + b, 0);
    const activeCats = Object.keys(catMinutes).length;

    if (activeCats >= categories.length) {
      result.push({ icon: "🌈", title: "Well-Rounded", detail: `You practiced all ${categories.length} categories this week! Great balance across life pillars.`, type: "positive" });
    } else if (activeCats <= 2 && sessions.length > 5) {
      result.push({ icon: "⚖️", title: "Consider Balance", detail: `You focused on ${activeCats} categories. Try spreading across more pillars for holistic growth.`, type: "action" });
    }

    // Peak productivity analysis
    const hourCounts: Record<number, number> = {};
    for (const s of sessions) {
      if (!s.completed_at) continue;
      const h = new Date(s.completed_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
    const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
    if (peakHour) {
      const h = Number(peakHour[0]);
      const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
      const timeOfDay = h < 6 ? "an early bird" : h < 12 ? "a morning person" : h < 18 ? "an afternoon focuser" : "a night owl";
      result.push({ icon: "⏰", title: `Peak: ${label}`, detail: `You're ${timeOfDay}! Schedule your hardest tasks around this time.`, type: "neutral" });
    }

    // Target completion rate
    const completed = categories.filter((c) => weekCounts[c.id] >= settings.weeklyTargets[c.id]).length;
    if (completed === categories.length) {
      result.push({ icon: "🏆", title: "All Targets Met!", detail: "Every category hit its weekly target. You're in full bloom!", type: "positive" });
    } else if (completed >= 4) {
      result.push({ icon: "🎯", title: `${completed}/${categories.length} Targets Met`, detail: `Almost there! Focus on ${categories.filter((c) => weekCounts[c.id] < settings.weeklyTargets[c.id]).map((c) => c.emoji).join("")} to complete the set.`, type: "neutral" });
    }

    // Average session length
    if (sessions.length > 0) {
      const avgDuration = Math.round(totalMin / sessions.length);
      if (avgDuration >= 45) {
        result.push({ icon: "🧘", title: "Deep Focus", detail: `Average session: ${avgDuration}min. You excel at sustained concentration.`, type: "positive" });
      } else if (avgDuration <= 15) {
        result.push({ icon: "⚡", title: "Quick Sessions", detail: `Average: ${avgDuration}min. Consider longer sessions for deeper work.`, type: "action" });
      }
    }

    // Growth trend (compare with previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = allSessions.filter((s) => s.completed_at && new Date(s.completed_at) >= thirtyDaysAgo);
    const first15 = recentSessions.filter((s) => {
      const d = new Date(s.completed_at!);
      return d < new Date(thirtyDaysAgo.getTime() + 15 * 86400000);
    });
    const last15 = recentSessions.filter((s) => {
      const d = new Date(s.completed_at!);
      return d >= new Date(thirtyDaysAgo.getTime() + 15 * 86400000);
    });
    if (first15.length > 0 && last15.length > first15.length * 1.2) {
      result.push({ icon: "📈", title: "Upward Trend", detail: "Your activity is increasing! You logged more sessions in the last 2 weeks vs the prior 2.", type: "positive" });
    }

    return result;
  }, [sessions, weekCounts, categories]);

  if (insights.length === 0) return null;

  return (
    <Card className="animate-fade-in bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-800" style={{ animationDelay: "0.47s" }}>
      <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-3">🧠 Smart Insights</h2>
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{insight.icon}</span>
            <div>
              <div className="text-sm font-semibold">{insight.title}</div>
              <div className="text-xs text-muted leading-relaxed">{insight.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
