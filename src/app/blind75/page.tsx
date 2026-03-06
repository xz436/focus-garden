"use client";

import { useState, useEffect } from "react";
import { Blind75Problem, ProblemStatus, Difficulty } from "@/types";
import { BLIND75_CATEGORIES, BLIND75_PROBLEMS } from "@/lib/constants";
import { getProblems, getProblemsByCategory, updateProblem } from "@/lib/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";

const STATUS_ICONS: Record<ProblemStatus, string> = {
  not_started: "⬜",
  in_progress: "🔄",
  solved: "✅",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400",
  Medium: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Hard: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
};

type DifficultyFilter = "All" | Difficulty;
type StatusFilter = "All" | ProblemStatus;

export default function Blind75Page() {
  const [problemsByCategory, setProblemsByCategory] = useState<
    Record<string, Blind75Problem[]>
  >({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Blind75Problem | null>(
    null
  );
  const [allProblems, setAllProblems] = useState<Blind75Problem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  function refreshData() {
    const all = getProblems();
    setAllProblems(all);
    setProblemsByCategory(getProblemsByCategory());
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">💻</div>
      </div>
    );
  }

  const solvedCount = allProblems.filter((p) => p.status === "solved").length;
  const inProgressCount = allProblems.filter(
    (p) => p.status === "in_progress"
  ).length;

  // Difficulty stats
  const easyProblems = allProblems.filter((p) => p.difficulty === "Easy");
  const mediumProblems = allProblems.filter((p) => p.difficulty === "Medium");
  const hardProblems = allProblems.filter((p) => p.difficulty === "Hard");
  const easySolved = easyProblems.filter((p) => p.status === "solved").length;
  const mediumSolved = mediumProblems.filter((p) => p.status === "solved").length;
  const hardSolved = hardProblems.filter((p) => p.status === "solved").length;

  const getLeetCodeUrl = (problemName: string) => {
    const seed = BLIND75_PROBLEMS.find((p) => p.name === problemName);
    if (seed?.leetcode_number) {
      return `https://leetcode.com/problems/${problemName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")}/`;
    }
    return null;
  };

  const handleStatusToggle = (problem: Blind75Problem) => {
    const nextStatus: Record<ProblemStatus, ProblemStatus> = {
      not_started: "solved",
      in_progress: "solved",
      solved: "not_started",
    };
    updateProblem(problem.id, {
      status: nextStatus[problem.status],
      solved_at:
        nextStatus[problem.status] === "solved"
          ? new Date().toISOString()
          : null,
    });
    refreshData();
  };

  const handleBulkToggle = (problems: Blind75Problem[]) => {
    const allSolved = problems.every((p) => p.status === "solved");
    const newStatus: ProblemStatus = allSolved ? "not_started" : "solved";
    for (const p of problems) {
      updateProblem(p.id, {
        status: newStatus,
        solved_at: newStatus === "solved" ? new Date().toISOString() : null,
      });
    }
    refreshData();
  };

  const handleSaveProblem = (updates: Partial<Blind75Problem>) => {
    if (selectedProblem) {
      updateProblem(selectedProblem.id, updates);
      refreshData();
      setSelectedProblem(null);
    }
  };

  // Filter problems within categories
  const filterProblems = (problems: Blind75Problem[]) => {
    return problems.filter((p) => {
      if (searchQuery && !p.problem_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) return false;
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      return true;
    });
  };

  const hasActiveFilters = searchQuery || difficultyFilter !== "All" || statusFilter !== "All";

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Blind 75</h1>
          <p className="text-sm text-muted">NeetCode Roadmap Progress</p>
        </div>

        {/* Overall Progress */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-3xl font-bold">{solvedCount}</span>
              <span className="text-lg text-muted">/75</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round((solvedCount / 75) * 100)}%
              </div>
              <div className="text-xs text-muted">
                {inProgressCount} in progress
              </div>
            </div>
          </div>
          <ProgressBar value={solvedCount} max={75} color="#22c55e" size="lg" showLabel={false} />

          {/* Difficulty progress rings */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Easy", solved: easySolved, total: easyProblems.length, color: "#22c55e", bgColor: "bg-green-50 dark:bg-green-900/30" },
              { label: "Medium", solved: mediumSolved, total: mediumProblems.length, color: "#f59e0b", bgColor: "bg-amber-50 dark:bg-amber-900/30" },
              { label: "Hard", solved: hardSolved, total: hardProblems.length, color: "#ef4444", bgColor: "bg-red-50 dark:bg-red-900/30" },
            ].map((diff) => {
              const pct = diff.total > 0 ? (diff.solved / diff.total) * 100 : 0;
              const circumference = 2 * Math.PI * 24;
              return (
                <div key={diff.label} className={`flex flex-col items-center rounded-xl ${diff.bgColor} p-3`}>
                  <div className="relative w-14 h-14">
                    <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-600" strokeWidth="3" />
                      <circle
                        cx="28" cy="28" r="24" fill="none"
                        stroke={diff.color}
                        strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (pct / 100) * circumference}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold">{diff.solved}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-medium mt-1" style={{ color: diff.color }}>{diff.label}</div>
                  <div className="text-[9px] text-muted">{diff.solved}/{diff.total}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Suggested Next Problem */}
        {(() => {
          const nextProblem = allProblems.find((p) => p.status !== "solved" && p.difficulty === "Easy") ||
            allProblems.find((p) => p.status !== "solved" && p.difficulty === "Medium") ||
            allProblems.find((p) => p.status !== "solved");
          if (!nextProblem) return null;
          const url = getLeetCodeUrl(nextProblem.problem_name);
          return (
            <Card className="animate-fade-in border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20" style={{ animationDelay: "0.12s" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-lg flex-shrink-0">
                  {nextProblem.status === "in_progress" ? "🔄" : "💡"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    Suggested Next
                  </div>
                  <div className="text-sm font-semibold truncate">{nextProblem.problem_name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[nextProblem.difficulty]}`}>
                      {nextProblem.difficulty}
                    </span>
                    <span className="text-[10px] text-muted">{nextProblem.category}</span>
                  </div>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors flex-shrink-0"
                  >
                    Solve →
                  </a>
                )}
              </div>
            </Card>
          );
        })()}

        {/* Search & Filters */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problems..."
              className="flex-1 rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-xl border text-sm transition-all ${
                hasActiveFilters
                  ? "border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              🔍
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-2 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-muted">Difficulty</label>
                <div className="flex gap-1.5 mt-1">
                  {(["All", "Easy", "Medium", "Hard"] as DifficultyFilter[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficultyFilter(d)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        difficultyFilter === d
                          ? "border-foreground bg-foreground text-background font-medium"
                          : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Status</label>
                <div className="flex gap-1.5 mt-1">
                  {([
                    { value: "All" as StatusFilter, label: "All" },
                    { value: "not_started" as StatusFilter, label: "⬜ Not Started" },
                    { value: "solved" as StatusFilter, label: "✅ Solved" },
                  ]).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatusFilter(s.value)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        statusFilter === s.value
                          ? "border-foreground bg-foreground text-background font-medium"
                          : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDifficultyFilter("All");
                    setStatusFilter("All");
                  }}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Categories */}
        {BLIND75_CATEGORIES.map((categoryName, idx) => {
          const problems = problemsByCategory[categoryName] || [];
          const filteredProblems = filterProblems(problems);
          const solved = problems.filter((p) => p.status === "solved").length;
          const isExpanded = expandedCategory === categoryName || (hasActiveFilters && filteredProblems.length > 0);
          const isComplete = solved === problems.length && problems.length > 0;

          // If filtering and no results in this category, hide it
          if (hasActiveFilters && filteredProblems.length === 0) return null;

          return (
            <Card
              key={categoryName}
              className="animate-fade-in overflow-hidden"
              style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
            >
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : categoryName)
                }
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{isExpanded ? "📂" : "📁"}</span>
                  <span className="font-medium text-sm">{categoryName}</span>
                  {isComplete && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      COMPLETE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {solved}/{problems.length}
                  </span>
                  <span className="text-muted text-xs">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>
              </button>

              {!isExpanded && (
                <div className="mt-2">
                  <ProgressBar
                    value={solved}
                    max={problems.length}
                    color={isComplete ? "#22c55e" : "#3b82f6"}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              )}

              {isExpanded && (
                <div className="mt-3 border-t border-card-border pt-3">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => handleBulkToggle(problems)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        isComplete
                          ? "border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "border-green-200 dark:border-green-800 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      {isComplete ? "Unmark all" : "Mark all done"}
                    </button>
                  </div>
                  <div className="space-y-1">
                  {(hasActiveFilters ? filteredProblems : problems).map((problem) => {
                    const leetCodeUrl = getLeetCodeUrl(problem.problem_name);
                    return (
                      <div
                        key={problem.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 group"
                      >
                        <button
                          onClick={() => handleStatusToggle(problem)}
                          className="text-lg transition-transform active:scale-90"
                          title="Toggle status"
                        >
                          {STATUS_ICONS[problem.status]}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            problem.status === "solved"
                              ? "line-through text-muted"
                              : ""
                          }`}
                        >
                          {problem.problem_name}
                        </span>
                        {problem.confidence && problem.confidence > 0 && (
                          <span className="text-[10px] text-amber-500">
                            {"⭐".repeat(Math.min(problem.confidence, 3))}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            DIFFICULTY_COLORS[problem.difficulty]
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                        {leetCodeUrl && (
                          <a
                            href={leetCodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:text-blue-700 transition-opacity"
                            title="Open on LeetCode"
                          >
                            LC
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedProblem(problem)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-foreground transition-opacity"
                        >
                          ✏️
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Problem Detail Modal */}
      {selectedProblem && (
        <ProblemModal
          problem={selectedProblem}
          onSave={handleSaveProblem}
          onClose={() => setSelectedProblem(null)}
        />
      )}
    </div>
  );
}

function ProblemModal({
  problem,
  onSave,
  onClose,
}: {
  problem: Blind75Problem;
  onSave: (updates: Partial<Blind75Problem>) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(problem.notes || "");
  const [confidence, setConfidence] = useState(problem.confidence || 0);
  const [solutionLink, setSolutionLink] = useState(
    problem.solution_link || ""
  );
  const [status, setStatus] = useState<ProblemStatus>(problem.status);

  const leetCodeUrl = (() => {
    const seed = BLIND75_PROBLEMS.find((p) => p.name === problem.problem_name);
    if (seed?.leetcode_number) {
      return `https://leetcode.com/problems/${problem.problem_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")}/`;
    }
    return null;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card p-6 shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{problem.problem_name}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl">
            ×
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              DIFFICULTY_COLORS[problem.difficulty]
            }`}
          >
            {problem.difficulty}
          </span>
          <span className="text-xs text-muted">{problem.category}</span>
          {leetCodeUrl && (
            <a
              href={leetCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Open on LeetCode →
            </a>
          )}
        </div>

        <div className="space-y-3">
          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted">Status</label>
            <div className="flex gap-2 mt-1">
              {(["not_started", "solved"] as ProblemStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      status === s
                        ? "border-foreground bg-foreground text-background"
                        : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {STATUS_ICONS[s]} {s.replace("_", " ")}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Confidence */}
          <div>
            <label className="text-xs font-medium text-muted">
              Confidence Level
            </label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setConfidence(star)}
                  className={`text-2xl transition-transform active:scale-90 ${
                    star <= confidence ? "" : "opacity-30"
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your approach, key insights, patterns used..."
              rows={3}
              className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Solution Link */}
          <div>
            <label className="text-xs font-medium text-muted">
              Solution Link
            </label>
            <input
              type="url"
              value={solutionLink}
              onChange={(e) => setSolutionLink(e.target.value)}
              placeholder="https://github.com/..."
              className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() =>
                onSave({
                  status,
                  confidence,
                  notes: notes || null,
                  solution_link: solutionLink || null,
                })
              }
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
