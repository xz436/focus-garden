"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { PLANT_STAGES } from "@/lib/constants";

interface SnapshotData {
  garden: Record<string, { emoji: string; label: string; sessions: number; color: string }>;
  streak: number;
  totalSessions: number;
  totalMinutes: number;
  weekSessions: number;
  weekMinutes: number;
  blind75Solved: number;
}

function getPlantStageEmoji(sessions: number, categoryEmoji: string): string {
  if (sessions === 0) return "🟤";
  if (sessions < 4) return "🌱";
  return categoryEmoji;
}

function getPlantStageName(sessions: number): string {
  let stage = PLANT_STAGES[0];
  for (const s of PLANT_STAGES) {
    if (sessions >= s.minSessions) stage = s;
  }
  return stage.name;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function SharePageClient({
  displayName,
  snapshotData,
  createdAt,
}: {
  displayName: string;
  snapshotData: SnapshotData;
  createdAt: string;
}) {
  const data = snapshotData;
  const sharedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const gardenEntries = Object.entries(data.garden || {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-amber-50 dark:from-green-950 dark:via-gray-900 dark:to-amber-950 pb-12">
      {/* Header */}
      <div className="text-center pt-10 pb-6 px-6">
        <div className="text-5xl mb-3 animate-sway">🌱</div>
        <h1 className="text-2xl font-bold">{displayName}&apos;s Garden</h1>
        <p className="text-sm text-gray-500 mt-1">
          Shared on {sharedDate}
        </p>
      </div>

      <div className="mx-auto max-w-lg px-4 space-y-4">
        {/* Stats Overview */}
        <Card>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{data.streak || 0}</div>
              <div className="text-xs text-gray-500">Day Streak 🔥</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.totalSessions || 0}</div>
              <div className="text-xs text-gray-500">Total Sessions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatMinutes(data.totalMinutes || 0)}</div>
              <div className="text-xs text-gray-500">Focus Time</div>
            </div>
          </div>
        </Card>

        {/* This Week */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">This Week</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-bold">{data.weekSessions || 0}</div>
              <div className="text-xs text-gray-500">Sessions</div>
            </div>
            <div>
              <div className="text-xl font-bold">{formatMinutes(data.weekMinutes || 0)}</div>
              <div className="text-xs text-gray-500">Focus Time</div>
            </div>
          </div>
        </Card>

        {/* Garden */}
        {gardenEntries.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-gray-500 mb-4">Garden</h2>
            <div className="grid grid-cols-3 gap-4">
              {gardenEntries.map(([catId, catData]) => {
                const plantEmoji = getPlantStageEmoji(catData.sessions, catData.emoji);
                const stageName = getPlantStageName(catData.sessions);
                const size =
                  catData.sessions >= 16 ? "text-5xl" :
                  catData.sessions >= 9 ? "text-4xl" :
                  catData.sessions >= 4 ? "text-3xl" :
                  catData.sessions >= 1 ? "text-2xl" : "text-xl";

                return (
                  <div key={catId} className="flex flex-col items-center gap-1">
                    <span className={`${size} animate-sway`}>{plantEmoji}</span>
                    <span className="text-xs font-medium">{catData.label}</span>
                    <span className="text-[10px] text-gray-500">
                      {stageName} · {catData.sessions} sessions
                    </span>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((catData.sessions / 16) * 100, 100)}%`,
                          backgroundColor: catData.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Blind 75 */}
        {data.blind75Solved > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Blind 75 Progress</h2>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">
                {data.blind75Solved}/75
              </div>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${(data.blind75Solved / 75) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">
                {Math.round((data.blind75Solved / 75) * 100)}%
              </span>
            </div>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center pt-4">
          <Link href="/">
            <Button size="lg" className="px-8">
              🌱 Start Your Own Garden
            </Button>
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Focus Garden — Grow your life, one session at a time.
          </p>
        </div>
      </div>
    </div>
  );
}
