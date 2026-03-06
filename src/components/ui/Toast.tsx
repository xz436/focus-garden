"use client";

import { useState, useEffect, useCallback } from "react";

interface ToastItem {
  id: string;
  emoji: string;
  title: string;
  description?: string;
  type?: "achievement" | "success" | "info";
}

let addToastFn: ((toast: Omit<ToastItem, "id">) => void) | null = null;

export function showToast(toast: Omit<ToastItem, "id">) {
  if (addToastFn) addToastFn(toast);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in rounded-2xl border border-card-border bg-card shadow-xl px-4 py-3 flex items-center gap-3"
          style={{
            borderColor:
              toast.type === "achievement"
                ? "#f59e0b"
                : toast.type === "success"
                ? "#22c55e"
                : "var(--card-border)",
          }}
        >
          <span className="text-3xl">{toast.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-muted truncate">{toast.description}</p>
            )}
          </div>
          {toast.type === "achievement" && (
            <span className="text-xs font-bold text-amber-500 whitespace-nowrap">
              NEW!
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
