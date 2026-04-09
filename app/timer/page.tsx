"use client";

import { useMemo } from "react";
import { usePomodoroStore } from "../components/usePomodoroStore";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MODE = {
  focus: { label: "FOCUS",       color: "#6366f1" },
  short: { label: "SHORT BREAK", color: "#10b981" },
  long:  { label: "LONG BREAK",  color: "#06b6d4" },
} as const;

function WinBtn({
  onClick,
  bg,
  hoverBg,
  title,
  children,
}: {
  onClick: () => void;
  bg: string;
  hoverBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bg; }}
      style={{
        width: 13, height: 13,
        borderRadius: "50%",
        border: "none",
        background: bg,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 7, color: "rgba(0,0,0,0.55)", fontWeight: 800,
        padding: 0,
        transition: "background 0.15s ease",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export default function TimerPopupPage() {
  const { state, toggle, reset } = usePomodoroStore();
  const { mode, timeLeft, running, settings } = state;

  const duration = useMemo(() => {
    if (mode === "short") return settings.shortBreakMinutes * 60;
    if (mode === "long")  return settings.longBreakMinutes * 60;
    return settings.focusMinutes * 60;
  }, [mode, settings]);

  const progress   = duration > 0 ? 1 - timeLeft / duration : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const { label, color } = MODE[mode];

  const handleMaximize = () => {
    if (typeof window === "undefined") return;
    if (window.outerWidth >= screen.availWidth - 20) {
      window.resizeTo(460, 210);
    } else {
      window.moveTo(0, 0);
      window.resizeTo(screen.availWidth, screen.availHeight);
    }
  };

  const handleMinimize = () => {
    if (typeof window === "undefined") return;
    window.resizeTo(window.outerWidth, 36);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(ellipse 140% 100% at 10% 20%, rgba(99,102,241,0.14), transparent 55%)," +
          "radial-gradient(ellipse 80% 80% at 90% 80%, rgba(6,182,212,0.08), transparent 60%)," +
          "#06080f",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      } as React.CSSProperties}
    >
      {/* ── Custom title bar ── */}
      <div
        style={{
          height: "min(36px, 16vh)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          cursor: "default",
          // @ts-expect-error webkit drag region
          WebkitAppRegion: "drag",
        }}
      >
        {/* Brand */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 16, height: 16,
              borderRadius: 5,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "min(10px, 4.5vh)",
              fontWeight: 700,
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}
          >
            FomoDoro
          </span>
        </div>

        {/* Window controls */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            // @ts-expect-error webkit no-drag
            WebkitAppRegion: "no-drag",
          }}
        >
          <WinBtn onClick={handleMinimize} bg="rgba(255,220,0,0.55)" hoverBg="rgba(255,180,0,0.85)" title="Minimise">
            −
          </WinBtn>
          <WinBtn onClick={handleMaximize} bg="rgba(34,197,94,0.55)" hoverBg="rgba(22,163,74,0.85)" title="Maximise">
            +
          </WinBtn>
          <WinBtn onClick={() => window.close()} bg="rgba(239,68,68,0.70)" hoverBg="rgba(220,38,38,0.95)" title="Close">
            ✕
          </WinBtn>
        </div>
      </div>

      {/* ── Main content: ring left, buttons right ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 16px 8px",
          overflow: "hidden",
        }}
      >
        {/* ── Ring dial ── */}
        <div style={{ flexShrink: 0, width: 86, height: 86 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            style={{
              filter: running ? `drop-shadow(0 0 8px ${color}55)` : "none",
              transition: "filter 0.6s ease",
              overflow: "visible",
            }}
          >
            <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.032)" stroke="rgba(255,255,255,0.055)" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4.5"/>
            <circle
              cx="50" cy="50" r={RADIUS}
              fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              style={{
                transform: "rotate(-90deg)",
                transformBox: "fill-box",
                transformOrigin: "center",
                transition: "stroke-dashoffset 0.85s ease, stroke 0.4s ease",
              }}
            />
            <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.93)" fontSize="19" fontWeight="700"
              fontFamily="ui-monospace,'SF Mono',Consolas,monospace" letterSpacing="-0.5">
              {mins}:{secs}
            </text>
            <text x="50" y="63" textAnchor="middle"
              fill={color} fontSize="5.5" fontWeight="600" letterSpacing="1.4" fontFamily="system-ui,sans-serif" opacity="0.9">
              {label}
            </text>
          </svg>
        </div>

        {/* ── Action buttons — two circles side by side ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Play / Pause */}
          <button
            onClick={toggle}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: running ? "rgba(99,102,241,0.22)" : color,
              border: `1.5px solid ${running ? "rgba(99,102,241,0.4)" : "transparent"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: running ? "none" : `0 2px 14px ${color}55`,
              transition: "all 0.18s ease",
              padding: 0, flexShrink: 0,
            }}
          >
            {running ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
                <polygon points="6,3 20,12 6,21"/>
              </svg>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={reset}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.18s ease",
              padding: 0, flexShrink: 0,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.10)";
              el.style.borderColor = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.05)";
              el.style.borderColor = "rgba(255,255,255,0.10)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
