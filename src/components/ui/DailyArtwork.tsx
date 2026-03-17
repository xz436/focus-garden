"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";
import { getTodayPacific } from "@/lib/utils";
import Card from "@/components/ui/Card";

const PRAYERS = [
  "Lord, thank You for Your Word today. Let it take root in my heart.",
  "Help me carry the truth of this passage into everything I do.",
  "Open my eyes to see where You are at work around me.",
  "Thank You for this time of stillness. May I return to it today.",
  "Father, let my life reflect what I've read. Use me for Your glory.",
];

export default function DailyArtwork() {
  const { user } = useAuth();
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const today = getTodayPacific();

    supabase
      .from("bible_journal")
      .select("artwork_url, book, chapter, verse_start, verse_end")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReference(
            `${data.book} ${data.chapter}:${data.verse_start}-${data.verse_end}`
          );
          if (data.artwork_url) {
            setArtworkUrl(data.artwork_url);
            setRevealed(true);
          }
        }
        setLoading(false);
      });

    // Poll for artwork if not ready yet
    if (!artworkUrl) {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from("bible_journal")
          .select("artwork_url")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (data?.artwork_url) {
          setArtworkUrl(data.artwork_url);
          // Delay reveal for nice transition
          setTimeout(() => setRevealed(true), 300);
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user, artworkUrl]);

  if (loading || !reference) return null;

  // Pick a prayer based on the day
  const prayerIdx = new Date().getDate() % PRAYERS.length;

  return (
    <Card className="overflow-hidden p-0 animate-fade-in">
      {revealed && artworkUrl ? (
        <div className="relative h-36 overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artworkUrl}
            alt={`Artwork inspired by ${reference}`}
            className="w-full object-cover transition-opacity duration-1000 opacity-100"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
            <p className="text-white text-xs font-medium">{reference}</p>
            <p className="text-white/70 text-xs">Today's devotional artwork</p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-5 bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{"\u2728"}</span>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">{reference}</p>
              <p className="text-sm italic text-foreground/80 leading-relaxed">
                {PRAYERS[prayerIdx]}
              </p>
              <p className="text-xs text-muted mt-2 animate-pulse">
                Your artwork is being painted...
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
