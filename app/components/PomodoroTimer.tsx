"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LoadingButton from "./LoadingButton";
import { usePomodoroStore, type PomodoroSettings } from "./usePomodoroStore";

const MODE_META = {
  focus: { label: "Focus", color: "#6366f1", bg: "var(--accent-dim)", border: "var(--accent-border)" },
  short: { label: "Short Break", color: "#10b981", bg: "var(--green-dim)", border: "var(--green-border)" },
  long: { label: "Long Break", color: "#06b6d4", bg: "var(--cyan-dim)", border: "var(--cyan-border)" },
} as const;

type Mode = keyof typeof MODE_META;

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function PomodoroTimer({
  settings,
  variant = "default",
  disablePopup = false,
}: {
  settings?: Partial<PomodoroSettings>;
  variant?: "default" | "popup";
  disablePopup?: boolean;
}) {
  const { state, setMode, toggle, start, reset, skip, updateSettings, lastComplete, clearLastComplete } = usePomodoroStore(settings);
  const { mode, timeLeft, running, sessions } = state;
  const [showComplete, setShowComplete] = useState(false);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (settings) updateSettings(settings);
  }, [settings, updateSettings]);

  useEffect(() => {
    if (lastComplete) {
      setShowComplete(true);
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("FomoDoro", {
            body: `Your focus timer for ${lastComplete.minutes} min got completed.`,
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification("FomoDoro", {
                body: `Your focus timer for ${lastComplete.minutes} min got completed.`,
              });
            }
          });
        }
      }
    }
  }, [lastComplete]);

  useEffect(() => {
    if (disablePopup) return;
    const onVisibility = () => {
      if (window.innerWidth <= 900) return;
      if (document.visibilityState === "hidden") {
        if (!popupRef.current || popupRef.current.closed) {
          popupRef.current = window.open(
            "/timer",
            "fomodoro-timer",
            "width=320,height=420,resizable=yes,scrollbars=no"
          );
        }
      } else if (document.visibilityState === "visible") {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
          popupRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [disablePopup]);

  const current = MODE_META[mode];
  const duration = useMemo(() => {
    if (mode === "short") return state.settings.shortBreakMinutes * 60;
    if (mode === "long") return state.settings.longBreakMinutes * 60;
    return state.settings.focusMinutes * 60;
  }, [mode, state.settings]);
  const progress = duration > 0 ? 1 - timeLeft / duration : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const minutes = pad(Math.floor(timeLeft / 60));
  const seconds = pad(timeLeft % 60);

  const totalMinutes = Math.floor(sessions * state.settings.focusMinutes);

  return (
    <div className="pomodoro-wrap fade-in flex flex-col items-center gap-8 w-full max-w-lg mx-auto py-6">
      {variant === "default" && (
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
        >
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <LoadingButton
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                mode === m
                  ? { background: MODE_META[m].bg, color: MODE_META[m].color, border: `1px solid ${MODE_META[m].border}` }
                  : { color: "var(--text-2)", border: "1px solid transparent" }
              }
            >
              {MODE_META[m].label}
            </LoadingButton>
          ))}
        </div>
      )}

      {/* Ring timer */}
      <div className="pomodoro-ring relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
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
          className="pomodoro-disc relative z-10 flex flex-col items-center justify-center rounded-full"
          style={{
            width: 220,
            height: 220,
            background: "var(--glass-2)",
            backdropFilter: "blur(24px)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="pomodoro-time font-mono font-semibold leading-none"
            style={{ fontSize: 52, color: "var(--text-1)", letterSpacing: "-2px" }}
          >
            {minutes}:{seconds}
          </span>
          <span className="text-xs mt-2 font-medium tracking-widest uppercase" style={{ color: current.color }}>
            {current.label}
          </span>
          {running && variant === "default" && (
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
      <div className="pomodoro-controls flex items-center gap-4">
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
          onClick={toggle}
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
          onClick={skip}
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
      {variant === "default" && (
        <div
          className="pomodoro-stats flex items-center gap-6 px-8 py-4 rounded-2xl w-full"
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
          <Stat label="Daily goal" value={`${Math.min(sessions, state.settings.dailyGoal)}/${state.settings.dailyGoal}`} color="#06b6d4" />
        </div>
      )}

      {/* Session dots */}
      {variant === "default" && sessions > 0 && (
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
      {showComplete && lastComplete && variant === "default" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,8,16,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(420px, 90vw)",
              background: "var(--glass-1)",
              border: "1px solid var(--glass-border)",
              borderRadius: 18,
              padding: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>
              Focus timer completed
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              Your focus timer for {lastComplete.minutes} min got completed.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
              <LoadingButton
                onClick={() => {
                  setMode("focus");
                  start();
                  setShowComplete(false);
                  clearLastComplete();
                }}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 12px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                Restart Focus
              </LoadingButton>
              <LoadingButton
                onClick={() => {
                  setMode("short");
                  start();
                  setShowComplete(false);
                  clearLastComplete();
                }}
                style={{
                  border: "1px solid var(--glass-border)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  background: "var(--glass-2)",
                  color: "var(--text-1)",
                  fontWeight: 600,
                }}
              >
                Start Break
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
