"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingButton from "./LoadingButton";
import { usePomodoroStore, type PomodoroSettings } from "./usePomodoroStore";

const MODE_META = {
  focus: { label: "Focus",       color: "#6366f1", bg: "var(--accent-dim)",  border: "var(--accent-border)"  },
  short: { label: "Short Break", color: "#10b981", bg: "var(--green-dim)",   border: "var(--green-border)"   },
  long:  { label: "Long Break",  color: "#06b6d4", bg: "var(--cyan-dim)",    border: "var(--cyan-border)"    },
} as const;

type Mode = keyof typeof MODE_META;

const RADIUS       = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// PiP ring uses a 0-100 viewBox
const PIP_R = 42;
const PIP_CIRCUM = 2 * Math.PI * PIP_R;

function pad(n: number) { return n.toString().padStart(2, "0"); }

/* ─────────────────────────────────────────────────────────────
   PipTimerContent — rendered inside the Document PiP window.
   Icon-only buttons, fully responsive via vmin/vh/vw units.
───────────────────────────────────────────────────────────── */
function PipTimerContent() {
  const { state, toggle, reset } = usePomodoroStore();
  const { mode, timeLeft, running, settings } = state;

  const duration = useMemo(() => {
    if (mode === "short") return settings.shortBreakMinutes * 60;
    if (mode === "long")  return settings.longBreakMinutes  * 60;
    return settings.focusMinutes * 60;
  }, [mode, settings]);

  const dashOffset = PIP_CIRCUM * (1 - (duration > 0 ? 1 - timeLeft / duration : 0));
  const mins = pad(Math.floor(timeLeft / 60));
  const secs = pad(timeLeft % 60);
  const { color } = MODE_META[mode];
  const modeShort = mode === "focus" ? "FOCUS" : mode === "short" ? "SHORT" : "LONG";

  return (
    <div
      style={{
        width: "100vw", height: "100vh",
        display: "flex", alignItems: "center",
        gap: "4vw", padding: "3vw 5vw",
        background:
          "radial-gradient(ellipse 140% 100% at 10% 20%, rgba(99,102,241,0.14), transparent 55%)," +
          "#06080f",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      } as React.CSSProperties}
    >
      {/* ── Ring dial ── */}
      <div style={{ flexShrink: 0, height: "86%", aspectRatio: "1 / 1" }}>
        <svg
          width="100%" height="100%"
          viewBox="0 0 100 100"
          style={{
            overflow: "visible",
            filter: running ? `drop-shadow(0 0 9px ${color}55)` : "none",
            transition: "filter 0.5s ease",
          }}
        >
          {/* Glass fill */}
          <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          {/* Track */}
          <circle cx="50" cy="50" r={PIP_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4"/>
          {/* Progress */}
          <circle
            cx="50" cy="50" r={PIP_R}
            fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={PIP_CIRCUM} strokeDashoffset={dashOffset}
            style={{
              transform: "rotate(-90deg)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: "stroke-dashoffset 0.85s ease, stroke 0.4s ease",
            }}
          />
          {/* Time */}
          <text
            x="50" y="46" textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.93)" fontSize="18" fontWeight="700"
            fontFamily="ui-monospace,'SF Mono',Consolas,monospace" letterSpacing="-0.5"
          >
            {mins}:{secs}
          </text>
          {/* Mode */}
          <text
            x="50" y="63" textAnchor="middle"
            fill={color} fontSize="5.2" fontWeight="600" letterSpacing="1.4" opacity="0.9"
          >
            {modeShort}
          </text>
        </svg>
      </div>

      {/* ── Icon-only buttons ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "min(12px, 3.5vh)" }}>

        {/* Play / Pause */}
        <button
          onClick={toggle}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: "min(58px, 22vh)",
            borderRadius: "min(14px, 4vw)",
            background: running ? "rgba(99,102,241,0.18)" : `linear-gradient(135deg, ${color}, ${color}cc)`,
            border: `1px solid ${running ? "rgba(99,102,241,0.32)" : "transparent"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: running ? "none" : `0 3px 18px ${color}44`,
            transition: "all 0.2s ease",
            padding: 0,
          }}
        >
          {running ? (
            <svg style={{ width: "38%", height: "38%" }} viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg style={{ width: "38%", height: "38%" }} viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
              <polygon points="6,3 20,12 6,21"/>
            </svg>
          )}
        </button>

        {/* Reset */}
        <button
          onClick={reset}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: "min(46px, 17vh)",
            borderRadius: "min(14px, 4vw)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            padding: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.16)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)";
          }}
        >
          <svg style={{ width: "36%", height: "36%" }} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main PomodoroTimer
───────────────────────────────────────────────────────────── */
export default function PomodoroTimer({
  settings,
  variant = "default",
  disablePopup = false,
  onSyncMinutes,
}: {
  settings?: Partial<PomodoroSettings>;
  variant?: "default" | "popup";
  disablePopup?: boolean;
  onSyncMinutes?: (minutes: number) => void;
}) {
  const { state, setMode, toggle, start, reset, updateSettings, lastComplete, clearLastComplete } = usePomodoroStore(settings);
  const { mode, timeLeft, running, sessions } = state;
  const [showComplete, setShowComplete] = useState(false);

  // ── Popup refs (window.open fallback) ──
  const popupRef = useRef<Window | null>(null);

  // ── Per-minute DB sync refs ──
  const pendingSecondsRef  = useRef(0);
  const syncedMinutesRef   = useRef(0);
  const prevTimeLeftRef    = useRef<number | null>(null);
  const prevRunningRef     = useRef(false);
  const prevModeRef        = useRef<Mode>(mode);

  const flushMinutes = useCallback((minutes: number) => {
    if (minutes > 0) onSyncMinutes?.(minutes);
  }, [onSyncMinutes]);

  // Track elapsed focus seconds → flush every 60 s
  useEffect(() => {
    const nowMode    = state.mode;
    const nowRunning = state.running;
    const nowTL      = state.timeLeft;

    if (nowMode !== prevModeRef.current) {
      syncedMinutesRef.current  = 0;
      pendingSecondsRef.current = 0;
      prevTimeLeftRef.current   = null;
      prevModeRef.current       = nowMode;
      prevRunningRef.current    = nowRunning;
      return;
    }
    prevModeRef.current = nowMode;
    if (nowMode !== "focus") { prevRunningRef.current = nowRunning; return; }

    if (!prevRunningRef.current && nowRunning) {
      prevTimeLeftRef.current = nowTL;
      prevRunningRef.current  = true;
      return;
    }
    if (prevRunningRef.current && !nowRunning) {
      prevTimeLeftRef.current = null;
      prevRunningRef.current  = false;
      return;
    }
    if (nowRunning && prevTimeLeftRef.current !== null) {
      const delta = prevTimeLeftRef.current - nowTL;
      prevTimeLeftRef.current = nowTL;
      if (delta > 0 && delta <= 5) {
        pendingSecondsRef.current += delta;
        const mins = Math.floor(pendingSecondsRef.current / 60);
        if (mins > 0) {
          pendingSecondsRef.current  -= mins * 60;
          syncedMinutesRef.current   += mins;
          flushMinutes(mins);
        }
      }
    }
    prevRunningRef.current = nowRunning;
  }, [state.timeLeft, state.running, state.mode, flushMinutes]);

  // On session complete: flush remaining unsynced minutes
  useEffect(() => {
    if (!lastComplete) return;
    const remaining = lastComplete.minutes - syncedMinutesRef.current;
    syncedMinutesRef.current  = 0;
    pendingSecondsRef.current = 0;
    prevTimeLeftRef.current   = null;
    flushMinutes(remaining);
  }, [lastComplete, flushMinutes]);

  useEffect(() => {
    if (settings) updateSettings(settings);
  }, [settings, updateSettings]);

  // Notification on completion
  useEffect(() => {
    if (lastComplete) {
      setShowComplete(true);
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("FomoDoro", { body: `Focus session of ${lastComplete.minutes} min completed!` });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => {
            if (p === "granted")
              new Notification("FomoDoro", { body: `Focus session of ${lastComplete.minutes} min completed!` });
          });
        }
      }
    }
  }, [lastComplete]);

  // ── Document Picture-in-Picture (or window.open fallback) ──
  useEffect(() => {
    if (disablePopup) return;

    const openPiP = async () => {
      // Document PiP — Chrome 111+
      if ("documentPictureInPicture" in window) {
        try {
          const pipWin: Window = await (
            window as unknown as { documentPictureInPicture: { requestWindow: (o: object) => Promise<Window> } }
          ).documentPictureInPicture.requestWindow({ width: 460, height: 200 });

          // Inject reset CSS
          const style = pipWin.document.createElement("style");
          style.textContent =
            "*, *::before, *::after { box-sizing: border-box; margin: 0; }" +
            "html, body { width: 100%; height: 100%; overflow: hidden; background: #06080f; }";
          pipWin.document.head.appendChild(style);

          // Render PipTimerContent via a new React root
          const { createRoot } = await import("react-dom/client");
          const root = createRoot(pipWin.document.body);
          root.render(<PipTimerContent />);

          pipWin.addEventListener("pagehide", () => {
            root.unmount();
          });
          return; // done — don't open window.open
        } catch {
          // fall through to window.open
        }
      }
      // Fallback
      if (!popupRef.current || popupRef.current.closed) {
        popupRef.current = window.open(
          "/timer",
          "fomodoro-timer",
          "width=460,height=210,resizable=yes,scrollbars=no,location=no,toolbar=no,menubar=no,status=no"
        );
      }
    };

    const closePiP = () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
        popupRef.current = null;
      }
    };

    const onVisibility = () => {
      if (window.innerWidth <= 900) return;
      if (document.visibilityState === "hidden") openPiP();
      else closePiP();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [disablePopup]);

  // ── Derived display values ──
  const current = MODE_META[mode];
  const duration = useMemo(() => {
    if (mode === "short") return state.settings.shortBreakMinutes * 60;
    if (mode === "long")  return state.settings.longBreakMinutes  * 60;
    return state.settings.focusMinutes * 60;
  }, [mode, state.settings]);

  const progress   = duration > 0 ? 1 - timeLeft / duration : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const minutes    = pad(Math.floor(timeLeft / 60));
  const seconds    = pad(timeLeft % 60);
  const totalMinutes = Math.floor(sessions * state.settings.focusMinutes);

  return (
    <div className="pomodoro-wrap fade-in flex flex-col items-center gap-8 w-full max-w-lg mx-auto py-6">

      {/* Mode tabs */}
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

      {/* ── Ring timer ── */}
      <div className="pomodoro-ring relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
        <svg
          width="280" height="280"
          className="absolute"
          style={{
            overflow: "visible",
            filter: running ? `drop-shadow(0 0 18px ${current.color}55)` : "none",
            transition: "filter 0.5s ease",
          }}
        >
          {/* Track */}
          <circle cx="140" cy="140" r={RADIUS} fill="none" stroke="var(--glass-border)" strokeWidth="6"/>
          {/* Progress arc */}
          <circle
            cx="140" cy="140" r={RADIUS}
            fill="none"
            stroke={current.color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            className="ring-progress"
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
          />
        </svg>

        {/* Glass disc */}
        <div
          className="pomodoro-disc relative z-10 flex flex-col items-center justify-center rounded-full"
          style={{
            width: 220, height: 220,
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
            <span className="absolute bottom-10 text-xs font-medium" style={{ color: "var(--text-3)" }}>
              stay focused
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="pomodoro-controls flex items-center gap-4">
        <LoadingButton
          onClick={reset}
          className="flex items-center justify-center rounded-full transition-all duration-200"
          style={{ width: 44, height: 44, background: "var(--glass-2)", border: "1px solid var(--glass-border)", color: "var(--text-2)" }}
          title="Reset"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </LoadingButton>

        <LoadingButton
          onClick={toggle}
          className="flex items-center justify-center rounded-full font-semibold transition-all duration-200"
          style={{
            width: 64, height: 64,
            background: running ? "rgba(99,102,241,0.25)" : current.color,
            border: `1px solid ${running ? "var(--accent-border)" : "transparent"}`,
            color: "white",
            boxShadow: running ? "none" : `0 4px 24px ${current.color}55`,
          }}
        >
          {running ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
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
                <span>{totalMinutes}</span><span>m</span>
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
              style={{ width: 8, height: 8, background: i < 8 ? "#6366f1" : "#10b981", opacity: 0.8 }}
            />
          ))}
          {sessions > 16 && <span style={{ fontSize: 11, color: "var(--text-3)" }}>+{sessions - 16}</span>}
        </div>
      )}

      {/* Session complete modal */}
      {showComplete && lastComplete && variant === "default" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,8,16,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 20 }}>
          <div style={{ width: "min(420px, 90vw)", background: "var(--glass-1)", border: "1px solid var(--glass-border)", borderRadius: 18, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>Focus timer completed</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              Your focus timer for {lastComplete.minutes} min got completed.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
              <LoadingButton
                onClick={() => { setMode("focus"); start(); setShowComplete(false); clearLastComplete(); }}
                style={{ border: "none", borderRadius: 10, padding: "8px 12px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontWeight: 600 }}
              >
                Restart Focus
              </LoadingButton>
              <LoadingButton
                onClick={() => { setMode("short"); start(); setShowComplete(false); clearLastComplete(); }}
                style={{ border: "1px solid var(--glass-border)", borderRadius: 10, padding: "8px 12px", background: "var(--glass-2)", color: "var(--text-1)", fontWeight: 600 }}
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

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-xl font-semibold" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}
