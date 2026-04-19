"use client";

// ─── Shared types ────────────────────────────────────────────────────────────

export type DayDatum = { date: string; minutes: number };

export type LeaderboardEntry = { name: string; days: DayDatum[]; total: number };

export type FriendRequest = {
  id: string;
  direction: "incoming" | "outgoing";
  name: string;
  publicId: string;
  createdAt: string;
};

export type LeaderboardRange = "last7" | "month";

export type ProfileRecord = {
  name: string;
  publicId: string;
  avatarUrl: string | null;
  dailyGoal: number;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
}

/** Heatmap colour for a given minute value — shared by Calendar and Leaderboard. */
export function colorFor(m: number): string {
  if (m === 0) return "var(--glass-2)";
  if (m < 30) return "rgba(99,102,241,0.35)";
  if (m < 60) return "rgba(99,102,241,0.55)";
  if (m < 120) return "rgba(99,102,241,0.75)";
  return "rgba(99,102,241,0.95)";
}

// ─── Skeleton components ──────────────────────────────────────────────────────

const SKELETON_BG =
  "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.14), rgba(255,255,255,0.06))";

export function SkeletonRow({
  height = 12,
  width = "100%",
}: {
  height?: number;
  width?: number | string;
}) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 8,
        background: SKELETON_BG,
        backgroundSize: "200% 100%",
        animation: "skeleton 1.2s ease-in-out infinite",
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonRow key={i} height={12} width={i === 0 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
