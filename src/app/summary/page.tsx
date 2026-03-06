"use client";

import { useState, useEffect, useMemo } from "react";
import { CategoryId, Session } from "@/types";
import {
  CATEGORIES,
  CATEGORY_LIST,
  getPlantEmoji,
} from "@/lib/constants";
import {
  getTodaySessions,
  getWeekSessions,
  getWeekCategorySessions,
  getProblems,
  getCategoryMinutes,
  getStreakData,
  generateWeeklyReport,
  deleteSession,
  getSessions,
  getSettings,
} from "@/lib/store";
import { formatMinutes, toLocalDateString } from "@/lib/utils";
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

type ViewMode = "today" | "week";

export default function SummaryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);
  const [weekCounts, setWeekCounts] = useState<Record<CategoryId, number>>({
    coding: 0, ai: 0, baby: 0, fitness: 0, reading: 0, spiritual: 0,
  });
  const [solvedCount, setSolvedCount] = useState(0);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setTodaySessions(getTodaySessions());
    setWeekSessions(getWeekSessions());
    setWeekCounts(getWeekCategorySessions());
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

  const handleShareReport = () => {
    const text = generateWeeklyReport();
    navigator.clipboard.writeText(text);
    showToast({ emoji: "📋", title: "Weekly report copied!", description: "Paste it anywhere to share", type: "success" });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📊</div>
      </div>
    );
  }

  const sessions = viewMode === "today" ? todaySessions : weekSessions;
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

  const missingCategories = CATEGORY_LIST.filter((cat) => !categoryCounts[cat.id]);

  // Suggestions
  const suggestions: string[] = [];
  if (viewMode === "today") {
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
    for (const cat of CATEGORY_LIST) {
      const count = weekCounts[cat.id] || 0;
      const target = settings.weeklyTargets[cat.id];
      if (count >= target) suggestions.push(`${cat.emoji} ${cat.label} target reached! (${count}/${target})`);
      else if (count < target * 0.3) suggestions.push(`${cat.emoji} ${cat.label} needs attention - only ${count}/${target} sessions this week.`);
    }
    if (solvedCount > 0) suggestions.push(`💻 Blind 75 progress: ${solvedCount}/75 (${Math.round((solvedCount / 75) * 100)}%) - keep going!`);
  }

  // Chart data
  const pieData = CATEGORY_LIST
    .filter((cat) => (categoryMinutes[cat.id] || 0) > 0)
    .map((cat) => ({
      name: cat.label,
      value: categoryMinutes[cat.id] || 0,
      color: cat.color,
      emoji: cat.emoji,
    }));

  const barSettings = getSettings();
  const barData = CATEGORY_LIST.map((cat) => ({
    name: cat.emoji,
    sessions: categoryCounts[cat.id] || 0,
    target: barSettings.weeklyTargets[cat.id],
    fill: cat.color,
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

        {/* View Toggle */}
        <div className="flex gap-2 animate-fade-in">
          <button
            onClick={() => setViewMode("today")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === "today" ? "bg-foreground text-background" : "bg-gray-100 dark:bg-gray-800 text-muted hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === "week" ? "bg-foreground text-background" : "bg-gray-100 dark:bg-gray-800 text-muted hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            This Week
          </button>
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
            <div className="text-xl font-bold">{Object.keys(categoryCounts).length}/6</div>
            <div className="text-[10px] text-muted">Categories</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xl font-bold">{streakCurrent}🔥</div>
            <div className="text-[10px] text-muted">Streak</div>
          </Card>
        </div>

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
        {viewMode === "week" && (
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
                  fill="#e5e7eb"
                  radius={[4, 4, 0, 0]}
                  name="Target"
                />
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
              {CATEGORY_LIST.map((cat) => {
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
            {viewMode === "today" ? "Today's" : "This Week's"} Garden
          </h2>
          <div className="flex justify-around py-4 bg-gradient-to-b from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-xl">
            {CATEGORY_LIST.map((cat) => {
              const count = viewMode === "today" ? categoryCounts[cat.id] || 0 : weekCounts[cat.id];
              return (
                <div key={cat.id} className="flex flex-col items-center gap-1">
                  <div className={`text-3xl ${count > 0 ? "animate-sway" : "opacity-40"}`}>
                    {getPlantEmoji(cat.id, count)}
                  </div>
                  <div className="text-[10px] font-medium">{cat.label.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weekly Targets */}
        {viewMode === "week" && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <h2 className="text-sm font-semibold text-muted mb-3">Weekly Targets</h2>
            <div className="space-y-2">
              {CATEGORY_LIST.map((cat) => {
                const count = weekCounts[cat.id];
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
        {viewMode === "week" && sessions.length > 0 && (
          <SmartInsights sessions={weekSessions} weekCounts={weekCounts} />
        )}

        {/* Session Log */}
        {sessions.length > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <h2 className="text-sm font-semibold text-muted mb-3">Session Log</h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {[...sessions].reverse().map((session) => {
                const cat = CATEGORIES[session.category];
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

        {/* Family Meeting Report (week view) */}
        {viewMode === "week" && sessions.length > 0 && (
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
                      Most focused on: {CATEGORIES[topCategory as CategoryId]?.emoji}{" "}
                      {CATEGORIES[topCategory as CategoryId]?.label} ({topCount} sessions)
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
                    {Object.keys(categoryCounts).length}/6 life categories active
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
                  {CATEGORY_LIST.map((cat) => {
                    const count = weekCounts[cat.id];
                    return (
                      <div key={cat.id} className="flex flex-col items-center gap-0.5">
                        <span className={`text-2xl ${count > 0 ? "animate-sway" : "opacity-30"}`}>
                          {getPlantEmoji(cat.id, count)}
                        </span>
                        <span className="text-[9px] text-muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Share button */}
              <Button onClick={handleShareReport} className="w-full" size="sm">
                📋 Copy Report for Family Meeting
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
}: {
  sessions: Session[];
  weekCounts: Record<CategoryId, number>;
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

    if (activeCats >= 6) {
      result.push({ icon: "🌈", title: "Well-Rounded", detail: "You practiced all 6 categories this week! Great balance across life pillars.", type: "positive" });
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
    const completed = CATEGORY_LIST.filter((c) => weekCounts[c.id] >= settings.weeklyTargets[c.id]).length;
    if (completed === 6) {
      result.push({ icon: "🏆", title: "All Targets Met!", detail: "Every category hit its weekly target. You're in full bloom!", type: "positive" });
    } else if (completed >= 4) {
      result.push({ icon: "🎯", title: `${completed}/6 Targets Met`, detail: `Almost there! Focus on ${CATEGORY_LIST.filter((c) => weekCounts[c.id] < settings.weeklyTargets[c.id]).map((c) => c.emoji).join("")} to complete the set.`, type: "neutral" });
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
  }, [sessions, weekCounts]);

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
