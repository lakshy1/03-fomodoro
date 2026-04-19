"use client";

import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline]     = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const handleOffline = () => { setOffline(true); setDismissed(false); };
    const handleOnline  = () => { setOffline(false); };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: "rgba(0, 0, 0, 0.55)",
      }}
    >
      <div
        style={{
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: 22,
          padding: "32px 28px 24px",
          maxWidth: 340,
          width: "90%",
          boxShadow: "0 28px 60px rgba(0,0,0,0.45)",
          textAlign: "center",
          animation: "fade-in 0.22s ease",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(245,158,11,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-1)",
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          You&apos;re offline
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-2)",
            lineHeight: 1.55,
            marginBottom: 24,
          }}
        >
          Data sync will not work while offline. Your local changes are saved
          and will sync automatically when you reconnect.
        </p>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "11px 0",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            boxShadow: "0 4px 18px var(--accent-glow)",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          Okay
        </button>
      </div>
    </div>
  );
}
