"use client";

import { useState, useEffect, useMemo } from "react";
import { Category, Session } from "@/types";
import { getSessions, getCategories } from "@/lib/store";
import { toLocalDateString } from "@/lib/utils";

interface MonthCalendarProps {
  className?: string;
}

export default function MonthCalendar({ className = "" }: MonthCalendarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    setSessions(getSessions());
    setCategories(getCategories());
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const s of sessions) {
      if (!s.completed_at) continue;
      const dateStr = toLocalDateString(new Date(s.completed_at));
      if (!map[dateStr]) {
        map[dateStr] = Object.fromEntries(categories.map(c => [c.id, 0]));
      }
      map[dateStr][s.category] = (map[dateStr][s.category] || 0) + 1;
    }
    return map;
  }, [sessions, categories]);

  // Calculate calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday start
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = toLocalDateString(today);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (next <= today) setCurrentMonth(next);
  };

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className={className}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="text-muted hover:text-foreground text-sm px-2 py-1"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">{monthName}</span>
        <button
          onClick={nextMonth}
          className={`text-sm px-2 py-1 ${
            new Date(year, month + 1, 1) > today
              ? "text-gray-200 dark:text-gray-700 cursor-not-allowed"
              : "text-muted hover:text-foreground"
          }`}
          disabled={new Date(year, month + 1, 1) > today}
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-[9px] text-muted text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for first week */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="h-9" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = sessionsByDay[dateStr];
          const isToday = dateStr === todayStr;
          const isFuture = new Date(dateStr) > today;
          const activeCategories = dayData
            ? categories.filter((c) => dayData[c.id] > 0)
            : [];
          const totalSessions = dayData
            ? Object.values(dayData).reduce((a, b) => a + b, 0)
            : 0;

          return (
            <div
              key={day}
              className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                isToday
                  ? "ring-2 ring-green-400 ring-offset-1"
                  : ""
              } ${
                isFuture
                  ? "opacity-30"
                  : totalSessions > 0
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-gray-50/50 dark:bg-gray-800/50"
              }`}
            >
              <span className={`text-[10px] ${
                isToday ? "font-bold text-green-600" : totalSessions > 0 ? "font-medium" : "text-muted"
              }`}>
                {day}
              </span>
              {activeCategories.length > 0 && (
                <div className="flex gap-px mt-0.5">
                  {activeCategories.slice(0, 4).map((cat) => (
                    <div
                      key={cat.id}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  ))}
                  {activeCategories.length > 4 && (
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-[9px] text-muted">{cat.label.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
