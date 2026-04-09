"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LoadingButton from "./LoadingButton";

const MODES = {
  focus: { label: "Focus", duration: 25 * 60, color: "#6366f1", bg: "var(--accent-dim)", border: "var(--accent-border)" },
  short: { label: "Short Break", duration: 5 * 60, color: "#10b981", bg: "var(--green-dim)", border: "var(--green-border)" },
  long: { label: "Long Break", duration: 15 * 60, color: "#06b6d4", bg: "var(--cyan-dim)", border: "var(--cyan-border)" },
} as const;

type Mode = keyof typeof MODES;

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = MODES[mode];
  const progress = 1 - timeLeft / current.duration;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(MODES[mode].duration);
  }, [mode]);

  useEffect(() => {
    reset();
  }, [mode, reset]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          if (mode === "focus") setSessions((s) => s + 1);
          // Attempt a subtle notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("FomoDoro", { body: mode === "focus" ? "Focus session complete! Take a break." : "Break over. Back to work!" });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  const minutes = pad(Math.floor(timeLeft / 60));
  const seconds = pad(timeLeft % 60);

  const totalMinutes = Math.floor(sessions * 25);

  return (
    <div className="fade-in flex flex-col items-center gap-8 w-full max-w-lg mx-auto py-6">
      {/* Mode selector */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
      >
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <LoadingButton
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={
              mode === m
                ? { background: current.bg, color: current.color, border: `1px solid ${current.border}` }
                : { color: "var(--text-2)", border: "1px solid transparent" }
            }
          >
            {MODES[m].label}
          </LoadingButton>
        ))}
      </div>

      {/* Ring timer */}
      <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
        {/* Outer glow ring */}
        <svg
          width="280"
          height="280"
          className="absolute"
          style={{ filter: running ? `drop-shadow(0 0 18px ${current.color}55)` : "none", transition: "filter 0.5s ease" }}
        >
          {/* Track */}
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            fill="none"
            stroke={current.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="ring-progress"
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
          />
        </svg>

        {/* Glass disc */}
        <div
          className="relative z-10 flex flex-col items-center justify-center rounded-full"
          style={{
            width: 220,
            height: 220,
            background: "var(--glass-2)",
            backdropFilter: "blur(24px)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="font-mono font-semibold leading-none"
            style={{ fontSize: 52, color: "var(--text-1)", letterSpacing: "-2px" }}
          >
            {minutes}:{seconds}
          </span>
          <span className="text-xs mt-2 font-medium tracking-widest uppercase" style={{ color: current.color }}>
            {current.label}
          </span>
          {running && (
            <span
              className="absolute bottom-10 text-xs font-medium"
              style={{ color: "var(--text-3)" }}
            >
              stay focused
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Reset */}
        <LoadingButton
          onClick={reset}
          className="flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: 44,
            height: 44,
            background: "var(--glass-2)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-2)",
          }}
          title="Reset"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </LoadingButton>

        {/* Play / Pause */}
        <LoadingButton
          onClick={() => setRunning((r) => !r)}
          className="flex items-center justify-center rounded-full font-semibold transition-all duration-200"
          style={{
            width: 64,
            height: 64,
            background: running ? "rgba(99,102,241,0.25)" : current.color,
            border: `1px solid ${running ? "var(--accent-border)" : "transparent"}`,
            color: "white",
            boxShadow: running ? "none" : `0 4px 24px ${current.color}55`,
          }}
        >
          {running ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </LoadingButton>

        {/* Skip */}
        <LoadingButton
          onClick={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === "focus") setSessions((s) => s + 1);
            setTimeLeft(0);
          }}
          className="flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: 44,
            height: 44,
            background: "var(--glass-2)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-2)",
          }}
          title="Skip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5,4 15,12 5,20" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </LoadingButton>
      </div>

      {/* Stats row */}
      <div
        className="flex items-center gap-6 px-8 py-4 rounded-2xl w-full"
        style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
      >
        <Stat label="Sessions" value={sessions.toString()} color="var(--accent)" />
        <div style={{ width: 1, height: 32, background: "var(--glass-border)" }} />
        <Stat
          label="Focus time"
          value={
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
              <span>{totalMinutes}</span>
              <span>m</span>
            </span>
          }
          color="#10b981"
        />
        <div style={{ width: 1, height: 32, background: "var(--glass-border)" }} />
        <Stat label="Daily goal" value={`${Math.min(sessions, 8)}/8`} color="#06b6d4" />
      </div>

      {/* Session dots */}
      {sessions > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: Math.min(sessions, 16) }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: i < 8 ? "#6366f1" : "#10b981",
                opacity: 0.8,
              }}
            />
          ))}
          {sessions > 16 && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>+{sessions - 16}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-xl font-semibold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}
