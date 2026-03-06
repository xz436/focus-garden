"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_LIST, getPlantEmoji } from "@/lib/constants";
import Button from "@/components/ui/Button";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [demoStage, setDemoStage] = useState(0);

  useEffect(() => {
    setMounted(true);
    const onboarded = localStorage.getItem("fg_onboarded");
    setIsOnboarded(!!onboarded);
  }, []);

  // Auto-redirect if already onboarded
  useEffect(() => {
    if (isOnboarded === true) {
      router.push("/dashboard");
    }
  }, [isOnboarded, router]);

  // Animated garden demo
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStage((s) => (s + 1) % 6);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted || isOnboarded === null || isOnboarded === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 via-background to-amber-50 dark:from-green-950 dark:via-background dark:to-amber-950">
        <div className="animate-sway text-7xl">🌱</div>
      </div>
    );
  }

  const features = [
    { icon: "⏱️", label: "Pomodoro Timer", desc: "Focus sessions with ambient sounds" },
    { icon: "🌿", label: "Growing Garden", desc: "Plants grow as you practice" },
    { icon: "💻", label: "Blind 75 Tracker", desc: "Track your LeetCode progress" },
    { icon: "📊", label: "Analytics", desc: "Trends, insights, and reports" },
    { icon: "🏆", label: "Achievements", desc: "24 badges to unlock" },
    { icon: "📝", label: "Daily Planning", desc: "Set intentions and reflect" },
    { icon: "🧘", label: "Focus Mode", desc: "Immersive distraction-free timer" },
    { icon: "🌙", label: "Dark Mode", desc: "Easy on the eyes at night" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-background to-amber-50 dark:from-green-950 dark:via-background dark:to-amber-950 overflow-hidden">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center px-6">
        {/* Floating background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span
            className="absolute text-2xl opacity-10"
            style={{ top: "15%", left: "5%", animation: "drift 25s linear infinite" }}
          >
            ☁️
          </span>
          <span
            className="absolute text-lg opacity-10"
            style={{ top: "8%", left: "60%", animation: "drift 30s linear infinite 8s" }}
          >
            ☁️
          </span>
          <span
            className="absolute text-sm"
            style={{ top: "20%", left: "85%", animation: "landing-float 6s ease-in-out infinite" }}
          >
            🦋
          </span>
          <span
            className="absolute text-xs"
            style={{ top: "35%", left: "8%", animation: "landing-float 8s ease-in-out infinite 2s" }}
          >
            🐝
          </span>
          {/* Sparkles */}
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="absolute text-sm"
              style={{
                top: `${20 + i * 15}%`,
                left: `${15 + i * 20}%`,
                animation: `landing-sparkle 3s ease-in-out infinite ${i * 0.8}s`,
              }}
            >
              ✨
            </span>
          ))}
        </div>

        {/* Animated Garden Demo */}
        <div className="relative mb-6 animate-fade-in">
          <div className="relative rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-green-100 dark:from-sky-900/30 dark:via-sky-800/20 dark:to-green-900/30 px-8 py-10 overflow-hidden shadow-lg border border-green-100 dark:border-green-800">
            {/* Sun */}
            <div className="absolute top-3 right-5">
              <span
                className="text-2xl"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(255,200,0,0.4))",
                  animation: "pulse-soft 3s ease-in-out infinite",
                }}
              >
                ☀️
              </span>
            </div>

            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-amber-200/50 to-transparent" />

            <div className="flex justify-center gap-5 relative z-10">
              {CATEGORY_LIST.map((cat, idx) => {
                const stage = Math.max(0, (demoStage - idx + 6) % 6);
                const sessionCount = [0, 0, 1, 4, 9, 16][Math.min(stage, 5)];
                const size =
                  sessionCount >= 16 ? "text-5xl" :
                  sessionCount >= 9 ? "text-4xl" :
                  sessionCount >= 4 ? "text-3xl" :
                  sessionCount >= 1 ? "text-2xl" : "text-xl";

                return (
                  <div
                    key={cat.id}
                    className="flex flex-col items-center gap-1 transition-all duration-700"
                  >
                    <span
                      className={`transition-all duration-700 ${size} ${
                        sessionCount > 0 ? "animate-sway" : "opacity-30"
                      }`}
                      style={{ animationDelay: `${idx * 0.4}s` }}
                    >
                      {getPlantEmoji(cat.id, sessionCount)}
                    </span>
                    <span className="text-[9px] text-muted font-medium">{cat.label.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Focus Garden
          </h1>
          <p className="text-muted text-lg max-w-md mx-auto leading-relaxed">
            Grow your life, one session at a time.
          </p>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
            Track 6 life pillars with a Pomodoro timer. Watch your virtual garden
            bloom as you build consistent habits.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 w-full max-w-sm animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Link href="/onboarding">
            <Button size="lg" className="w-full text-base shadow-lg shadow-green-200 dark:shadow-green-900">
              🌱 Get Started
            </Button>
          </Link>
          <Link href="/dashboard">
            <button className="w-full text-sm text-muted hover:text-foreground transition-colors py-2">
              I already have data &rarr;
            </button>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 pb-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-2xl font-bold text-center mb-2 animate-fade-in">
            Everything you need to grow
          </h2>
          <p className="text-sm text-muted text-center mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            A complete productivity system wrapped in a beautiful garden
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, idx) => (
              <div
                key={feature.label}
                className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-card-border p-4 hover:scale-105 transition-transform animate-fade-in"
                style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
              >
                <span className="text-2xl">{feature.icon}</span>
                <div className="mt-2">
                  <div className="text-sm font-semibold">{feature.label}</div>
                  <div className="text-xs text-muted mt-0.5">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* The 6 Pillars */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <h3 className="text-lg font-bold text-center mb-4">
              Your 6 Life Pillars
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORY_LIST.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-card-border p-4"
                >
                  <span className="text-3xl animate-sway">{cat.emoji}</span>
                  <span className="text-xs font-semibold">{cat.label}</span>
                  <span className="text-[10px] text-muted">{cat.plant}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <h3 className="text-lg font-bold text-center mb-6">
              How It Works
            </h3>
            <div className="space-y-4">
              {[
                { step: "1", icon: "⏱️", title: "Start a Focus Session", desc: "Choose a category and set your timer" },
                { step: "2", icon: "💧", title: "Water Your Plants", desc: "Each completed session waters your garden" },
                { step: "3", icon: "🌺", title: "Watch Them Grow", desc: "Plants evolve through 5 stages as you practice" },
                { step: "4", icon: "📊", title: "Track & Reflect", desc: "Review your progress and share with others" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-sm font-semibold">{item.title}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <Link href="/onboarding">
              <Button size="lg" className="w-full max-w-sm text-base">
                🌱 Start Your Garden
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted">
              Built with 💚 for the journey to OpenAI
            </p>
            <p className="text-[10px] text-muted mt-1">
              Focus Garden v1.0 &middot; Offline-first &middot; 13 pages &middot; PWA ready
            </p>
          </div>
        </div>
      </div>

      {/* Landing page animations */}
      <style jsx global>{`
        @keyframes landing-float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -15px) rotate(5deg); }
          50% { transform: translate(40px, 5px) rotate(-3deg); }
          75% { transform: translate(15px, -10px) rotate(3deg); }
        }
        @keyframes landing-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 0.6; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
