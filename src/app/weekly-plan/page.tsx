"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Category, Session } from "@/types";
import {
  getWeeklyPlan,
  saveWeeklyPlan,
  WeeklyPlanLocal,
  WeeklyPlanSection,
  WeeklyPlanTask,
  getSessions,
  getSettings,
  getCategories,
} from "@/lib/store";
import { getWeekStart, toLocalDateString, formatMinutes } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function getWeekDays(weekStart: string): string[] {
  const days: string[] = [];
  const start = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(toLocalDateString(d));
  }
  return days;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_SECTIONS: WeeklyPlanSection[] = [
  { title: "Priorities", content: "" },
  { title: "Study / Neetcode", content: "" },
  { title: "Career", content: "" },
  { title: "Family & Others", content: "" },
];

// Category keyword mapping for auto-detection
// Priority order matters — first match wins for each line
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  coding: ["leetcode", "neetcode", "blind 75", "coding", "code", "dsa", "data structure", "algorithm"],
  ai: ["ai learning", "machine learning", "ml", "deep learning"],
  baby: ["nolan", "bonding", "baby", "tummy time", "baby time"],
  fitness: ["gym", "exercise", "workout", "yoga", "pilates", "fitness", "stretch"],
  reading: ["reading book", "book club"],
  spiritual: ["bible", "journaling", "journal", "pray", "devotion", "church", "spiritual", "worship", "quiet time"],
};

// Words that should NOT match "reading" category
const READING_EXCLUDE = ["bible reading"];

// Day name patterns for detecting day-specific tasks
const DAY_PATTERNS: Record<string, number[]> = {
  "monday": [0], "mon": [0], "tue": [1], "tuesday": [1],
  "wed": [2], "wednesday": [2], "thu": [3], "thur": [3], "thursday": [3],
  "fri": [4], "friday": [4], "sat": [5], "saturday": [5],
  "sun": [6], "sunday": [6],
  "weekday": [0, 1, 2, 3, 4], "weekdays": [0, 1, 2, 3, 4],
  "weekend": [5, 6], "weekends": [5, 6],
  "daily": [0, 1, 2, 3, 4, 5, 6], "everyday": [0, 1, 2, 3, 4, 5, 6], "every day": [0, 1, 2, 3, 4, 5, 6],
};

interface GeneratedPlan {
  targets: Record<string, number>;
  dayPlan: Record<string, { tasks: WeeklyPlanTask[]; categoryFocus: string[]; reflection: string }>;
}

// Match a single line to a category (returns category id or null)
function matchLineToCategory(line: string, categories: Category[]): string | null {
  const lower = line.toLowerCase();

  // Check specific keywords first (longest/most specific match wins)
  for (const cat of categories) {
    const keywords = CATEGORY_KEYWORDS[cat.id] || [];
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Special case: "bible reading" is spiritual, not reading
        if (cat.id === "reading" && READING_EXCLUDE.some((ex) => lower.includes(ex))) {
          continue;
        }
        return cat.id;
      }
    }
  }
  return null;
}

// Extract a number from a line (e.g., "4 problems/day" → {count: 4, perDay: true})
function extractNumber(line: string): { count: number; perDay: boolean; perWeek: boolean } | null {
  const lower = line.toLowerCase();

  // "N/day" or "N per day" or "N problems/day"
  const perDayMatch = lower.match(/(\d+)\s*(?:problems?|sessions?|times?|x)?\s*\/\s*day/);
  if (perDayMatch) return { count: parseInt(perDayMatch[1]), perDay: true, perWeek: false };

  const perDay2 = lower.match(/(\d+)\s*(?:problems?|sessions?|times?)?\s*per\s*day/);
  if (perDay2) return { count: parseInt(perDay2[1]), perDay: true, perWeek: false };

  // "Nx/week" or "N per week" or "N times/week"
  const perWeekMatch = lower.match(/(\d+)\s*(?:x|times?)?\s*(?:\/|per)\s*(?:week|wk)/);
  if (perWeekMatch) return { count: parseInt(perWeekMatch[1]), perDay: false, perWeek: true };

  // "Nx" standalone (e.g., "5x")
  const timesMatch = lower.match(/(\d+)\s*x\b/);
  if (timesMatch) return { count: parseInt(timesMatch[1]), perDay: false, perWeek: true };

  // "Nhr" or "N hour" with "everyday" or "/day"
  const hourDayMatch = lower.match(/(\d+)\s*(?:hr|hour|h)\s*(?:every\s*day|\/\s*day|daily)/);
  if (hourDayMatch) return { count: Math.ceil((parseInt(hourDayMatch[1]) * 60) / 25), perDay: true, perWeek: false };

  // "Nhr" or "N hour" standalone
  const hourMatch = lower.match(/(\d+)\s*(?:hr|hour|h)\b/);
  if (hourMatch) return { count: Math.ceil((parseInt(hourMatch[1]) * 60) / 25), perDay: false, perWeek: true };

  return null;
}

function generatePlanFromSections(
  sections: WeeklyPlanSection[],
  overallGoals: string,
  categories: Category[],
  weekDays: string[]
): GeneratedPlan {
  const allText = [overallGoals, ...sections.map((s) => s.content)].join("\n");
  // Deduplicate lines to avoid processing the same text twice
  const rawLines = allText.split("\n").map((l) => l.trim()).filter(Boolean);
  const lines = [...new Set(rawLines)];

  // 1. Detect category targets — line by line
  const targets: Record<string, number> = {};
  const mentionedCategories = new Set<string>();

  for (const line of lines) {
    const catId = matchLineToCategory(line, categories);
    if (!catId) continue;

    mentionedCategories.add(catId);
    const num = extractNumber(line);

    if (num) {
      const weeklyCount = num.perDay ? num.count * 7 : num.count;
      // Only update if this gives a higher target
      targets[catId] = Math.max(targets[catId] || 0, weeklyCount);
    }
  }

  // For mentioned categories without a specific number, use their default weekly target
  for (const catId of mentionedCategories) {
    if (targets[catId] === undefined || targets[catId] === 0) {
      const cat = categories.find((c) => c.id === catId);
      targets[catId] = cat?.weeklyTarget || 5;
    }
  }

  // 2. Generate day-by-day plan
  const dayPlan: Record<string, { tasks: WeeklyPlanTask[]; categoryFocus: string[]; reflection: string }> = {};
  for (const day of weekDays) {
    dayPlan[day] = { tasks: [], categoryFocus: [], reflection: "" };
  }

  // Parse lines for day-specific items (e.g., "Friday: dinner", "Tue car maintenance")
  // Only match specific days, skip generic patterns like "everyday", "daily", "/day"
  const SPECIFIC_DAY_PATTERNS: [RegExp, number[]][] = [
    [/\bmonday\b/i, [0]], [/\bmon\b\.?/i, [0]],
    [/\btuesday\b/i, [1]], [/\btue\b\.?/i, [1]],
    [/\bwednesday\b/i, [2]], [/\bwed\b\.?/i, [2]],
    [/\bthursday\b/i, [3]], [/\bthur?s?\b\.?/i, [3]],
    [/\bfriday\b/i, [4]], [/\bfri\b\.?/i, [4]],
    [/\bsaturday\b/i, [5]], [/\bsat\b\.?/i, [5]],
    [/\bsunday\b/i, [6]],
  ];

  const seenTasks = new Set<string>();

  for (const line of lines) {
    if (line.startsWith("[") || !line.trim()) continue;

    // Skip lines that are just category headers or numbers
    if (/^\d+\s*(problems?|sessions?|x)\s*\//i.test(line)) continue;
    if (line.length < 3) continue;

    for (const [regex, dayIndices] of SPECIFIC_DAY_PATTERNS) {
      if (regex.test(line)) {
        // Clean up the task: remove day names, brackets with day refs, trim, and shorten
        let cleanTask = line
          .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon\.?|tue\.?|wed\.?|thu\.?|thur\.?|fri\.?|sat\.?)[.:,]?\s*/gi, "")
          .replace(/\[(?:mon|tue|wed|thu|thur|fri|sat|sun)\.?\]/gi, "")
          .replace(/^\s*[-–•]\s*/, "")
          .trim();

        // Shorten long tasks: take first phrase before comma, arrow, or dash
        if (cleanTask.length > 40) {
          const parts = cleanTask.split(/[,;→\-–]/).map((p) => p.trim()).filter(Boolean);
          cleanTask = parts[0].length > 40 ? parts[0].substring(0, 37) + "..." : parts[0];
        }

        if (cleanTask && cleanTask.length > 1) {
          const taskKey = cleanTask.toLowerCase();
          for (const idx of dayIndices) {
            const dayKey = `${weekDays[idx]}:${taskKey}`;
            if (weekDays[idx] && !seenTasks.has(dayKey)) {
              seenTasks.add(dayKey);
              dayPlan[weekDays[idx]].tasks.push({ text: cleanTask, done: false });
            }
          }
        }
        break;
      }
    }
  }

  // 3. Distribute category focus across days based on targets
  for (const cat of categories) {
    const target = targets[cat.id] || 0;
    if (target === 0) continue;

    const daysNeeded = Math.min(target, 7);

    if (daysNeeded >= 7) {
      for (const day of weekDays) {
        if (!dayPlan[day].categoryFocus.includes(cat.id)) {
          dayPlan[day].categoryFocus.push(cat.id);
        }
      }
    } else if (daysNeeded >= 5) {
      for (let i = 0; i < 5; i++) {
        if (!dayPlan[weekDays[i]].categoryFocus.includes(cat.id)) {
          dayPlan[weekDays[i]].categoryFocus.push(cat.id);
        }
      }
    } else {
      const step = Math.floor(7 / daysNeeded);
      for (let i = 0; i < daysNeeded; i++) {
        const dayIdx = Math.min(i * step, 6);
        if (!dayPlan[weekDays[dayIdx]].categoryFocus.includes(cat.id)) {
          dayPlan[weekDays[dayIdx]].categoryFocus.push(cat.id);
        }
      }
    }
  }

  return { targets, dayPlan };
}

export default function WeeklyPlanPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [overallGoals, setOverallGoals] = useState("");
  const [sections, setSections] = useState<WeeklyPlanSection[]>(DEFAULT_SECTIONS);
  const [familyMeetingNotes, setFamilyMeetingNotes] = useState("");
  const [categoryTargets, setCategoryTargets] = useState<Record<string, number>>({});
  const [days, setDays] = useState<Record<string, { goals: string; categoryFocus: string[]; tasks: WeeklyPlanTask[]; reflection: string }>>({});
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showLastWeek, setShowLastWeek] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTargets, setPreviewTargets] = useState<Record<string, number>>({});
  const [previewDayPlan, setPreviewDayPlan] = useState<Record<string, { tasks: WeeklyPlanTask[]; categoryFocus: string[]; reflection: string }>>({});
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate current week start with offset
  const baseWeekStart = getWeekStart();
  const offsetDate = new Date(baseWeekStart + "T00:00:00");
  offsetDate.setDate(offsetDate.getDate() + weekOffset * 7);
  const weekStart = toLocalDateString(offsetDate);
  const weekDays = getWeekDays(weekStart);
  const today = toLocalDateString(new Date());
  const isCurrentWeek = weekOffset === 0;

  useEffect(() => {
    setMounted(true);
    const cats = getCategories();
    setCategories(cats);
    setSessions(getSessions());
  }, []);

  // Load plan when week changes
  useEffect(() => {
    if (!mounted) return;
    const cats = getCategories();
    const settings = getSettings();
    const existing = getWeeklyPlan(weekStart);

    if (existing) {
      setOverallGoals(existing.overallGoals);
      setFamilyMeetingNotes(existing.familyMeetingNotes);
      setCategoryTargets(existing.categoryTargets);
      setSections(existing.sections && existing.sections.length > 0 ? existing.sections : DEFAULT_SECTIONS);
      const loadedDays: Record<string, { goals: string; categoryFocus: string[]; tasks: WeeklyPlanTask[]; reflection: string }> = {};
      for (const day of getWeekDays(weekStart)) {
        const d = existing.days?.[day];
        // Backward compatibility: migrate string[] tasks to {text, done}[]
        const rawTasks = d?.tasks || [];
        const tasks: WeeklyPlanTask[] = rawTasks.map((t: WeeklyPlanTask | string) =>
          typeof t === 'string' ? { text: t, done: false } : t
        );
        loadedDays[day] = {
          goals: d?.goals || "",
          categoryFocus: d?.categoryFocus || [],
          tasks,
          reflection: d?.reflection || "",
        };
      }
      setDays(loadedDays);
    } else {
      setOverallGoals("");
      setFamilyMeetingNotes("");
      setSections(DEFAULT_SECTIONS);
      setCategoryTargets(
        Object.fromEntries(cats.map((c) => [c.id, settings.weeklyTargets[c.id] || c.weeklyTarget]))
      );
      const emptyDays: Record<string, { goals: string; categoryFocus: string[]; tasks: WeeklyPlanTask[]; reflection: string }> = {};
      for (const day of getWeekDays(weekStart)) {
        emptyDays[day] = { goals: "", categoryFocus: [], tasks: [], reflection: "" };
      }
      setDays(emptyDays);
    }
    setExpandedDay(isCurrentWeek ? today : null);
    setPlanGenerated(false);
  }, [weekStart, mounted]);

  // Generate Plan: step 1 — show preview
  const handleGeneratePlan = () => {
    if (categories.length === 0) return;
    const result = generatePlanFromSections(sections, overallGoals, categories, weekDays);
    setPreviewTargets({ ...categoryTargets, ...result.targets });
    // Preserve existing reflections in the preview
    const previewDays: Record<string, { tasks: WeeklyPlanTask[]; categoryFocus: string[]; reflection: string }> = {};
    for (const [day, generated] of Object.entries(result.dayPlan)) {
      previewDays[day] = {
        ...generated,
        reflection: days[day]?.reflection || "",
      };
    }
    setPreviewDayPlan(previewDays);
    setShowPreview(true);
  };

  // Generate Plan: step 2 — apply confirmed preview
  const handleConfirmPlan = () => {
    setCategoryTargets(previewTargets);

    // Replace day-by-day with generated plan (keeps existing notes)
    setDays((prev) => {
      const updated = { ...prev };
      for (const [day, generated] of Object.entries(previewDayPlan)) {
        const existing = updated[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
        updated[day] = {
          goals: existing.goals,
          tasks: generated.tasks,
          categoryFocus: generated.categoryFocus,
          reflection: existing.reflection,
        };
      }
      return updated;
    });

    setShowPreview(false);
    setPlanGenerated(true);
    setTimeout(() => setPlanGenerated(false), 3000);
  };

  // Auto-save with debounce
  const autoSave = useCallback(() => {
    if (!mounted) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      const plan: WeeklyPlanLocal = {
        weekStart,
        overallGoals,
        sections,
        categoryTargets,
        days,
        familyMeetingNotes,
        createdAt: getWeeklyPlan(weekStart)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveWeeklyPlan(plan);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  }, [mounted, weekStart, overallGoals, sections, categoryTargets, days, familyMeetingNotes]);

  useEffect(() => {
    if (mounted) autoSave();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [overallGoals, sections, categoryTargets, days, familyMeetingNotes, autoSave, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📋</div>
      </div>
    );
  }

  // Sessions for the displayed week
  const weekEnd = weekDays[6];
  const weekSessions = sessions.filter((s) => {
    if (!s.completed_at) return false;
    const d = toLocalDateString(new Date(s.completed_at));
    return d >= weekStart && d <= weekEnd;
  });

  const weekSessionsByDay: Record<string, Session[]> = {};
  for (const day of weekDays) {
    weekSessionsByDay[day] = weekSessions.filter(
      (s) => s.completed_at && toLocalDateString(new Date(s.completed_at)) === day
    );
  }

  const weekSessionsByCategory: Record<string, number> = {};
  for (const s of weekSessions) {
    weekSessionsByCategory[s.category] = (weekSessionsByCategory[s.category] || 0) + 1;
  }

  const totalWeekMinutes = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Last week data
  const lastWeekDate = new Date(weekStart + "T00:00:00");
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekStart = toLocalDateString(lastWeekDate);
  const lastWeekEndDate = new Date(lastWeekDate);
  lastWeekEndDate.setDate(lastWeekEndDate.getDate() + 6);
  const lastWeekEnd = toLocalDateString(lastWeekEndDate);

  const lastWeekSessions = sessions.filter((s) => {
    if (!s.completed_at) return false;
    const d = toLocalDateString(new Date(s.completed_at));
    return d >= lastWeekStart && d <= lastWeekEnd;
  });

  const toggleCategoryFocus = (day: string, catId: string) => {
    setDays((prev) => {
      const dayData = prev[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
      const focus = dayData.categoryFocus.includes(catId)
        ? dayData.categoryFocus.filter((id) => id !== catId)
        : [...dayData.categoryFocus, catId];
      return { ...prev, [day]: { ...dayData, categoryFocus: focus } };
    });
  };

  const addTask = (day: string) => {
    setDays((prev) => {
      const dayData = prev[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
      return { ...prev, [day]: { ...dayData, tasks: [...dayData.tasks, { text: "", done: false }] } };
    });
  };

  const updateTask = (day: string, idx: number, value: string) => {
    setDays((prev) => {
      const dayData = prev[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
      const tasks = [...dayData.tasks];
      tasks[idx] = { ...tasks[idx], text: value };
      return { ...prev, [day]: { ...dayData, tasks } };
    });
  };

  const toggleTask = (day: string, idx: number) => {
    setDays((prev) => {
      const dayData = prev[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
      const tasks = [...dayData.tasks];
      tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
      return { ...prev, [day]: { ...dayData, tasks } };
    });
  };

  const removeTask = (day: string, idx: number) => {
    setDays((prev) => {
      const dayData = prev[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
      const tasks = dayData.tasks.filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...dayData, tasks } };
    });
  };

  const updateSection = (idx: number, content: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, content } : s)));
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    setSections((prev) => [...prev, { title: newSectionTitle.trim(), content: "" }]);
    setNewSectionTitle("");
    setAddingSection(false);
  };

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Weekly Plan</h1>
              <p className="text-sm text-muted">{formatWeekRange(weekStart)}</p>
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

          {/* Week navigation */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
              >
                Current Week
              </button>
            )}
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ›
            </button>
          </div>
        </div>

        {/* Last Week Review */}
        {isCurrentWeek && lastWeekSessions.length > 0 && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <button
              onClick={() => setShowLastWeek(!showLastWeek)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h2 className="text-sm font-semibold">Last Week Review</h2>
              </div>
              <span className="text-xs text-muted">{showLastWeek ? "▲" : "▼"}</span>
            </button>
            {showLastWeek && (
              <div className="mt-3 pt-3 border-t border-card-border space-y-2">
                <p className="text-xs text-muted">
                  {formatWeekRange(lastWeekStart)} · {lastWeekSessions.length} sessions · {formatMinutes(lastWeekSessions.reduce((s, x) => s + x.duration_minutes, 0))}
                </p>
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const count = lastWeekSessions.filter((s) => s.category === cat.id).length;
                    if (count === 0) return null;
                    const target = categoryTargets[cat.id] || 0;
                    return (
                      <div key={cat.id} className="flex items-center gap-2 text-xs">
                        <span>{cat.emoji}</span>
                        <span className="flex-1">{cat.label}</span>
                        <span className={count >= target ? "text-green-600" : "text-muted"}>
                          {count} sessions
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Structured Sections */}
        {sections.map((section, idx) => (
          <Card key={idx} className="animate-fade-in" style={{ animationDelay: `${0.1 + idx * 0.03}s` }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {idx === 0 ? "⭐" : idx === 1 ? "📚" : idx === 2 ? "💼" : idx === 3 ? "👨‍👩‍👧" : "📌"}
                </span>
                <h2 className="text-sm font-semibold">{section.title}</h2>
              </div>
              {sections.length > 1 && (
                <button
                  onClick={() => removeSection(idx)}
                  className="text-xs text-muted hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  ✕
                </button>
              )}
            </div>
            <textarea
              value={section.content}
              onChange={(e) => updateSection(idx, e.target.value)}
              placeholder={
                idx === 0 ? "Your top priorities for the week...\n\nBible reading\nJournaling\nGym\nStudy\nProject\nBonding time" :
                idx === 1 ? "Study plan, topics to cover, problems to solve...\n\nNeetcode: Stack, Binary Search, Trees\n4 problems/day" :
                idx === 2 ? "Career goals, applications, interviews...\n\nResume updates\nApply to 10 companies\nPrepare for interviews" :
                idx === 3 ? "Family activities, errands, social...\n\nDate night\nDoctor appointment\nGrocery shopping" :
                "Notes for this section..."
              }
              rows={5}
              className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm resize-y focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600 whitespace-pre-wrap"
            />
          </Card>
        ))}

        {/* Add Section */}
        {addingSection ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Section name..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              className="flex-1 px-3 py-2 rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:border-green-400"
            />
            <Button size="sm" onClick={addSection}>Add</Button>
            <Button size="sm" variant="secondary" onClick={() => { setAddingSection(false); setNewSectionTitle(""); }}>Cancel</Button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSection(true)}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-card-border text-sm text-muted hover:text-foreground hover:border-green-400 transition-all"
          >
            + Add Section
          </button>
        )}

        {/* Generate Plan Button */}
        <Button
          size="lg"
          className="w-full"
          onClick={handleGeneratePlan}
        >
          {planGenerated ? "✅ Plan Generated!" : "✨ Generate Plan"}
        </Button>
        <p className="text-[10px] text-muted text-center -mt-2">
          Analyzes your sections above and fills category targets + day-by-day schedule
        </p>

        {/* Preview Modal */}
        {showPreview && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowPreview(false)}
            />
            <div className="fixed inset-x-4 top-[10%] bottom-[10%] z-50 mx-auto max-w-lg overflow-y-auto rounded-2xl bg-card border border-card-border shadow-2xl p-5 animate-fade-in">
              <h2 className="text-lg font-bold mb-1">Review Generated Plan</h2>
              <p className="text-xs text-muted mb-4">Adjust the targets before applying.</p>

              {/* Category targets */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-muted">Category Targets (sessions/week)</h3>
                {categories.map((cat) => {
                  const target = previewTargets[cat.id] || 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-sm flex-1">{cat.label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewTargets((t) => ({ ...t, [cat.id]: Math.max(0, (t[cat.id] || 0) - 1) }))}
                          className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={target}
                          onChange={(e) => setPreviewTargets((t) => ({ ...t, [cat.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                          min={0}
                          className="w-10 text-center text-sm font-bold bg-transparent border-b border-card-border focus:outline-none focus:border-green-400"
                          style={{ color: target > 0 ? cat.color : "#9ca3af" }}
                        />
                        <button
                          onClick={() => setPreviewTargets((t) => ({ ...t, [cat.id]: (t[cat.id] || 0) + 1 }))}
                          className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day tasks preview — editable */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted mb-2">Day Tasks</h3>
                <div className="space-y-3">
                  {weekDays.map((day, idx) => {
                    const dp = previewDayPlan[day] || { tasks: [], categoryFocus: [] };
                    return (
                      <div key={day}>
                        <div className="text-xs font-bold text-muted mb-1">{DAY_NAMES[idx]}</div>
                        <div className="space-y-1">
                          {dp.tasks.map((t, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="text-xs text-muted">•</span>
                              <input
                                type="text"
                                value={typeof t === 'object' ? t.text : t}
                                onChange={(e) => {
                                  setPreviewDayPlan((prev) => {
                                    const updated = { ...prev };
                                    const dayData = { ...updated[day] };
                                    const tasks = [...dayData.tasks];
                                    tasks[i] = { text: e.target.value, done: false };
                                    updated[day] = { ...dayData, tasks };
                                    return updated;
                                  });
                                }}
                                className="flex-1 px-2 py-1 rounded-lg border border-card-border bg-white dark:bg-gray-800 text-xs focus:outline-none focus:border-green-400"
                              />
                              <button
                                onClick={() => {
                                  setPreviewDayPlan((prev) => {
                                    const updated = { ...prev };
                                    const dayData = { ...updated[day] };
                                    updated[day] = { ...dayData, tasks: dayData.tasks.filter((_, j) => j !== i) };
                                    return updated;
                                  });
                                }}
                                className="text-xs text-muted hover:text-red-500 px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setPreviewDayPlan((prev) => {
                                const updated = { ...prev };
                                const dayData = { ...updated[day] };
                                updated[day] = { ...dayData, tasks: [...dayData.tasks, { text: "", done: false }] };
                                return updated;
                              });
                            }}
                            className="text-[10px] text-muted hover:text-green-600"
                          >
                            + Add task
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowPreview(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmPlan}
                >
                  Apply Plan
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Overall Brain Dump */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📝</span>
            <h2 className="text-sm font-semibold">Additional Notes</h2>
          </div>
          <p className="text-[10px] text-muted mb-3">
            Free-form notes, brain dump, anything else for the week.
          </p>
          <textarea
            value={overallGoals}
            onChange={(e) => { setOverallGoals(e.target.value); }}
            placeholder="Anything else on your mind for this week..."
            rows={4}
            className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm resize-y focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600 whitespace-pre-wrap"
          />
        </Card>

        {/* Family Meeting Notes */}
        <Card className="animate-fade-in border-amber-100 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👨‍👩‍👧</span>
            <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Family Meeting Notes</h2>
          </div>
          <textarea
            value={familyMeetingNotes}
            onChange={(e) => setFamilyMeetingNotes(e.target.value)}
            placeholder="Discussion points, decisions, family activities planned..."
            rows={3}
            className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 px-4 py-3 text-sm resize-y focus:outline-none focus:border-amber-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </Card>

        {/* Category Targets (auto-detected) */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h2 className="text-sm font-semibold">Category Targets</h2>
            </div>
            {isCurrentWeek && (
              <span className="text-xs text-muted">
                {weekSessions.length} done · {formatMinutes(totalWeekMinutes)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted mb-3">
            Generated from your plan. Adjust as needed.
          </p>

          <div className="space-y-3">
            {categories.map((cat) => {
              const target = categoryTargets[cat.id] || 0;
              const actual = weekSessionsByCategory[cat.id] || 0;
              const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7">{cat.emoji}</span>
                    <span className="text-sm flex-1">{cat.label}</span>
                    {isCurrentWeek && (
                      <span className={`text-xs mr-2 ${actual >= target && target > 0 ? "text-green-600 font-medium" : "text-muted"}`}>
                        {actual}/{target}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCategoryTargets((t) => ({
                            ...t,
                            [cat.id]: Math.max(0, (t[cat.id] || 0) - 1),
                          }))
                        }
                        className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={target}
                        onChange={(e) =>
                          setCategoryTargets((t) => ({
                            ...t,
                            [cat.id]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        min={0}
                        className="w-10 text-center text-sm font-bold bg-transparent border-b border-card-border focus:outline-none focus:border-green-400"
                        style={{ color: target > 0 ? cat.color : "#9ca3af" }}
                      />
                      <button
                        onClick={() =>
                          setCategoryTargets((t) => ({
                            ...t,
                            [cat.id]: (t[cat.id] || 0) + 1,
                          }))
                        }
                        className="w-7 h-7 rounded-full border border-card-border flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {isCurrentWeek && target > 0 && (
                    <div className="ml-10 mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Day-by-Day Breakdown */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📅</span>
            <h2 className="text-sm font-semibold">Day-by-Day</h2>
          </div>

          <div className="space-y-2">
            {weekDays.map((day, idx) => {
              const isToday = day === today;
              const isExpanded = expandedDay === day;
              const dayData = days[day] || { goals: "", categoryFocus: [], tasks: [], reflection: "" };
              const daySessions = weekSessionsByDay[day] || [];
              const dayDate = new Date(day + "T00:00:00");
              const dayLabel = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

              return (
                <div
                  key={day}
                  className={`rounded-xl border transition-all ${
                    isToday
                      ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
                      : "border-card-border"
                  }`}
                >
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                    className="w-full flex items-center gap-3 px-3 py-2.5"
                  >
                    <span className={`text-xs font-bold w-8 ${isToday ? "text-green-600 dark:text-green-400" : "text-muted"}`}>
                      {DAY_NAMES[idx]}
                    </span>
                    <span className="text-xs text-muted flex-1 text-left">{dayLabel}</span>
                    {dayData.tasks.filter((t) => (typeof t === 'object' ? t.text : t).trim()).length > 0 && (
                      <span className="text-[10px] text-muted">
                        {dayData.tasks.filter((t) => typeof t === 'object' && t.done).length}/{dayData.tasks.filter((t) => (typeof t === 'object' ? t.text : t).trim()).length} done
                      </span>
                    )}
                    {dayData.categoryFocus.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayData.categoryFocus.map((catId) => {
                          const cat = categories.find((c) => c.id === catId);
                          return cat ? (
                            <span key={catId} className="text-xs">{cat.emoji}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {daySessions.length > 0 && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                        {daySessions.length} done
                      </span>
                    )}
                    {isToday && (
                      <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                    <span className="text-xs text-muted">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-card-border mt-0 pt-3">
                      {/* Focus categories */}
                      <div>
                        <label className="text-[10px] font-medium text-muted block mb-1.5">
                          Focus Areas
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.map((cat) => {
                            const isActive = dayData.categoryFocus.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                onClick={() => toggleCategoryFocus(day, cat.id)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                                  isActive
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700"
                                    : "bg-gray-50 dark:bg-gray-800 text-muted border border-card-border hover:border-gray-400"
                                }`}
                              >
                                <span>{cat.emoji}</span>
                                <span>{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tasks */}
                      <div>
                        <label className="text-[10px] font-medium text-muted block mb-1.5">
                          Tasks
                        </label>
                        <div className="space-y-1.5">
                          {dayData.tasks.map((task, taskIdx) => {
                            const taskText = typeof task === 'object' ? task.text : task;
                            const taskDone = typeof task === 'object' ? task.done : false;
                            return (
                            <div key={taskIdx} className="flex items-center gap-2">
                              <button
                                onClick={() => toggleTask(day, taskIdx)}
                                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                                  taskDone
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-card-border hover:border-green-400"
                                }`}
                              >
                                {taskDone && <span className="text-[8px]">✓</span>}
                              </button>
                              <input
                                type="text"
                                value={taskText}
                                onChange={(e) => updateTask(day, taskIdx, e.target.value)}
                                placeholder="Task..."
                                className={`flex-1 px-2 py-1 rounded-lg border border-card-border bg-white dark:bg-gray-800 text-xs focus:outline-none focus:border-gray-400 ${
                                  taskDone ? "line-through text-muted" : ""
                                }`}
                              />
                              <button
                                onClick={() => removeTask(day, taskIdx)}
                                className="text-xs text-muted hover:text-red-500 px-1"
                              >
                                ✕
                              </button>
                            </div>
                            );
                          })}
                          <button
                            onClick={() => addTask(day)}
                            className="text-xs text-muted hover:text-green-600 flex items-center gap-1"
                          >
                            + Add task
                          </button>
                        </div>
                      </div>

                      {/* Day notes */}
                      <div>
                        <label className="text-[10px] font-medium text-muted block mb-1.5">
                          Notes
                        </label>
                        <textarea
                          value={dayData.goals}
                          onChange={(e) =>
                            setDays((prev) => ({
                              ...prev,
                              [day]: { ...dayData, goals: e.target.value },
                            }))
                          }
                          placeholder="Notes for this day..."
                          rows={2}
                          className="w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-2 text-xs resize-none focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                        />
                      </div>

                      {/* Completed sessions (read-only) */}
                      {daySessions.length > 0 && (
                        <div>
                          <label className="text-[10px] font-medium text-muted block mb-1.5">
                            Completed Sessions
                          </label>
                          <div className="space-y-1">
                            {daySessions.map((s) => {
                              const cat = categories.find((c) => c.id === s.category);
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-center gap-2 text-xs text-muted"
                                >
                                  <span>{cat?.emoji || "?"}</span>
                                  <span>{cat?.label || s.category}</span>
                                  <span>· {s.duration_minutes}m</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Evening Reflection */}
                      <div>
                        <label className="text-[10px] font-medium text-muted block mb-1.5">
                          🌙 Reflection
                        </label>
                        <textarea
                          value={dayData.reflection}
                          onChange={(e) =>
                            setDays((prev) => ({
                              ...prev,
                              [day]: { ...dayData, reflection: e.target.value },
                            }))
                          }
                          placeholder="How did the day go? What went well?"
                          rows={2}
                          className="w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-2 text-xs resize-none focus:outline-none focus:border-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Link href="/timer" className="flex-1">
            <Button size="lg" className="w-full">
              ⏱️ Start Session
            </Button>
          </Link>
          <Link href="/review" className="flex-1">
            <Button variant="secondary" size="lg" className="w-full">
              📅 Weekly Review
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
