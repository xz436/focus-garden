"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useLanguage } from "@/components/providers/LanguageProvider";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || "Friend",
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      setSuccess(
        "Account created! Check your email for a confirmation link, or log in if email confirmation is disabled."
      );
      setMode("login");
      setLoading(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Check onboarding status
      const onboarded = localStorage.getItem("fg_onboarded");
      router.push(onboarded ? "/dashboard" : "/onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-background to-amber-50 dark:from-green-950 dark:via-background dark:to-amber-950 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-6 animate-fade-in">
        <div className="text-6xl animate-sway">🌱</div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-1 animate-fade-in">
        Welcome to Focus Garden
      </h1>
      <p className="text-sm text-muted mb-8 animate-fade-in">
        Grow your life, one session at a time.
      </p>

      {/* Auth Card */}
      <div className="w-full max-w-sm animate-fade-in">
        <div className="rounded-2xl bg-card border border-card-border p-6 shadow-sm">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-background border border-card-border overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-green-500 text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-green-500 text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (signup only) */}
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-2.5">
                {success}
              </div>
            )}

            {/* Submit */}
            <Button
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "..."
                : mode === "login"
                ? "Log In"
                : "Create Account"}
            </Button>
          </form>
        </div>

        {/* Back to landing */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>

        {/* Language selector */}
        <div className="mt-4 flex justify-center">
          <LanguageSelector compact />
        </div>
      </div>
    </div>
  );
}
