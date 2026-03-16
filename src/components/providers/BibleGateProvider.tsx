"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";

// Pages that should NOT be gated
const EXEMPT_PATHS = [
  "/bible-gate",
  "/login",
  "/auth",
  "/onboarding",
  "/evening-reflection",
  "/journal",
  "/",
  "/share",
];

export default function BibleGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // No user = no gate
    if (!user) {
      setChecked(true);
      return;
    }

    // Exempt paths don't need gate check
    if (EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      setChecked(true);
      return;
    }

    // Check sessionStorage cache first (avoid DB call on every navigation)
    const cacheKey = `fg_bible_gate_${new Date().toISOString().split("T")[0]}`;
    if (sessionStorage.getItem(cacheKey) === "passed") {
      setChecked(true);
      return;
    }

    // Check Supabase for today's completion
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    supabase
      .from("bible_journal")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Table might not exist yet — let through
          console.warn("Bible gate check failed:", error.message);
          setChecked(true);
          return;
        }

        if (data?.completed_at) {
          // Already completed today — cache it and let through
          sessionStorage.setItem(cacheKey, "passed");
          setChecked(true);
        } else {
          // Not completed — redirect to gate
          router.replace("/bible-gate");
        }
      });
  }, [user, authLoading, pathname, router]);

  if (!checked && !EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl mb-2 animate-pulse">{"\u2728"}</div>
          <p className="text-sm text-muted">Checking daily devotion...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
