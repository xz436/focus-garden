"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";
import { addSession } from "@/lib/store";
import { getTodayPacific } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const STEPS = [
  "Today's Passage",
  "Comprehension Quiz",
  "Reflection",
  "Journal",
];

interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ReadingPlan {
  day_number: number;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  reference: string;
}

export default function BibleGatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reading plan state
  const [todayPlan, setTodayPlan] = useState<ReadingPlan | null>(null);
  const [passageText, setPassageText] = useState("");
  const [passageLoading, setPassageLoading] = useState(false);
  const [startedAt, setStartedAt] = useState("");

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Reflection state
  const [reflectionChat, setReflectionChat] = useState<ChatMessage[]>([]);
  const [reflectionInput, setReflectionInput] = useState("");
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Journal state
  const [journalEntry, setJournalEntry] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  // Journal entry ID for updates
  const [journalId, setJournalId] = useState<string | null>(null);

  const today = getTodayPacific();

  // Check if already completed today
  useEffect(() => {
    if (authLoading || !user) return;

    const supabase = createClient();
    supabase
      .from("bible_journal")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.completed_at) {
          router.replace("/dashboard");
        } else {
          setLoading(false);
        }
      });
  }, [user, authLoading, today, router]);

  // Load today's reading plan
  useEffect(() => {
    if (loading || !user) return;

    const supabase = createClient();

    async function loadPlan() {
      // Find which day the user is on
      // Count how many completed journal entries they have
      const { count } = await supabase
        .from("bible_journal")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .not("completed_at", "is", null);

      const dayNumber = ((count ?? 0) % 30) + 1;

      const { data: plan } = await supabase
        .from("bible_reading_plan")
        .select("*")
        .eq("day_number", dayNumber)
        .single();

      if (plan) {
        setTodayPlan(plan);
      }
    }

    loadPlan();
  }, [loading, user]);

  // Fetch passage text from Bible API
  useEffect(() => {
    if (!todayPlan) return;

    async function fetchPassage() {
      setPassageLoading(true);
      try {
        const ref = `${todayPlan!.book}${todayPlan!.chapter}:${todayPlan!.verse_start}-${todayPlan!.verse_end}`;
        const res = await fetch(
          `https://bible-api.com/${encodeURIComponent(ref)}`
        );
        const data = await res.json();
        setPassageText(data.text || "Failed to load passage.");
        setStartedAt(new Date().toISOString());
      } catch {
        setPassageText("Failed to load passage. Please try again.");
      }
      setPassageLoading(false);
    }

    fetchPassage();
  }, [todayPlan]);

  // Create or fetch today's journal entry
  useEffect(() => {
    if (!todayPlan || !user || !passageText) return;

    const supabase = createClient();
    supabase
      .from("bible_journal")
      .upsert(
        {
          user_id: user.id,
          date: today,
          day_number: todayPlan.day_number,
          book: todayPlan.book,
          chapter: todayPlan.chapter,
          verse_start: todayPlan.verse_start,
          verse_end: todayPlan.verse_end,
          passage_text: passageText,
        },
        { onConflict: "user_id,date" }
      )
      .select("id")
      .single()
      .then(({ data }) => {
        if (data) setJournalId(data.id);
      });
  }, [todayPlan, user, passageText, today]);

  // Generate quiz
  const generateQuiz = useCallback(async () => {
    if (!passageText || !todayPlan) return;
    setQuizLoading(true);
    try {
      const res = await fetch("/api/bible-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: passageText,
          reference: todayPlan.reference,
        }),
      });
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      console.error("Failed to generate quiz");
    }
    setQuizLoading(false);
  }, [passageText, todayPlan]);

  // Start reflection
  const startReflection = useCallback(async () => {
    if (!passageText || !todayPlan) return;
    setReflectionLoading(true);
    try {
      const res = await fetch("/api/bible-reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: passageText,
          reference: todayPlan.reference,
          messages: [],
        }),
      });
      const data = await res.json();
      setReflectionChat([{ role: "assistant", content: data.message }]);
    } catch {
      console.error("Failed to start reflection");
    }
    setReflectionLoading(false);
  }, [passageText, todayPlan]);

  // Send reflection message
  const sendReflection = async () => {
    if (!reflectionInput.trim() || !passageText || !todayPlan) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: reflectionInput.trim(),
    };
    const newChat = [...reflectionChat, userMsg];
    setReflectionChat(newChat);
    setReflectionInput("");

    // Count user messages (exchanges)
    const userMsgCount = newChat.filter((m) => m.role === "user").length;

    if (userMsgCount >= 3) {
      setReflectionDone(true);
      // Save reflection chat
      if (journalId) {
        const supabase = createClient();
        await supabase
          .from("bible_journal")
          .update({ reflection_chat: newChat })
          .eq("id", journalId);
      }
      return;
    }

    setReflectionLoading(true);
    try {
      const res = await fetch("/api/bible-reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: passageText,
          reference: todayPlan.reference,
          messages: newChat,
        }),
      });
      const data = await res.json();
      const updatedChat = [
        ...newChat,
        { role: "assistant" as const, content: data.message },
      ];
      setReflectionChat(updatedChat);

      // If we've hit 3 user messages after this response comes back, mark done
      if (userMsgCount >= 2) {
        setReflectionDone(true);
        if (journalId) {
          const supabase = createClient();
          await supabase
            .from("bible_journal")
            .update({ reflection_chat: updatedChat })
            .eq("id", journalId);
        }
      }
    } catch {
      console.error("Failed to send reflection");
    }
    setReflectionLoading(false);
  };

  // Complete the gate
  const completeGate = async () => {
    if (!user || !journalId || !todayPlan) return;

    const supabase = createClient();
    await supabase
      .from("bible_journal")
      .update({
        quiz_answers: selectedAnswers,
        journal_entry: journalEntry,
        completed_at: new Date().toISOString(),
      })
      .eq("id", journalId);

    // Log a spiritual session for morning devotion
    addSession({
      category: "spiritual",
      duration_minutes: 15,
      notes: `Morning devotion: ${todayPlan.reference}`,
      started_at: startedAt || new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    // Fire artwork generation in the background (don't await)
    fetch("/api/bible-artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journalEntry,
        reference: todayPlan.reference,
        passage: passageText,
      }),
    }).catch(() => {});

    setShowComplete(true);
  };

  // Preload quiz as soon as passage is available (while user reads)
  useEffect(() => {
    if (passageText && todayPlan && questions.length === 0 && !quizLoading) {
      generateQuiz();
    }
  }, [passageText, todayPlan, questions.length, quizLoading, generateQuiz]);

  // Preload reflection as soon as quiz is loaded
  useEffect(() => {
    if (questions.length > 0 && reflectionChat.length === 0 && !reflectionLoading) {
      startReflection();
    }
  }, [questions.length, reflectionChat.length, reflectionLoading, startReflection]);

  // Step navigation
  const goNext = () => {
    setStep((s) => s + 1);
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reflectionChat]);

  // Validation helpers
  const canProceedFromQuiz = quizSubmitted;
  const canProceedFromReflection = reflectionDone;
  const journalSentenceCount = journalEntry
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 5).length;
  const canProceedFromJournal = journalSentenceCount >= 3;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">
            {"\u2728"}
          </div>
          <p className="text-muted">Preparing your morning devotion...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
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
                    ? "bg-spiritual"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Step 0: Passage */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted">
                Day {todayPlan?.day_number || "..."} of 30
              </p>
              <h1 className="text-2xl font-bold">
                {todayPlan?.reference || "Loading..."}
              </h1>
            </div>

            <Card className="border-spiritual/20 bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
              {passageLoading ? (
                <div className="py-12 text-center">
                  <div className="text-2xl mb-3 animate-pulse">
                    {"\uD83D\uDCD6"}
                  </div>
                  <p className="text-muted text-sm">
                    Loading passage...
                  </p>
                </div>
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-line">
                  {passageText}
                </p>
              )}
            </Card>

            <div className="text-center text-sm text-muted">
              Take a moment to read slowly and let the words settle.
            </div>

            <Button
              onClick={goNext}
              disabled={!passageText || passageLoading}
              className="w-full"
              size="lg"
            >
              I've read the passage
            </Button>
          </div>
        )}

        {/* Step 1: Quiz */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Comprehension Check</h1>
              <p className="text-sm text-muted">
                Let's see how well you absorbed the passage
              </p>
            </div>

            {quizLoading ? (
              <Card>
                <div className="py-12 text-center">
                  <div className="text-2xl mb-3 animate-pulse">
                    {"\uD83E\uDDE0"}
                  </div>
                  <p className="text-muted text-sm">
                    Generating questions...
                  </p>
                </div>
              </Card>
            ) : (
              questions.map((q, qi) => (
                <Card key={qi} className="space-y-3">
                  <p className="font-medium">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const letter = opt[0];
                      const isSelected = selectedAnswers[qi] === letter;
                      const isCorrect = letter === q.correct;
                      const showResult = quizSubmitted;

                      let optClasses =
                        "block w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ";
                      if (showResult && isCorrect) {
                        optClasses +=
                          "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300";
                      } else if (showResult && isSelected && !isCorrect) {
                        optClasses +=
                          "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300";
                      } else if (isSelected) {
                        optClasses +=
                          "border-spiritual bg-purple-50 dark:bg-purple-950/30";
                      } else {
                        optClasses +=
                          "border-card-border hover:border-spiritual/50";
                      }

                      return (
                        <button
                          key={opt}
                          className={optClasses}
                          onClick={() => {
                            if (!quizSubmitted) {
                              setSelectedAnswers((prev) => ({
                                ...prev,
                                [qi]: letter,
                              }));
                            }
                          }}
                          disabled={quizSubmitted}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <div
                      className={`text-sm p-3 rounded-lg ${
                        selectedAnswers[qi] === q.correct
                          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"
                          : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {selectedAnswers[qi] === q.correct
                        ? "Correct! "
                        : "Not quite. "}
                      {q.explanation}
                    </div>
                  )}
                </Card>
              ))
            )}

            {!quizLoading && questions.length > 0 && (
              <div className="space-y-3">
                {!quizSubmitted ? (
                  <Button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={
                      Object.keys(selectedAnswers).length < questions.length
                    }
                    className="w-full"
                    size="lg"
                  >
                    Check Answers
                  </Button>
                ) : (
                  <Button
                    onClick={goNext}
                    className="w-full"
                    size="lg"
                  >
                    Continue to Reflection
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Reflection */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Reflect & Discuss</h1>
              <p className="text-sm text-muted">
                A short conversation about what this passage means to you
              </p>
            </div>

            <Card className="space-y-4 max-h-[50vh] overflow-y-auto">
              {reflectionChat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-spiritual text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {reflectionLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </Card>

            {!reflectionDone ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reflectionInput}
                  onChange={(e) => setReflectionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReflection()}
                  placeholder="Share your thoughts..."
                  className="flex-1 rounded-xl border border-card-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-spiritual/50"
                  disabled={reflectionLoading}
                />
                <Button
                  onClick={sendReflection}
                  disabled={!reflectionInput.trim() || reflectionLoading}
                >
                  Send
                </Button>
              </div>
            ) : (
              <Button
                onClick={goNext}
                className="w-full"
                size="lg"
              >
                Continue to Journal
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Journal */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Journal Entry</h1>
              <p className="text-sm text-muted">
                Write freely about what God is speaking to you today
              </p>
            </div>

            <Card>
              <textarea
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                placeholder="Today, this passage made me think about..."
                className="w-full h-48 bg-transparent resize-none text-sm leading-relaxed focus:outline-none placeholder:text-muted/50"
              />
              <div className="flex justify-between items-center pt-2 border-t border-card-border">
                <span
                  className={`text-xs ${
                    canProceedFromJournal ? "text-green-600" : "text-muted"
                  }`}
                >
                  {journalSentenceCount}/3 sentences minimum
                </span>
                <span className="text-xs text-muted">
                  {journalEntry.length} characters
                </span>
              </div>
            </Card>

            <Button
              onClick={completeGate}
              disabled={!canProceedFromJournal}
              className="w-full bg-spiritual hover:bg-spiritual/90 text-white"
              size="lg"
            >
              Complete & Enter Focus Garden
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
              <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-300 dark:from-amber-600 dark:via-yellow-600 dark:to-orange-500 px-6 py-8 text-center">
                <div className="text-5xl mb-3">{"\u2600\uFE0F"}</div>
                <h2 className="text-xl font-bold text-white">
                  You showed up today!
                </h2>
                <p className="text-white/80 text-sm mt-2">
                  Starting your day in God's Word
                  <br />
                  sets the tone for everything ahead.
                </p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-foreground/70 text-center leading-relaxed italic">
                  {[
                    "\"This is the day the Lord has made; let us rejoice and be glad in it.\" — Psalm 118:24",
                    "\"I can do all things through Christ who strengthens me.\" — Philippians 4:13",
                    "\"The joy of the Lord is your strength.\" — Nehemiah 8:10",
                    "\"Trust in the Lord with all your heart and lean not on your own understanding.\" — Proverbs 3:5",
                    "\"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.\" — Jeremiah 29:11",
                    "\"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.\" — Joshua 1:9",
                    "\"The Lord is my shepherd; I shall not want.\" — Psalm 23:1",
                  ][new Date().getDate() % 7]}
                </p>
                <Button
                  onClick={() => router.replace("/dashboard")}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  size="lg"
                >
                  Let's Go!
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
