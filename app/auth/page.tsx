"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { gsap } from "gsap";
import LoadingButton from "../components/LoadingButton";
import { useToast } from "../components/ToastProvider";
import { getAppBaseUrl } from "../lib/appUrl";

type Mode = "login" | "signup" | "reset";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const [shakeKey, setShakeKey] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const floatARef = useRef<HTMLDivElement | null>(null);
  const floatBRef = useRef<HTMLDivElement | null>(null);

  const heading = useMemo(() => {
    if (mode === "signup") return "Create your account";
    if (mode === "reset") return "Reset your password";
    return "Welcome back";
  }, [mode]);

  const subheading = useMemo(() => {
    if (mode === "signup") return "Join FomoDoro and start tracking focus time.";
    if (mode === "reset") return "We’ll email you a secure reset link.";
    return "Sign in to continue your focus journey.";
  }, [mode]);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { y: 18, opacity: 0, rotateX: 8 },
      { y: 0, opacity: 1, rotateX: 0, duration: 0.9, ease: "power3.out" }
    );
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
    if (floatARef.current) {
      gsap.to(floatARef.current, {
        y: -14,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
    if (floatBRef.current) {
      gsap.to(floatBRef.current, {
        y: 16,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, [mode]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const wrap = wrapRef.current;
    const grid = gridRef.current;
    const orb = orbRef.current;
    const glow = glowRef.current;
    const floatA = floatARef.current;
    const floatB = floatBRef.current;
    const move = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (grid) gsap.to(grid, { x: x * 12, y: y * 12, duration: 0.6, ease: "power3.out" });
      if (orb) gsap.to(orb, { x: x * 28, y: y * 28, duration: 0.6, ease: "power3.out" });
      if (glow) gsap.to(glow, { x: x * 18, y: y * 18, duration: 0.6, ease: "power3.out" });
      if (floatA) gsap.to(floatA, { x: x * 16, y: y * 8, duration: 0.6, ease: "power3.out" });
      if (floatB) gsap.to(floatB, { x: x * -18, y: y * 10, duration: 0.6, ease: "power3.out" });
    };
    wrap.addEventListener("mousemove", move);
    return () => wrap.removeEventListener("mousemove", move);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === "reset") {
        const redirectTo = `${getAppBaseUrl()}/auth/reset`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetError) throw resetError;
        setSuccess("Password reset link sent. Check your email.");
        push({ type: "success", title: "Reset link sent", message: "Check your email inbox." });
      } else if (mode === "signup") {
        const emailRedirectTo = `${getAppBaseUrl()}/auth`;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo,
          },
        });
        if (signUpError) throw signUpError;
        setSuccess("Check your email to confirm your account.");
        push({ type: "success", title: "Confirm your email", message: "We sent a verification link." });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/");
        push({ type: "success", title: "Welcome back", message: "Login successful." });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      push({ type: "error", title: "Authentication failed", message });
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  const emailValid = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length === 0 || password.length >= 6;

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
          "radial-gradient(1200px 600px at 20% 0%, rgba(99,102,241,0.25), transparent), radial-gradient(800px 400px at 80% 20%, rgba(6,182,212,0.2), transparent), var(--bg)",
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
        ref={floatARef}
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "48% 52% 58% 42%",
          background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.16))",
          bottom: "10%",
          left: "8%",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <div
        ref={floatBRef}
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "52% 48% 46% 54%",
          background: "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(59,130,246,0.18))",
          top: "18%",
          right: "6%",
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
          className="auth-side"
        >
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#a5b4fc" }}>
            FomoDoro
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
            Build a focus streak your future self will thank you for.
          </div>
          <div style={{ fontSize: 13, color: "#c7d2fe" }}>
            Stay accountable with friends, daily milestones, and calming ambient soundscapes.
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {[
              { title: "Instant sessions", body: "Start a timer in one click and log focus automatically." },
              { title: "Team energy", body: "See who’s studying and climb the leaderboard together." },
              { title: "Insights", body: "Track streaks, weekly wins, and your best focus hours." },
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
            padding: 26,
            boxShadow: "var(--glass-shadow)",
            transformStyle: "preserve-3d",
            backdropFilter: "blur(20px)",
          }}
          className={`auth-card ${error ? "shake" : ""}`}
        >
          <div className="auth-action-row" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {(["login", "signup"] as Mode[]).map((m) => (
              <LoadingButton
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: 999,
                  background: mode === m ? "var(--accent-dim)" : "var(--glass-2)",
                  color: mode === m ? "var(--accent-text)" : "var(--text-3)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </LoadingButton>
            ))}
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>{heading}</h1>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>{subheading}</p>

          <form onSubmit={handleSubmit} className="auth-input-stack" style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <GlowInput
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                valid={name.length === 0 || name.length >= 2}
                hint="Use at least 2 characters."
              />
            )}
            <GlowInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              valid={emailValid}
              hint="Enter a valid email address."
            />
            {mode !== "reset" && (
              <GlowInput
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                valid={passwordValid}
                hint="At least 6 characters."
              />
            )}
            {mode === "login" && (
              <LoadingButton
                type="button"
                onClick={() => setMode("reset")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-3)",
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                Forgot password?
              </LoadingButton>
            )}
            {success && (
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
                {success}
              </div>
            )}
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
            <LoadingButton
              type="submit"
              loading={loading}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "12px 14px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log In"
                  : mode === "signup"
                    ? "Create Account"
                    : "Send Reset Link"}
            </LoadingButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function GlowInput({
  valid = true,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { valid?: boolean; hint?: string }) {
  const [focused, setFocused] = useState(false);
  const showHint = !valid && (props.value?.toString().length || 0) > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={{
          background: "var(--glass-2)",
          border: `1px solid ${focused ? "rgba(99,102,241,0.7)" : "var(--glass-border)"}`,
          borderRadius: 12,
          padding: "12px 14px",
          color: "var(--text-1)",
          outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.2)" : "none",
          transform: focused ? "translateY(-1px)" : "translateY(0)",
          transition: "all 0.2s ease",
        }}
      />
      {showHint && (
        <span style={{ fontSize: 11, color: "#f87171" }}>{hint}</span>
      )}
    </div>
  );
}
