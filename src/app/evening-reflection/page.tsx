"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";
import { getTodaySessions, addSession } from "@/lib/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const STEPS = ["Day Review", "Reflection", "Gratitude"];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface JournalEntry {
  id: string;
  passage_text: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  journal_entry: string;
  evening_completed_at: string | null;
}

export default function EveningReflectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [reference, setReference] = useState("");

  // Reflection chat state
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatDone, setChatDone] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Gratitude state
  const [gratitude, setGratitude] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  // Today's sessions for context
  const [sessionsSummary, setSessionsSummary] = useState<
    { category: string; duration: number }[]
  >([]);

  const today = new Date().toISOString().split("T")[0];

  // Load today's journal and sessions
  useEffect(() => {
    if (authLoading || !user) return;

    const supabase = createClient();
    supabase
      .from("bible_journal")
      .select(
        "id, passage_text, book, chapter, verse_start, verse_end, journal_entry, evening_completed_at"
      )
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          // No morning devotion done
          router.replace("/dashboard");
          return;
        }
        if (data.evening_completed_at) {
          router.replace("/dashboard");
          return;
        }
        setJournal(data);
        setReference(
          `${data.book} ${data.chapter}:${data.verse_start}-${data.verse_end}`
        );
        setLoading(false);
      });

    // Get today's sessions
    const sessions = getTodaySessions();
    const summary = sessions.map((s) => ({
      category: s.category,
      duration: s.duration_minutes,
    }));
    setSessionsSummary(summary);
  }, [user, authLoading, today, router]);

  // Start AI reflection
  const startReflection = async () => {
    if (!journal) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/bible-evening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: journal.passage_text,
          reference,
          morningJournal: journal.journal_entry,
          todaySessions: sessionsSummary,
          messages: [],
        }),
      });
      const data = await res.json();
      setChat([{ role: "assistant", content: data.message }]);
    } catch {
      console.error("Failed to start evening reflection");
    }
    setChatLoading(false);
  };

  // Send chat message
  const sendMessage = async () => {
    if (!chatInput.trim() || !journal) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newChat = [...chat, userMsg];
    setChat(newChat);
    setChatInput("");

    const userMsgCount = newChat.filter((m) => m.role === "user").length;

    if (userMsgCount >= 3) {
      setChatDone(true);
      return;
    }

    setChatLoading(true);
    try {
      const res = await fetch("/api/bible-evening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: journal.passage_text,
          reference,
          morningJournal: journal.journal_entry,
          todaySessions: sessionsSummary,
          messages: newChat,
        }),
      });
      const data = await res.json();
      const updatedChat = [
        ...newChat,
        { role: "assistant" as const, content: data.message },
      ];
      setChat(updatedChat);

      if (userMsgCount >= 2) {
        setChatDone(true);
      }
    } catch {
      console.error("Failed to send message");
    }
    setChatLoading(false);
  };

  // Complete evening reflection
  const complete = async () => {
    if (!user || !journal) return;

    const supabase = createClient();
    await supabase
      .from("bible_journal")
      .update({
        evening_reflection: chat,
        evening_gratitude: gratitude,
        evening_completed_at: new Date().toISOString(),
      })
      .eq("id", journal.id);

    // Log a spiritual session for evening reflection
    addSession({
      category: "spiritual",
      duration_minutes: 10,
      notes: `Evening reflection: ${reference}`,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    setShowComplete(true);
  };

  // Step navigation
  const goNext = () => {
    const next = step + 1;
    setStep(next);
    if (next === 1 && chat.length === 0) {
      startReflection();
    }
  };

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const gratitudeSentences = gratitude
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 5).length;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{"\uD83C\uDF19"}</div>
          <p className="text-muted">Preparing your evening reflection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-card-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted font-medium">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-muted">{STEPS[step]}</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= step
                    ? "bg-amber-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Step 0: Day Review */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Evening Reflection</h1>
              <p className="text-sm text-muted">
                Look back on your day with gratitude
              </p>
            </div>

            {/* Morning passage reminder */}
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
              <p className="text-xs text-muted mb-1">This morning's passage</p>
              <p className="text-sm font-medium mb-2">{reference}</p>
              <p className="text-sm leading-relaxed text-foreground/70 line-clamp-4">
                {journal?.passage_text}
              </p>
            </Card>

            {/* Today's sessions */}
            <Card>
              <p className="text-sm font-medium mb-3">
                Today's Focus Sessions
              </p>
              {sessionsSummary.length > 0 ? (
                <div className="space-y-2">
                  {sessionsSummary.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">{s.category}</span>
                      <span className="text-muted">{s.duration}min</span>
                    </div>
                  ))}
                  <div className="border-t border-card-border pt-2 mt-2 flex justify-between text-sm font-medium">
                    <span>Total</span>
                    <span>
                      {sessionsSummary.reduce((sum, s) => sum + s.duration, 0)}
                      min
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No sessions recorded today — that's okay. Rest is important
                  too.
                </p>
              )}
            </Card>

            <Button onClick={goNext} className="w-full" size="lg">
              Begin Reflection
            </Button>
          </div>
        )}

        {/* Step 1: AI Reflection Chat */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">How Was Your Day?</h1>
              <p className="text-sm text-muted">
                Reflect on how today's passage showed up in your life
              </p>
            </div>

            <Card className="space-y-4 max-h-[50vh] overflow-y-auto">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-amber-500 text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </Card>

            {!chatDone ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Share how your day went..."
                  className="flex-1 rounded-xl border border-card-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  disabled={chatLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || chatLoading}
                >
                  Send
                </Button>
              </div>
            ) : (
              <Button onClick={goNext} className="w-full" size="lg">
                Continue to Gratitude
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Gratitude & Close */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Gratitude & Prayer</h1>
              <p className="text-sm text-muted">
                End your day with thankfulness
              </p>
            </div>

            <Card>
              <textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Today I'm grateful for..."
                className="w-full h-40 bg-transparent resize-none text-sm leading-relaxed focus:outline-none placeholder:text-muted/50"
              />
              <div className="pt-2 border-t border-card-border">
                <span
                  className={`text-xs ${
                    gratitudeSentences >= 1 ? "text-amber-600" : "text-muted"
                  }`}
                >
                  {gratitude.length > 0
                    ? `${gratitude.length} characters`
                    : "Write anything on your heart"}
                </span>
              </div>
            </Card>

            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
              <p className="text-sm italic text-foreground/70 text-center leading-relaxed">
                "Give thanks in all circumstances; for this is God's will for
                you in Christ Jesus." — 1 Thessalonians 5:18
              </p>
            </Card>

            <Button
              onClick={complete}
              disabled={gratitude.trim().length < 10}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              size="lg"
            >
              Complete Evening Reflection
            </Button>
          </div>
        )}
      </div>

      {/* Encouragement Modal */}
      {showComplete && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-sm rounded-3xl bg-card border border-card-border shadow-2xl overflow-hidden animate-fade-in">
              <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 px-6 py-8 text-center">
                <div className="text-5xl mb-3">{"\uD83C\uDF1F"}</div>
                <h2 className="text-xl font-bold text-white">
                  Beautiful Day Complete
                </h2>
                <p className="text-white/80 text-sm mt-2">
                  You started and ended your day with God.
                  <br />
                  That takes real commitment.
                </p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-foreground/70 text-center leading-relaxed italic">
                  {[
                    "\"The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.\" — Zephaniah 3:17",
                    "\"Be still, and know that I am God.\" — Psalm 46:10",
                    "\"His mercies are new every morning; great is your faithfulness.\" — Lamentations 3:23",
                    "\"Come to me, all you who are weary, and I will give you rest.\" — Matthew 11:28",
                    "\"The peace of God, which transcends all understanding, will guard your hearts and minds.\" — Philippians 4:7",
                  ][new Date().getDate() % 5]}
                </p>
                <Button
                  onClick={() => router.replace("/dashboard")}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="lg"
                >
                  Rest Well Tonight
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
