"use client";

import { useState, useEffect, useRef } from "react";
import { Category } from "@/types";
import { PLANT_PRESETS } from "@/lib/constants";
import {
  getSettings,
  saveSettings,
  AppSettings,
  exportData,
  importData,
} from "@/lib/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { showToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingPillar, setEditingPillar] = useState<string | null>(null);
  const [newPillar, setNewPillar] = useState(false);
  const [pillarForm, setPillarForm] = useState({ label: "", emoji: "🌸", plant: "Cherry Blossom", color: "#f472b6", colorClass: "text-pink-400", bgClass: "bg-pink-400", defaultMinutes: 25, weeklyTarget: 5 });

  useEffect(() => {
    setMounted(true);
    setSettings(getSettings());
  }, []);

  if (!mounted || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-4xl">⚙️</div>
      </div>
    );
  }

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focus-garden-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const success = importData(evt.target?.result as string);
      setImportStatus(success ? "success" : "error");
      if (success) {
        setSettings(getSettings());
      }
      setTimeout(() => setImportStatus("idle"), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen pb-24 pt-6 px-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted">Customize your Focus Garden</p>
        </div>

        {saved && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium animate-fade-in shadow-lg">
            Settings saved!
          </div>
        )}

        {/* Profile */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Profile</h2>
          <div>
            <label className="text-xs font-medium text-muted">Display Name</label>
            <input
              type="text"
              value={settings.displayName}
              onChange={(e) =>
                setSettings({ ...settings, displayName: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        </Card>

        {/* Account */}
        {user && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-sm font-semibold text-muted mb-3">Account</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted">Signed in</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => signOut()}
              >
                Log Out
              </Button>
            </div>
          </Card>
        )}

        {/* Life Pillars */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Life Pillars</h2>
          <p className="text-xs text-muted mb-3">Customize your focus categories (1-8 pillars)</p>
          <div className="space-y-2">
            {settings.categories.map((cat, idx) => (
              <div key={cat.id}>
                {editingPillar === cat.id ? (
                  <div className="rounded-xl border border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10 p-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted">Name</label>
                      <input
                        type="text"
                        value={pillarForm.label}
                        onChange={(e) => setPillarForm({ ...pillarForm, label: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:border-green-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted mb-1 block">Plant</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PLANT_PRESETS.map((p) => (
                          <button
                            key={p.emoji}
                            onClick={() => setPillarForm({ ...pillarForm, emoji: p.emoji, plant: p.plant, color: p.color, colorClass: p.colorClass, bgClass: p.bgClass })}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                              pillarForm.emoji === p.emoji ? "ring-2 ring-green-400 scale-110 bg-green-50 dark:bg-green-900/30" : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {p.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted">Timer (min)</label>
                        <input type="number" value={pillarForm.defaultMinutes} onChange={(e) => setPillarForm({ ...pillarForm, defaultMinutes: Number(e.target.value) })} min={5} max={120} className="mt-1 w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-center focus:outline-none focus:border-green-400" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted">Weekly target</label>
                        <input type="number" value={pillarForm.weeklyTarget} onChange={(e) => setPillarForm({ ...pillarForm, weeklyTarget: Number(e.target.value) })} min={0} max={50} className="mt-1 w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-center focus:outline-none focus:border-green-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setEditingPillar(null)} className="flex-1" size="sm">Cancel</Button>
                      <Button onClick={() => {
                        if (!pillarForm.label.trim()) return;
                        const updated = settings.categories.map(c => c.id === cat.id ? { ...c, label: pillarForm.label.trim(), emoji: pillarForm.emoji, plant: pillarForm.plant, color: pillarForm.color, colorClass: pillarForm.colorClass, bgClass: pillarForm.bgClass, defaultMinutes: pillarForm.defaultMinutes, weeklyTarget: pillarForm.weeklyTarget } : c);
                        const newSettings = {
                          ...settings,
                          categories: updated,
                          timerDurations: { ...settings.timerDurations, [cat.id]: pillarForm.defaultMinutes },
                          weeklyTargets: { ...settings.weeklyTargets, [cat.id]: pillarForm.weeklyTarget },
                        };
                        setSettings(newSettings);
                        setEditingPillar(null);
                      }} className="flex-1" size="sm">Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                    <span className="text-xl">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cat.label}</div>
                      <div className="text-[10px] text-muted">{cat.plant} · {settings.timerDurations[cat.id] || cat.defaultMinutes}m · {settings.weeklyTargets[cat.id] || cat.weeklyTarget}/wk</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button onClick={() => {
                          const cats = [...settings.categories];
                          [cats[idx - 1], cats[idx]] = [cats[idx], cats[idx - 1]];
                          setSettings({ ...settings, categories: cats });
                        }} className="text-xs px-1.5 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-muted">▲</button>
                      )}
                      {idx < settings.categories.length - 1 && (
                        <button onClick={() => {
                          const cats = [...settings.categories];
                          [cats[idx], cats[idx + 1]] = [cats[idx + 1], cats[idx]];
                          setSettings({ ...settings, categories: cats });
                        }} className="text-xs px-1.5 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-muted">▼</button>
                      )}
                      <button onClick={() => {
                        setEditingPillar(cat.id);
                        setPillarForm({ label: cat.label, emoji: cat.emoji, plant: cat.plant, color: cat.color, colorClass: cat.colorClass, bgClass: cat.bgClass, defaultMinutes: settings.timerDurations[cat.id] || cat.defaultMinutes, weeklyTarget: settings.weeklyTargets[cat.id] || cat.weeklyTarget });
                      }} className="text-xs px-1.5 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-muted">✏️</button>
                      {settings.categories.length > 1 && (
                        <button onClick={() => {
                          if (!confirm(`Remove "${cat.label}"? Existing sessions will show as "Unknown".`)) return;
                          const filtered = settings.categories.filter(c => c.id !== cat.id);
                          setSettings({ ...settings, categories: filtered });
                        }} className="text-xs px-1.5 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-muted hover:text-red-500">🗑️</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new pillar */}
          {newPillar ? (
            <div className="mt-3 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Name</label>
                <input
                  type="text"
                  value={pillarForm.label}
                  onChange={(e) => setPillarForm({ ...pillarForm, label: e.target.value })}
                  placeholder="e.g., Music, Journaling..."
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Plant</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLANT_PRESETS.map((p) => (
                    <button
                      key={p.emoji}
                      onClick={() => setPillarForm({ ...pillarForm, emoji: p.emoji, plant: p.plant, color: p.color, colorClass: p.colorClass, bgClass: p.bgClass })}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                        pillarForm.emoji === p.emoji ? "ring-2 ring-blue-400 scale-110 bg-blue-50 dark:bg-blue-900/30" : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {p.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">Timer (min)</label>
                  <input type="number" value={pillarForm.defaultMinutes} onChange={(e) => setPillarForm({ ...pillarForm, defaultMinutes: Number(e.target.value) })} min={5} max={120} className="mt-1 w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-center focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Weekly target</label>
                  <input type="number" value={pillarForm.weeklyTarget} onChange={(e) => setPillarForm({ ...pillarForm, weeklyTarget: Number(e.target.value) })} min={0} max={50} className="mt-1 w-full rounded-lg border border-card-border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-center focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setNewPillar(false); setPillarForm({ label: "", emoji: "🌸", plant: "Cherry Blossom", color: "#f472b6", colorClass: "text-pink-400", bgClass: "bg-pink-400", defaultMinutes: 25, weeklyTarget: 5 }); }} className="flex-1" size="sm">Cancel</Button>
                <Button onClick={() => {
                  if (!pillarForm.label.trim()) return;
                  if (settings.categories.length >= 8) { showToast({ emoji: "⚠️", title: "Maximum 8 pillars", type: "info" }); return; }
                  const id = pillarForm.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
                  if (settings.categories.some(c => c.id === id)) { showToast({ emoji: "⚠️", title: "A pillar with this name already exists", type: "info" }); return; }
                  const newCat: Category = { id, label: pillarForm.label.trim(), emoji: pillarForm.emoji, plant: pillarForm.plant, color: pillarForm.color, colorClass: pillarForm.colorClass, bgClass: pillarForm.bgClass, defaultMinutes: pillarForm.defaultMinutes, weeklyTarget: pillarForm.weeklyTarget };
                  setSettings({
                    ...settings,
                    categories: [...settings.categories, newCat],
                    timerDurations: { ...settings.timerDurations, [id]: pillarForm.defaultMinutes },
                    weeklyTargets: { ...settings.weeklyTargets, [id]: pillarForm.weeklyTarget },
                  });
                  setNewPillar(false);
                  setPillarForm({ label: "", emoji: "🌸", plant: "Cherry Blossom", color: "#f472b6", colorClass: "text-pink-400", bgClass: "bg-pink-400", defaultMinutes: 25, weeklyTarget: 5 });
                  showToast({ emoji: pillarForm.emoji, title: `${pillarForm.label} added!`, type: "success" });
                }} className="flex-1" size="sm">Add Pillar</Button>
              </div>
            </div>
          ) : settings.categories.length < 8 && (
            <button
              onClick={() => {
                setNewPillar(true);
                setEditingPillar(null);
                setPillarForm({ label: "", emoji: "🌸", plant: "Cherry Blossom", color: "#f472b6", colorClass: "text-pink-400", bgClass: "bg-pink-400", defaultMinutes: 25, weeklyTarget: 5 });
              }}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-card-border text-sm text-muted hover:text-foreground hover:border-green-400 transition-all"
            >
              + Add New Pillar
            </button>
          )}
        </Card>

        {/* Baby Info */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.11s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Baby Info</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted">Baby&apos;s Name</label>
              <input
                type="text"
                value={settings.babyName}
                onChange={(e) =>
                  setSettings({ ...settings, babyName: e.target.value })
                }
                placeholder="e.g., Noah"
                className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Date of Birth</label>
              <input
                type="date"
                value={settings.babyBirthdate}
                onChange={(e) =>
                  setSettings({ ...settings, babyBirthdate: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.12s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Appearance</h2>
          <div className="flex gap-2">
            {([
              { value: "light" as const, label: "Light", icon: "☀️" },
              { value: "dark" as const, label: "Dark", icon: "🌙" },
              { value: "system" as const, label: "System", icon: "💻" },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${
                  theme === opt.value
                    ? "border-green-400 bg-green-50 dark:bg-green-900/30"
                    : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Language */}
          <div className="mt-4">
            <h3 className="text-xs font-medium text-muted mb-2">Language</h3>
            <LanguageSelector />
          </div>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">Timer</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted">Daily Goal</label>
                <input
                  type="number"
                  value={settings.pomodoroGoal}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pomodoroGoal: Number(e.target.value),
                    })
                  }
                  min={1}
                  max={20}
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400"
                />
                <span className="text-[10px] text-muted">sessions</span>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Short Break</label>
                <input
                  type="number"
                  value={settings.shortBreak}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shortBreak: Number(e.target.value),
                    })
                  }
                  min={1}
                  max={30}
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400"
                />
                <span className="text-[10px] text-muted">minutes</span>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Long Break</label>
                <input
                  type="number"
                  value={settings.longBreak}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      longBreak: Number(e.target.value),
                    })
                  }
                  min={5}
                  max={60}
                  className="mt-1 w-full rounded-xl border border-card-border bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400"
                />
                <span className="text-[10px] text-muted">minutes</span>
              </div>
            </div>

            <div className="pt-2 border-t border-card-border">
              <label className="text-xs font-medium text-muted mb-2 block">
                Timer Duration Per Category
              </label>
              <div className="space-y-2">
                {settings.categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-sm w-5">{cat.emoji}</span>
                    <span className="text-sm flex-1">{cat.label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={settings.timerDurations[cat.id]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            timerDurations: {
                              ...settings.timerDurations,
                              [cat.id]: Number(e.target.value),
                            },
                          })
                        }
                        min={5}
                        max={120}
                        className="w-16 rounded-lg border border-card-border bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-center focus:outline-none focus:border-gray-400"
                      />
                      <span className="text-xs text-muted">min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Weekly Targets */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Weekly Targets
          </h2>
          <div className="space-y-2">
            {settings.categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-sm w-5">{cat.emoji}</span>
                <span className="text-sm flex-1">{cat.label}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={settings.weeklyTargets[cat.id]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weeklyTargets: {
                          ...settings.weeklyTargets,
                          [cat.id]: Number(e.target.value),
                        },
                      })
                    }
                    min={0}
                    max={50}
                    className="w-16 rounded-lg border border-card-border bg-gray-50 px-2 py-1.5 text-sm text-center focus:outline-none focus:border-gray-400"
                  />
                  <span className="text-xs text-muted">sessions</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Management */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-sm font-semibold text-muted mb-3">
            Data Management
          </h2>
          <div className="space-y-3">
            <Button
              onClick={handleExport}
              variant="secondary"
              className="w-full"
            >
              📥 Export All Data (JSON)
            </Button>
            <div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full"
              >
                📤 Import Data
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            {importStatus === "success" && (
              <p className="text-xs text-green-600 text-center">
                Data imported successfully!
              </p>
            )}
            {importStatus === "error" && (
              <p className="text-xs text-red-600 text-center">
                Failed to import data. Check the file format.
              </p>
            )}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="animate-fade-in border-red-200 dark:border-red-800" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm font-semibold text-red-500 mb-3">Danger Zone</h2>
          {!showResetConfirm ? (
            <Button
              onClick={() => setShowResetConfirm(true)}
              variant="danger"
              className="w-full"
            >
              🗑️ Reset All Data
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-500 text-center">
                This will permanently delete all sessions, plans, achievements, and garden data. Export your data first!
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    localStorage.clear();
                    setSettings(getSettings());
                    setShowResetConfirm(false);
                    showToast({ emoji: "🗑️", title: "All data cleared", type: "info" });
                    setTimeout(() => window.location.reload(), 1000);
                  }}
                  variant="danger"
                  className="flex-1"
                >
                  Confirm Reset
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Save */}
        <Button onClick={handleSave} size="lg" className="w-full">
          💾 Save Settings
        </Button>

        {/* App info */}
        <div className="text-center text-xs text-muted pt-4">
          <p>Focus Garden v1.0</p>
          <p className="mt-1">Built with 💚 for the journey to OpenAI</p>
        </div>
      </div>
    </div>
  );
}
