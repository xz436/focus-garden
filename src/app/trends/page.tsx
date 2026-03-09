"use client";

import { useState, useEffect, useMemo } from "react";
import { Category, Session } from "@/types";
import { getSessions, getCategories } from "@/lib/store";
import { formatMinutes, toLocalDateString } from "@/lib/utils";
import Card from "@/components/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export default function TrendsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSessions(getSessions());
    setCategories(getCategories());
  }, []);

  // Build daily data for last 30 days
  const dailyData = useMemo(() => {
    const days: { date: string; label: string; total: number; categories: Record<string, number>; minutes: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateString(d);
      const daySessions = sessions.filter((s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === dateStr);
      const cats: Record<string, number> = Object.fromEntries(categories.map(c => [c.id, 0]));
      let totalMinutes = 0;
      for (const s of daySessions) {
        cats[s.category] = (cats[s.category] || 0) + 1;
        totalMinutes += s.duration_minutes;
      }
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: daySessions.length,
        categories: cats as Record<string, number>,
        minutes: totalMinutes,
      });
    }
    return days;
  }, [sessions, categories]);

  // Day of week patterns
  const dayOfWeekData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const weekCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const s of sessions) {
      if (!s.completed_at) continue;
      const d = new Date(s.completed_at);
      const dow = (d.getDay() + 6) % 7; // Monday = 0
      counts[dow]++;
    }
    // Get number of each day in the last 90 days
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dow = (d.getDay() + 6) % 7;
      weekCounts[dow]++;
    }
    return days.map((name, i) => ({
      name,
      avg: weekCounts[i] > 0 ? Math.round((counts[i] / weekCounts[i]) * 10) / 10 : 0,
      total: counts[i],
    }));
  }, [sessions]);

  // Time of day patterns
  const hourData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`,
      count: 0,
    }));
    for (const s of sessions) {
      if (!s.completed_at) continue;
      const h = new Date(s.completed_at).getHours();
      hours[h].count++;
    }
    return hours;
  }, [sessions]);

  // Moving average (7-day)
  const movingAvg = useMemo(() => {
    return dailyData.map((day, i) => {
      const start = Math.max(0, i - 6);
      const window = dailyData.slice(start, i + 1);
      const avg = window.reduce((sum, d) => sum + d.total, 0) / window.length;
      return { ...day, avg: Math.round(avg * 10) / 10 };
    });
  }, [dailyData]);

  // Best day
  const bestDay = useMemo(() => {
    return dailyData.reduce((best, day) => day.total > best.total ? day : best, dailyData[0]);
  }, [dailyData]);

  // Average per day
  const avgPerDay = useMemo(() => {
    const activeDays = dailyData.filter((d) => d.total > 0).length;
    const total = dailyData.reduce((sum, d) => sum + d.total, 0);
    return activeDays > 0 ? Math.round((total / activeDays) * 10) / 10 : 0;
  }, [dailyData]);

  // Total in period
  const totalInPeriod = dailyData.reduce((sum, d) => sum + d.total, 0);
  const totalMinutesInPeriod = dailyData.reduce((sum, d) => sum + d.minutes, 0);

  // Peak hour
  const peakHour = hourData.reduce((best, h) => h.count > best.count ? h : best, hourData[0]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📈</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Trends</h1>
          <p className="text-sm text-muted">Last 30 days of activity</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="text-center p-3">
            <div className="text-lg font-bold">{totalInPeriod}</div>
            <div className="text-[9px] text-muted">Sessions</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-lg font-bold">{formatMinutes(totalMinutesInPeriod)}</div>
            <div className="text-[9px] text-muted">Focus</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-lg font-bold">{avgPerDay}</div>
            <div className="text-[9px] text-muted">Avg/Day</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-lg font-bold">{peakHour.label}</div>
            <div className="text-[9px] text-muted">Peak Hour</div>
          </Card>
        </div>

        {/* Session Trend Line */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Daily Sessions (30 Days)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={movingAvg}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                width={20}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid var(--card-border)", fontSize: "12px", backgroundColor: "var(--card)", color: "var(--foreground)" }}
                formatter={(value, name) => [
                  name === "avg" ? Number(value).toFixed(1) : value,
                  name === "avg" ? "7-day avg" : "Sessions",
                ]}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Sessions"
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="avg"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-[10px] text-muted">Daily</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-500 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 3px, transparent 3px, transparent 5px)" }} />
              <span className="text-[10px] text-muted">7-day avg</span>
            </div>
          </div>
        </Card>

        {/* Focus Time Trend */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Daily Focus Time
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyData}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                width={25}
                tickFormatter={(v) => `${v}m`}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid var(--card-border)", fontSize: "12px", backgroundColor: "var(--card)", color: "var(--foreground)" }}
                formatter={(value) => [formatMinutes(Number(value)), "Focus Time"]}
              />
              <Bar dataKey="minutes" radius={[2, 2, 0, 0]}>
                {dailyData.map((entry, i) => (
                  <Cell key={i} fill={entry.minutes > 0 ? "#22c55e" : "#f3f4f6"} opacity={entry.minutes > 0 ? 0.7 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Day of Week Pattern */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Best Days of Week
          </h2>
          <div className="space-y-2">
            {dayOfWeekData.map((day) => {
              const maxAvg = Math.max(...dayOfWeekData.map((d) => d.avg), 1);
              return (
                <div key={day.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-7">{day.name}</span>
                  <div className="flex-1 h-4 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                      style={{ width: `${(day.avg / maxAvg) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-10 text-right">{day.avg} avg</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Time of Day Pattern */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Productivity by Hour
          </h2>
          <div className="flex items-end gap-[2px] h-24">
            {hourData.map((h) => {
              const maxCount = Math.max(...hourData.map((x) => x.count), 1);
              const height = (h.count / maxCount) * 100;
              const isActive = h.count > 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                    isActive ? "bg-gradient-to-t from-green-500 to-emerald-400" : "bg-gray-100 dark:bg-gray-700"
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${h.label}: ${h.count} sessions`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-muted">12am</span>
            <span className="text-[8px] text-muted">6am</span>
            <span className="text-[8px] text-muted">12pm</span>
            <span className="text-[8px] text-muted">6pm</span>
            <span className="text-[8px] text-muted">12am</span>
          </div>
        </Card>

        {/* Category Trends */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Category Distribution (30 Days)
          </h2>
          {(() => {
            const catTotals = categories.map((cat) => ({
              ...cat,
              total: dailyData.reduce((sum, d) => sum + d.categories[cat.id], 0),
            }));
            const maxTotal = Math.max(...catTotals.map((c) => c.total), 1);
            const grandTotal = catTotals.reduce((sum, c) => sum + c.total, 0);

            return (
              <div className="space-y-2">
                {catTotals.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-sm w-6">{cat.emoji}</span>
                    <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(cat.total / maxTotal) * 100}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted w-16 text-right">
                      {cat.total} ({grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

        {/* Insights */}
        <Card className="animate-fade-in bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
            💡 Insights
          </h2>
          <div className="space-y-1.5 text-sm text-blue-600 dark:text-blue-400">
            {bestDay && bestDay.total > 0 && (
              <p>Your most productive day was {bestDay.label} with {bestDay.total} sessions.</p>
            )}
            {peakHour.count > 0 && (
              <p>You&apos;re most productive around {peakHour.label}.</p>
            )}
            {(() => {
              const bestDow = dayOfWeekData.reduce((best, d) => d.avg > best.avg ? d : best, dayOfWeekData[0]);
              if (bestDow.avg > 0) return <p>{bestDow.name}s are your strongest day (avg {bestDow.avg} sessions).</p>;
              return null;
            })()}
            {totalInPeriod === 0 && (
              <p>Start logging sessions to see your productivity trends!</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
