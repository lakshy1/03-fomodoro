"use client";

import PomodoroTimer from "../components/PomodoroTimer";

export default function TimerPopupPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background:
          "radial-gradient(600px 300px at 20% 0%, rgba(99,102,241,0.2), transparent), radial-gradient(400px 200px at 80% 20%, rgba(6,182,212,0.18), transparent), var(--bg-base)",
      }}
    >
      <PomodoroTimer variant="popup" disablePopup />
    </div>
  );
}
