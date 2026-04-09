"use client";

import { useState, useEffect, useRef, useCallback, type InputHTMLAttributes } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  acceptFriendRequest,
  createFriendRequestByCode,
  declineFriendRequest,
  fetchCalendarRange,
  fetchFriendRequests,
  fetchLeaderboardRange,
  fetchProfile,
  signOutUser,
  updateProfile,
  ensureProfilePublicId,
} from "../lib/queries";
import { supabase } from "../lib/supabaseClient";
import LoadingButton from "./LoadingButton";
import { useToast } from "./ToastProvider";

const PomodoroTimer = dynamic(() => import("./PomodoroTimer"), { ssr: false });
const TodoList      = dynamic(() => import("./TodoList"),      { ssr: false });
const AmbientSounds = dynamic(() => import("./AmbientSounds"), { ssr: false });
const Notes         = dynamic(() => import("./Notes"),         { ssr: false });
const KanbanBoard   = dynamic(() => import("./KanbanBoard"),   { ssr: false });

type Tab   = "pomodoro" | "tasks" | "sounds" | "notes" | "kanban";
type Theme = "dark" | "light";
type View  = Tab | "leaderboard" | "profile" | "calendar" | "requests" | "add-friend";

type ProfileRecord = {
  name: string;
  publicId: string;
  avatarUrl: string | null;
  dailyGoal: number;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
};

type DayDatum = { date: string; minutes: number };
type LeaderboardEntry = { name: string; days: DayDatum[]; total: number };
type FriendRequest = {
  id: string;
  direction: "incoming" | "outgoing";
  name: string;
  publicId: string;
  createdAt: string;
};
type LeaderboardRange = "last7" | "month";

const DAY_MS = 24 * 60 * 60 * 1000;
const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const buildLastNDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const dt = new Date(Date.now() - (n - 1 - i) * DAY_MS);
    return toISODate(dt);
  });
const buildMonthDays = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const days: string[] = [];
  const d = new Date(first);
  while (d.getMonth() === month) {
    days.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
};
const monthLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
};
const rangeLabel = (iso: string) => iso.slice(5);
const formatMinutes = (min: number) => {
  if (min < 60) return `${min} m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
};

/* ── Typewriter text — types in on mount, re-mounts on key flip ─ */
function TypewriterText({
  text,
  delay   = 0,
  charMs  = 22,
  animate = true,
  replay  = 0,
  style,
}: {
  text:   string;
  delay?: number;
  charMs?: number;
  animate?: boolean;
  replay?: number;
  style?: React.CSSProperties;
}) {
  const [chars, setChars] = useState(animate ? "" : text);
  const tRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const iRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!animate) {
      setChars(text);
      return () => {
        if (tRef.current) clearTimeout(tRef.current);
        if (iRef.current) clearInterval(iRef.current);
      };
    }

    setChars("");
    tRef.current = setTimeout(() => {
      let i = 0;
      iRef.current = setInterval(() => {
        i++;
        setChars(text.slice(0, i));
        if (i >= text.length) clearInterval(iRef.current!);
      }, charMs);
    }, delay);

    return () => {
      if (tRef.current) clearTimeout(tRef.current);
      if (iRef.current) clearInterval(iRef.current);
    };
  }, [animate, delay, charMs, text, replay]);

  return <span style={style}>{chars}</span>;
}

/* ── Nav config ──────────────────────────────────────────────── */
const NAV: { id: View; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "pomodoro", label: "Focus", desc: "Pomodoro timer",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  },
  {
    id: "tasks", label: "Tasks", desc: "Study to-do list",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    id: "sounds", label: "Sounds", desc: "Ambient audio",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  },
  {
    id: "notes", label: "Notes", desc: "Quick capture",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    id: "kanban", label: "Board", desc: "Kanban view",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    id: "leaderboard", label: "Leaderboard", desc: "Friends focus rank",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-7"/><path d="M12 21V3"/><path d="M20 21v-11"/></svg>,
  },
];

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  pomodoro: { title: "Focus Timer",    subtitle: "Stay in the zone — one session at a time." },
  tasks:    { title: "Study Tasks",    subtitle: "What needs to get done today?" },
  sounds:   { title: "Ambient Sounds", subtitle: "Layer your perfect focus environment." },
  notes:    { title: "Quick Notes",    subtitle: "Capture ideas without breaking flow." },
  kanban:   { title: "Kanban Board",   subtitle: "See your study progress at a glance." },
  leaderboard: { title: "Leaderboard", subtitle: "See how you stack up against friends." },
  profile:  { title: "My Profile",     subtitle: "Your identity, stats, and profile settings." },
  calendar: { title: "My Calendar",    subtitle: "Your focus activity over time." },
  requests: { title: "Requests",       subtitle: "Pending friend requests and invites." },
  "add-friend": { title: "Add Friend", subtitle: "Invite and connect with your study circle." },
};

const SIDEBAR_ANIM_MS = 500;
const TYPE_TOTAL_MS = 1000;
const ICON_COL = 44;
const SIDEBAR_INSET = 16;
const SIDEBAR_COLLAPSED_W = 64;
const SIDEBAR_EXPANDED_W = 200;
const BRAND_TEXT_MAX = 140;
const NAV_TEXT_MAX = 120;
const COLLAPSED_INSET = (SIDEBAR_COLLAPSED_W - ICON_COL) / 2;
const ACTIVE_GLOW_INSET = 6;
const SKELETON_BG = "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.14), rgba(255,255,255,0.06))";
const typeMs = (text: string) =>
  Math.max(18, Math.round(TYPE_TOTAL_MS / Math.max(1, text.length)));

/* ── FomoDoro logo icon ──────────────────────────────────────── */
function FomoDoroIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10.5 5.2C9.8 3.2 6.8 3.0 7.8 5.8C9.0 5.0 10.5 5.2 10.5 5.2Z" fill="white" opacity="0.9"/>
      <path d="M13.5 5.2C14.2 3.2 17.2 3.0 16.2 5.8C15.0 5.0 13.5 5.2 13.5 5.2Z" fill="white" opacity="0.9"/>
      <line x1="12" y1="4.5" x2="12" y2="7.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.95"/>
      <circle cx="12" cy="15" r="7.8" fill="white" opacity="0.12"/>
      <circle cx="12" cy="15" r="7.8" stroke="white" strokeWidth="1.4" opacity="0.90"/>
      <line x1="12" y1="8.2" x2="12" y2="9.8" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.55"/>
      <line x1="12" y1="15" x2="8.4" y2="11.2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="12" y1="15" x2="15.6" y2="13.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="15" r="1.3" fill="white"/>
    </svg>
  );
}

/* ── Icons ───────────────────────────────────────────────────── */
function SunIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function ChevronIcon({ pointRight }: { pointRight: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {pointRight
        ? <polyline points="9,18 15,12 9,6"/>
        : <polyline points="15,18 9,12 15,6"/>}
    </svg>
  );
}

/* ── Animated theme pill (expanded sidebar) ──────────────────── */
function ThemePill({ theme, onSet }: { theme: Theme; onSet: (t: Theme) => void }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border)",
        borderRadius: 999,
        padding: 3,
        width: "100%",
      }}
    >
      {/* Sliding indicator */}
      <div
        style={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: theme === "dark" ? 3 : "calc(50% + 0px)",
          width: "calc(50% - 3px)",
          borderRadius: 999,
          background: "var(--glass-3)",
          border: "1px solid var(--glass-border-hover)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
          transition: "left 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
        }}
      />
      {/* Dark button */}
      <LoadingButton
        onClick={() => onSet("dark")}
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          padding: "5px 4px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: theme === "dark" ? "var(--text-1)" : "var(--text-3)",
          transition: "color 0.22s ease",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <MoonIcon size={12} />
        Dark
      </LoadingButton>
      {/* Light button */}
      <LoadingButton
        onClick={() => onSet("light")}
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          padding: "5px 4px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: theme === "light" ? "var(--text-1)" : "var(--text-3)",
          transition: "color 0.22s ease",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <SunIcon size={13} />
        Light
      </LoadingButton>
    </div>
  );
}

function InlineEdit({
  value,
  onChange,
  label,
  inputMode,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditing(false);
          }}
          inputMode={inputMode}
          maxLength={maxLength}
          style={{
            background: "var(--glass-1)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: "6px 8px",
            color: "var(--text-1)",
            fontSize: 14,
            outline: "none",
            width: "100%",
          }}
          aria-label={label}
        />
      ) : (
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>{value}</span>
      )}
      <LoadingButton
        onClick={() => setEditing((e) => !e)}
        style={{
          border: "none",
          background: "var(--glass-2)",
          color: "var(--text-2)",
          padding: "6px 8px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {editing ? "Done" : "Edit"}
      </LoadingButton>
    </div>
  );
}

function SkeletonRow({ height = 12, width = "100%" }: { height?: number; width?: number | string }) {
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

function SkeletonCard({ lines = 3 }: { lines?: number }) {
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

function MyProfilePanel({
  profile,
  onProfileChange,
  onAvatarPick,
  loading,
  stats,
}: {
  profile: ProfileRecord;
  onProfileChange: (next: ProfileRecord) => void;
  onAvatarPick: (file: File) => void;
  loading: boolean;
  stats: { total: number; streak: number; bestDay: string };
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SkeletonCard lines={4} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <LoadingButton
          onClick={() => fileRef.current?.click()}
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "none",
            padding: 0,
            cursor: "pointer",
            overflow: "hidden",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Tap to change image"
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "white", fontSize: 28, fontWeight: 700 }}>
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </LoadingButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAvatarPick(file);
          }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <InlineEdit
            value={profile.name}
            label="Name"
            onChange={(v) => onProfileChange({ ...profile, name: v })}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>ID</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{profile.publicId}</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Total Focus", value: formatMinutes(stats.total) },
          { label: "Longest Streak", value: `${stats.streak} days` },
          { label: "Best Day", value: stats.bestDay ? stats.bestDay : "—" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--glass-1)",
              border: "1px solid var(--glass-border)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{card.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginTop: 6 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            label: "Daily goal",
            value: profile.dailyGoal,
            min: 1,
            max: 99,
            key: "dailyGoal",
          },
          {
            label: "Focus minutes",
            value: profile.focusMinutes,
            min: 5,
            max: 180,
            key: "focusMinutes",
          },
          {
            label: "Short break",
            value: profile.shortBreakMinutes,
            min: 1,
            max: 60,
            key: "shortBreakMinutes",
          },
          {
            label: "Long break",
            value: profile.longBreakMinutes,
            min: 5,
            max: 120,
            key: "longBreakMinutes",
          },
        ].map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "var(--glass-2)",
              border: "1px solid var(--glass-border)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{item.label}</span>
            <input
              type="number"
              min={item.min}
              max={item.max}
              value={item.value}
              onChange={(e) => {
                const next = Math.max(item.min, Math.min(item.max, Number(e.target.value || 0)));
                onProfileChange({ ...profile, [item.key]: next } as ProfileRecord);
              }}
              style={{
                background: "var(--glass-1)",
                border: "1px solid var(--glass-border)",
                borderRadius: 8,
                padding: "6px 8px",
                color: "var(--text-1)",
                fontSize: 14,
                outline: "none",
                width: "100%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarPanel({
  last7,
  history,
  loading,
}: {
  last7: DayDatum[];
  history: DayDatum[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }
  const max = Math.max(30, ...last7.map((d) => d.minutes));
  const total = last7.reduce((a, b) => a + b.minutes, 0);
  const levels = [0, 30, 60, 120, 240];
  const colorFor = (m: number) => {
    if (m === 0) return "var(--glass-2)";
    if (m < 30) return "rgba(99,102,241,0.35)";
    if (m < 60) return "rgba(99,102,241,0.55)";
    if (m < 120) return "rgba(99,102,241,0.75)";
    return "rgba(99,102,241,0.95)";
  };
  const weeks = Array.from({ length: Math.ceil(history.length / 7) }, (_, w) => history.slice(w * 7, w * 7 + 7));
  const monthLabels = weeks.map((week) => {
    const labelDate = week.find((d) => d.date.endsWith("-01"))?.date;
    return labelDate ? monthLabel(labelDate) : "";
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          padding: 18,
          scrollSnapAlign: "start",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>Last 7 days</div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "flex-end" }}>
          {last7.map((d) => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: "100%",
                  height: 90,
                  borderRadius: 10,
                  background: "var(--glass-2)",
                  display: "flex",
                  alignItems: "flex-end",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(8, Math.round((d.minutes / max) * 90))}px`,
                    background: "linear-gradient(180deg, rgba(99,102,241,0.95), rgba(99,102,241,0.35))",
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{d.date.slice(5)}</span>
              <span style={{ fontSize: 11, color: "var(--text-1)", fontWeight: 600 }}>{formatMinutes(d.minutes)}</span>
            </div>
          ))}
        </div>
        {total === 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>
            No data yet. Start a focus session to populate this chart.
          </div>
        )}
      </div>

      <div
        style={{
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          padding: 18,
          scrollSnapAlign: "start",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>Contribution history</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {weeks.map((week, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {week.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date} — ${formatMinutes(d.minutes)}`}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: colorFor(d.minutes),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {monthLabels.map((m, i) => (
            <div key={i} style={{ width: 16, position: "relative", height: 12 }}>
              {m && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: "translateX(-6px)",
                    fontSize: 9,
                    color: "var(--text-3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>
          <span>Less</span>
          {levels.map((l) => (
            <span
              key={l}
              style={{ width: 12, height: 12, borderRadius: 3, background: colorFor(l), display: "inline-block" }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function RequestsPanel({
  requests,
  loading,
  onAccept,
  onDecline,
}: {
  requests: FriendRequest[];
  loading: boolean;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}) {
  const [busyIds, setBusyIds] = useState<string[]>([]);
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    );
  }
  if (!requests.length) {
    return (
      <div
        style={{
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          padding: 20,
          color: "var(--text-3)",
        }}
      >
        No pending friend requests yet.
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border)",
        borderRadius: 18,
        padding: 20,
        color: "var(--text-2)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--glass-2)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{req.name}</span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{req.publicId}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {req.direction === "incoming" ? (
              <>
                {(() => {
                  const isBusy = busyIds.includes(req.id);
                  return (
                    <>
                <LoadingButton
                  compact
                  loading={isBusy}
                  onClick={async () => {
                    setBusyIds((s) => [...s, req.id]);
                    await onDecline(req.id);
                    setBusyIds((s) => s.filter((id) => id !== req.id));
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    overflow: "hidden",
                  }}
                  title="Decline"
                >
                  {isBusy ? "" : "✕"}
                </LoadingButton>
                <LoadingButton
                  compact
                  loading={isBusy}
                  onClick={async () => {
                    setBusyIds((s) => [...s, req.id]);
                    await onAccept(req.id);
                    setBusyIds((s) => s.filter((id) => id !== req.id));
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(34,197,94,0.15)",
                    color: "#22c55e",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    overflow: "hidden",
                  }}
                  title="Accept"
                >
                  {isBusy ? "" : "✓"}
                </LoadingButton>
                    </>
                  );
                })()}
              </>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>Pending</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddFriendPanel({ onSend }: { onSend: (code: string) => Promise<void> | void }) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <div
      style={{
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border)",
        borderRadius: 18,
        padding: 20,
        color: "var(--text-2)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>Add a friend</div>
      <input
        placeholder="Enter friend code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        style={{
          background: "var(--glass-2)",
          border: "1px solid var(--glass-border)",
          borderRadius: 10,
          padding: "10px 12px",
          color: "var(--text-1)",
          outline: "none",
        }}
      />
      <LoadingButton
        loading={sending}
        onClick={async () => {
          if (!code.trim()) return;
          setSending(true);
          await onSend(code);
          setCode("");
          setSending(false);
        }}
        style={{
          border: "none",
          borderRadius: 10,
          background: "var(--accent)",
          color: "white",
          padding: "10px 12px",
          fontWeight: 600,
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        Send Request
      </LoadingButton>
    </div>
  );
}

function LeaderboardMini({ rows, loading }: { rows: LeaderboardEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ padding: "8px 12px 12px" }}>
        <SkeletonRow height={10} width="40%" />
        <div style={{ marginTop: 10 }}>
          <SkeletonRow height={8} width="100%" />
          <div style={{ height: 8 }} />
          <SkeletonRow height={8} width="100%" />
        </div>
      </div>
    );
  }
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.map((r) => r.total));
  const colorFor = (m: number) => {
    if (m === 0) return "var(--glass-2)";
    if (m < 30) return "rgba(99,102,241,0.35)";
    if (m < 60) return "rgba(99,102,241,0.55)";
    if (m < 120) return "rgba(99,102,241,0.75)";
    return "rgba(99,102,241,0.95)";
  };
  return (
    <div style={{ padding: "8px 12px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>Leaderboard</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-1)" }}>
                <span>{row.name}</span>
                <span style={{ color: "var(--text-3)" }}>{formatMinutes(row.total)}</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: "var(--glass-2)", marginTop: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((row.total / max) * 100))}%`,
                    background: "linear-gradient(90deg, rgba(99,102,241,0.75), rgba(99,102,241,0.2))",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {row.days.map((d) => (
                  <span
                    key={d.date}
                    title={`${d.date} — ${formatMinutes(d.minutes)}`}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: colorFor(d.minutes),
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardPanel({
  rows,
  loading,
  range,
  onRangeChange,
  onRefresh,
}: {
  rows: LeaderboardEntry[];
  loading: boolean;
  range: LeaderboardRange;
  onRangeChange: (r: LeaderboardRange) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "var(--glass-1)",
            border: "1px solid var(--glass-border)",
            borderRadius: 999,
            padding: 4,
            width: "fit-content",
            scrollSnapAlign: "start",
          }}
        >
          {[
            { key: "last7", label: "Last 7 days" },
            { key: "month", label: "This month" },
          ].map((opt) => (
            <LoadingButton
              key={opt.key}
              onClick={() => onRangeChange(opt.key as LeaderboardRange)}
              style={{
                border: "none",
                padding: "6px 12px",
                borderRadius: 999,
                background: range === opt.key ? "var(--accent-dim)" : "transparent",
                color: range === opt.key ? "var(--accent-text)" : "var(--text-3)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {opt.label}
            </LoadingButton>
          ))}
        </div>
        <LoadingButton
          onClick={onRefresh}
          loading={loading}
          style={{
            border: "1px solid var(--glass-border)",
            borderRadius: 999,
            background: "var(--glass-1)",
            color: "var(--text-2)",
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="Refresh leaderboard"
        >
          Refresh
        </LoadingButton>
      </div>
      <div
        style={{
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          scrollSnapAlign: "start",
        }}
      >
        {rows.map((row, idx) => (
          <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 26, textAlign: "center", fontWeight: 700, color: "var(--text-1)" }}>
              #{idx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-1)" }}>
                <span>{row.name}</span>
                <span style={{ color: "var(--text-3)" }}>{formatMinutes(row.total)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--glass-2)", marginTop: 6, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((row.total / Math.max(1, rows[0]?.total || 1)) * 100))}%`,
                    background: "linear-gradient(90deg, rgba(99,102,241,0.8), rgba(99,102,241,0.25))",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {row.days.map((d) => (
                  <span
                    key={d.date}
                    title={`${d.date} — ${formatMinutes(d.minutes)}`}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: d.minutes === 0 ? "var(--glass-2)" : "rgba(99,102,241,0.6)",
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Kept-alive component map ────────────────────────────────── */
const COMPONENTS: Record<Tab, React.ReactNode> = {
  pomodoro: <PomodoroTimer />,
  tasks:    <TodoList />,
  sounds:   <AmbientSounds />,
  notes:    <Notes />,
  kanban:   <KanbanBoard />,
};


/* ═══════════════════════════════════════════════════════════════ */
export default function StudylinApp() {
  const router = useRouter();
  const { push } = useToast();
  const [view,         setView]        = useState<View>("pomodoro");
  const [theme,        setTheme]       = useState<Theme>("dark");
  const [collapsed,    setCollapsed]   = useState(false);
  const [mobileOpen,   setMobileOpen]  = useState(false);
  const [isMobile,     setIsMobile]    = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const snapTick = useRef(0);
  const [profileOpen,  setProfileOpen] = useState(false);
  const [profileHover, setProfileHover] = useState(false);
  const [expandTick,   setExpandTick]  = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [userId,       setUserId]      = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardRange, setLeaderboardRange] = useState<LeaderboardRange>("last7");
  const [profileSaveTick, setProfileSaveTick] = useState(0);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [profileStats, setProfileStats] = useState({ total: 0, streak: 0, bestDay: "" });
  const [realtimeFriendIds, setRealtimeFriendIds] = useState<string[]>([]);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileBtnRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const [profile, setProfile] = useState<ProfileRecord>({
    name: "",
    publicId: "",
    avatarUrl: null,
    dailyGoal: 8,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [last7Days, setLast7Days] = useState<DayDatum[]>(
    buildLastNDays(7).map((d) => ({ date: d, minutes: 0 }))
  );
  const [historyDays, setHistoryDays] = useState<DayDatum[]>(
    buildLastNDays(28).map((d) => ({ date: d, minutes: 0 }))
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("fomodoro_theme") as Theme | null;
    const t: Theme = saved === "light" || saved === "dark" ? saved : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    if (!collapsed) setExpandTick((n) => n + 1);
  }, [collapsed]);

  useEffect(() => {
    const update = () => {
      const m = window.innerWidth <= 900;
      setIsMobile(m);
      if (!m) setMobileOpen(false);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchDeltaX.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const current = e.touches[0].clientX;
      touchDeltaX.current = current - touchStartX.current;
    };
    const onTouchEnd = () => {
      if (touchDeltaX.current < -40) {
        setMobileOpen(false);
      }
      touchStartX.current = null;
      touchDeltaX.current = 0;
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current?.contains(target)) return;
      if (profileBtnRef.current?.contains(target)) return;
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  useEffect(() => {
    if (!isMobile) return;
    const click = () => {
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 180;
        g.gain.value = 0.03;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        o.stop(ctx.currentTime + 0.09);
      } catch {
        /* ignore */
      }
    };
    const handler = () => {
      const el = document.querySelector("[data-snap-scope='true']") as HTMLElement | null;
      if (!el) return;
      snapTick.current += 1;
      el.classList.remove("rubber-pop");
      // reflow to restart animation
      void el.offsetWidth;
      el.classList.add("rubber-pop");
      click();
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [isMobile]);

  const loadProfile = useCallback(async () => {
    const data = await fetchProfile();
    if (!mountedRef.current) return;
    if (!data) {
      router.push("/auth");
      return;
    }
    setUserId(data.userId);
      setProfile({
        name: data.profile.name,
        publicId: data.profile.publicId,
        avatarUrl: data.profile.avatarUrl,
        dailyGoal: data.profile.dailyGoal,
        focusMinutes: data.profile.focusMinutes,
        shortBreakMinutes: data.profile.shortBreakMinutes,
        longBreakMinutes: data.profile.longBreakMinutes,
      });
    setProfileLoading(false);
    setAuthReady(true);
    const ensured = await ensureProfilePublicId(data.userId);
    if (ensured && mountedRef.current) {
      setProfile((p) => ({ ...p, publicId: ensured }));
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!userId || !profileDirty) return;
    const t = setTimeout(async () => {
      await updateProfile(userId, {
        name: profile.name,
        avatar_url: profile.avatarUrl,
        daily_goal: profile.dailyGoal,
        focus_minutes: profile.focusMinutes,
        short_break_minutes: profile.shortBreakMinutes,
        long_break_minutes: profile.longBreakMinutes,
      });
      setProfileDirty(false);
      setProfileSaveTick((n) => n + 1);
    }, 700);
    return () => clearTimeout(t);
  }, [profile, profileDirty, userId]);

  const refreshCalendar = useCallback(async () => {
    if (!userId) return;
    setCalendarLoading(true);
    const last28 = buildLastNDays(28);
    const data = await fetchCalendarRange(userId, last28[0], last28[last28.length - 1]);
    if (!mountedRef.current) return;
    const byDate = new Map<string, number>();
    data.forEach((row) => byDate.set(row.date, (byDate.get(row.date) || 0) + row.minutes));
    const last7 = buildLastNDays(7);
    setLast7Days(last7.map((d) => ({ date: d, minutes: byDate.get(d) || 0 })));
    setHistoryDays(last28.map((d) => ({ date: d, minutes: byDate.get(d) || 0 })));
    const totals = last28.map((d) => ({ date: d, minutes: byDate.get(d) || 0 }));
    const totalMinutes = totals.reduce((a, b) => a + b.minutes, 0);
    const best = totals.reduce((a, b) => (b.minutes > a.minutes ? b : a), totals[0]);
    let streak = 0;
    let current = 0;
    totals.forEach((d) => {
      if (d.minutes > 0) {
        current += 1;
        streak = Math.max(streak, current);
      } else {
        current = 0;
      }
    });
    setProfileStats({
      total: totalMinutes,
      streak,
      bestDay: best.date,
    });
    setCalendarLoading(false);
  }, [userId]);

  useEffect(() => {
    refreshCalendar();
  }, [refreshCalendar]);

  const refreshLeaderboard = useCallback(async () => {
    if (!userId) return;
    setLeaderboardLoading(true);
    const now = new Date();
    const monthDays = buildMonthDays(now.getFullYear(), now.getMonth());
    const days = leaderboardRange === "month" ? monthDays : buildLastNDays(7);
    const rows = await fetchLeaderboardRange(userId, days[0], days[days.length - 1], days, profile.name);
    if (!mountedRef.current) return;
    setLeaderboard(rows);
    setLeaderboardLoading(false);
  }, [userId, leaderboardRange, profile.name]);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!userId) return;
    refreshLeaderboard();
  }, [profileSaveTick, refreshLeaderboard, userId]);

  useEffect(() => {
    if (view === "leaderboard") refreshLeaderboard();
  }, [view, refreshLeaderboard]);

  const refreshRequests = useCallback(async () => {
    if (!userId) return;
    setRequestsLoading(true);
    const data = await fetchFriendRequests(userId);
    if (!mountedRef.current) return;
    setRequests(data);
    setRequestsLoading(false);
  }, [userId]);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  const refreshFriendIds = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("friends").select("friend_id").eq("user_id", userId);
    if (!mountedRef.current) return;
    const ids = (data || []).map((row: { friend_id: string }) => row.friend_id);
    setRealtimeFriendIds(ids);
  }, [userId]);

  useEffect(() => {
    refreshFriendIds();
  }, [refreshFriendIds]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`rt-base-${userId}`);
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `requester_id=eq.${userId}` },
        () => refreshRequests()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `addressee_id=eq.${userId}` },
        () => refreshRequests()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends", filter: `user_id=eq.${userId}` },
        () => {
          refreshFriendIds();
          refreshLeaderboard();
          refreshRequests();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => loadProfile()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadProfile, refreshFriendIds, refreshLeaderboard, refreshRequests]);

  useEffect(() => {
    if (!userId) return;
    const ids = Array.from(new Set([userId, ...realtimeFriendIds]));
    const channels = ids.map((id) =>
      supabase
        .channel(`rt-sessions-${id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${id}` },
          () => {
            refreshCalendar();
            refreshLeaderboard();
          }
        )
        .subscribe()
    );
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [userId, realtimeFriendIds, refreshCalendar, refreshLeaderboard]);

  function applyTheme(t: Theme) {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("fomodoro_theme", t);
  }

  const SIDEBAR_W = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;
  const displayName = (profile.name || "User").trim() || "User";
  const displayInitial = (displayName[0] || "U").toUpperCase();

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-2)",
          background:
            "radial-gradient(1200px 600px at 20% 0%, var(--mesh-a), transparent), radial-gradient(800px 400px at 80% 20%, var(--mesh-b), transparent), var(--bg-base)",
        }}
      >
        Loading your workspace...
      </div>
    );
  }
  const showSidebar = !isMobile || mobileOpen;
  const viewComponents: Record<View, React.ReactNode> = {
    ...COMPONENTS,
    pomodoro: (
      <PomodoroTimer
        settings={{
          focusMinutes: profile.focusMinutes,
          shortBreakMinutes: profile.shortBreakMinutes,
          longBreakMinutes: profile.longBreakMinutes,
          dailyGoal: profile.dailyGoal,
        }}
      />
    ),
    profile: (
      <MyProfilePanel
        profile={profile}
        onProfileChange={(next) => {
          setProfile(next);
          setProfileDirty(true);
        }}
        onAvatarPick={async (file) => {
          if (!userId) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setProfile((p) => ({ ...p, avatarUrl: reader.result as string }));
              setProfileDirty(true);
            }
          };
          reader.readAsDataURL(file);
          await updateProfile(userId || "", { avatar_file: file });
          push({ type: "success", title: "Profile updated", message: "Avatar saved." });
        }}
        loading={profileLoading}
        stats={profileStats}
      />
    ),
    calendar: <CalendarPanel last7={last7Days} history={historyDays} loading={calendarLoading} />,
    requests: (
      <RequestsPanel
        requests={requests}
        loading={requestsLoading}
        onAccept={async (id) => {
          try {
            await acceptFriendRequest(userId || "", id);
            setRequests((r) => r.filter((req) => req.id !== id));
            push({ type: "success", title: "Friend added", message: "You are now connected." });
            await refreshRequests();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Could not accept request.";
            push({ type: "error", title: "Action failed", message });
          }
        }}
        onDecline={async (id) => {
          try {
            await declineFriendRequest(userId || "", id);
            setRequests((r) => r.filter((req) => req.id !== id));
            push({ type: "info", title: "Request declined" });
            await refreshRequests();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Could not decline request.";
            push({ type: "error", title: "Action failed", message });
          }
        }}
      />
    ),
    leaderboard: (
      <LeaderboardPanel
        rows={leaderboard}
        loading={leaderboardLoading}
        range={leaderboardRange}
        onRangeChange={setLeaderboardRange}
        onRefresh={refreshLeaderboard}
      />
    ),
    "add-friend": (
      <AddFriendPanel
        onSend={async (code) => {
          if (!code.trim()) return;
          try {
            await createFriendRequestByCode(userId || "", code.trim());
            push({ type: "success", title: "Request sent", message: "Friend request delivered." });
            await refreshRequests();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Could not send request.";
            push({ type: "error", title: "Request failed", message });
          }
        }}
      />
    ),
  };
  const profileMenu = [
    {
      label: "My Profile",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      view: "profile" as View,
    },
    {
      label: "My Calendar",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      view: "calendar" as View,
    },
    {
      label: "Requests",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8"/><path d="M8 14h5"/>
        </svg>
      ),
      view: "requests" as View,
    },
    {
      label: "Add Friend",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
      ),
      view: "add-friend" as View,
    },
    {
      label: "Sign Out",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
      action: async () => {
        setSigningOut(true);
        await signOutUser();
        router.push("/auth");
        push({ type: "info", title: "Signed out" });
      },
      danger: true,
      loading: signingOut,
    },
  ];

  return (
    <div className="relative z-10 flex h-full w-full">
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 7, 15, 0.55)",
            zIndex: 70,
          }}
        />
      )}

      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <aside
        style={{
          position: "relative",
          width: showSidebar ? SIDEBAR_W : 0,
          flexShrink: 0,
          transition: `width ${SIDEBAR_ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          overflow: showSidebar ? "visible" : "hidden",
        }}
      >
        {/* Inner clip */}
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            width: "100%",
            background: "var(--sidebar-bg)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            transition: "background 0.35s ease, border-color 0.35s ease",
            position: isMobile ? "fixed" : "relative",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: isMobile ? 80 : 1,
            boxShadow: isMobile ? "8px 0 24px rgba(0,0,0,0.35)" : "none",
            transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "none",
            transitionProperty: "transform, background, border-color",
            transitionDuration: isMobile ? "260ms" : "0ms",
            pointerEvents: isMobile ? (mobileOpen ? "auto" : "none") : "auto",
          }}
        >

          {/* ── Brand ── */}
          <div
            className="flex items-center shrink-0"
            style={{
              height: 60,
              padding: `0 ${collapsed ? COLLAPSED_INSET : SIDEBAR_INSET}px`,
              justifyContent: "flex-start",
              transition: `padding ${SIDEBAR_ANIM_MS}ms ease`,
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0" style={{ flex: 1 }}>
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{
                  width: ICON_COL, height: ICON_COL,
                  background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
                  boxShadow: "0 2px 14px rgba(99,102,241,0.50)",
                }}
              >
                <FomoDoroIcon size={30} />
              </div>
              {/* max-width collapse → clips text right-to-left; key flip → remount → retype */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: ICON_COL,
                overflow: "hidden",
                maxWidth: collapsed ? 0 : BRAND_TEXT_MAX,
                transition: `max-width ${SIDEBAR_ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`,
                flexShrink: 0,
                paddingTop: 0,
              }}>
                <TypewriterText
                  key={`brand-${expandTick}`}
                  text="FomoDoro"
                  delay={0}
                  charMs={typeMs("FomoDoro")}
                  animate={!collapsed}
                  replay={expandTick}
                  style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em", lineHeight: 1.15, whiteSpace: "nowrap" }} />
                <TypewriterText
                  key={`tag-${expandTick}`}
                  text="Focus. Repeat."
                  delay={0}
                  charMs={typeMs("Focus. Repeat.")}
                  animate={!collapsed}
                  replay={expandTick}
                  style={{ display: "block", fontSize: 10, color: "var(--text-3)", marginTop: 2, whiteSpace: "nowrap" }} />
              </div>
            </div>
            {isMobile && (
              <LoadingButton
                onClick={() => setMobileOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Close menu"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </LoadingButton>
            )}
          </div>

          {/* ── Nav — NO workspace label, consistent padding ── */}
          <nav
            className="flex flex-col gap-0.5 flex-1 overflow-hidden"
            style={{ padding: isMobile ? "6px 0" : "8px 0" }}
          >
            {NAV.map((item) => {
              const active = view === item.id;
              return (
                <LoadingButton
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    if (isMobile) setMobileOpen(false);
                  }}
                  className="flex items-center rounded-xl w-full relative transition-all duration-200"
                  title={collapsed ? item.label : undefined}
                  style={{
                    /* Fixed padding — icons never shift */
                    padding: `9px ${collapsed ? COLLAPSED_INSET : SIDEBAR_INSET}px`,
                    gap: collapsed ? 0 : 10,
                    justifyContent: "flex-start",
                    background: "transparent",
                    border: "1px solid transparent",
                    color: active ? "var(--accent-text)" : "var(--text-2)",
                    boxSizing: "border-box",
                  }}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: ACTIVE_GLOW_INSET,
                        right: ACTIVE_GLOW_INSET,
                        borderRadius: 14,
                        background: "var(--accent-dim)",
                        border: "1px solid var(--accent-border)",
                        boxShadow: "0 0 0 1px rgba(99,102,241,0.15)",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <span style={{ width: ICON_COL, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: active ? 1 : 0.65 }}>
                    {item.icon}
                  </span>
                  {/* Wrapper clips right-to-left on collapse; key remounts TypewriterText on expand */}
                  <div style={{
                    overflow: "hidden",
                    maxWidth: collapsed ? 0 : NAV_TEXT_MAX,
                    transition: `max-width ${SIDEBAR_ANIM_MS}ms cubic-bezier(0.4,0,0.2,1)`,
                    textAlign: "left",
                    willChange: "max-width",
                  }}>
                    <TypewriterText
                      key={`label-${item.id}-${expandTick}`}
                      text={item.label}
                      delay={0}
                      charMs={typeMs(item.label)}
                      animate={!collapsed}
                      replay={expandTick}
                      style={{ display: "block", fontSize: 13, fontWeight: 500, lineHeight: 1.2, whiteSpace: "nowrap" }} />
                    <TypewriterText
                      key={`desc-${item.id}-${expandTick}`}
                      text={item.desc}
                      delay={0}
                      charMs={typeMs(item.desc)}
                      animate={!collapsed}
                      replay={expandTick}
                      style={{ display: "block", fontSize: 10, color: "var(--text-3)", marginTop: 1, whiteSpace: "nowrap" }} />
                  </div>
                </LoadingButton>
              );
            })}
          </nav>

          {!collapsed && (leaderboardLoading || leaderboard.length > 0) && (
            <div
              style={{
                margin: "4px 8px 8px",
                background: "var(--glass-1)",
                border: "1px solid var(--glass-border)",
                borderRadius: 14,
              }}
            >
              <LeaderboardMini rows={leaderboard} loading={leaderboardLoading} />
            </div>
          )}

          {/* ── Theme switcher — just above the profile border ── */}
          {collapsed ? (
            <div className="flex justify-center shrink-0" style={{ padding: "0 8px 8px" }}>
              <LoadingButton
                onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--glass-1)",
                  border: "1px solid var(--glass-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-2)", cursor: "pointer",
                  transition: "background 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent-dim)"; (e.currentTarget as HTMLElement).style.color = "var(--accent-text)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--glass-1)"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
              >
                {theme === "dark" ? <SunIcon size={14}/> : <MoonIcon size={13}/>}
              </LoadingButton>
            </div>
          ) : (
            <div className="shrink-0" style={{ padding: "0 8px 8px" }}>
              <ThemePill theme={theme} onSet={applyTheme} />
            </div>
          )}

          {/* Profile strip removed from sidebar */}
        </div>

        {/* ── Floating collapse toggle — half in / half out ── */}
        {!isMobile && (
          <LoadingButton
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              position: "absolute",
              right: -16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 40,
              width: 16, height: 32,
              borderRadius: "0 16px 16px 0",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--sidebar-bg)",
              border: "none",
              color: "var(--text-3)",
              cursor: "pointer",
              boxShadow: "none",
              transition: "color 0.18s ease",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "var(--text-1)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "var(--text-3)";
            }}
          >
            <ChevronIcon pointRight={collapsed} />
          </LoadingButton>
        )}
      </aside>

      {/* ══════════════════════════════════════
          MAIN
      ══════════════════════════════════════ */}
      <main
        className="flex flex-col min-w-0"
        style={{ flex: "1 1 0", overflow: "hidden" }}
        onClick={() => {
          if (isMobile && mobileOpen) setMobileOpen(false);
        }}
      >
        {/* ── Header ── */}
        <header
          className="flex items-center shrink-0"
          style={{
            height: 60,
            padding: isMobile ? "0 16px" : "0 24px",
            background: "var(--header-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            transition: "background 0.35s ease, border-color 0.35s ease",
            position: "relative",
            zIndex: 40,
          }}
        >
          {isMobile && (
            <LoadingButton
              onClick={() => setMobileOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--glass-border)",
                background: "var(--glass-1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
              title="Open menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </LoadingButton>
          )}
          {!isMobile && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
                {VIEW_META[view].title}
              </h1>
            </div>
          )}

          {/* Profile button — top right */}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            {profileOpen && (
              <div
                ref={profileMenuRef}
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "var(--header-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 14,
                  boxShadow: "var(--glass-shadow)",
                  overflow: "hidden",
                  zIndex: 80,
                  minWidth: 190,
                }}
              >
                {profileMenu.map((item, idx) => (
                  <LoadingButton
                    key={item.label}
                    loading={item.loading}
                    onClick={() => {
                      if (item.view) setView(item.view);
                      if (item.action) item.action();
                      setProfileOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "10px 12px",
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      borderBottom: idx < profileMenu.length - 1 ? "1px solid var(--glass-border)" : "none",
                      color: item.danger ? "#ef4444" : "var(--text-2)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.icon}
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</span>
                    </div>
                  </LoadingButton>
                ))}
              </div>
            )}
            <LoadingButton
              ref={profileBtnRef}
              onClick={() => setProfileOpen(o => !o)}
              onMouseEnter={() => setProfileHover(true)}
              onMouseLeave={() => setProfileHover(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 8px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: 10,
                color: "var(--text-1)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 30, height: 30,
                  background: "linear-gradient(135deg,#6366f1,#06b6d4)",
                  color: "white", fontSize: 12, fontWeight: 700,
                }}
              >
                {displayInitial}
              </div>
              <span style={{ fontSize: 13, fontWeight: 650 }}>
                {profileLoading ? "Loading..." : displayName}
              </span>
              <span style={{
                display: "flex",
                alignItems: "center",
                opacity: profileHover || profileOpen ? 1 : 0.7,
                transition: "opacity 0.15s ease, transform 0.2s ease",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                color: "var(--text-3)",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </span>
            </LoadingButton>
          </div>
        </header>

        {/* ── Content card ── */}
        <div
          style={{
            flex: "1 1 0",
            overflow: "hidden",
            padding: isMobile ? "12px" : "14px 18px",
          }}
        >
          <div
            className="h-full w-full"
            style={{
              borderRadius: "16px",
              background: "var(--glass-1)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
              overflow: "hidden",
              transition: "background 0.35s ease, border-color 0.35s ease",
            }}
          >
            {/*
              Each tab wrapper is h-full so children (esp. Notes) can fill it.
              overflow-y-auto here allows scroll for Pomodoro / Tasks / Sounds.
              Notes manages its own scroll internally via overflow:hidden children.
            */}
            {(Object.keys(viewComponents) as View[]).map((t) => (
              <div
                key={t}
                className={t === view ? "fade-in" : ""}
                style={{
                  display: t === view ? "flex" : "none",
                  flexDirection: "column",
                  height: "100%",
                  overflow: t === "notes" || t === "kanban" ? "hidden" : "auto",
                  padding: isMobile ? "12px" : "14px 18px",   /* ← reduced inner padding */
                  scrollSnapType: isMobile && (t === "leaderboard" || t === "calendar") ? "y mandatory" : "unset",
                }}
              >
                <div
                  data-snap-scope={isMobile && (t === "leaderboard" || t === "calendar") ? "true" : undefined}
                  style={{
                    height:
                      t === "notes" ||
                      (t === "tasks" && !isMobile) ||
                      (isMobile && (t === "tasks" || t === "kanban"))
                        ? "100%"
                        : "auto",
                    display:
                      t === "notes" ||
                      (t === "tasks" && !isMobile) ||
                      (isMobile && (t === "tasks" || t === "kanban"))
                        ? "flex"
                        : "block",
                    flex:
                      t === "notes" ||
                      (t === "tasks" && !isMobile) ||
                      (isMobile && (t === "tasks" || t === "kanban"))
                        ? "1 1 0"
                        : undefined,
                  }}
                >
                  {viewComponents[t]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
