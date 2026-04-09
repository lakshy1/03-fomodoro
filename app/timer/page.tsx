"use client";

import { useMemo } from "react";
import { usePomodoroStore } from "../components/usePomodoroStore";
import { PipBody } from "../components/PomodoroTimer";

export default function TimerPopupPage() {
  const { state, toggle, reset } = usePomodoroStore();
  const { mode, timeLeft, running, settings } = state;

  const duration = useMemo(() => {
    if (mode === "short") return settings.shortBreakMinutes * 60;
    if (mode === "long")  return settings.longBreakMinutes * 60;
    return settings.focusMinutes * 60;
  }, [mode, settings]);

  return (
    <PipBody
      timeLeft={timeLeft}
      running={running}
      mode={mode}
      duration={duration}
      toggle={toggle}
      reset={reset}
      onClose={() => window.close()}
      onMin={() => { try { window.resizeTo(window.outerWidth, 30); } catch {} }}
      onMax={() => {
        try { (window.opener as Window | null)?.focus(); } catch {}
        window.close();
      }}
    />
  );
}
