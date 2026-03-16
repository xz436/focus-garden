"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface JournalEntry {
  id: string;
  date: string;
  day_number: number;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  passage_text: string;
  journal_entry: string | null;
  reflection_chat: { role: string; content: string }[] | null;
  evening_reflection: { role: string; content: string }[] | null;
  evening_gratitude: string | null;
  artwork_url: string | null;
  completed_at: string | null;
  evening_completed_at: string | null;
}

export default function JournalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const supabase = createClient();
    supabase
      .from("bible_journal")
      .select("*")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setEntries(data || []);
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{"\uD83D\uDCD6"}</div>
          <p className="text-muted">Loading your journal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen pb-24 pt-6 px-4 bg-background">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Journal</h1>
            <p className="text-sm text-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        {entries.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <div className="text-3xl mb-3">{"\uD83D\uDCD6"}</div>
              <p className="text-muted text-sm">
                No journal entries yet. Complete your first morning devotion to
                start your journal.
              </p>
            </div>
          </Card>
        ) : (
          entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const reference = `${entry.book} ${entry.chapter}:${entry.verse_start}-${entry.verse_end}`;

            return (
              <Card
                key={entry.id}
                className="overflow-hidden p-0 cursor-pointer"
                onClick={() =>
                  setExpandedId(isExpanded ? null : entry.id)
                }
              >
                {/* Artwork banner if available */}
                {entry.artwork_url && (
                  <div className="h-24 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.artwork_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  {/* Date and reference */}
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted">
                      Day {entry.day_number} &middot; {formatDate(entry.date)}
                    </p>
                    <div className="flex gap-1">
                      {entry.completed_at && (
                        <span className="text-xs" title="Morning devotion">
                          {"\u2600\uFE0F"}
                        </span>
                      )}
                      {entry.evening_completed_at && (
                        <span className="text-xs" title="Evening reflection">
                          {"\uD83C\uDF19"}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-semibold mb-2">{reference}</p>

                  {/* Preview or full content */}
                  {!isExpanded ? (
                    <p className="text-sm text-foreground/70 line-clamp-2">
                      {entry.journal_entry || "No journal entry"}
                    </p>
                  ) : (
                    <div
                      className="space-y-5 mt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Passage */}
                      <div>
                        <p className="text-xs font-medium text-muted mb-1 uppercase tracking-wide">
                          Passage
                        </p>
                        <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                          {entry.passage_text}
                        </p>
                      </div>

                      {/* Morning Journal */}
                      {entry.journal_entry && (
                        <div>
                          <p className="text-xs font-medium text-muted mb-1 uppercase tracking-wide">
                            Morning Journal
                          </p>
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {entry.journal_entry}
                          </p>
                        </div>
                      )}

                      {/* Morning Reflection Chat */}
                      {entry.reflection_chat &&
                        entry.reflection_chat.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">
                              Morning Reflection
                            </p>
                            <div className="space-y-2">
                              {entry.reflection_chat.map((msg, i) => (
                                <div
                                  key={i}
                                  className={`flex ${
                                    msg.role === "user"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                                      msg.role === "user"
                                        ? "bg-spiritual/20 rounded-br-md"
                                        : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Evening Reflection Chat */}
                      {entry.evening_reflection &&
                        entry.evening_reflection.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">
                              Evening Reflection
                            </p>
                            <div className="space-y-2">
                              {entry.evening_reflection.map((msg, i) => (
                                <div
                                  key={i}
                                  className={`flex ${
                                    msg.role === "user"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                                      msg.role === "user"
                                        ? "bg-amber-500/20 rounded-br-md"
                                        : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Evening Gratitude */}
                      {entry.evening_gratitude && (
                        <div>
                          <p className="text-xs font-medium text-muted mb-1 uppercase tracking-wide">
                            Gratitude
                          </p>
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {entry.evening_gratitude}
                          </p>
                        </div>
                      )}

                      {/* Artwork full view */}
                      {entry.artwork_url && (
                        <div>
                          <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">
                            Artwork
                          </p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.artwork_url}
                            alt={`Artwork for ${reference}`}
                            className="w-full rounded-xl"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => setExpandedId(null)}
                        className="w-full text-center text-xs text-muted hover:text-foreground py-2"
                      >
                        Collapse
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
