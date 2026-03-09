"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Category } from "@/types";
import {
  getDailyPlanWithWeekly,
  saveDailyPlan,
  DailyPlanLocal,
  getSessions,
  getSettings,
  getCategories,
} from "@/lib/store";
import { getToday, toLocalDateString } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function PlanPage() {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [intentions, setIntentions] = useState("");
  const [reflection, setReflection] = useState("");
  const [categoryGoals, setCategoryGoals] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [pomodoroGoal, setPomodoroGoal] = useState(5);
  const [mounted, setMounted] = useState(false);
  const [daySessionCount, setDaySessionCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const today = getToday();
  const isToday = selectedDate === today;

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(toLocalDateString(d));
  };

  // Load plan when date changes
  useEffect(() => {
    setMounted(true);
    const cats = getCategories();
    setCategories(cats);
    const existing = getDailyPlanWithWeekly(selectedDate);
    const settings = getSettings();

    // Count sessions for selected date
    const allSessions = getSessions();
    const daySessions = allSessions.filter(
      (s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === selectedDate
    );
    setDaySessionCount(daySessions.length);

    if (existing) {
      setIntentions(existing.intentions);
      setReflection(existing.reflection);
      setCategoryGoals(existing.categoryGoals);
      setPomodoroGoal(existing.pomodoroGoal);
    } else {
      setIntentions("");
      setReflection("");
      setCategoryGoals(Object.fromEntries(cats.map(c => [c.id, 0])));
      setPomodoroGoal(settings.pomodoroGoal);
    }
  }, [selectedDate]);

  // Auto-save with debounce
  const autoSave = useCallback(() => {
    if (!mounted) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      const newPlan: DailyPlanLocal = {
        date: selectedDate,
        intentions,
        categoryGoals,
        reflection,
        pomodoroGoal,
      };
      saveDailyPlan(newPlan);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  }, [mounted, selectedDate, intentions, categoryGoals, reflection, pomodoroGoal]);

  // Trigger auto-save when anything changes
  useEffect(() => {
    if (mounted) autoSave();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [intentions, categoryGoals, reflection, pomodoroGoal, autoSave, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📝</div>
      </div>
    );
  }

  const totalPlannedSessions = Object.values(categoryGoals).reduce((a, b) => a + b, 0);

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const dayOfWeek = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });
  const dateFormatted = selectedDateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isPast = selectedDate < today;

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {isToday ? "Today's Plan" : `Plan for ${dayOfWeek}`}
              </h1>
              <p className="text-sm text-muted">{dayOfWeek}, {dateFormatted}</p>
            </div>
            <div className="text-right">
              {saveStatus === "saving" && (
                <span className="text-[10px] text-muted animate-pulse">Saving...</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-[10px] text-green-600 dark:text-green-400">Saved ✓</span>
              )}
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => navigateDate(-1)}
              className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 rounded-lg border border-card-border bg-background text-xs focus:outline-none focus:border-green-400"
            />
            <button
              onClick={() => navigateDate(1)}
              className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ›
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="px-3 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Intentions */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-semibold">Intentions</h2>
          </div>
          <p className="text-[10px] text-muted mb-3">
            {isToday
              ? "Write down what you want to accomplish today. Changes save automatically."
              : isPast
              ? "What you planned for this day."
              : "Plan ahead — what do you want to accomplish?"}
          </p>
          <textarea
            value={intentions}
            onChange={(e) => setIntentions(e.target.value)}
            placeholder="What do I want to accomplish? What's most important?&#10;&#10;e.g., Solve 2 Blind 75 problems, 30 min tummy time, Pilates at 5pm"
            rows={4}
            className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm resize-y focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </Card>

        {/* Session Allocation */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h2 className="text-sm font-semibold">Session Goals</h2>
            </div>
            <div className="text-xs text-muted">
              {totalPlannedSessions} sessions planned
            </div>
          </div>

          <div className="space-y-3 mt-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-lg w-7">{cat.emoji}</span>
                <span className="text-sm flex-1">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCategoryGoals((g) => ({
                        ...g,
                        [cat.id]: Math.max(0, (g[cat.id] || 0) - 1),
                      }))
                    }
                    className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90"
                  >
                    -
                  </button>
                  <span
                    className="w-6 text-center text-sm font-bold"
                    style={{ color: (categoryGoals[cat.id] || 0) > 0 ? cat.color : "#9ca3af" }}
                  >
                    {categoryGoals[cat.id] || 0}
                  </span>
                  <button
                    onClick={() =>
                      setCategoryGoals((g) => ({
                        ...g,
                        [cat.id]: (g[cat.id] || 0) + 1,
                      }))
                    }
                    className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Visual timeline */}
          {totalPlannedSessions > 0 && (
            <div className="mt-4 pt-3 border-t border-card-border">
              <div className="text-xs text-muted mb-2">Visual plan</div>
              <div className="flex flex-wrap gap-1">
                {categories.flatMap((cat) =>
                  Array.from({ length: categoryGoals[cat.id] || 0 }).map((_, i) => (
                    <div
                      key={`${cat.id}-${i}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${cat.color}20` }}
                      title={cat.label}
                    >
                      {cat.emoji}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Progress (if sessions exist for this date) */}
        {daySessionCount > 0 && (
          <Card className="animate-fade-in border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <h2 className="text-sm font-semibold text-green-700 dark:text-green-400">
                Progress: {daySessionCount}/{totalPlannedSessions} sessions done
              </h2>
            </div>
            <div className="mt-2 h-2 rounded-full bg-green-100 dark:bg-green-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${Math.min((daySessionCount / Math.max(totalPlannedSessions, 1)) * 100, 100)}%`,
                }}
              />
            </div>
          </Card>
        )}

        {/* Morning Devotional */}
        <Card className="animate-fade-in border-purple-100 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/20" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🪻</span>
            <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-400">Morning Devotional</h2>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
            Take a moment for Bible reading and journaling before starting your day.
          </p>
          <Link href="/timer">
            <Button variant="secondary" size="sm" className="text-purple-600 border-purple-200">
              Start Spiritual Session →
            </Button>
          </Link>
        </Card>

        {/* Evening Reflection */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙</span>
            <h2 className="text-sm font-semibold">Evening Reflection</h2>
          </div>
          <p className="text-[10px] text-muted mb-3">
            {isToday
              ? "Come back at the end of your day to reflect on what went well."
              : isPast
              ? "How did this day go?"
              : "You can fill this in after the day is done."}
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How did the day go? What went well? What could be better?"
            rows={3}
            className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm resize-y focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </Card>

        {/* Quick access */}
        {isToday && (
          <Link href="/timer">
            <Button size="lg" className="w-full">
              ⏱️ Start a Focus Session
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
