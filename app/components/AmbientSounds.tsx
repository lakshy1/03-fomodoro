"use client";

import { useState, useRef, useEffect } from "react";

interface Sound {
  id: string;
  name: string;
  emoji: string;
  description: string;
  file: string;
}

const SOUNDS: Sound[] = [
  { id: "rain",       name: "Rain",       emoji: "🌧", description: "Relaxing natural rainfall",           file: "/dragon-studio-relaxing-rain-444802.mp3" },
  { id: "binaural",   name: "Binaural",   emoji: "🧠", description: "Delta binaural beats for deep focus", file: "/freesound_community-binaural-beats_delta_440_440-5hz-48565.mp3" },
  { id: "deep-focus", name: "Deep Focus", emoji: "🎯", description: "Cinematic deep work flow",             file: "/lilliben-ambient-background-for-deep-work-364890.mp3" },
  { id: "ambient",    name: "Ambient",    emoji: "🌌", description: "Soft atmospheric soundscape",         file: "/quietphase-ambient-deep-489704.mp3" },
  { id: "lofi",       name: "Lo-fi",      emoji: "🎵", description: "Calm lo-fi ambient",                  file: "/quietphase-deep-ambient-489703.mp3" },
  { id: "lounge",     name: "Lounge",     emoji: "☕", description: "Warm instrumental lounge",            file: "/quietphase-deep-instrumental-496353.mp3" },
];

interface ActiveSound {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
}

// Animated equalizer bars
function EqBars({ active, barCount = 12, height = 36 }: { active: boolean; barCount?: number; height?: number }) {
  const peaks = [55, 80, 45, 95, 60, 85, 40, 75, 65, 90, 50, 70];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? "var(--accent)" : "var(--text-3)",
            opacity: active ? 0.8 : 0.18,
            height: active ? `${Math.max(4, peaks[i % peaks.length] * (height / 100))}px` : 4,
            animationName: active ? `ambientEq${i % 4}` : "none",
            animationDuration: active ? `${0.65 + (i % 5) * 0.12}s` : undefined,
            animationTimingFunction: active ? "ease-in-out" : undefined,
            animationIterationCount: active ? "infinite" : undefined,
            animationDirection: active ? "alternate" : undefined,
            animationDelay: `${i * 0.055}s`,
            transition: "opacity 0.4s ease, height 0.5s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function AmbientSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const activeSoundsRef = useRef<Map<string, ActiveSound>>(new Map());
  const [playing, setPlaying] = useState<Set<string>>(new Set());
  const [masterVolume, setMasterVolume] = useState(0.8);
  const masterGainRef = useRef<GainNode | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  function getCtx() {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  }

  function stopSound(id: string, fadeMs = 600) {
    const ctx = ctxRef.current;
    const active = activeSoundsRef.current.get(id);
    if (!active || !ctx) return;
    active.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => {
      try {
        active.audio.pause();
        active.audio.src = "";
        active.audio.load();
        active.source.disconnect();
        active.gainNode.disconnect();
      } catch {
        /* ignore */
      }
    }, fadeMs);
    activeSoundsRef.current.delete(id);
  }

  async function toggleSound(sound: Sound) {
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    setPlaybackError(null);

    if (playing.has(sound.id)) {
      stopSound(sound.id);
      setPlaying((p) => { const next = new Set(p); next.delete(sound.id); return next; });
    } else {
      // Stop current (single-play mode)
      activeSoundsRef.current.forEach((_, id) => stopSound(id, 500));
      activeSoundsRef.current.clear();
      setPlaying(new Set());

      const audio = new Audio(sound.file);
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";

      const source = ctx.createMediaElementSource(audio);
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1;
      source.connect(gainNode);
      gainNode.connect(masterGainRef.current!);
      activeSoundsRef.current.set(sound.id, { audio, source, gainNode });
      try {
        await audio.play();
        setPlaying(new Set([sound.id]));
      } catch {
        try {
          audio.pause();
          source.disconnect();
          gainNode.disconnect();
        } catch {
          /* ignore */
        }
        activeSoundsRef.current.delete(sound.id);
        setPlaybackError("Playback was blocked by the browser.");
      }
    }
  }

  function setMaster(vol: number) {
    setMasterVolume(vol);
    if (masterGainRef.current) masterGainRef.current.gain.value = vol;
  }

  useEffect(() => {
    return () => {
      activeSoundsRef.current.forEach((active) => {
        try { active.audio.pause(); active.gainNode.disconnect(); } catch { /* ignore */ }
      });
      ctxRef.current?.close();
    };
  }, []);

  const activeId = [...playing][0] ?? null;
  const activeSound = activeId ? SOUNDS.find((s) => s.id === activeId) ?? null : null;

  return (
    <>
      <style>{`
        @keyframes ambientEq0 { from { height: 4px } to { height: 22px } }
        @keyframes ambientEq1 { from { height: 6px } to { height: 28px } }
        @keyframes ambientEq2 { from { height: 8px } to { height: 18px } }
        @keyframes ambientEq3 { from { height: 5px } to { height: 24px } }
        .ambient-card { transition: transform 0.15s ease, box-shadow 0.2s ease; }
        .ambient-card:hover { transform: translateY(-2px); }
        .ambient-card:active { transform: scale(0.97); }
      `}</style>

      <div className="fade-in flex flex-col gap-5 w-full max-w-none mx-auto py-4">

        {/* ── Now Playing Hero ── */}
        <div
          style={{
            background: activeSound
              ? "linear-gradient(135deg, var(--accent-dim) 0%, var(--glass-1) 100%)"
              : "var(--glass-1)",
            border: `1px solid ${activeSound ? "var(--accent-border)" : "var(--glass-border)"}`,
            borderRadius: 22,
            padding: "20px 20px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: activeSound ? "0 0 48px var(--accent-glow)" : "none",
            transition: "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: activeSound ? "var(--accent-dim)" : "var(--glass-2)",
                border: `1px solid ${activeSound ? "var(--accent-border)" : "var(--glass-border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26,
                transition: "all 0.3s ease",
              }}
            >
              {activeSound ? activeSound.emoji : "🎧"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: activeSound ? "var(--accent)" : "var(--text-3)",
                marginBottom: 3,
                transition: "color 0.3s ease",
              }}>
                {activeSound ? "NOW PLAYING" : "PLAYER READY"}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeSound ? activeSound.name : "No track selected"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                {activeSound ? activeSound.description : "Tap a sound below to begin"}
              </div>
            </div>

            <EqBars active={!!activeSound} barCount={10} height={38} />
          </div>

          {/* Volume controls */}
          {activeSound && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-2)", flexShrink: 0 }}>
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                  <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
                  <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
                </svg>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={masterVolume}
                  onChange={(e) => setMaster(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer", height: 3 }}
                />
                <span style={{ fontSize: 10, color: "var(--text-2)", width: 26, textAlign: "right" }}>
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
            </div>
          )}
          {!activeSound && playbackError && (
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>
              {playbackError}
            </div>
          )}
        </div>

        {/* ── Sound Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SOUNDS.map((sound) => {
            const isOn = playing.has(sound.id);
            return (
              <div
                key={sound.id}
                className="ambient-card flex flex-col gap-3 p-4 rounded-2xl cursor-pointer relative"
                style={{
                  background: isOn ? "var(--accent-dim)" : "var(--glass-1)",
                  border: `1px solid ${isOn ? "var(--accent-border)" : "var(--glass-border)"}`,
                  boxShadow: isOn ? "0 0 20px var(--accent-glow)" : "none",
                }}
                onClick={() => toggleSound(sound)}
              >
                {isOn && (
                  <span
                    className="ambient-pulse"
                    style={{
                      position: "absolute", inset: -2, borderRadius: 18,
                      border: "1px solid rgba(99,102,241,0.3)", pointerEvents: "none",
                    }}
                  />
                )}

                {/* Emoji + mini eq bars */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 24 }}>{sound.emoji}</span>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18 }}>
                {[55, 85, 45, 95, 65].map((h, i) => (
                  <div
                    key={i}
                    style={{
                        width: 2, borderRadius: 1,
                        background: isOn ? "var(--accent)" : "var(--text-3)",
                        opacity: isOn ? 0.75 : 0.2,
                        height: isOn ? `${Math.max(3, h * 0.18)}px` : 3,
                        animationName: isOn ? `ambientEq${i % 4}` : "none",
                        animationDuration: isOn ? `${0.6 + i * 0.1}s` : undefined,
                        animationTimingFunction: isOn ? "ease-in-out" : undefined,
                        animationIterationCount: isOn ? "infinite" : undefined,
                        animationDirection: isOn ? "alternate" : undefined,
                        animationDelay: `${i * 0.07}s`,
                        transition: "height 0.4s ease, opacity 0.4s ease",
                      }}
                    />
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>{sound.name}</p>
                  <p style={{ fontSize: 10, color: "var(--text-3)", margin: "2px 0 0", lineHeight: 1.4 }}>{sound.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
