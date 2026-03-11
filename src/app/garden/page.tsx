"use client";

import { useState, useEffect } from "react";
import { Category } from "@/types";
import {
  getPlantEmoji,
  getPlantStage,
  PLANT_STAGES,
} from "@/lib/constants";
import {
  getWeekCategorySessions,
  getStreakData,
  autoSnapshotPreviousWeek,
  getGardenSnapshots,
  getSettings,
  getWeeklyPlan,
  GardenSnapshot,
  getCategories,
  getCategoryMap,
} from "@/lib/store";
import { formatMinutes, getWeekStart } from "@/lib/utils";
import Card from "@/components/ui/Card";

export default function GardenPage() {
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [mounted, setMounted] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<GardenSnapshot[]>([]);
  const [wateringPlant, setWateringPlant] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const cats = getCategories();
    setCategories(cats);
    setCategoryMap(getCategoryMap());
    setWeekCounts(getWeekCategorySessions());
    setStreakDays(getStreakData().current);
    autoSnapshotPreviousWeek();
    setSnapshots(getGardenSnapshots().sort((a, b) => b.weekStart.localeCompare(a.weekStart)));
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">🌱</div>
      </div>
    );
  }

  const totalSessions = Object.values(weekCounts).reduce((a, b) => a + b, 0);
  const settings = getSettings();

  const gardenHealth =
    totalSessions === 0
      ? "empty"
      : totalSessions < 5
      ? "starting"
      : totalSessions < 15
      ? "growing"
      : totalSessions < 30
      ? "flourishing"
      : "paradise";

  const skyGradient: Record<string, string> = {
    empty: "from-gray-100 via-blue-50 to-green-50",
    starting: "from-blue-100 via-sky-50 to-green-50",
    growing: "from-blue-200 via-sky-100 to-green-100",
    flourishing: "from-sky-200 via-blue-100 to-emerald-100",
    paradise: "from-indigo-200 via-sky-100 to-emerald-100",
  };

  // Time-based sky adjustments
  const hour = new Date().getHours();
  const isEvening = hour >= 18 || hour < 6;
  const timeGradient = isEvening
    ? "from-indigo-900 via-purple-800 to-slate-900"
    : skyGradient[gardenHealth];

  const formatWeekDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handlePlantTap = (catId: string) => {
    if (selectedPlant === catId) {
      setSelectedPlant(null);
    } else {
      setSelectedPlant(catId);
      // Trigger a watering animation
      setWateringPlant(catId);
      setTimeout(() => setWateringPlant(null), 1200);
    }
  };

  // Use weekly plan targets if available, fall back to settings
  const weeklyPlan = getWeeklyPlan(getWeekStart());
  const targets: Record<string, number> = { ...settings.weeklyTargets };
  if (weeklyPlan?.categoryTargets) {
    for (const [catId, target] of Object.entries(weeklyPlan.categoryTargets)) {
      if (target > 0) targets[catId] = target;
    }
  }

  // Calculate garden score
  const gardenScore = categories.reduce((score, cat) => {
    const pct = Math.min((weekCounts[cat.id] || 0) / (targets[cat.id] || 1), 1);
    return score + pct;
  }, 0);
  const gardenPct = Math.round((gardenScore / (categories.length || 1)) * 100);

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in text-center">
          <h1 className="text-2xl font-bold">My Garden</h1>
          <p className="text-sm text-muted">
            {totalSessions} sessions this week
            {streakDays > 0 && ` · ${streakDays} day streak 🔥`}
          </p>
          <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
            {gardenHealth === "empty" && "Plant your first seed today!"}
            {gardenHealth === "starting" && "Your garden is sprouting!"}
            {gardenHealth === "growing" && "Beautiful growth happening!"}
            {gardenHealth === "flourishing" && "Your garden is flourishing!"}
            {gardenHealth === "paradise" && "A magnificent paradise!"}
          </p>
        </div>

        {/* Garden Health Score */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="currentColor"
                  className="text-gray-100 dark:text-gray-700"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={`${gardenPct * 0.942} 94.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {gardenPct}%
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Garden Health</div>
              <div className="text-xs text-muted">
                {gardenPct >= 100
                  ? "All targets met! Perfect garden!"
                  : gardenPct >= 75
                  ? "Almost there! Keep nurturing!"
                  : gardenPct >= 50
                  ? "Good progress. Water your plants!"
                  : gardenPct > 0
                  ? "Your garden needs attention."
                  : "Start planting seeds today!"}
              </div>
              <div className="flex gap-1 mt-1.5">
                {categories.map((cat) => {
                  const done = (weekCounts[cat.id] || 0) >= (targets[cat.id] || 1);
                  return (
                    <div
                      key={cat.id}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${done ? "scale-125" : "opacity-30"}`}
                      style={{ backgroundColor: cat.color }}
                      title={`${cat.label}: ${weekCounts[cat.id] || 0}/${targets[cat.id] || 0}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Main Garden Scene */}
        <Card className="animate-fade-in p-0 overflow-hidden" style={{ animationDelay: "0.1s" }}>
          <div className={`relative min-h-[380px] bg-gradient-to-b ${timeGradient} overflow-hidden`}>
            {/* Weather effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Sun/Moon */}
              {isEvening ? (
                <div className="absolute top-5 right-8">
                  <span className="text-3xl" style={{ filter: "drop-shadow(0 0 15px rgba(200,200,255,0.5))" }}>
                    🌙
                  </span>
                  {/* Stars at night */}
                  {[...Array(8)].map((_, i) => (
                    <span
                      key={`star-${i}`}
                      className="absolute text-[8px]"
                      style={{
                        top: `${-20 + Math.sin(i * 1.5) * 60}px`,
                        left: `${-80 + i * 25}px`,
                        animation: `sparkle 3s ease-in-out infinite ${i * 0.5}s`,
                        opacity: 0.7,
                      }}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              ) : (
                <div className="absolute top-5 right-8">
                  <span
                    className="text-3xl"
                    style={{
                      filter: "drop-shadow(0 0 10px rgba(255,200,0,0.5))",
                      animation: "pulse-soft 4s ease-in-out infinite",
                    }}
                  >
                    ☀️
                  </span>
                  {/* Sun rays */}
                  {totalSessions > 10 && (
                    <div
                      className="absolute inset-0 w-16 h-16 -top-2 -left-2"
                      style={{
                        background: "radial-gradient(circle, rgba(255,200,0,0.15) 0%, transparent 70%)",
                        animation: "pulse-soft 3s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
              )}

              {/* Butterflies */}
              {totalSessions > 0 && (
                <span
                  className="absolute text-sm"
                  style={{
                    top: "15%",
                    left: "10%",
                    animation: "float-butterfly 8s ease-in-out infinite",
                  }}
                >
                  🦋
                </span>
              )}
              {totalSessions > 10 && (
                <span
                  className="absolute text-xs"
                  style={{
                    top: "25%",
                    right: "15%",
                    animation: "float-butterfly 12s ease-in-out infinite 3s",
                  }}
                >
                  🦋
                </span>
              )}

              {/* Sparkles for flourishing gardens */}
              {totalSessions > 15 && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={`sparkle-${i}`}
                      className="absolute text-xs"
                      style={{
                        top: `${20 + Math.random() * 40}%`,
                        left: `${10 + Math.random() * 80}%`,
                        animation: `sparkle 2s ease-in-out infinite ${i * 0.4}s`,
                        opacity: 0.6,
                      }}
                    >
                      ✨
                    </span>
                  ))}
                </>
              )}

              {/* Bee */}
              {totalSessions > 5 && (
                <span
                  className="absolute text-xs"
                  style={{
                    bottom: "40%",
                    right: "20%",
                    animation: "float-bee 6s ease-in-out infinite 1s",
                  }}
                >
                  🐝
                </span>
              )}

              {/* Dragonfly for paradise gardens */}
              {gardenHealth === "paradise" && (
                <span
                  className="absolute text-sm"
                  style={{
                    top: "30%",
                    left: "50%",
                    animation: "float-butterfly 10s ease-in-out infinite 2s",
                  }}
                >
                  🪺
                </span>
              )}

              {/* Rainbow for all targets met */}
              {gardenPct >= 100 && (
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 text-4xl"
                  style={{ animation: "fade-in 2s ease-out forwards" }}
                >
                  🌈
                </div>
              )}
            </div>

            {/* Clouds */}
            <span
              className="absolute text-2xl opacity-30"
              style={{ top: "8%", left: "5%", animation: "drift 20s linear infinite" }}
            >
              ☁️
            </span>
            <span
              className="absolute text-lg opacity-20"
              style={{ top: "12%", left: "40%", animation: "drift 25s linear infinite 5s" }}
            >
              ☁️
            </span>
            <span
              className="absolute text-sm opacity-15"
              style={{ top: "5%", left: "70%", animation: "drift 30s linear infinite 10s" }}
            >
              ☁️
            </span>

            {/* Ground layers */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-200/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-amber-300/30" />

            {/* Grass tufts */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-around px-4">
              {[...Array(12)].map((_, i) => (
                <span
                  key={`grass-${i}`}
                  className="text-[8px] opacity-40"
                  style={{ animation: `sway 3s ease-in-out infinite ${i * 0.2}s` }}
                >
                  🌾
                </span>
              ))}
            </div>

            {/* Plants Grid */}
            <div className="relative grid grid-cols-3 gap-x-8 gap-y-6 px-6 pt-20 pb-16">
              {categories.map((cat, idx) => {
                const sessions = weekCounts[cat.id] || 0;
                const isSelected = selectedPlant === cat.id;
                const isWatering = wateringPlant === cat.id;
                const plantSize =
                  sessions === 0
                    ? "text-3xl"
                    : sessions < 4
                    ? "text-4xl"
                    : sessions < 9
                    ? "text-5xl"
                    : sessions < 16
                    ? "text-6xl"
                    : "text-7xl";

                return (
                  <button
                    key={cat.id}
                    onClick={() => handlePlantTap(cat.id)}
                    className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                      isSelected ? "scale-110 -translate-y-2" : "hover:scale-105"
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {/* Water drops animation */}
                    {isWatering && (
                      <div className="absolute -top-2 flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <span
                            key={i}
                            className="text-[10px] animate-water"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          >
                            💧
                          </span>
                        ))}
                      </div>
                    )}

                    {sessions > 0 && (
                      <div className="flex gap-0.5 mb-0.5">
                        {[...Array(Math.min(sessions, 5))].map((_, i) => (
                          <span key={i} className="text-[8px] opacity-60">💧</span>
                        ))}
                        {sessions > 5 && (
                          <span className="text-[8px] text-muted">+{sessions - 5}</span>
                        )}
                      </div>
                    )}

                    <div
                      className={`${plantSize} ${
                        sessions > 0 ? "animate-sway" : "opacity-40"
                      } transition-all duration-500`}
                      style={{
                        filter: isSelected
                          ? `drop-shadow(0 0 12px ${cat.color}80)`
                          : sessions > 0
                          ? `drop-shadow(0 2px 4px rgba(0,0,0,0.1))`
                          : "none",
                        transform: isWatering ? "scale(1.15)" : undefined,
                      }}
                    >
                      {getPlantEmoji(cat.emoji, sessions)}
                    </div>

                    <div
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: sessions > 0 ? `${cat.color}15` : "transparent",
                        color: sessions > 0 ? cat.color : "#9ca3af",
                      }}
                    >
                      {cat.plant}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fence */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around px-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={`fence-${i}`}
                  className="w-1 h-3 bg-amber-400/30 rounded-t"
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Selected Plant Detail */}
        {selectedPlant && (
          <Card
            className="animate-slide-up border-2"
            style={{ borderColor: categoryMap[selectedPlant]?.color }}
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl animate-sway">
                {getPlantEmoji(categoryMap[selectedPlant]?.emoji || "🌱", weekCounts[selectedPlant] || 0)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">
                  {categoryMap[selectedPlant]?.emoji}{" "}
                  {categoryMap[selectedPlant]?.plant}
                </h3>
                <p className="text-sm text-muted">
                  {categoryMap[selectedPlant]?.label}
                </p>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      Stage: {getPlantStage(weekCounts[selectedPlant] || 0).name}
                    </span>
                    <span className="text-xs text-muted">
                      ({weekCounts[selectedPlant] || 0} sessions this week)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Target: {targets[selectedPlant] || 0}/week</span>
                    {(weekCounts[selectedPlant] || 0) >= (targets[selectedPlant] || 0) && (
                      <span className="text-green-600 font-medium">Target reached! 🎉</span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex gap-2">
                    {PLANT_STAGES.map((s, idx) => {
                      const currentStage = getPlantStage(weekCounts[selectedPlant] || 0);
                      const isReached = PLANT_STAGES.indexOf(currentStage) >= idx;
                      const isCurrent = PLANT_STAGES.indexOf(currentStage) === idx;
                      return (
                        <div
                          key={s.name}
                          className={`flex flex-col items-center transition-all ${
                            isReached ? "" : "opacity-20"
                          } ${isCurrent ? "scale-110" : ""}`}
                        >
                          <span className="text-xl">{s.emoji}</span>
                          <span className="text-[9px] text-muted">{s.name}</span>
                          <span className="text-[8px] text-muted">{s.minSessions}+</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Growth Guide */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Growth Stages</h2>
          <div className="flex justify-around">
            {PLANT_STAGES.map((stage) => (
              <div key={stage.name} className="flex flex-col items-center gap-1">
                <span className={stage.size}>{stage.emoji}</span>
                <span className="text-xs font-medium">{stage.name}</span>
                <span className="text-[10px] text-muted">
                  {stage.minSessions === 0 ? "Start" : `${stage.minSessions}+`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Plant Collection */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Your Plants</h2>
          <div className="space-y-3">
            {categories.map((cat) => {
              const sessions = weekCounts[cat.id];
              const stage = getPlantStage(sessions);
              const target = targets[cat.id];
              const nextStage = PLANT_STAGES.find((s) => s.minSessions > sessions);
              const progressToNext = nextStage
                ? ((sessions - stage.minSessions) / (nextStage.minSessions - stage.minSessions)) * 100
                : 100;
              const targetPct = Math.min((sessions / target) * 100, 100);

              return (
                <div key={cat.id} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                  <span className="text-3xl">
                    {getPlantEmoji(cat.emoji, sessions)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.plant}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ color: cat.color, backgroundColor: `${cat.color}15` }}
                      >
                        {stage.name}
                      </span>
                      {sessions >= target && (
                        <span className="text-xs">✅</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${targetPct}%`,
                            backgroundColor: sessions >= target ? "#22c55e" : cat.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted whitespace-nowrap">
                        {sessions}/{target}
                        {nextStage && ` · next: ${nextStage.name}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Garden History */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-sm font-semibold text-muted">
              📸 Garden History
            </h2>
            <span className="text-xs text-muted">
              {showHistory ? "Hide ▲" : `${snapshots.length} weeks ▼`}
            </span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-4">
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  Past week snapshots will appear here automatically.
                </p>
              ) : (
                snapshots.map((snap) => {
                  const healthEmoji: Record<string, string> = {
                    empty: "🏜️",
                    starting: "🌱",
                    growing: "🌿",
                    flourishing: "🌸",
                    paradise: "🏝️",
                  };

                  return (
                    <div
                      key={snap.weekStart}
                      className="rounded-xl border border-card-border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatWeekDate(snap.weekStart)} - {formatWeekDate(snap.weekEnd)}
                        </span>
                        <span className="text-lg">
                          {healthEmoji[snap.gardenHealth] || "🌱"}
                        </span>
                      </div>

                      {/* Mini garden */}
                      <div className="flex justify-around py-2 px-4 rounded-lg bg-gradient-to-b from-sky-50 to-green-50 dark:from-sky-900/20 dark:to-green-900/20">
                        {categories.map((cat) => (
                          <div key={cat.id} className="flex flex-col items-center gap-0.5">
                            <span className={getPlantStage(snap.plants[cat.id] || 0).size}>
                              {getPlantEmoji(cat.emoji, snap.plants[cat.id] || 0)}
                            </span>
                            <span className="text-[8px] text-muted">
                              {snap.plants[cat.id] || 0} 💧
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{snap.totalSessions} sessions</span>
                        <span>{formatMinutes(snap.totalMinutes)} focus</span>
                        <span className="capitalize">{snap.gardenHealth}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>
      </div>

      {/* CSS for garden animations */}
      <style jsx global>{`
        @keyframes float-butterfly {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -15px) rotate(5deg); }
          50% { transform: translate(60px, 5px) rotate(-3deg); }
          75% { transform: translate(20px, -10px) rotate(3deg); }
        }
        @keyframes float-bee {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-20px, -10px); }
          50% { transform: translate(-40px, 5px); }
          75% { transform: translate(-15px, -8px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes drift {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
      `}</style>
    </div>
  );
}
