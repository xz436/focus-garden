"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CategoryId } from "@/types";
import { CATEGORY_LIST } from "@/lib/constants";
import {
  getDailyPlan,
  saveDailyPlan,
  DailyPlanLocal,
  getTodaySessions,
  getSettings,
} from "@/lib/store";
import { getToday, getGreeting } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function PlanPage() {
  const [intentions, setIntentions] = useState("");
  const [reflection, setReflection] = useState("");
  const [categoryGoals, setCategoryGoals] = useState<Record<CategoryId, number>>({
    coding: 2, ai: 1, baby: 2, fitness: 1, reading: 1, spiritual: 1,
  });
  const [pomodoroGoal, setPomodoroGoal] = useState(5);
  const [mounted, setMounted] = useState(false);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const today = getToday();

  useEffect(() => {
    setMounted(true);
    const existing = getDailyPlan(today);
    const settings = getSettings();
    const todaySessions = getTodaySessions();
    setTodaySessionCount(todaySessions.length);

    if (existing) {
      setIntentions(existing.intentions);
      setReflection(existing.reflection);
      setCategoryGoals(existing.categoryGoals);
      setPomodoroGoal(existing.pomodoroGoal);
    } else {
      setPomodoroGoal(settings.pomodoroGoal);
    }
  }, [today]);

  // Auto-save with debounce
  const autoSave = useCallback(() => {
    if (!mounted) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      const newPlan: DailyPlanLocal = {
        date: today,
        intentions,
        categoryGoals,
        reflection,
        pomodoroGoal,
      };
      saveDailyPlan(newPlan);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  }, [mounted, today, intentions, categoryGoals, reflection, pomodoroGoal]);

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

  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateFormatted = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}&apos;s Plan</h1>
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

        {/* Morning Intentions */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-semibold">Today&apos;s Intentions</h2>
          </div>
          <p className="text-[10px] text-muted mb-3">
            Write down what you want to accomplish today. Changes save automatically.
          </p>
          <textarea
            value={intentions}
            onChange={(e) => setIntentions(e.target.value)}
            placeholder="What do I want to accomplish today? What's most important?&#10;&#10;e.g., Solve 2 Blind 75 problems (Stack category), 30 min tummy time with baby, Pilates class at 5pm"
            rows={4}
            className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm resize-none focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
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
          <p className="text-[10px] text-muted mb-3">
            Set how many focus sessions you want for each category today.
          </p>

          <div className="space-y-3">
            {CATEGORY_LIST.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-lg w-7">{cat.emoji}</span>
                <span className="text-sm flex-1">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCategoryGoals((g) => ({
                        ...g,
                        [cat.id]: Math.max(0, g[cat.id] - 1),
                      }))
                    }
                    className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90"
                  >
                    -
                  </button>
                  <span
                    className="w-6 text-center text-sm font-bold"
                    style={{ color: categoryGoals[cat.id] > 0 ? cat.color : "#9ca3af" }}
                  >
                    {categoryGoals[cat.id]}
                  </span>
                  <button
                    onClick={() =>
                      setCategoryGoals((g) => ({
                        ...g,
                        [cat.id]: g[cat.id] + 1,
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
          <div className="mt-4 pt-3 border-t border-card-border">
            <div className="text-xs text-muted mb-2">Visual plan</div>
            <div className="flex flex-wrap gap-1">
              {CATEGORY_LIST.flatMap((cat) =>
                Array.from({ length: categoryGoals[cat.id] }).map((_, i) => (
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
              {totalPlannedSessions === 0 && (
                <span className="text-xs text-muted">No sessions planned</span>
              )}
            </div>
          </div>
        </Card>

        {/* Today's Progress (if sessions exist) */}
        {todaySessionCount > 0 && (
          <Card className="animate-fade-in border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <h2 className="text-sm font-semibold text-green-700 dark:text-green-400">
                Progress: {todaySessionCount}/{totalPlannedSessions} sessions done
              </h2>
            </div>
            <div className="mt-2 h-2 rounded-full bg-green-100 dark:bg-green-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${Math.min((todaySessionCount / Math.max(totalPlannedSessions, 1)) * 100, 100)}%`,
                }}
              />
            </div>
          </Card>
        )}

        {/* Bible/Journal prompt */}
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
            Come back at the end of your day to reflect on what went well and what to improve.
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How did today go? What went well? What could be better tomorrow?&#10;&#10;Fill this in at the end of your day..."
            rows={3}
            className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm resize-none focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </Card>

        {/* Quick access */}
        <Link href="/timer">
          <Button size="lg" className="w-full">
            ⏱️ Start a Focus Session
          </Button>
        </Link>
      </div>
    </div>
  );
}
