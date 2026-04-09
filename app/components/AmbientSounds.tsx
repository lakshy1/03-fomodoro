"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Sound {
  id: string;
  name: string;
  emoji: string;
  description: string;
  generate: (ctx: AudioContext) => AudioNode;
}

/** Build a looping white-noise buffer source */
function noiseSource(ctx: AudioContext, seconds = 8): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

/** Brown noise: integrate white noise (very low-frequency rumble) */
function brownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

/** Pink noise: equal energy per octave */
function pinkNoise(ctx: AudioContext): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11;
    b6 = white * 0.115926;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

const SOUNDS: Sound[] = [
  {
    id: "rain",
    name: "Rain",
    emoji: "🌧",
    description: "Soft rainfall",
    generate(ctx) {
      const src = noiseSource(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 380;
      lp.Q.value = 0.4;
      const gain = ctx.createGain();
      gain.gain.value = 0.55;
      src.connect(lp);
      lp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "cafe",
    name: "Café",
    emoji: "☕",
    description: "Warm room tone",
    generate(ctx) {
      const src = pinkNoise(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 0.3;
      const gain = ctx.createGain();
      gain.gain.value = 0.18;
      src.connect(bp);
      bp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "fire",
    name: "Fireplace",
    emoji: "🔥",
    description: "Soft crackle",
    generate(ctx) {
      const src = noiseSource(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      bp.Q.value = 1.4;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      src.connect(bp);
      bp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "pink",
    name: "Pink noise",
    emoji: "🩷",
    description: "Balanced hush",
    generate(ctx) {
      const src = pinkNoise(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1200;
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      src.connect(lp);
      lp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "night",
    name: "Night",
    emoji: "🌙",
    description: "Crickets & air",
    generate(ctx) {
      const src = noiseSource(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800;
      const gain = ctx.createGain();
      gain.gain.value = 0.18;
      src.connect(hp);
      hp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    description: "Rolling waves",
    generate(ctx) {
      const src = noiseSource(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600;
      lp.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      // Slow wave modulation ~0.12 Hz
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.28;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.gain.value = 0.3;
      lfo.start();
      src.connect(lp);
      lp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌿",
    description: "Birds & breeze",
    generate(ctx) {
      const src = noiseSource(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200;
      bp.Q.value = 0.5;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 200;
      const gain = ctx.createGain();
      gain.gain.value = 0.22;
      src.connect(hp);
      hp.connect(bp);
      bp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "wind",
    name: "Wind",
    emoji: "💨",
    description: "Gentle wind",
    generate(ctx) {
      const src = brownNoise(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 250;
      lp.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      // Slow amplitude swell
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.06;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.2;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      src.connect(lp);
      lp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "vinyl",
    name: "Lo-fi",
    emoji: "🎵",
    description: "Vinyl static",
    generate(ctx) {
      const src = noiseSource(ctx);
      // Vinyl has a specific crackle character
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3500;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1000;
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      src.connect(lp);
      lp.connect(hp);
      hp.connect(gain);
      src.start();
      return gain;
    },
  },
  {
    id: "space",
    name: "Deep focus",
    emoji: "🔮",
    description: "40 Hz binaural",
    generate(ctx) {
      // Binaural-ish: left 200 Hz, right 240 Hz — creates 40 Hz beat in brain
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 200;
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 240;
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      const merger = ctx.createChannelMerger(2);
      osc1.connect(merger, 0, 0);
      osc2.connect(merger, 0, 1);
      merger.connect(gain);
      osc1.start();
      osc2.start();
      return gain;
    },
  },
];

interface ActiveSound {
  node: AudioNode;
  gainNode: GainNode;
}

export default function AmbientSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const activeSoundsRef = useRef<Map<string, ActiveSound>>(new Map());
  const [playing, setPlaying] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(SOUNDS.map((s) => [s.id, 0.7]))
  );
  const [masterVolume, setMasterVolume] = useState(0.8);
  const masterGainRef = useRef<GainNode | null>(null);

  function getCtx() {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  }

  function toggleSound(sound: Sound) {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();

    if (playing.has(sound.id)) {
      // Stop
      const active = activeSoundsRef.current.get(sound.id);
      if (active) {
        active.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        setTimeout(() => {
          try { active.gainNode.disconnect(); } catch { /* ignore */ }
        }, 600);
      }
      activeSoundsRef.current.delete(sound.id);
      setPlaying((p) => {
        const next = new Set(p);
        next.delete(sound.id);
        return next;
      });
    } else {
      // Stop any other sound (single-play mode)
      activeSoundsRef.current.forEach((active, id) => {
        active.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        setTimeout(() => {
          try { active.gainNode.disconnect(); } catch { /* ignore */ }
        }, 500);
        activeSoundsRef.current.delete(id);
      });
      setPlaying(new Set());

      // Play
      const outputNode = sound.generate(ctx);
      const gainNode = ctx.createGain();
      const targetVol = Number.isFinite(volumes[sound.id]) ? volumes[sound.id] : 0.7;
      gainNode.gain.value = 0;
      gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.5);
      outputNode.connect(gainNode);
      gainNode.connect(masterGainRef.current!);
      activeSoundsRef.current.set(sound.id, { node: outputNode, gainNode });
      setPlaying((p) => new Set([...p, sound.id]));
    }
  }

  function setVolume(id: string, vol: number) {
    setVolumes((v) => ({ ...v, [id]: vol }));
    const active = activeSoundsRef.current.get(id);
    if (active && ctxRef.current) {
      active.gainNode.gain.setTargetAtTime(vol, ctxRef.current.currentTime, 0.05);
    }
  }

  function setMaster(vol: number) {
    setMasterVolume(vol);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = vol;
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return (
    <div className="fade-in flex flex-col gap-6 w-full max-w-none mx-auto py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Layer sounds to create your perfect study environment.
          </p>
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-3)" }}
        >
          Tap a sound to play
        </span>
      </div>

      {/* Master volume */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-2)", flexShrink: 0 }}>
          <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
          <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
          <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
        </svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => setMaster(parseFloat(e.target.value))}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="text-xs w-8 text-right" style={{ color: "var(--text-2)" }}>
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      {/* Sound grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {SOUNDS.map((sound) => {
          const isOn = playing.has(sound.id);
          return (
            <div
              key={sound.id}
              className="flex flex-col gap-3 p-4 rounded-2xl transition-all duration-200 cursor-pointer relative"
              style={{
                background: isOn ? "var(--accent-dim)" : "var(--glass-1)",
                border: `1px solid ${isOn ? "var(--accent-border)" : "var(--glass-border)"}`,
                boxShadow: isOn ? "0 0 24px var(--accent-glow)" : "none",
              }}
              onClick={() => toggleSound(sound)}
            >
              {isOn && (
                <span
                  className="ambient-pulse"
                  style={{
                    position: "absolute",
                    inset: -2,
                    borderRadius: 18,
                    border: "1px solid rgba(99,102,241,0.35)",
                    pointerEvents: "none",
                  }}
                />
              )}
              <div className="flex items-start justify-between">
                <span style={{ fontSize: 28 }}>{sound.emoji}</span>
                {/* Toggle pill removed */}
              </div>

              <div>
                <p className="text-sm font-semibold" style={{ color: isOn ? "var(--text-1)" : "var(--text-1)" }}>
                  {sound.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  {sound.description}
                </p>
              </div>

              {/* Per-sound volume (only when playing) */}
              {isOn && (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volumes[sound.id]}
                    onChange={(e) => setVolume(sound.id, parseFloat(e.target.value))}
                    className="flex-1 h-0.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: "var(--accent)" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs" style={{ color: "var(--text-3)" }}>
        All sounds are generated in-browser — no downloads needed.
      </p>
    </div>
  );
}
