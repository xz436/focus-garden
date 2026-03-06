"use client";

import { useState } from "react";
import { CategoryId, Session } from "@/types";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/constants";
import { editSession } from "@/lib/store";
import Button from "@/components/ui/Button";

interface SessionEditModalProps {
  session: Session;
  onClose: () => void;
  onSave: () => void;
}

export default function SessionEditModal({
  session,
  onClose,
  onSave,
}: SessionEditModalProps) {
  const [category, setCategory] = useState<CategoryId>(session.category);
  const [duration, setDuration] = useState(session.duration_minutes);
  const [notes, setNotes] = useState(session.notes || "");

  const handleSave = () => {
    editSession(session.id, {
      category,
      duration_minutes: duration,
      notes: notes || null,
    });
    onSave();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto rounded-2xl bg-card border border-card-border shadow-2xl p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Edit Session</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted mb-2 block">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_LIST.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                  category === cat.id
                    ? "border-green-400 bg-green-50 dark:bg-green-900/30 scale-105"
                    : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] font-medium">
                  {cat.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted mb-2 block">
            Duration (minutes)
          </label>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[15, 25, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    duration === m
                      ? "border-green-400 bg-green-50 dark:bg-green-900/30 font-medium"
                      : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={1}
              max={240}
              className="w-16 rounded-lg border border-card-border bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-center focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="text-xs font-medium text-muted mb-2 block">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note..."
            className="w-full rounded-lg border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>

        {/* Timestamp info */}
        <div className="mt-3 text-center">
          <span className="text-[10px] text-muted">
            {session.completed_at &&
              new Date(session.completed_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
          </span>
        </div>
      </div>
    </>
  );
}
