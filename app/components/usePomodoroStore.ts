"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "focus" | "short" | "long";

// IST date helpers — uses Intl.DateTimeFormat (not a fixed offset) so DST-adjacent
// edge cases are handled correctly regardless of system locale or timezone.
const IST_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
const toISTDate = (utcMs: number): string => IST_FMT.format(utcMs);
const todayIST = () => toISTDate(Date.now());

export type PomodoroSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailyGoal: number;
};

type PomodoroState = {
  mode: Mode;
  timeLeft: number;
  running: boolean;
  sessions: number;
  updatedAt: number;
  settings: PomodoroSettings;
  sessionDate: string; // IST "YYYY-MM-DD" — resets sessions at 12 AM IST
};

const STATE_KEY = "pomodoro_state_v1";
const OWNER_KEY = "pomodoro_owner_v1";
const CHANNEL = "pomodoro_channel_v1";
const OWNER_TTL = 4000;

const defaultSettings: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  dailyGoal: 8,
};

const durationFor = (mode: Mode, settings: PomodoroSettings) => {
  if (mode === "short") return settings.shortBreakMinutes * 60;
  if (mode === "long") return settings.longBreakMinutes * 60;
  return settings.focusMinutes * 60;
};

const readState = (): PomodoroState => {
  const today = todayIST();
  if (typeof window === "undefined") {
    return {
      mode: "focus",
      timeLeft: defaultSettings.focusMinutes * 60,
      running: false,
      sessions: 0,
      updatedAt: Date.now(),
      settings: defaultSettings,
      sessionDate: today,
    };
  }
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) throw new Error("no state");
    const parsed = JSON.parse(raw) as PomodoroState;
    const storedDate = parsed.sessionDate || "";
    // Reset sessions/running at midnight IST
    const newDay = storedDate !== today;
    return {
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      sessionDate: today,
      sessions: newDay ? 0 : parsed.sessions,
      running: newDay ? false : parsed.running,
    };
  } catch {
    return {
      mode: "focus",
      timeLeft: defaultSettings.focusMinutes * 60,
      running: false,
      sessions: 0,
      updatedAt: Date.now(),
      settings: defaultSettings,
      sessionDate: today,
    };
  }
};

const writeState = (state: PomodoroState) => {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const readOwner = () => {
  try {
    const raw = localStorage.getItem(OWNER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { id: string; ts: number };
  } catch {
    return null;
  }
};

const writeOwner = (id: string) => {
  try {
    localStorage.setItem(OWNER_KEY, JSON.stringify({ id, ts: Date.now() }));
  } catch {
    // ignore
  }
};

export function usePomodoroStore(initialSettings?: Partial<PomodoroSettings>) {
  const [state, setState] = useState<PomodoroState>(() => {
    const base = readState();
    const mergedSettings = { ...base.settings, ...(initialSettings || {}) };
    const timeLeft = Math.min(base.timeLeft, durationFor(base.mode, mergedSettings)) || durationFor(base.mode, mergedSettings);
    return { ...base, settings: mergedSettings, timeLeft };
  });
  const [lastComplete, setLastComplete] = useState<{ mode: Mode; minutes: number } | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const idRef = useRef<string>(Math.random().toString(36).slice(2));
  const ownerRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks real wall-clock time of last tick so throttled background intervals
  // still deduct the correct elapsed seconds (fixes timer drift when tab is hidden).
  const lastTickTimeRef = useRef<number>(Date.now());

  const emitState = useCallback((next: PomodoroState) => {
    writeState(next);
    channelRef.current?.postMessage({ type: "state", payload: next });
  }, []);

  const applyState = useCallback((updater: (prev: PomodoroState) => PomodoroState) => {
    setState((prev) => {
      const next = updater(prev);
      const withTs = { ...next, updatedAt: Date.now() };
      emitState(withTs);
      return withTs;
    });
  }, [emitState]);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL);
    const channel = channelRef.current;
    channel.onmessage = (event) => {
      const msg = event.data as { type: string; payload?: PomodoroState; cmd?: string; value?: unknown };
      if (msg.type === "state" && msg.payload) {
        setState((prev) => (msg.payload!.updatedAt > prev.updatedAt ? msg.payload! : prev));
      }
      if (msg.type === "cmd" && ownerRef.current) {
        handleCommand(msg.cmd, msg.value);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PomodoroState;
          setState((prev) => (parsed.updatedAt > prev.updatedAt ? parsed : prev));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tickOwner = () => {
      const owner = readOwner();
      const now = Date.now();
      if (!owner || now - owner.ts > OWNER_TTL) {
        writeOwner(idRef.current);
        ownerRef.current = true;
        return;
      }
      if (owner.id === idRef.current) {
        writeOwner(idRef.current);
        ownerRef.current = true;
      } else {
        ownerRef.current = false;
      }
    };
    tickOwner();
    const ownerInterval = setInterval(tickOwner, 2000);
    return () => clearInterval(ownerInterval);
  }, []);

  // Midnight IST reset — check every minute and reset sessions if the IST date changed
  useEffect(() => {
    const checkMidnight = () => {
      const today = todayIST();
      setState((prev) => {
        if (prev.sessionDate === today) return prev;
        const next: PomodoroState = {
          ...prev,
          sessions: 0,
          running: false,
          sessionDate: today,
          updatedAt: Date.now(),
        };
        writeState(next);
        channelRef.current?.postMessage({ type: "state", payload: next });
        return next;
      });
    };
    const id = setInterval(checkMidnight, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleCommand = useCallback((cmd?: string, value?: unknown) => {
    if (!cmd) return;
    if (cmd === "setMode" && typeof value === "string") {
      applyState((prev) => {
        const mode = value as Mode;
        const duration = durationFor(mode, prev.settings);
        return { ...prev, mode, timeLeft: duration, running: false };
      });
    }
    if (cmd === "toggle") {
      lastTickTimeRef.current = Date.now();
      applyState((prev) => ({ ...prev, running: !prev.running }));
    }
    if (cmd === "start") {
      lastTickTimeRef.current = Date.now();
      applyState((prev) => {
        const duration = durationFor(prev.mode, prev.settings);
        const timeLeft = prev.timeLeft === 0 ? duration : prev.timeLeft;
        return { ...prev, running: true, timeLeft };
      });
    }
    if (cmd === "pause") {
      applyState((prev) => ({ ...prev, running: false }));
    }
    if (cmd === "reset") {
      applyState((prev) => ({ ...prev, running: false, timeLeft: durationFor(prev.mode, prev.settings) }));
    }
    if (cmd === "skip") {
      applyState((prev) => ({ ...prev, running: false, timeLeft: 0, sessions: prev.mode === "focus" ? prev.sessions + 1 : prev.sessions }));
    }
    if (cmd === "settings" && typeof value === "object" && value) {
      applyState((prev) => {
        const settings = { ...prev.settings, ...(value as Partial<PomodoroSettings>) };
        const duration = durationFor(prev.mode, settings);
        const timeLeft = Math.min(prev.timeLeft, duration) || duration;
        return { ...prev, settings, timeLeft };
      });
    }
  }, [applyState]);

  // Catch up the timer when the tab becomes visible again after being
  // backgrounded (the interval may not have fired while hidden).
  useEffect(() => {
    const catchUp = () => {
      if (document.hidden || !ownerRef.current) return;
      setState((prev) => {
        if (!prev.running) return prev;
        const now = Date.now();
        const elapsed = Math.round((now - lastTickTimeRef.current) / 1000);
        if (elapsed <= 0) return prev;
        lastTickTimeRef.current = now;
        const nextTime = Math.max(0, prev.timeLeft - elapsed);
        const next: PomodoroState = { ...prev, timeLeft: nextTime, updatedAt: Date.now() };
        emitState(next);
        return next;
      });
    };
    document.addEventListener("visibilitychange", catchUp);
    return () => document.removeEventListener("visibilitychange", catchUp);
  }, [emitState]);

  useEffect(() => {
    if (!ownerRef.current) return;
    if (!state.running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Reset the tick reference so the first interval tick measures correctly.
    lastTickTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (!ownerRef.current) return prev;
        const now = Date.now();
        // Use real elapsed ms so throttled background intervals still deduct
        // the correct amount of time instead of always just 1 second.
        const elapsed = Math.max(1, Math.round((now - lastTickTimeRef.current) / 1000));
        lastTickTimeRef.current = now;
        const nextTime = prev.timeLeft - elapsed;
        if (nextTime <= 0) {
          const completedMode = prev.mode;
          const durationMin = Math.round(durationFor(prev.mode, prev.settings) / 60);
          const next: PomodoroState = {
            ...prev,
            timeLeft: 0,
            running: false,
            sessions: completedMode === "focus" ? prev.sessions + 1 : prev.sessions,
            updatedAt: Date.now(),
          };
          emitState(next);
          if (completedMode === "focus") {
            setLastComplete({ mode: completedMode, minutes: durationMin });
          }
          return next;
        }
        const next: PomodoroState = { ...prev, timeLeft: nextTime, updatedAt: Date.now() };
        emitState(next);
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.running, emitState]);

  const setMode = useCallback((mode: Mode) => {
    if (ownerRef.current) {
      handleCommand("setMode", mode);
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "setMode", value: mode });
    }
  }, [handleCommand]);

  const toggle = useCallback(() => {
    if (ownerRef.current) {
      handleCommand("toggle");
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "toggle" });
    }
  }, [handleCommand]);

  const start = useCallback(() => {
    if (ownerRef.current) {
      handleCommand("start");
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "start" });
    }
  }, [handleCommand]);

  const pause = useCallback(() => {
    if (ownerRef.current) {
      handleCommand("pause");
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "pause" });
    }
  }, [handleCommand]);

  const reset = useCallback(() => {
    if (ownerRef.current) {
      handleCommand("reset");
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "reset" });
    }
  }, [handleCommand]);

  const skip = useCallback(() => {
    if (ownerRef.current) {
      handleCommand("skip");
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "skip" });
    }
  }, [handleCommand]);

  const updateSettings = useCallback((settings: Partial<PomodoroSettings>) => {
    if (ownerRef.current) {
      handleCommand("settings", settings);
    } else {
      channelRef.current?.postMessage({ type: "cmd", cmd: "settings", value: settings });
    }
  }, [handleCommand]);

  const clearLastComplete = useCallback(() => setLastComplete(null), []);

  return {
    state,
    setMode,
    toggle,
    start,
    pause,
    reset,
    skip,
    updateSettings,
    lastComplete,
    clearLastComplete,
  };
}
