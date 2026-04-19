"use client";

import { useRef, useState, type InputHTMLAttributes, useCallback } from "react";
import LoadingButton from "../LoadingButton";
import { formatMinutes, SkeletonCard, type ProfileRecord } from "./shared";

// ─── InlineEdit (private to this panel) ──────────────────────────────────────

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
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-label={label}
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

// ─── SettingCard ──────────────────────────────────────────────────────────────

function SettingCard({
  label, icon, value, unit, min, max, step = 1, accentColor = "var(--accent)", onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  accentColor?: string;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  const dec = useCallback(() => onChange(Math.max(min, value - step)), [value, min, step, onChange]);
  const inc = useCallback(() => onChange(Math.min(max, value + step)), [value, max, step, onChange]);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 14,
        background: "var(--glass-1)", border: "1px solid var(--glass-border)",
        borderRadius: 16, padding: "16px 14px",
      }}
    >
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ color: accentColor, display: "flex", opacity: 0.85 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-3)" }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: "var(--text-1)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, paddingBottom: 2 }}>{unit}</span>
      </div>

      {/* Progress track */}
      <div style={{ height: 5, borderRadius: 999, background: "var(--glass-2)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%", borderRadius: 999,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
            transition: "width 0.2s ease",
          }}
        />
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={dec}
          disabled={value <= min}
          style={{
            flex: 1, padding: "7px 0",
            background: "var(--glass-2)", border: "1px solid var(--glass-border)",
            borderRadius: 9, cursor: value <= min ? "default" : "pointer",
            fontSize: 18, fontWeight: 600, lineHeight: 1,
            color: value <= min ? "var(--text-3)" : "var(--text-1)",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => { if (value > min) (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-3)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-2)"; }}
        >
          −
        </button>
        <button
          onClick={inc}
          disabled={value >= max}
          style={{
            flex: 1, padding: "7px 0",
            background: "var(--glass-2)", border: "1px solid var(--glass-border)",
            borderRadius: 9, cursor: value >= max ? "default" : "pointer",
            fontSize: 18, fontWeight: 600, lineHeight: 1,
            color: value >= max ? "var(--text-3)" : "var(--text-1)",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => { if (value < max) (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-3)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-2)"; }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── ProfilePanel ─────────────────────────────────────────────────────────────

export default function ProfilePanel({
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
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Avatar + name ── */}
      <div
        style={{
          display: "flex", gap: 18, alignItems: "center",
          background: "var(--glass-1)", border: "1px solid var(--glass-border)",
          borderRadius: 18, padding: 18,
        }}
      >
        <LoadingButton
          onClick={() => fileRef.current?.click()}
          title="Tap to change avatar"
          style={{
            width: 96, height: 96, borderRadius: "50%",
            border: "none", padding: 0, cursor: "pointer", overflow: "hidden",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "white", fontSize: 28, fontWeight: 700 }}>
              {(profile.name[0] ?? "U").toUpperCase()}
            </span>
          )}
        </LoadingButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarPick(f); }}
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

      {/* Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Total Focus",     value: formatMinutes(stats.total) },
          { label: "Longest Streak",  value: `${stats.streak} days` },
          { label: "Best Day",        value: stats.bestDay || "—" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--glass-1)", border: "1px solid var(--glass-border)",
              borderRadius: 14, padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{card.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginTop: 6 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Timer settings ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <SettingCard
          label="Daily Goal"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>}
          value={profile.dailyGoal}
          unit="sessions"
          min={1} max={20} step={1}
          accentColor="#6366f1"
          onChange={(v) => onProfileChange({ ...profile, dailyGoal: v })}
        />
        <SettingCard
          label="Focus"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>}
          value={profile.focusMinutes}
          unit="min"
          min={5} max={120} step={5}
          accentColor="#6366f1"
          onChange={(v) => onProfileChange({ ...profile, focusMinutes: v })}
        />
        <SettingCard
          label="Short Break"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>}
          value={profile.shortBreakMinutes}
          unit="min"
          min={1} max={30} step={1}
          accentColor="#10b981"
          onChange={(v) => onProfileChange({ ...profile, shortBreakMinutes: v })}
        />
        <SettingCard
          label="Long Break"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>}
          value={profile.longBreakMinutes}
          unit="min"
          min={5} max={60} step={5}
          accentColor="#06b6d4"
          onChange={(v) => onProfileChange({ ...profile, longBreakMinutes: v })}
        />
      </div>
    </div>
  );
}
