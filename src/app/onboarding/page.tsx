"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategoryId } from "@/types";
import { CATEGORY_LIST, getPlantEmoji } from "@/lib/constants";
import { saveSettings, getSettings, AppSettings } from "@/lib/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Step = "welcome" | "name" | "pillars" | "targets" | "ready";
const STEPS: Step[] = ["welcome", "name", "pillars", "targets", "ready"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [targets, setTargets] = useState<Record<CategoryId, number>>({
    coding: 15, ai: 8, baby: 14, fitness: 5, reading: 5, spiritual: 7,
  });
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [demoStage, setDemoStage] = useState(0);

  const goTo = (newStep: Step, dir: "forward" | "backward" = "forward") => {
    setDirection(dir);
    setStep(newStep);
  };

  // Animated garden demo on ready step
  useEffect(() => {
    if (step !== "ready") return;
    const interval = setInterval(() => {
      setDemoStage((s) => (s + 1) % 5);
    }, 1200);
    return () => clearInterval(interval);
  }, [step]);

  const handleFinish = () => {
    const settings = getSettings();
    const updated: AppSettings = {
      ...settings,
      displayName: name || "Friend",
      weeklyTargets: targets,
    };
    saveSettings(updated);
    localStorage.setItem("fg_onboarded", "true");
    router.push("/dashboard");
  };

  const slideClass = direction === "forward"
    ? "animate-slide-in-right"
    : "animate-slide-in-left";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-b from-green-50 via-background to-amber-50 dark:from-green-950 dark:via-background dark:to-amber-950 overflow-hidden">
      <div className="w-full max-w-md">
        {/* Step: Welcome */}
        {step === "welcome" && (
          <div key="welcome" className={`text-center space-y-6 ${slideClass}`}>
            {/* Animated garden scene */}
            <div className="relative h-40 flex items-end justify-center gap-4">
              {CATEGORY_LIST.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex flex-col items-center animate-grow"
                  style={{ animationDelay: `${idx * 0.2}s` }}
                >
                  <span
                    className="text-4xl animate-sway"
                    style={{ animationDelay: `${idx * 0.5}s` }}
                  >
                    {cat.emoji}
                  </span>
                </div>
              ))}
              {/* Floating elements */}
              <span
                className="absolute top-2 left-8 text-sm"
                style={{ animation: "float-onboard 4s ease-in-out infinite" }}
              >
                🦋
              </span>
              <span
                className="absolute top-4 right-10 text-xs"
                style={{ animation: "float-onboard 5s ease-in-out infinite 1s" }}
              >
                🐝
              </span>
            </div>

            <h1 className="text-3xl font-bold">Welcome to Focus Garden</h1>
            <p className="text-muted text-lg">
              Grow your life, one session at a time.
            </p>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Track your coding practice, AI learning, fitness, reading,
              spirituality, and baby bonding &mdash; all with a beautiful
              garden that grows as you do.
            </p>
            <Button onClick={() => goTo("name")} size="lg" className="w-full">
              Let&apos;s Get Started
            </Button>
          </div>
        )}

        {/* Step: Name */}
        {step === "name" && (
          <div key="name" className={`space-y-6 ${slideClass}`}>
            <div className="text-center">
              <div className="text-5xl mb-3 animate-bounce-gentle">👋</div>
              <h2 className="text-2xl font-bold">What&apos;s your name?</h2>
              <p className="text-sm text-muted mt-1">
                So we can greet you each morning!
              </p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full rounded-2xl border-2 border-card-border bg-white dark:bg-gray-800 px-6 py-4 text-xl text-center focus:outline-none focus:border-green-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
            {name && (
              <p className="text-center text-sm text-green-600 animate-fade-in">
                Nice to meet you, {name}! 🌱
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => goTo("welcome", "backward")} className="flex-1">
                Back
              </Button>
              <Button onClick={() => goTo("pillars")} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step: Pillars */}
        {step === "pillars" && (
          <div key="pillars" className={`space-y-6 ${slideClass}`}>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Your 6 Life Pillars</h2>
              <p className="text-sm text-muted mt-1">
                Each pillar grows a unique plant in your garden
              </p>
            </div>
            <div className="space-y-3">
              {CATEGORY_LIST.map((cat, idx) => (
                <Card
                  key={cat.id}
                  className="flex items-center gap-4"
                  style={{
                    animation: `fade-in 0.4s ease-out ${idx * 0.08}s both`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{cat.label}</div>
                    <div className="text-xs text-muted">
                      Grows a {cat.plant}
                    </div>
                  </div>
                  {/* Growth demo: seed → sprout → plant */}
                  <div className="flex gap-0.5 items-end">
                    <span className="text-xs opacity-30">🟤</span>
                    <span className="text-sm opacity-50">🌱</span>
                    <span className="text-xl animate-sway" style={{ animationDelay: `${idx * 0.3}s` }}>
                      {cat.emoji}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => goTo("name", "backward")} className="flex-1">
                Back
              </Button>
              <Button onClick={() => goTo("targets")} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step: Targets */}
        {step === "targets" && (
          <div key="targets" className={`space-y-6 ${slideClass}`}>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Set Weekly Targets</h2>
              <p className="text-sm text-muted mt-1">
                How many sessions per week for each pillar?
              </p>
              <p className="text-xs text-muted">
                (You can change these anytime in Settings)
              </p>
            </div>
            <div className="space-y-3">
              {CATEGORY_LIST.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-card-border p-3"
                  style={{ animation: `fade-in 0.3s ease-out ${idx * 0.06}s both` }}
                >
                  <span className="text-xl w-8">{cat.emoji}</span>
                  <span className="text-sm flex-1 font-medium">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setTargets((t) => ({
                          ...t,
                          [cat.id]: Math.max(0, t[cat.id] - 1),
                        }))
                      }
                      className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-all"
                    >
                      -
                    </button>
                    <span
                      className="w-8 text-center text-lg font-bold transition-all"
                      style={{ color: cat.color }}
                    >
                      {targets[cat.id]}
                    </span>
                    <button
                      onClick={() =>
                        setTargets((t) => ({
                          ...t,
                          [cat.id]: t[cat.id] + 1,
                        }))
                      }
                      className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="text-center text-xs text-muted">
              Total: {Object.values(targets).reduce((a, b) => a + b, 0)} sessions/week
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => goTo("pillars", "backward")} className="flex-1">
                Back
              </Button>
              <Button onClick={() => goTo("ready")} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === "ready" && (
          <div key="ready" className={`text-center space-y-6 ${slideClass}`}>
            {/* Animated garden demo */}
            <div className="relative rounded-2xl bg-gradient-to-b from-sky-100 via-sky-50 to-green-100 dark:from-sky-900/30 dark:via-sky-800/20 dark:to-green-900/30 p-6 overflow-hidden">
              {/* Clouds */}
              <span
                className="absolute text-lg opacity-20"
                style={{ top: "10%", animation: "drift 15s linear infinite" }}
              >
                ☁️
              </span>

              <div className="flex justify-center gap-4 pt-4 pb-2">
                {CATEGORY_LIST.map((cat, idx) => {
                  // Plants grow through stages in the demo
                  const stage = Math.max(0, demoStage - idx % 3);
                  const sessionCount = [0, 1, 4, 9, 16][Math.min(stage, 4)];

                  return (
                    <div
                      key={cat.id}
                      className="flex flex-col items-center gap-1 transition-all duration-500"
                    >
                      <span
                        className={`transition-all duration-500 ${
                          sessionCount > 0 ? "animate-sway" : "opacity-40"
                        } ${
                          sessionCount >= 16 ? "text-5xl" :
                          sessionCount >= 9 ? "text-4xl" :
                          sessionCount >= 4 ? "text-3xl" :
                          sessionCount >= 1 ? "text-2xl" : "text-xl"
                        }`}
                      >
                        {getPlantEmoji(cat.id, sessionCount)}
                      </span>
                      <span className="text-[9px] text-muted">{cat.plant}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted mt-2">
                Watch your plants grow with each session!
              </p>
            </div>

            <h2 className="text-2xl font-bold">
              Your garden is ready, {name || "Friend"}!
            </h2>
            <p className="text-muted">
              Start your first Pomodoro session and watch your plants grow.
              Every session waters your garden.
            </p>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-sm text-green-700 dark:text-green-400 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌱</span>
                <span>Complete sessions to water your plants</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">💧</span>
                <span>Plants grow through 5 stages</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌺</span>
                <span>Hit weekly targets for full bloom</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <span>Earn achievements and badges</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <span>Track trends and share reports</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => goTo("targets", "backward")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleFinish} size="lg" className="flex-1 text-lg">
                🌱 Start Growing!
              </Button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-500 ${
                step === s
                  ? "bg-green-500 w-8"
                  : STEPS.indexOf(step) > i
                  ? "bg-green-300 w-2"
                  : "bg-gray-200 dark:bg-gray-700 w-2"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Onboarding-specific animations */}
      <style jsx global>{`
        @keyframes float-onboard {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(15px, -10px) rotate(5deg); }
          50% { transform: translate(30px, 5px) rotate(-3deg); }
          75% { transform: translate(10px, -8px) rotate(3deg); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
