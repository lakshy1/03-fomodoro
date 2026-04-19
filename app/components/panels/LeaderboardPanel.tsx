"use client";

import LoadingButton from "../LoadingButton";
import {
  colorFor,
  formatMinutes,
  SkeletonCard,
  SkeletonRow,
  type DayDatum,
  type LeaderboardEntry,
  type LeaderboardRange,
} from "./shared";

// ─── LeaderboardMini — compact sidebar preview ────────────────────────────────

export function LeaderboardMini({
  rows,
  loading,
}: {
  rows: LeaderboardEntry[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: "6px 10px 10px" }}>
        <SkeletonRow height={10} width="40%" />
        <div style={{ marginTop: 8 }}>
          <SkeletonRow height={8} width="100%" />
          <div style={{ height: 6 }} />
          <SkeletonRow height={8} width="100%" />
        </div>
      </div>
    );
  }

  if (!rows.length) return null;

  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div style={{ padding: "6px 10px 10px" }}>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>Leaderboard</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row) => (
          <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-1)" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.name.split(" ")[0]}
                </span>
                <span style={{ color: "var(--text-3)", flexShrink: 0, marginLeft: 4 }}>
                  {formatMinutes(row.total)}
                </span>
              </div>
              <div
                style={{
                  height: 4, borderRadius: 999,
                  background: "var(--glass-2)", marginTop: 3, overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((row.total / max) * 100))}%`,
                    background: "linear-gradient(90deg, rgba(99,102,241,0.75), rgba(99,102,241,0.2))",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                {row.days.map((d: DayDatum) => (
                  <span
                    key={d.date}
                    title={`${d.date} — ${formatMinutes(d.minutes)}`}
                    style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: colorFor(d.minutes), display: "inline-block",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LeaderboardPanel — full view ────────────────────────────────────────────

export function LeaderboardPanel({
  rows,
  loading,
  range,
  onRangeChange,
  onRefresh,
}: {
  rows: LeaderboardEntry[];
  loading: boolean;
  range: LeaderboardRange;
  onRangeChange: (r: LeaderboardRange) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  const topTotal = Math.max(1, rows[0]?.total ?? 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Range picker + refresh ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex", gap: 8,
            background: "var(--glass-1)", border: "1px solid var(--glass-border)",
            borderRadius: 999, padding: 4, width: "fit-content",
          }}
        >
          {([
            { key: "last7", label: "Last 7 days" },
            { key: "month", label: "This month" },
          ] as { key: LeaderboardRange; label: string }[]).map((opt) => (
            <LoadingButton
              key={opt.key}
              onClick={() => onRangeChange(opt.key)}
              style={{
                border: "none", padding: "6px 12px", borderRadius: 999,
                background: range === opt.key ? "var(--accent-dim)" : "transparent",
                color: range === opt.key ? "var(--accent-text)" : "var(--text-3)",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              {opt.label}
            </LoadingButton>
          ))}
        </div>
        <LoadingButton
          onClick={onRefresh}
          style={{
            border: "1px solid var(--glass-border)", borderRadius: 999,
            background: "var(--glass-1)", color: "var(--text-2)",
            padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
          title="Refresh leaderboard"
        >
          Refresh
        </LoadingButton>
      </div>

      {/* Rows ── */}
      <div
        style={{
          background: "var(--glass-1)", border: "1px solid var(--glass-border)",
          borderRadius: 18, padding: 16,
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        {rows.map((row, idx) => (
          <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 26, textAlign: "center", fontWeight: 700, color: "var(--text-1)", flexShrink: 0 }}>
              #{idx + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-1)" }}>
                <span>{row.name.split(" ")[0]}</span>
                <span style={{ color: "var(--text-3)" }}>{formatMinutes(row.total)}</span>
              </div>
              <div
                style={{
                  height: 6, borderRadius: 999,
                  background: "var(--glass-2)", marginTop: 6, overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((row.total / topTotal) * 100))}%`,
                    background: "linear-gradient(90deg, rgba(99,102,241,0.8), rgba(99,102,241,0.25))",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {row.days.map((d: DayDatum) => (
                  <span
                    key={d.date}
                    title={`${d.date} — ${formatMinutes(d.minutes)}`}
                    style={{
                      width: 10, height: 10, borderRadius: 3,
                      background: d.minutes === 0 ? "var(--glass-2)" : "rgba(99,102,241,0.6)",
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
