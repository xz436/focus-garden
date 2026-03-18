"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";
import { getTodayPacific, getPacificHour } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface EveningReflectionCardProps {
  allGoalsMet: boolean;
}

export default function EveningReflectionCard({
  allGoalsMet,
}: EveningReflectionCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    if (!user) return;

    const hour = getPacificHour();
    const isAfter4pm = hour >= 16;

    if (!isAfter4pm && !allGoalsMet) return;

    const supabase = createClient();
    const today = getTodayPacific();

    supabase
      .from("bible_journal")
      .select("completed_at, evening_completed_at")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.completed_at) return; // No morning devotion
        if (data.evening_completed_at) {
          setAlreadyDone(true);
          setShowCard(true);
          return;
        }

        // Show card always, show modal only if not dismissed
        setShowCard(true);
        const dismissKey = `fg_evening_dismissed_${today}`;
        if (!sessionStorage.getItem(dismissKey)) {
          setShowModal(true);
        }
      });
  }, [user, allGoalsMet]);

  const handleDismiss = () => {
    const dismissKey = `fg_evening_dismissed_${getTodayPacific()}`;
    sessionStorage.setItem(dismissKey, "1");
    setShowModal(false);
  };

  const handleStart = () => {
    setShowModal(false);
    router.push("/evening-reflection");
  };

  if (!showCard) return null;

  if (alreadyDone) {
    return (
      <Card className="bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20 border-amber-200/50 dark:border-amber-800/30 animate-fade-in">
        <div className="flex items-center gap-3">
          <span className="text-xl">{"\uD83C\uDF19"}</span>
          <div>
            <p className="text-sm font-medium">Evening reflection complete</p>
            <p className="text-xs text-muted">Rest well tonight</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Always show the card as an entry point */}
      <Card
        className="bg-gradient-to-br from-card to-amber-50/40 dark:to-amber-950/20 border-amber-300/50 dark:border-amber-700/30 animate-fade-in cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleStart}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{"\uD83C\uDF05"}</span>
            <div>
              <p className="text-sm font-medium">
                {allGoalsMet
                  ? "All goals met! Time to reflect"
                  : "Evening Reflection"}
              </p>
              <p className="text-xs text-muted">
                Tap to look back on your day with gratitude
              </p>
            </div>
          </div>
          <span className="text-muted text-lg">{"\u2192"}</span>
        </div>
      </Card>

      {/* Modal popup (only first time) */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-card border border-card-border shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 dark:from-amber-600 dark:via-orange-600 dark:to-rose-600 px-6 py-8 text-center">
                <div className="text-5xl mb-3">{"\uD83C\uDF05"}</div>
                <h2 className="text-xl font-bold text-white">
                  {allGoalsMet
                    ? "You crushed your goals today!"
                    : "Time to Wind Down"}
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  {allGoalsMet
                    ? "All sessions complete. Let's reflect."
                    : "Take a moment to look back on your day"}
                </p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-foreground/70 text-center leading-relaxed">
                  A short evening reflection to end your day with gratitude and
                  connect back to this morning's passage.
                </p>
                <Button
                  onClick={handleStart}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  size="lg"
                >
                  Begin Evening Reflection
                </Button>
                <button
                  onClick={handleDismiss}
                  className="w-full text-center text-xs text-muted hover:text-foreground transition-colors py-1"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
