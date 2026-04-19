"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import LoadingButton from "./LoadingButton";
import { useToast } from "./ToastProvider";
import { useAppContext } from "./AppContext";
import { usePomodoroStore, type PomodoroSettings } from "./usePomodoroStore";
import {
  getSharedTasks,
  getPinnedTaskId,
  setPinnedTaskId,
  SHARED_TASKS_CHANGED,
  type SharedTask,
} from "./useSharedTasks";
import { hapticLight, hapticMedium } from "../lib/haptics";

const MODE_META = {
  focus: { label: "Focus",       color: "#6366f1", bg: "var(--accent-dim)",  border: "var(--accent-border)"  },
  short: { label: "Short Break", color: "#10b981", bg: "var(--green-dim)",   border: "var(--green-border)"   },
  long:  { label: "Long Break",  color: "#06b6d4", bg: "var(--cyan-dim)",    border: "var(--cyan-border)"    },
} as const;

export type Mode = keyof typeof MODE_META;

const RADIUS       = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// PiP ring uses a 0-100 viewBox
const PIP_R = 42;
const PIP_CIRCUM = 2 * Math.PI * PIP_R;
const TIMER_NOTIFICATION_ID = 51001;
const TIMER_CHANNEL_ID = "fomodoro-timer-live-v2";
const TIMER_ACTION_TYPE = "fomodoro-timer-actions";
const COMPLETE_ACTION_TYPE = "fomodoro-complete-actions";

function pad(n: number) { return n.toString().padStart(2, "0"); }
function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${pad(safe % 60)}`;
}

/* ─────────────────────────────────────────────────────────────
   PipTimerContent — rendered inside the Document PiP window.
   Icon-only buttons, fully responsive via vmin/vh/vw units.
───────────────────────────────────────────────────────────── */
/* Shared mac dot + pip body used by both Document PiP and the /timer fallback page */
function MacDots({ onClose, onMin, onMax }: { onClose: () => void; onMin: () => void; onMax: () => void }) {
  const [hov, setHov] = useState<number>(-1);
  const dots = [
    { bg: "#ff5f57", hov: "#ff3b30", sym: "×", fn: onClose },
    { bg: "#ffbd2e", hov: "#ff9500", sym: "−", fn: onMin  },
    { bg: "#28c840", hov: "#34c759", sym: "↗", fn: onMax  },
  ];
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {dots.map((d, i) => (
        <button
          key={i}
          onClick={d.fn}
          onMouseEnter={() => setHov(i)}
          onMouseLeave={() => setHov(-1)}
          style={{
            width: 11, height: 11, borderRadius: "50%",
            border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
            background: hov === i ? d.hov : d.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 7, fontWeight: 900, lineHeight: 1,
            color: "rgba(0,0,0,0.55)",
            transition: "background 0.1s ease",
            boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.18)",
          }}
        >
          {hov === i ? d.sym : null}
        </button>
      ))}
    </div>
  );
}

export function PipBody({
  timeLeft, running, mode, duration, toggle, reset,
  onClose, onMin, onMax,
}: {
  timeLeft: number; running: boolean; mode: Mode; duration: number;
  toggle: () => void; reset: () => void;
  onClose: () => void; onMin: () => void; onMax: () => void;
}) {
  const dashOffset = PIP_CIRCUM * (1 - (duration > 0 ? 1 - timeLeft / duration : 0));
  const mins = pad(Math.floor(timeLeft / 60));
  const secs = pad(timeLeft % 60);
  const { color } = MODE_META[mode];
  const modeShort = MODE_META[mode].label.toUpperCase();

  return (
    <div
      style={{
        width: "100vw", height: "100vh",
        display: "flex", alignItems: "center",
        gap: 8, padding: "0 6px 0 8px",
        background:
          "radial-gradient(ellipse 160% 120% at 5% 50%, rgba(99,102,241,0.15), transparent 50%)," +
          "#06080f",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      } as React.CSSProperties}
    >
      {/* ── Ring ── fills height */}
      <div style={{ flexShrink: 0, width: "min(100vh, 96px)", height: "min(100vh, 96px)" }}>
        <svg
          width="100%" height="100%"
          viewBox="0 0 100 100"
          style={{
            overflow: "visible",
            filter: running ? `drop-shadow(0 0 9px ${color}66)` : "none",
            transition: "filter 0.5s ease",
          }}
        >
          <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
          <circle cx="50" cy="50" r={PIP_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5.5"/>
          <circle
            cx="50" cy="50" r={PIP_R}
            fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round"
            strokeDasharray={PIP_CIRCUM} strokeDashoffset={dashOffset}
            style={{
              transform: "rotate(-90deg)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: "stroke-dashoffset 0.85s ease, stroke 0.4s ease",
            }}
          />
          <text x="50" y="45" textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.94)" fontSize="20" fontWeight="700"
            fontFamily="ui-monospace,'SF Mono',Consolas,monospace" letterSpacing="-0.5">
            {mins}:{secs}
          </text>
          <text x="50" y="63" textAnchor="middle"
            fill={color} fontSize="6" fontWeight="600" letterSpacing="1.4" opacity="0.85">
            {modeShort}
          </text>
        </svg>
      </div>

      {/* ── Right column: mac dots → play/pause → reset, all on the same center axis ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center",      // horizontally centers every child on the same axis
        justifyContent: "center",  // vertically centers the group in the window
        flex: 1, minWidth: 0, height: "100%",
        gap: 7,
        paddingRight: 4,
      }}>
        {/* Mac dots — centered with siblings, not pinned to a corner */}
        <MacDots onClose={onClose} onMin={onMin} onMax={onMax} />

        {/* Play / Pause */}
        <button
          onClick={toggle}
          style={{
            width: 42, height: 42, borderRadius: "50%", padding: 0,
            background: running ? "rgba(99,102,241,0.20)" : color,
            border: `1.5px solid ${running ? "rgba(99,102,241,0.38)" : "transparent"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
            boxShadow: running ? "none" : `0 2px 14px ${color}55`,
            transition: "all 0.18s ease",
          }}
        >
          {running ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)">
              <polygon points="6,3 20,12 6,21"/>
            </svg>
          )}
        </button>

        {/* Reset */}
        <button
          onClick={reset}
          style={{
            width: 32, height: 32, borderRadius: "50%", padding: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid rgba(255,255,255,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
            transition: "all 0.18s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.20)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function PipTimerContent() {
  const { state, toggle, reset } = usePomodoroStore();
  const { mode, timeLeft, running, settings } = state;
  const duration = useMemo(() => {
    if (mode === "short") return settings.shortBreakMinutes * 60;
    if (mode === "long")  return settings.longBreakMinutes  * 60;
    return settings.focusMinutes * 60;
  }, [mode, settings]);

  return (
    <PipBody
      timeLeft={timeLeft} running={running} mode={mode} duration={duration}
      toggle={toggle} reset={reset}
      onClose={() => window.close()}
      onMin={() => { try { window.blur(); } catch {} }}
      onMax={() => { try { (window.opener as Window | null)?.focus(); } catch {} window.close(); }}
    />
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
  const { push } = useToast();
  const { todayFocusMinutes } = useAppContext();
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  // ── Pinned task state ──
  const [pinnedTask, setPinnedTask]     = useState<SharedTask | null>(null);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<SharedTask[]>([]);

  const refreshPinnedTask = useCallback(() => {
    const id    = getPinnedTaskId();
    const tasks = getSharedTasks().filter((t) => !t.done);
    setAvailableTasks(tasks);
    setPinnedTask(id ? (tasks.find((t) => t.id === id) ?? null) : null);
  }, []);

  useEffect(() => {
    refreshPinnedTask();
    const handler = () => refreshPinnedTask();
    window.addEventListener(SHARED_TASKS_CHANGED, handler);
    return () => window.removeEventListener(SHARED_TASKS_CHANGED, handler);
  }, [refreshPinnedTask]);

  // ── 5-minute mid-session notification ──
  const fiveMinFiredRef = useRef(false);
  useEffect(() => {
    if (mode !== "focus") { fiveMinFiredRef.current = false; return; }
    if (!running) return;
    if (timeLeft <= 5 * 60 && timeLeft > 5 * 60 - 2 && !fiveMinFiredRef.current) {
      fiveMinFiredRef.current = true;
      if (isAndroidNative && nativeNotificationReadyRef.current) {
        void LocalNotifications.schedule({
          notifications: [{
            id: TIMER_NOTIFICATION_ID + 1,
            title: "FomoDoro",
            body: "5 minutes left — keep going!",
            channelId: TIMER_CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
            iconColor: "#6366f1",
          }],
        }).catch(() => {});
      } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("FomoDoro", { body: "5 minutes left — keep going!" });
      }
      push({ type: "info", title: "5 minutes left", message: "Stay focused — almost there!", durationMs: 4000 });
    }
    if (timeLeft > 5 * 60) fiveMinFiredRef.current = false;
  }, [timeLeft, running, mode, isAndroidNative, push]);

  // Reset 5-min flag when mode changes
  useEffect(() => { fiveMinFiredRef.current = false; }, [mode]);

  // ── Break-end nudge ──
  const breakEndFiredRef = useRef(false);
  useEffect(() => {
    if (mode === "focus") { breakEndFiredRef.current = false; return; }
    if (!running) return;
    if (timeLeft <= 10 && timeLeft > 8 && !breakEndFiredRef.current) {
      breakEndFiredRef.current = true;
      push({ type: "info", title: "Break ending soon", message: "Get ready to focus again!", durationMs: 4000 });
    }
    if (timeLeft > 10) breakEndFiredRef.current = false;
  }, [timeLeft, running, mode, push]);

  // ── Popup ref (window.open fallback) ──
  const popupRef = useRef<Window | null>(null);
  // Tracks the latest running state without needing to re-register event listeners.
  const runningRef = useRef<boolean>(state.running);
  useEffect(() => { runningRef.current = state.running; }, [state.running]);

  // ── Per-minute DB sync refs ──
  const pendingSecondsRef  = useRef(0);
  const syncedMinutesRef   = useRef(0);
  const prevTimeLeftRef    = useRef<number | null>(null);
  const prevRunningRef     = useRef(false);
  const prevModeRef        = useRef<Mode>(mode);
  const nativeNotificationReadyRef = useRef(false);
  const nativeTimerStateRef = useRef({ timeLeft: state.timeLeft, mode: state.mode, running: state.running });

  const flushMinutes = useCallback((minutes: number) => {
    if (minutes > 0) onSyncMinutes?.(minutes);
  }, [onSyncMinutes]);

  useEffect(() => {
    nativeTimerStateRef.current = {
      timeLeft: state.timeLeft,
      mode: state.mode,
      running: state.running,
    };
  }, [state.mode, state.running, state.timeLeft]);

  const scheduleNativeTimerNotification = useCallback(async (nextSeconds: number, nextMode: Mode, runningNow: boolean) => {
    if (!isAndroidNative || !nativeNotificationReadyRef.current) return;
    if (nextSeconds <= 0) return;
    try {
      const modeLabel = nextMode === "focus" ? "Focus" : nextMode === "short" ? "Break" : "Break";
      const stateLabel = runningNow ? "Running" : "Paused";
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TIMER_NOTIFICATION_ID,
            title: `FomoDoro`,
            body: `${modeLabel} · ${formatCountdown(nextSeconds)}`,
            largeBody: `${modeLabel}\n${formatCountdown(nextSeconds)}\n${stateLabel}`,
            summaryText: `${modeLabel} • ${stateLabel}`,
            channelId: TIMER_CHANNEL_ID,
            ongoing: true,
            autoCancel: false,
            actionTypeId: TIMER_ACTION_TYPE,
            iconColor: "#6366f1",
            schedule: {
              at: new Date(Date.now() + 100),
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch {
      // ignore native notification failures
    }
  }, [isAndroidNative]);

  const scheduleNativeCompleteNotification = useCallback(async (completedMinutes: number) => {
    if (!isAndroidNative || !nativeNotificationReadyRef.current) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] });
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TIMER_NOTIFICATION_ID,
            title: "FomoDoro",
            body: `Done · ${completedMinutes}m`,
            largeBody: `Done · ${completedMinutes}m\nAgain, break, or close.`,
            summaryText: "Done",
            channelId: TIMER_CHANNEL_ID,
            ongoing: false,
            autoCancel: false,
            actionTypeId: COMPLETE_ACTION_TYPE,
            iconColor: "#10b981",
            schedule: {
              at: new Date(Date.now() + 100),
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch {
      // ignore native notification failures
    }
  }, [isAndroidNative]);

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

  useEffect(() => {
    if (!isAndroidNative) return;
    let cancelled = false;

    void (async () => {
      try {
        await LocalNotifications.createChannel({
          id: TIMER_CHANNEL_ID,
          name: "FomoDoro timer",
          description: "Live FomoDoro countdown updates",
          importance: 2,
          visibility: 1,
          vibration: false,
          lights: false,
        });
        const permissions = await LocalNotifications.checkPermissions();
        if (permissions.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: TIMER_ACTION_TYPE,
              actions: [
                { id: "toggle", title: "Play / Pause", foreground: true },
                { id: "reset", title: "Reset", foreground: true },
              ],
            },
            {
              id: COMPLETE_ACTION_TYPE,
              actions: [
                { id: "restart", title: "Again", foreground: true },
                { id: "break", title: "Break", foreground: true },
                { id: "dismiss", title: "Close" },
              ],
            },
          ],
        });
        if (!cancelled) {
          nativeNotificationReadyRef.current = true;
          const current = nativeTimerStateRef.current;
          void scheduleNativeTimerNotification(current.timeLeft, current.mode, current.running);
        }
      } catch {
        nativeNotificationReadyRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAndroidNative, scheduleNativeTimerNotification]);

  useEffect(() => {
    if (!isAndroidNative) return;
    let listener: { remove: () => Promise<void> } | null = null;

    void LocalNotifications.addListener("localNotificationActionPerformed", async ({ actionId, notification }) => {
      if (notification.id !== TIMER_NOTIFICATION_ID) return;

      if (notification.actionTypeId === TIMER_ACTION_TYPE) {
        if (actionId === "toggle") {
          toggle();
        } else if (actionId === "reset") {
          reset();
        }
        return;
      }

      try {
        await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIFICATION_ID }] });
      } catch {
        // ignore
      }

      if (actionId === "restart") {
        setMode("focus");
        start();
      } else if (actionId === "break") {
        setMode("short");
        start();
      }
      clearLastComplete();
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      void listener?.remove();
    };
  }, [clearLastComplete, isAndroidNative, reset, setMode, start, toggle]);

  useEffect(() => {
    if (!isAndroidNative) return;
    if (state.timeLeft > 0) {
      void scheduleNativeTimerNotification(state.timeLeft, state.mode, state.running);
    }
  }, [isAndroidNative, scheduleNativeTimerNotification, state.mode, state.running, state.timeLeft]);

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
      if (!isAndroidNative) {
        push({
          type: "info",
          title: "Focus session completed",
          message: `Focus session of ${lastComplete.minutes} min completed.`,
          durationMs: 7000,
          actions: [
            {
              label: "Dismiss",
              variant: "ghost",
              onClick: () => clearLastComplete(),
            },
            {
              label: "Start Again",
              variant: "primary",
              onClick: () => { setMode("focus"); start(); clearLastComplete(); },
            },
            {
              label: "Start Break",
              variant: "glass",
              onClick: () => { setMode("short"); start(); clearLastComplete(); },
            },
          ],
        });
      }
      if (isAndroidNative && nativeNotificationReadyRef.current) {
        void scheduleNativeCompleteNotification(lastComplete.minutes);
      } else if (typeof window !== "undefined" && "Notification" in window) {
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
  }, [isAndroidNative, lastComplete, scheduleNativeCompleteNotification, push, clearLastComplete, setMode, start]);

  // ── Document PiP / popup ─────────────────────────────────────────────────────
  //
  // DESIGN:
  //  • openPip()       — explicit "pop out" button. Opens Document PiP (Chrome 116+)
  //                      or a visible window.open popup. Requires a real user click.
  //  • preOpenPopup()  — called on Play button click (user gesture available).
  //                      Silently opens a window.open popup IN THE BACKGROUND.
  //                      Chrome opens popup windows behind the active window by default,
  //                      so the user does not see it. On tab-switch, focus() brings it
  //                      forward. Does nothing if Document PiP is available (those can
  //                      only be opened visibly — no point pre-opening them silently).
  //  • visibilitychange — when the tab is hidden: focus the pre-opened popup.
  //                       when the tab is visible again: send popup back to background.
  //
  // WHY NOT auto-open Document PiP on tab switch:
  //  documentPictureInPicture.requestWindow() requires a transient user activation.
  //  visibilitychange fires after the gesture has expired — calling it there throws.
  //  The pop-out button is the correct trigger for Document PiP.
  //
  const pipRootRef = useRef<{ unmount: () => void } | null>(null);

  /** Explicit pop-out: opens Document PiP (or visible popup). Must be a real click. */
  const openPip = useCallback(async () => {
    if (disablePopup || window.innerWidth <= 900) return;

    if ("documentPictureInPicture" in window) {
      const dpip = window as unknown as { documentPictureInPicture: { window: Window | null; requestWindow: (o: object) => Promise<Window> } };
      // Guard: don't create a second React root if already open.
      if (dpip.documentPictureInPicture.window) return;
      try {
        const pipWin = await dpip.documentPictureInPicture.requestWindow({ width: 220, height: 112 });

        const style = pipWin.document.createElement("style");
        style.textContent =
          "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }" +
          "html, body { width: 100%; height: 100%; overflow: hidden; background: #06080f; scrollbar-width: none; -ms-overflow-style: none; }" +
          "html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }";
        pipWin.document.head.appendChild(style);

        const { createRoot } = await import("react-dom/client");
        const root = createRoot(pipWin.document.body);
        pipRootRef.current = root;
        root.render(<PipTimerContent />);

        pipWin.addEventListener("pagehide", () => {
          root.unmount();
          pipRootRef.current = null;
        });
        return;
      } catch {
        // fall through to window.open
      }
    }

    // window.open fallback — if already pre-opened off-screen, just focus + reposition.
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.focus(); } catch { /* ignore */ }
    } else {
      popupRef.current = window.open(
        "/timer",
        "fomodoro-timer",
        "width=230,height=170,resizable=yes,scrollbars=no,location=no,toolbar=no,menubar=no,status=no"
      );
    }
  }, [disablePopup]);

  /**
   * Silent pre-open — uses the Play button's user gesture to open the window.open popup
   * in the BACKGROUND (browsers place popup windows behind the active tab by default).
   * The user does not see it until they switch tabs and visibilitychange calls focus().
   * Only used for the window.open fallback — Document PiP cannot be pre-opened silently.
   */
  const preOpenPopup = useCallback(() => {
    if (disablePopup || window.innerWidth <= 900) return;
    if ("documentPictureInPicture" in window) return; // Document PiP opens only via pop-out button
    if (popupRef.current && !popupRef.current.closed) return; // already open
    popupRef.current = window.open(
      "/timer",
      "fomodoro-timer",
      "width=230,height=170,resizable=yes,scrollbars=no,location=no,toolbar=no,menubar=no,status=no"
    );
  }, [disablePopup]);

  // visibilitychange:
  //  - tab hidden   → focus the pre-opened popup so it appears in front (timer is running)
  //  - tab visible  → bring main window back to front so popup returns to background
  useEffect(() => {
    if (disablePopup) return;
    const handleVisibility = () => {
      if (window.innerWidth <= 900) return; // mobile: notifications handle this

      if (document.hidden) {
        // ── Tab is leaving ──────────────────────────────────────────────────
        if (!runningRef.current) return; // timer paused — nothing to show

        // Document PiP is always-on-top and already visible — nothing needed.
        if ("documentPictureInPicture" in window) {
          const dpip = window as unknown as { documentPictureInPicture: { window: Window | null } };
          if (dpip.documentPictureInPicture.window) return;
        }

        // Bring the pre-opened popup to the front.
        if (popupRef.current && !popupRef.current.closed) {
          try { popupRef.current.focus(); } catch { /* ignore */ }
        }
      } else {
        // ── Tab is returning ────────────────────────────────────────────────
        // Document PiP stays on top (user can close it with the red dot).
        if ("documentPictureInPicture" in window) {
          const dpip = window as unknown as { documentPictureInPicture: { window: Window | null } };
          if (dpip.documentPictureInPicture.window) return;
        }

        // Send the popup back to the background so it doesn't cover the main UI.
        if (popupRef.current && !popupRef.current.closed) {
          try { window.focus(); } catch { /* ignore */ }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [disablePopup]);

  // ── Mobile detection ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Task panel minimize/maximize (starts minimized by default) ──
  const [taskPanelMinimized, setTaskPanelMinimized] = useState(true);

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
  // Completed sessions + elapsed minutes of the current running focus session
  const elapsedThisSession = mode === "focus" ? Math.floor((duration - timeLeft) / 60) : 0;
  const localTotalMinutes = Math.floor(sessions * state.settings.focusMinutes) + elapsedThisSession;
  // Sync with remote — take whichever is higher (remote data from Supabase via AppContext)
  const remoteSessions = state.settings.focusMinutes > 0 ? Math.floor(todayFocusMinutes / state.settings.focusMinutes) : 0;
  const displaySessions = Math.max(sessions, remoteSessions);
  const totalMinutes = Math.max(localTotalMinutes, todayFocusMinutes + elapsedThisSession);

  // ── Shared task widget pieces ──
  const PinIcon = ({ filled }: { filled: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );

  const priorityDot = (p: string) => (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
      background: p === "high" ? "var(--red)" : p === "medium" ? "var(--amber)" : "var(--glass-border-hover)",
    }} />
  );

  // ── Desktop right-panel task widget ──
  const DesktopTaskPanel = variant === "default" && !isMobile ? (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: taskPanelMinimized ? 38 : 320,
        transition: "width 0.42s cubic-bezier(0.4,0,0.2,1)",
        alignSelf: "flex-start",
        overflow: "hidden",
      }}
    >
      {/* ── Collapsed tab (visible when minimized, click to restore) ── */}
      <button
        onClick={() => setTaskPanelMinimized(false)}
        title="Expand task panel"
        style={{
          position: "absolute",
          top: 0, right: 0,
          width: 38,
          height: "100%",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 14,
          cursor: "pointer",
          opacity: taskPanelMinimized ? 1 : 0,
          pointerEvents: taskPanelMinimized ? "auto" : "none",
          transition: "opacity 0.25s ease",
          color: pinnedTask ? "var(--amber)" : "var(--text-3)",
          zIndex: 2,
        }}
      >
        <PinIcon filled={!!pinnedTask} />
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transform: "rotate(180deg)",
        }}>
          Focus
        </span>
      </button>

      {/* ── Full panel card (visible when maximized) ── */}
      <div
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 18,
          overflow: "hidden",
          transform: taskPanelMinimized
            ? "translateX(60px) translateY(-50px) scale(0.84)"
            : "translateX(0) translateY(0) scale(1)",
          opacity: taskPanelMinimized ? 0 : 1,
          transition: "transform 0.42s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
          pointerEvents: taskPanelMinimized ? "none" : "auto",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ color: pinnedTask ? "var(--amber)" : "var(--text-3)", display: "flex" }}>
              <PinIcon filled={!!pinnedTask} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", flex: 1 }}>
              Focusing on
            </span>
            {/* Minimize button */}
            <button
              onClick={() => setTaskPanelMinimized(true)}
              title="Minimize panel"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-3)", padding: "3px 5px", display: "flex",
                alignItems: "center", borderRadius: 5,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {/* Pinned task display */}
          {pinnedTask ? (
            <div style={{
              background: "rgba(245,158,11,0.09)",
              border: "1px solid rgba(245,158,11,0.28)",
              borderRadius: 10,
              padding: "9px 12px",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-1)", lineHeight: 1.4 }}>
                {pinnedTask.text}
              </span>
              <button
                onClick={() => { hapticLight(); setPinnedTaskId(null); refreshPinnedTask(); }}
                title="Unpin"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, display: "flex", borderRadius: 4, flexShrink: 0 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
              Pick a task below to pin it to this session.
            </div>
          )}
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: "auto", maxHeight: 420 }}>
          {availableTasks.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
              No active tasks.<br />Add some in Tasks.
            </div>
          ) : (
            availableTasks.map((t) => {
              const active = pinnedTask?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { hapticLight(); setPinnedTaskId(active ? null : t.id); refreshPinnedTask(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    width: "100%", padding: "10px 16px",
                    background: active ? "var(--accent-dim)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--glass-border)",
                    color: "var(--text-1)", fontSize: 12, textAlign: "left", cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--glass-2)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {priorityDot(t.priority)}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.text}
                  </span>
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  // ── Mobile task bar — shown at the BOTTOM of the timer column ──
  // Uses marginTop:auto to float into the empty space below stats.
  // Minimized pill stays relative (no fixed position) anchored bottom-right of the spacer.
  const MobileTaskBar = variant === "default" && isMobile ? (
    <div style={{
      width: "100%",
      marginTop: "auto",
      position: "relative",
      // Spacer so the pill has room even when the full bar is hidden
      minHeight: taskPanelMinimized ? 48 : undefined,
    }}>
      {/* ── Minimized pill — anchored bottom-right of this spacer ── */}
      <button
        onClick={() => setTaskPanelMinimized(false)}
        title="Expand task panel"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 14px",
          background: "var(--glass-1)",
          border: `1px solid ${pinnedTask ? "rgba(245,158,11,0.4)" : "var(--glass-border)"}`,
          borderRadius: 999,
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          cursor: "pointer",
          color: pinnedTask ? "var(--amber)" : "var(--text-3)",
          opacity: taskPanelMinimized ? 1 : 0,
          pointerEvents: taskPanelMinimized ? "auto" : "none",
          transform: taskPanelMinimized ? "scale(1)" : "scale(0.85)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        <PinIcon filled={!!pinnedTask} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
          {pinnedTask ? pinnedTask.text.slice(0, 18) + (pinnedTask.text.length > 18 ? "…" : "") : "Tasks"}
        </span>
      </button>

      {/* ── Full bar (visible when not minimized) ── */}
      <div style={{
        width: "100%",
        background: pinnedTask ? "rgba(245,158,11,0.07)" : "var(--glass-1)",
        border: `1px solid ${pinnedTask ? "rgba(245,158,11,0.28)" : "var(--glass-border)"}`,
        borderRadius: 14,
        padding: "9px 12px",
        display: "flex",
        alignItems: "center",
        gap: 9,
        position: "relative",
        opacity: taskPanelMinimized ? 0 : 1,
        transform: taskPanelMinimized ? "translateY(6px)" : "translateY(0)",
        pointerEvents: taskPanelMinimized ? "none" : "auto",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}>
        <span style={{ color: pinnedTask ? "var(--amber)" : "var(--text-3)", display: "flex", flexShrink: 0 }}>
          <PinIcon filled={!!pinnedTask} />
        </span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: pinnedTask ? 500 : 400, color: pinnedTask ? "var(--text-1)" : "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pinnedTask ? pinnedTask.text : "No task pinned"}
        </span>
        {pinnedTask && (
          <button onClick={() => { hapticLight(); setPinnedTaskId(null); refreshPinnedTask(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 3, display: "flex", borderRadius: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        <LoadingButton
          onClick={() => { hapticLight(); setTaskPickerOpen((o) => !o); }}
          style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-2)", cursor: "pointer", flexShrink: 0 }}
        >
          {taskPickerOpen ? "Close" : "Pick"}
        </LoadingButton>
        {/* Minimize button */}
        <button
          onClick={() => { setTaskPanelMinimized(true); setTaskPickerOpen(false); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 3, display: "flex", borderRadius: 5, flexShrink: 0 }}
          title="Minimize"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {/* Dropdown */}
        {taskPickerOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--glass-1)", border: "1px solid var(--glass-border)",
            borderRadius: 12, overflow: "hidden", zIndex: 50,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)", backdropFilter: "blur(20px)",
            maxHeight: 220, overflowY: "auto",
          }}>
            {availableTasks.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
                No active tasks — add some in Tasks
              </div>
            ) : availableTasks.map((t) => (
              <button key={t.id}
                onClick={() => { hapticLight(); setPinnedTaskId(t.id); refreshPinnedTask(); setTaskPickerOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "10px 14px", background: pinnedTask?.id === t.id ? "var(--accent-dim)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--glass-border)",
                  color: "var(--text-1)", fontSize: 12, textAlign: "left", cursor: "pointer",
                }}>
                {priorityDot(t.priority)}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                {pinnedTask?.id === t.id && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      className="pomodoro-wrap fade-in"
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "flex-start",
        justifyContent: "center",
        gap: isMobile ? 20 : 28,
        width: "100%",
        maxWidth: isMobile ? 480 : 1200,
        margin: "0 auto",
        paddingTop: isMobile ? 16 : 24,
        paddingBottom: isMobile ? 16 : 24,
        // On mobile: fill the full card height so there's usable space below the timer
        minHeight: isMobile ? "100%" : undefined,
      }}
    >
      {/* ── Left / main: mode tabs + ring + controls + stats ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 16 : 24, minWidth: 0, height: isMobile ? "100%" : undefined }}>

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
            width="100%" height="100%"
            viewBox="0 0 280 280"
            className="absolute"
            style={{
              overflow: "visible",
              filter: running ? `drop-shadow(0 0 18px ${current.color}55)` : "none",
              transition: "filter 0.5s ease",
            }}
          >
            <circle cx="140" cy="140" r={RADIUS} fill="none" stroke="var(--glass-border)" strokeWidth="6"/>
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              stroke={current.color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
              className="ring-progress"
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
            />
          </svg>

          <div
            className="pomodoro-disc relative z-10 flex flex-col items-center justify-center rounded-full"
            style={{
              width: "78.6%", height: "78.6%",
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
        <div className="pomodoro-controls flex items-center gap-4 justify-center w-full">
          <LoadingButton
            onClick={reset}
            className="pomodoro-control-btn pomodoro-control-btn-secondary flex items-center justify-center rounded-full transition-all duration-200"
            style={{ width: 44, height: 44, background: "var(--glass-2)", border: "1px solid var(--glass-border)", color: "var(--text-2)" }}
            title="Reset"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </LoadingButton>

          <LoadingButton
            onClick={() => {
              hapticMedium();
              if (!running) preOpenPopup();
              toggle();
            }}
            className="pomodoro-control-btn pomodoro-control-btn-primary flex items-center justify-center rounded-full font-semibold transition-all duration-200"
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

          {!disablePopup && (
            <LoadingButton
              onClick={openPip}
              className="pomodoro-control-btn pomodoro-control-btn-secondary flex items-center justify-center rounded-full transition-all duration-200"
              style={{ width: 44, height: 44, background: "var(--glass-2)", border: "1px solid var(--glass-border)", color: "var(--text-2)" }}
              title="Pop out timer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            </LoadingButton>
          )}
          {disablePopup && <div className="pomodoro-control-placeholder" style={{ width: 44, height: 44, flexShrink: 0 }} />}
        </div>

        {/* Stats row */}
        {variant === "default" && (
          <div
            className="pomodoro-stats w-full"
            style={{
              display: "flex",
              alignItems: "stretch",
              background: "var(--glass-1)",
              border: "1px solid var(--glass-border)",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <Stat label="Sessions" value={displaySessions.toString()} color="var(--accent)" compact={isMobile} />
            <div className="pomodoro-stat-sep" style={{ width: 1, background: "var(--glass-border)", flexShrink: 0 }} />
            <Stat
              label="Focus time"
              value={
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
                  <span>{totalMinutes}</span>
                  <span style={{ fontSize: "0.6em", fontWeight: 500, opacity: 0.7 }}>m</span>
                </span>
              }
              color="#10b981"
              compact={isMobile}
            />
            <div className="pomodoro-stat-sep" style={{ width: 1, background: "var(--glass-border)", flexShrink: 0 }} />
            <Stat label="Daily goal" value={`${Math.min(displaySessions, state.settings.dailyGoal)}/${state.settings.dailyGoal}`} color="#06b6d4" compact={isMobile} />
          </div>
        )}

        {/* Session dots */}
        {variant === "default" && sessions > 0 && (
          <div className="flex flex-wrap gap-2 justify-center" title={`${sessions} session${sessions === 1 ? "" : "s"} completed`}>
            {Array.from({ length: Math.min(sessions, 16) }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{ width: 8, height: 8, background: i < 8 ? "#6366f1" : "#10b981", opacity: 0.8 }}
              />
            ))}
            {sessions > 16 && (
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>+{sessions - 16} more</span>
            )}
          </div>
        )}

        {/* Mobile task bar — bottom of timer column */}
        {MobileTaskBar}
      </div>

      {/* ── Right: desktop task panel ── */}
      {DesktopTaskPanel}
    </div>
  );
}

function Stat({ label, value, color, compact = false }: { label: string; value: React.ReactNode; color: string; compact?: boolean }) {
  return (
    <div
      className="pomodoro-stat flex-1 min-w-0"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 3 : 5,
        padding: compact ? "14px 6px" : "18px 8px",
      }}
    >
      <span style={{ fontSize: compact ? 18 : 22, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontSize: compact ? 10 : 11, fontWeight: 500, color: "var(--text-3)", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{label}</span>
    </div>
  );
}
