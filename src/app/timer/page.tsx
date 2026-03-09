"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Category } from "@/types";
import { getPlantEmoji } from "@/lib/constants";
import { addSession, getWeekCategorySessions, getWeekCategorySessionsForWeek, getSettings, getTodaySessions, checkAndUnlockAchievements, getCategories, getCategoryMap } from "@/lib/store";
import { formatTime, getWeekStart, toLocalDateString } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { triggerConfetti } from "@/components/ui/Confetti";

type TimerState = "idle" | "running" | "paused" | "break";
type AmbientSound = "none" | "rain" | "forest" | "cafe";

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string, emoji: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`,
      tag: "focus-garden-timer",
    });
  }
}

function playCompletionSound() {
  try {
    const audioCtx = new AudioContext();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + dur);
      osc.start(audioCtx.currentTime + start);
      osc.stop(audioCtx.currentTime + start + dur);
    };
    playTone(523, 0, 0.3);     // C5
    playTone(659, 0.15, 0.3);  // E5
    playTone(784, 0.3, 0.5);   // G5
  } catch {
    // Audio not available
  }
}

// Ambient Sound Generator using Web Audio API
class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private running = false;

  private getCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    return this.audioCtx;
  }

  stop() {
    this.running = false;
    for (const node of this.nodes) {
      try {
        if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
          node.stop();
        }
        node.disconnect();
      } catch { /* ignore */ }
    }
    this.nodes = [];
  }

  play(type: AmbientSound) {
    this.stop();
    if (type === "none") return;
    this.running = true;
    const ctx = this.getCtx();

    if (type === "rain") {
      // Brown noise for rain
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.15;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.nodes.push(source, gain, filter);
    } else if (type === "forest") {
      // Gentle wind + bird-like oscillations
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.01 * white) / 1.01;
        lastOut = data[i];
        data[i] *= 2;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 400;
      filter.Q.value = 0.5;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.nodes.push(source, gain, filter);

      // Bird chirps using oscillator
      const chirp = () => {
        if (!this.running) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        const baseFreq = 2000 + Math.random() * 2000;
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.1);
        osc.type = "sine";
        g.gain.setValueAtTime(0.02, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        setTimeout(chirp, 3000 + Math.random() * 8000);
      };
      setTimeout(chirp, 1000);
    } else if (type === "cafe") {
      // Pink noise for cafe murmur
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.nodes.push(source, gain, filter);
    }
  }
}

const ambientEngine = typeof window !== "undefined" ? new AmbientSoundEngine() : null;

export default function TimerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft text-4xl">🌱</div></div>}>
      <TimerPageInner />
    </Suspense>
  );
}

function TimerPageInner() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Category>>({});
  const [category, setCategory] = useState("coding");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [sessionCount, setSessionCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [completedCategory, setCompletedCategory] = useState("coding");
  const [weekSessions, setWeekSessions] = useState<Record<string, number>>({});
  const [weeklyTargets, setWeeklyTargets] = useState<Record<string, number>>({});
  const [progressWeekOffset, setProgressWeekOffset] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Baby bonding manual log
  const [babyMinutes, setBabyMinutes] = useState(30);
  const [babyActivity, setBabyActivity] = useState("");

  // Manual session log
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualCategory, setManualCategory] = useState("coding");
  const [manualMinutes, setManualMinutes] = useState(25);
  const [manualNotes, setManualNotes] = useState("");
  const [manualTime, setManualTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  // Ambient sound
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("none");

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);
  const [breathePhase, setBreathePhase] = useState<"inhale" | "hold" | "exhale">("inhale");

  // "Already started" backdating
  const [showBackdate, setShowBackdate] = useState(false);
  const [backdateTime, setBackdateTime] = useState("");

  const startTimeRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>("");

  // Persist active timer to localStorage so it survives page navigation
  const saveActiveTimer = useCallback((state: TimerState, cat: string, total: number, left: number, started: string) => {
    if (state === "idle") {
      localStorage.removeItem("fg_active_timer");
    } else {
      localStorage.setItem("fg_active_timer", JSON.stringify({
        state, category: cat, totalTime: total, timeLeft: left,
        startedAt: started, savedAt: Date.now(),
      }));
    }
  }, []);

  useEffect(() => {
    originalTitleRef.current = document.title;
    requestNotificationPermission();
    setNotificationsEnabled(
      "Notification" in window && Notification.permission === "granted"
    );

    const cats = getCategories();
    const catMap = getCategoryMap();
    setCategories(cats);
    setCategoryMap(catMap);

    // Set category from URL param (e.g., /timer?category=baby)
    const paramCat = searchParams.get("category");
    if (paramCat && catMap[paramCat]) {
      setCategory(paramCat);
    }

    // Load settings for timer durations
    const settings = getSettings();
    const todaySessions = getTodaySessions();
    setSessionCount(todaySessions.length);
    setTimeLeft((settings.timerDurations?.coding || 25) * 60);
    setTotalTime((settings.timerDurations?.coding || 25) * 60);
    setWeeklyTargets(settings.weeklyTargets);

    // Restore active timer if navigating back
    try {
      const saved = localStorage.getItem("fg_active_timer");
      if (saved) {
        const t = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - t.savedAt) / 1000);
        if (t.state === "running" || t.state === "break") {
          const remaining = t.timeLeft - elapsed;
          if (remaining > 0) {
            setCategory(t.category);
            setTotalTime(t.totalTime);
            setTimeLeft(remaining);
            setTimerState(t.state);
            startTimeRef.current = t.startedAt;
          } else {
            // Timer expired while away — clear it
            localStorage.removeItem("fg_active_timer");
          }
        } else if (t.state === "paused") {
          setCategory(t.category);
          setTotalTime(t.totalTime);
          setTimeLeft(t.timeLeft);
          setTimerState("paused");
          startTimeRef.current = t.startedAt;
        }
      }
    } catch { /* ignore corrupt data */ }

    return () => {
      document.title = originalTitleRef.current;
      ambientEngine?.stop();
    };
  }, []);

  useEffect(() => {
    if (progressWeekOffset === 0) {
      setWeekSessions(getWeekCategorySessions());
    } else {
      const base = getWeekStart();
      const d = new Date(base + "T00:00:00");
      d.setDate(d.getDate() + progressWeekOffset * 7);
      setWeekSessions(getWeekCategorySessionsForWeek(toLocalDateString(d)));
    }
  }, [showComplete, progressWeekOffset]);

  // Update tab title with countdown
  useEffect(() => {
    if (timerState === "running" || timerState === "paused" || timerState === "break") {
      const catEmoji = categoryMap[category]?.emoji || "🌱";
      const state = timerState === "break" ? "Break" : timerState === "paused" ? "⏸" : "";
      document.title = `${formatTime(timeLeft)} ${state} ${catEmoji} Focus Garden`;
    } else {
      document.title = "Focus Garden";
    }
  }, [timeLeft, timerState, category]);

  // Ambient sound management
  useEffect(() => {
    if (timerState === "running" && ambientSound !== "none") {
      ambientEngine?.play(ambientSound);
    } else if (timerState === "paused" || timerState === "idle") {
      ambientEngine?.stop();
    } else if (timerState === "break") {
      ambientEngine?.stop();
    }
  }, [timerState, ambientSound]);

  // Breathing exercise during focus mode break
  useEffect(() => {
    if (!focusMode || timerState !== "break") return;
    const breatheCycle = () => {
      setBreathePhase("inhale");
      setTimeout(() => setBreathePhase("hold"), 4000);
      setTimeout(() => setBreathePhase("exhale"), 7000);
    };
    breatheCycle();
    const interval = setInterval(breatheCycle, 11000);
    return () => clearInterval(interval);
  }, [focusMode, timerState]);

  const selectedCategory = categoryMap[category];

  const getTimerDuration = useCallback(
    (cat: string) => {
      const settings = getSettings();
      return settings.timerDurations?.[cat] || 25;
    },
    []
  );

  const completeSession = useCallback(() => {
    saveActiveTimer("idle", category, 0, 0, "");
    addSession({
      category,
      duration_minutes: Math.round(totalTime / 60),
      notes: notes || null,
      started_at: startTimeRef.current,
      completed_at: new Date().toISOString(),
    });
    setSessionCount((c) => c + 1);
    setCompletedCategory(category);
    setShowComplete(true);
    setNotes("");

    playCompletionSound();
    sendNotification(
      "Session Complete! 🌱",
      `Your ${categoryMap[category]?.plant || "plant"} is growing! Time for a break.`,
      categoryMap[category]?.emoji || "🌱"
    );

    // Check for new achievements
    setTimeout(() => {
      const newlyUnlocked = checkAndUnlockAchievements();
      if (newlyUnlocked.length > 0) {
        triggerConfetti();
        for (const a of newlyUnlocked) {
          showToast({
            emoji: a.emoji,
            title: `Achievement: ${a.name}`,
            description: a.description,
            type: "achievement",
          });
        }
      }
    }, 500);

    const settings = getSettings();
    setTimeout(() => {
      setShowComplete(false);
      const isLongBreak = (sessionCount + 1) % 4 === 0;
      const breakMinutes = isLongBreak ? settings.longBreak : settings.shortBreak;
      const breakTotal = breakMinutes * 60;
      setTimeLeft(breakTotal);
      setTotalTime(breakTotal);
      setTimerState("break");
      saveActiveTimer("break", category, breakTotal, breakTotal, startTimeRef.current);
    }, 2000);
  }, [category, notes, sessionCount, totalTime, saveActiveTimer]);

  const startTimer = useCallback(() => {
    const minutes = getTimerDuration(category);
    const total = minutes * 60;
    let elapsed = 0;
    let started: string;

    if (showBackdate && backdateTime) {
      const now = new Date();
      const [h, m] = backdateTime.split(":").map(Number);
      const backdateDate = new Date(now);
      backdateDate.setHours(h, m, 0, 0);
      // If the time is in the future, assume it was yesterday
      if (backdateDate > now) {
        backdateDate.setDate(backdateDate.getDate() - 1);
      }
      elapsed = Math.floor((now.getTime() - backdateDate.getTime()) / 1000);
      started = backdateDate.toISOString();
    } else {
      started = new Date().toISOString();
    }

    const remaining = total - elapsed;
    if (remaining <= 0) {
      // Already exceeded full duration — auto-complete
      startTimeRef.current = started;
      setTimeLeft(0);
      setTotalTime(total);
      setTimerState("running");
      setShowBackdate(false);
      setBackdateTime("");
      // Trigger completion on next tick
      setTimeout(() => completeSession(), 0);
      return;
    }

    setTimeLeft(remaining);
    setTotalTime(total);
    setTimerState("running");
    startTimeRef.current = started;
    setShowBackdate(false);
    setBackdateTime("");
    saveActiveTimer("running", category, total, remaining, started);
    requestNotificationPermission();
  }, [category, getTimerDuration, saveActiveTimer, showBackdate, backdateTime, completeSession]);

  const pauseTimer = () => {
    setTimerState("paused");
    setTimeLeft((t) => {
      saveActiveTimer("paused", category, totalTime, t, startTimeRef.current);
      return t;
    });
  };
  const resumeTimer = () => {
    setTimerState("running");
    setTimeLeft((t) => {
      saveActiveTimer("running", category, totalTime, t, startTimeRef.current);
      return t;
    });
  };

  const resetTimer = () => {
    setTimerState("idle");
    const minutes = getTimerDuration(category);
    setTimeLeft(minutes * 60);
    setTotalTime(minutes * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
    document.title = "Focus Garden";
    saveActiveTimer("idle", category, 0, 0, "");
  };

  useEffect(() => {
    if (timerState === "running" || timerState === "break") {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timerState === "running") {
              completeSession();
            } else {
              // Break ended
              sendNotification(
                "Break Over! ⏱️",
                "Ready for another session?",
                "🌱"
              );
              playCompletionSound();
              setTimerState("idle");
              const minutes = getTimerDuration(category);
              setTimeLeft(minutes * 60);
              setTotalTime(minutes * 60);
              localStorage.removeItem("fg_active_timer");
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, completeSession, category, getTimerDuration]);

  // Periodically save timer state so navigation away preserves accurate timeLeft
  useEffect(() => {
    if (timerState === "running" || timerState === "break") {
      const saveInterval = setInterval(() => {
        saveActiveTimer(timerState, category, totalTime, timeLeft, startTimeRef.current);
      }, 5000);
      return () => clearInterval(saveInterval);
    }
  }, [timerState, category, totalTime, timeLeft, saveActiveTimer]);

  const logBabyTime = () => {
    const now = new Date();
    const started = new Date(now.getTime() - babyMinutes * 60 * 1000);
    addSession({
      category: "baby",
      duration_minutes: babyMinutes,
      notes: babyActivity || null,
      started_at: started.toISOString(),
      completed_at: now.toISOString(),
    });
    setBabyActivity("");
    setBabyMinutes(30);
    setSessionCount((c) => c + 1);
    setCompletedCategory("baby");
    setShowComplete(true);
    setTimeout(() => setShowComplete(false), 2000);
  };

  const logManualSession = () => {
    const [hours, mins] = manualTime.split(":").map(Number);
    const completed = new Date();
    completed.setHours(hours, mins, 0, 0);
    const started = new Date(completed.getTime() - manualMinutes * 60 * 1000);
    addSession({
      category: manualCategory,
      duration_minutes: manualMinutes,
      notes: manualNotes || null,
      started_at: started.toISOString(),
      completed_at: completed.toISOString(),
    });
    setManualNotes("");
    setManualMinutes(25);
    setSessionCount((c) => c + 1);
    setShowManualLog(false);
    setCompletedCategory(manualCategory);
    setShowComplete(true);
    setTimeout(() => setShowComplete(false), 2000);
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (timerState !== "running") {
      setTimerState("idle");
      const minutes = getTimerDuration(newCat);
      setTimeLeft(minutes * 60);
      setTotalTime(minutes * 60);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (timerState === "idle") startTimer();
          else if (timerState === "running") pauseTimer();
          else if (timerState === "paused") resumeTimer();
          break;
        case "Escape":
          if (focusMode) setFocusMode(false);
          else if (timerState === "running" || timerState === "paused") resetTimer();
          break;
        case "KeyF":
          if (timerState === "idle") {
            startTimer();
            setFocusMode(true);
          } else if (timerState === "running" || timerState === "paused") {
            setFocusMode(!focusMode);
          }
          break;
        case "Digit1": if (timerState !== "running" && categories[0]) handleCategoryChange(categories[0].id); break;
        case "Digit2": if (timerState !== "running" && categories[1]) handleCategoryChange(categories[1].id); break;
        case "Digit3": if (timerState !== "running" && categories[2]) handleCategoryChange(categories[2].id); break;
        case "Digit4": if (timerState !== "running" && categories[3]) handleCategoryChange(categories[3].id); break;
        case "Digit5": if (timerState !== "running" && categories[4]) handleCategoryChange(categories[4].id); break;
        case "Digit6": if (timerState !== "running" && categories[5]) handleCategoryChange(categories[5].id); break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timerState, focusMode, startTimer, resumeTimer, handleCategoryChange]);

  // Focus mode gradient based on category
  const focusGradients: Record<string, string> = {
    coding: "from-emerald-900 via-green-800 to-teal-900",
    ai: "from-amber-900 via-orange-800 to-yellow-900",
    baby: "from-pink-900 via-rose-800 to-fuchsia-900",
    fitness: "from-teal-900 via-emerald-800 to-cyan-900",
    reading: "from-red-900 via-rose-800 to-orange-900",
    spiritual: "from-purple-900 via-violet-800 to-indigo-900",
  };
  const defaultGradient = "from-slate-900 via-gray-800 to-zinc-900";

  // Immersive Focus Mode
  if (focusMode && (timerState === "running" || timerState === "paused" || timerState === "break")) {
    return (
      <div
        className={`fixed inset-0 z-[60] bg-gradient-to-b ${focusGradients[category] || defaultGradient} flex flex-col items-center justify-center transition-all duration-1000`}
      >
        {/* Exit button */}
        <button
          onClick={() => setFocusMode(false)}
          className="absolute top-6 right-6 text-white/40 hover:text-white/80 text-sm transition-colors"
        >
          Exit Focus ×
        </button>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/10 rounded-full"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${Math.random() * 100}%`,
                animation: `drift ${15 + Math.random() * 20}s linear infinite ${Math.random() * 10}s`,
              }}
            />
          ))}
        </div>

        {/* Plant emoji floating */}
        <div className="text-6xl mb-8 animate-sway opacity-80">
          {timerState === "break" ? "☕" : getPlantEmoji(categoryMap[category]?.emoji || "🌱", weekSessions[category] || 0)}
        </div>

        {/* Timer circle */}
        <div className="relative mb-8">
          <svg width="300" height="300" className="-rotate-90">
            <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="150" cy="150" r="130" fill="none"
              stroke={timerState === "break" ? "rgba(96,165,250,0.8)" : "rgba(255,255,255,0.8)"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 130}
              strokeDashoffset={2 * Math.PI * 130 - (progress / 100) * 2 * Math.PI * 130}
              className="timer-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-7xl font-extralight tabular-nums tracking-tight">
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-white/50 mt-2">
              {timerState === "break"
                ? "Break Time"
                : timerState === "paused"
                ? "Paused"
                : selectedCategory.label}
            </span>
          </div>
        </div>

        {/* Breathing exercise during break */}
        {timerState === "break" && (
          <div className="mb-8 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-3 transition-all duration-[4000ms]"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                transform: breathePhase === "inhale" ? "scale(1.5)" : breathePhase === "hold" ? "scale(1.5)" : "scale(0.8)",
              }}
            />
            <p className="text-white/60 text-sm">
              {breathePhase === "inhale" && "Breathe in..."}
              {breathePhase === "hold" && "Hold..."}
              {breathePhase === "exhale" && "Breathe out..."}
            </p>
          </div>
        )}

        {/* Notes input */}
        {(timerState === "running" || timerState === "paused") && (
          <div className="text-center mb-6">
            <label className="text-[10px] text-white/40 mb-1 block">
              Session Notes (saved when complete)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What are you working on?"
              className="w-64 bg-white/10 border border-white/20 rounded-full px-5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 text-center"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4">
          {timerState === "running" && (
            <button
              onClick={pauseTimer}
              className="w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-xl transition-all"
            >
              ⏸
            </button>
          )}
          {timerState === "paused" && (
            <>
              <button
                onClick={resumeTimer}
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition-all"
              >
                ▶
              </button>
              <button
                onClick={() => { resetTimer(); setFocusMode(false); }}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-all"
              >
                ⏹
              </button>
            </>
          )}
          {timerState === "break" && (
            <button
              onClick={() => {
                setTimerState("idle");
                const minutes = getTimerDuration(category);
                setTimeLeft(minutes * 60);
                setTotalTime(minutes * 60);
                setFocusMode(false);
              }}
              className="px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm transition-all"
            >
              ⏭ Skip Break
            </button>
          )}
        </div>

        {/* Session counter */}
        <div className="absolute bottom-8 text-white/30 text-xs">
          Session {sessionCount + 1} today
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Focus Garden</h1>
          <p className="text-sm text-muted">
            Session {sessionCount + 1} today
            {!notificationsEnabled && timerState === "idle" && (
              <button
                onClick={() => {
                  requestNotificationPermission();
                  setTimeout(() => {
                    setNotificationsEnabled(
                      Notification.permission === "granted"
                    );
                  }, 1000);
                }}
                className="ml-2 text-xs text-blue-500 underline"
              >
                Enable notifications
              </button>
            )}
          </p>
        </div>

        {/* Category Selection */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              disabled={timerState === "running"}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                category === cat.id
                  ? "border-current shadow-md scale-105"
                  : "border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              } ${timerState === "running" ? "opacity-50" : ""}`}
              style={category === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-xs font-medium text-foreground">{cat.label}</span>
              <span className="text-[10px] text-muted">
                {weekSessions[cat.id] || 0}/{weeklyTargets[cat.id] || 0} this week
              </span>
            </button>
          ))}
        </div>

        {/* Completion animation */}
        {showComplete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="animate-grow text-center">
              <div className="text-8xl mb-4">{categoryMap[completedCategory]?.emoji || "🌱"}</div>
              <div className="text-4xl mb-2">💧</div>
              <p className="text-xl font-bold">Session Complete!</p>
              <p className="text-muted">Your {categoryMap[completedCategory]?.plant || "plant"} is growing!</p>
            </div>
          </div>
        )}

        {/* Baby Bonding - Manual Log */}
        {category === "baby" ? (
          <Card className="mb-6">
            <div className="text-center mb-4">
              <span className="text-6xl animate-sway inline-block">🌷</span>
              <h2 className="text-lg font-bold mt-2">Log Baby Time</h2>
              <p className="text-sm text-muted">
                No timer &mdash; just log the time you spent with your little one
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted">Duration (minutes)</label>
                <input
                  type="number"
                  value={babyMinutes}
                  onChange={(e) => setBabyMinutes(Number(e.target.value))}
                  min={1}
                  max={480}
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-lg font-semibold text-center focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted">Activity (optional)</label>
                <input
                  type="text"
                  value={babyActivity}
                  onChange={(e) => setBabyActivity(e.target.value)}
                  placeholder="e.g., Tummy time, reading, playing"
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900"
                />
              </div>
              <Button onClick={logBabyTime} className="w-full" size="lg">
                🌷 Log Baby Time
              </Button>
            </div>
          </Card>
        ) : (
          /* Timer Circle */
          <Card className="mb-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <svg width="280" height="280" className="-rotate-90">
                  <circle cx="140" cy="140" r="120" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="8" />
                  <circle
                    cx="140" cy="140" r="120" fill="none"
                    stroke={timerState === "break" ? "#60a5fa" : selectedCategory?.color || "#22c55e"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="timer-ring"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl mb-1">
                    {timerState === "break" ? "☕" : getPlantEmoji(categoryMap[category]?.emoji || "🌱", weekSessions[category] || 0)}
                  </span>
                  <span className="text-5xl font-bold tabular-nums">{formatTime(timeLeft)}</span>
                  <span className="text-sm text-muted mt-1">
                    {timerState === "break"
                      ? `${(sessionCount) % 4 === 0 ? "Long" : "Short"} Break`
                      : selectedCategory?.label || category}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3 mb-4">
                {timerState === "idle" && (
                  <>
                    <Button onClick={startTimer} size="lg" className="px-10">
                      ▶ Start
                    </Button>
                    <Button
                      onClick={() => { startTimer(); setFocusMode(true); }}
                      size="lg"
                      variant="secondary"
                      className="px-4"
                    >
                      🧘 Focus
                    </Button>
                  </>
                )}
                {timerState === "running" && (
                  <>
                    <Button onClick={pauseTimer} variant="secondary" size="lg">⏸ Pause</Button>
                    <Button onClick={resetTimer} variant="ghost" size="lg">⏹ Stop</Button>
                  </>
                )}
                {timerState === "paused" && (
                  <>
                    <Button onClick={resumeTimer} size="lg" className="px-8">▶ Resume</Button>
                    <Button onClick={resetTimer} variant="ghost" size="lg">⏹ Stop</Button>
                  </>
                )}
                {timerState === "break" && (
                  <Button
                    onClick={() => {
                      setTimerState("idle");
                      const minutes = getTimerDuration(category);
                      setTimeLeft(minutes * 60);
                      setTotalTime(minutes * 60);
                    }}
                    variant="secondary"
                    size="lg"
                  >
                    ⏭ Skip Break
                  </Button>
                )}
              </div>

              {/* Adjust start time */}
              {(timerState === "idle" || timerState === "running" || timerState === "paused") && (
                <div className="w-full text-center mb-2">
                  <button
                    onClick={() => {
                      setShowBackdate(!showBackdate);
                      if (!showBackdate) {
                        if (timerState === "idle") {
                          const now = new Date();
                          setBackdateTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
                        } else {
                          // Pre-fill with the current start time
                          const started = new Date(startTimeRef.current);
                          setBackdateTime(`${String(started.getHours()).padStart(2, "0")}:${String(started.getMinutes()).padStart(2, "0")}`);
                        }
                      }
                    }}
                    className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    {showBackdate ? "Cancel" : timerState === "idle" ? "Already started? Set start time" : "Adjust start time"}
                  </button>
                  {showBackdate && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <label className="text-xs text-muted">Started at</label>
                      <input
                        type="time"
                        value={backdateTime}
                        onChange={(e) => setBackdateTime(e.target.value)}
                        className="rounded-lg border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900"
                      />
                      {(timerState === "running" || timerState === "paused") && backdateTime && (
                        <button
                          onClick={() => {
                            const now = new Date();
                            const [h, m] = backdateTime.split(":").map(Number);
                            const bd = new Date(now);
                            bd.setHours(h, m, 0, 0);
                            if (bd > now) bd.setDate(bd.getDate() - 1);
                            const elapsed = Math.floor((now.getTime() - bd.getTime()) / 1000);
                            const remaining = totalTime - elapsed;
                            if (remaining > 0) {
                              setTimeLeft(remaining);
                              startTimeRef.current = bd.toISOString();
                              saveActiveTimer(timerState, category, totalTime, remaining, bd.toISOString());
                              setShowBackdate(false);
                              setBackdateTime("");
                            } else {
                              startTimeRef.current = bd.toISOString();
                              setShowBackdate(false);
                              setBackdateTime("");
                              completeSession();
                            }
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 active:scale-95 transition-all font-medium"
                        >
                          Apply
                        </button>
                      )}
                      {backdateTime && (() => {
                        const now = new Date();
                        const [h, m] = backdateTime.split(":").map(Number);
                        const bd = new Date(now);
                        bd.setHours(h, m, 0, 0);
                        if (bd > now) bd.setDate(bd.getDate() - 1);
                        const elapsedMin = Math.floor((now.getTime() - bd.getTime()) / 60000);
                        const timerMin = Math.round(totalTime / 60);
                        const remainMin = timerMin - elapsedMin;
                        return (
                          <span className={`text-xs ${remainMin > 0 ? "text-green-600" : "text-amber-600"}`}>
                            {remainMin > 0 ? `${remainMin}m left` : "auto-complete"}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {(timerState === "running" || timerState === "paused") && (
                <div className="w-full">
                  <label className="text-xs text-muted mb-1 block text-center">
                    Session Notes <span className="text-[9px]">(saved when session completes)</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`e.g., ${
                      category === "coding" ? "Two Sum - Easy"
                      : category === "ai" ? "Building RAG pipeline"
                      : category === "fitness" ? "Pilates class"
                      : category === "reading" ? "Designing Data-Intensive Apps Ch.3"
                      : "Morning devotional"
                    }`}
                    className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:border-current focus:outline-none"
                  />
                </div>
              )}

              {/* Ambient Sound Selector */}
              {timerState !== "break" && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted">Sound:</span>
                  {([
                    { id: "none" as AmbientSound, label: "Off", icon: "🔇" },
                    { id: "rain" as AmbientSound, label: "Rain", icon: "🌧️" },
                    { id: "forest" as AmbientSound, label: "Forest", icon: "🌲" },
                    { id: "cafe" as AmbientSound, label: "Cafe", icon: "☕" },
                  ]).map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => setAmbientSound(sound.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                        ambientSound === sound.id
                          ? "border-green-400 bg-green-50 dark:bg-green-900/30 font-medium"
                          : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {sound.icon} {sound.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Keyboard Shortcuts Hint */}
        {timerState === "idle" && category !== "baby" && (
          <div className="text-center text-[10px] text-muted space-x-3 animate-fade-in">
            <span><kbd className="px-1 py-0.5 rounded border border-card-border bg-gray-50 dark:bg-gray-800 text-[9px] font-mono">Space</kbd> Start</span>
            <span><kbd className="px-1 py-0.5 rounded border border-card-border bg-gray-50 dark:bg-gray-800 text-[9px] font-mono">F</kbd> Focus</span>
            <span><kbd className="px-1 py-0.5 rounded border border-card-border bg-gray-50 dark:bg-gray-800 text-[9px] font-mono">1-{categories.length}</kbd> Category</span>
          </div>
        )}

        {/* Manual Log */}
        {timerState === "idle" && category !== "baby" && (
          <Card className="mb-4">
            <button
              onClick={() => setShowManualLog(!showManualLog)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Log a Past Session</div>
                  <div className="text-[10px] text-muted">Manually add time you already spent</div>
                </div>
              </div>
              <span className="text-muted text-xs">{showManualLog ? "▲" : "▼"}</span>
            </button>

            {showManualLog && (
              <div className="mt-4 pt-4 border-t border-card-border space-y-3 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-muted">Category</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setManualCategory(cat.id)}
                        className={`text-sm px-2 py-1 rounded-lg border transition-all ${
                          manualCategory === cat.id
                            ? "border-current"
                            : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                        style={manualCategory === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted">Duration</label>
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(Number(e.target.value))}
                        min={1}
                        max={480}
                        className="w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400"
                      />
                      <span className="text-xs text-muted">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted">Time</label>
                    <input
                      type="time"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Notes (optional)</label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="What did you work on?"
                    className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <Button onClick={logManualSession} className="w-full" size="md">
                  📝 Log Session
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Quick stats */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted">
              {progressWeekOffset === 0 ? "This Week's Progress" : (() => {
                const base = getWeekStart();
                const d = new Date(base + "T00:00:00");
                d.setDate(d.getDate() + progressWeekOffset * 7);
                const end = new Date(d);
                end.setDate(end.getDate() + 6);
                const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return `${fmt(d)} – ${fmt(end)}`;
              })()}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setProgressWeekOffset((o) => o - 1)}
                className="w-6 h-6 rounded-full border border-card-border flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ‹
              </button>
              {progressWeekOffset !== 0 && (
                <button
                  onClick={() => setProgressWeekOffset(0)}
                  className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                >
                  Now
                </button>
              )}
              <button
                onClick={() => setProgressWeekOffset((o) => o + 1)}
                className="w-6 h-6 rounded-full border border-card-border flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ›
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <span className="text-sm w-5">{cat.emoji}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(((weekSessions[cat.id] || 0) / (weeklyTargets[cat.id] || 1)) * 100, 100)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
                <span className="text-xs text-muted w-10 text-right">
                  {weekSessions[cat.id] || 0}/{weeklyTargets[cat.id] || 0}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
