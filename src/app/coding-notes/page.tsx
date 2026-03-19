"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CodingNote {
  id: string;
  problem_name: string;
  problem_number: number | null;
  problem_slug: string;
  language: string;
  ai_notes: string;
  patterns: string[];
  complexity: string;
  errors_log: { attempt: number; result: string }[];
  created_at: string;
}

export default function CodingNotesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<CodingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPattern, setFilterPattern] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const supabase = createClient();
    supabase
      .from("coding_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotes(data || []);
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-4xl animate-pulse">{"\uD83D\uDCDD"}</div>
      </div>
    );
  }

  // Collect all unique patterns
  const allPatterns = [...new Set(notes.flatMap((n) => n.patterns))].filter(Boolean);

  const filtered = filterPattern
    ? notes.filter((n) => n.patterns.includes(filterPattern))
    : notes;

  return (
    <div className="min-h-screen pb-24 pt-6 px-4 bg-background">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Coding Notes</h1>
            <p className="text-sm text-muted">
              {notes.length} {notes.length === 1 ? "problem" : "problems"} reviewed
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        {/* Pattern filter chips */}
        {allPatterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterPattern(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                !filterPattern
                  ? "bg-foreground text-background border-foreground"
                  : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              All
            </button>
            {allPatterns.map((p) => (
              <button
                key={p}
                onClick={() => setFilterPattern(filterPattern === p ? null : p)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  filterPattern === p
                    ? "bg-foreground text-background border-foreground"
                    : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <div className="text-3xl mb-3">{"\uD83D\uDCBB"}</div>
              <p className="text-muted text-sm">
                No coding notes yet. Solve problems on NeetCode or LeetCode with the
                extension installed to auto-generate learning notes.
              </p>
            </div>
          </Card>
        ) : (
          filtered.map((note) => {
            const isExpanded = expandedId === note.id;
            const attempts = note.errors_log?.length || 0;

            return (
              <Card
                key={note.id}
                className="cursor-pointer p-0 overflow-hidden"
                onClick={() => setExpandedId(isExpanded ? null : note.id)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {note.problem_number ? `#${note.problem_number} ` : ""}
                        {note.problem_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {note.patterns.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      >
                        {p}
                      </span>
                    ))}
                    {note.complexity && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        {note.complexity}
                      </span>
                    )}
                    {attempts > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        {attempts} {attempts === 1 ? "retry" : "retries"}
                      </span>
                    )}
                    <span className="text-[10px] text-muted">{note.language}</span>
                  </div>

                  {isExpanded && (
                    <div
                      className="mt-4 pt-4 border-t border-card-border prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                      onClick={(e) => e.stopPropagation()}
                      dangerouslySetInnerHTML={{
                        __html: note.ai_notes
                          .replace(/## /g, '<h3 class="text-sm font-semibold mt-4 mb-1">')
                          .replace(/\n- /g, "\n<li>")
                          .replace(/\n\n/g, "<br/>")
                          .replace(/`([^`]+)`/g, '<code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">$1</code>'),
                      }}
                    />
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
