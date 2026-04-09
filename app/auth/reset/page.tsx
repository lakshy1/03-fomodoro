"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { gsap } from "gsap";
import LoadingButton from "../../components/LoadingButton";
import { useToast } from "../../components/ToastProvider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const [shakeKey, setShakeKey] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function hydrate() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMessage("Please open the reset link from your email.");
        return;
      }
      setReady(true);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 18, opacity: 0, rotateX: 8 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.9, ease: "power3.out" }
      );
    }
    if (orbRef.current) {
      gsap.to(orbRef.current, {
        y: -16,
        duration: 4.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.45,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
    if (floatRef.current) {
      gsap.to(floatRef.current, {
        y: 14,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const wrap = wrapRef.current;
    const grid = gridRef.current;
    const orb = orbRef.current;
    const glow = glowRef.current;
    const floatEl = floatRef.current;
    const move = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (grid) gsap.to(grid, { x: x * 12, y: y * 12, duration: 0.6, ease: "power3.out" });
      if (orb) gsap.to(orb, { x: x * 28, y: y * 28, duration: 0.6, ease: "power3.out" });
      if (glow) gsap.to(glow, { x: x * 18, y: y * 18, duration: 0.6, ease: "power3.out" });
      if (floatEl) gsap.to(floatEl, { x: x * -16, y: y * 8, duration: 0.6, ease: "power3.out" });
    };
    wrap.addEventListener("mousemove", move);
    return () => wrap.removeEventListener("mousemove", move);
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      push({ type: "error", title: "Reset failed", message: updateError.message });
      setShakeKey((k) => k + 1);
    } else {
      setMessage("Password updated. Redirecting…");
      push({ type: "success", title: "Password updated", message: "Redirecting to your dashboard." });
      setTimeout(() => router.push("/"), 900);
    }
    setLoading(false);
  }

  return (
    <div
      ref={wrapRef}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 30% 0%, rgba(99,102,241,0.25), transparent), radial-gradient(800px 400px at 80% 20%, rgba(6,182,212,0.2), transparent), var(--bg)",
        perspective: 1200,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={gridRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.35), transparent 60%)",
          filter: "blur(12px)",
          top: "10%",
          left: "8%",
          opacity: 0.25,
          pointerEvents: "none",
        }}
      />
      <div
        ref={orbRef}
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.25))",
          top: "14%",
          right: "16%",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />
      <div
        ref={floatRef}
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "52% 48% 46% 54%",
          background: "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(59,130,246,0.18))",
          bottom: "12%",
          left: "8%",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: "min(1100px, 100%)",
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) minmax(320px, 420px)",
          gap: 24,
          position: "relative",
          zIndex: 2,
        }}
        className="auth-grid"
      >
        <div
          style={{
            background: "linear-gradient(145deg, rgba(15,19,36,0.9), rgba(6,8,16,0.85))",
            border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 24,
            padding: 32,
            color: "white",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minHeight: 420,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#a5b4fc" }}>
            FomoDoro
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
            Reset and return to deep focus in seconds.
          </div>
          <div style={{ fontSize: 13, color: "#c7d2fe" }}>
            Your streaks, friends, and progress are safe. Update your password and pick up where you left off.
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {[
              { title: "Secure reset", body: "We use time‑bound reset links to keep your account protected." },
              { title: "Instant return", body: "Jump back into your active focus session in one click." },
              { title: "Team insights", body: "Your leaderboard and study circles stay intact." },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#c7d2fe", marginTop: 4 }}>{item.body}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.45), transparent 60%)",
              filter: "blur(2px)",
            }}
          />
        </div>
        <div
          key={shakeKey}
          ref={cardRef}
          style={{
            background: "var(--glass-1)",
            border: "1px solid var(--glass-border)",
            borderRadius: 22,
            padding: 24,
            boxShadow: "var(--glass-shadow)",
            transformStyle: "preserve-3d",
            backdropFilter: "blur(20px)",
          }}
          className={error ? "shake" : undefined}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>Set a new password</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
            Choose a strong password to secure your account.
          </p>

          {!ready && message && (
            <div
              style={{
                marginTop: 16,
                background: "rgba(99,102,241,0.12)",
                color: "var(--accent-text)",
                border: "1px solid var(--accent-border)",
                padding: "8px 10px",
                borderRadius: 10,
                fontSize: 12,
              }}
            >
              {message}
            </div>
          )}

          {ready && (
            <form onSubmit={handleUpdate} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  background: "var(--glass-2)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "var(--text-1)",
                  outline: "none",
                  boxShadow: "0 0 0 0 rgba(99,102,241,0.0)",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.7)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(99,102,241,0.2)";
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 rgba(99,102,241,0.0)";
                }}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                style={{
                  background: "var(--glass-2)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "var(--text-1)",
                  outline: "none",
                  boxShadow: "0 0 0 0 rgba(99,102,241,0.0)",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.7)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(99,102,241,0.2)";
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 rgba(99,102,241,0.0)";
                }}
              />
              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.3)",
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}
              {message && !error && (
                <div
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.3)",
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                >
                  {message}
                </div>
              )}
              <LoadingButton
                type="submit"
                loading={loading}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: "var(--accent)",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 20px rgba(99,102,241,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {loading ? "Updating..." : "Update password"}
              </LoadingButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
