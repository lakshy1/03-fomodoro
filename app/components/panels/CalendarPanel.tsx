"use client";

import { colorFor, formatMinutes, SkeletonCard, type DayDatum } from "./shared";

// ─── Private helpers ──────────────────────────────────────────────────────────

function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
}

type CalendarCell = {
  date: string;
  minutes: number;
  blank?: boolean;
};

// ─── CalendarPanel ────────────────────────────────────────────────────────────

export default function CalendarPanel({
  last7,
  history,
  loading,
}: {
  last7: DayDatum[];
  history: DayDatum[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  const max = Math.max(30, ...last7.map((d) => d.minutes));
  const total = last7.reduce((a, b) => a + b.minutes, 0);
  const HEAT_LEVELS = [0, 30, 60, 120, 240];
  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
  const CELL = 12;
  const GAP = 4;

  const historyByDate = new Map(history.map((d) => [d.date, d.minutes]));
  const monthGroups = history.reduce<
    Array<{
      key: string;
      label: string;
      cells: CalendarCell[];
    }>
  >((acc, day) => {
    const monthKey = day.date.slice(0, 7);
    const month = acc[acc.length - 1];
    if (!month || month.key !== monthKey) {
      acc.push({
        key: monthKey,
        label: monthLabel(day.date),
        cells: [],
      });
    }
    acc[acc.length - 1].cells.push({ date: day.date, minutes: day.minutes });
    return acc;
  }, []);

  const monthCards = monthGroups.map((month) => {
    const firstDate = new Date(`${month.cells[0]?.date ?? history[0].date}T00:00:00`);
    const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const monthEnd = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0);
    const startOffset = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const blanks: CalendarCell[] = Array.from({ length: startOffset }, (_, i) => ({ date: `${month.key}-blank-${i}`, minutes: 0, blank: true }));
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const date = `${month.key}-${day}`;
      return {
        date,
        minutes: historyByDate.get(date) ?? 0,
      } satisfies CalendarCell;
    });
    const cells: CalendarCell[] = [...blanks, ...monthDays];
    const rows = Math.max(1, Math.ceil(cells.length / 7));
    const padded: CalendarCell[] = [
      ...cells,
      ...Array.from({ length: rows * 7 - cells.length }, (_, i) => ({
        date: `${month.key}-pad-${i}`,
        minutes: 0,
        blank: true,
      })),
    ];
    return { ...month, cells: padded, rows };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Last 7 days bar chart ── */}
      <div
        style={{
          background: "var(--glass-1)", border: "1px solid var(--glass-border)",
          borderRadius: 20, padding: 16, scrollSnapAlign: "start",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>Last 7 days</div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-end" }}>
          {last7.map((d) => (
            <div
              key={d.date}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 0 }}
            >
              <div
                style={{
                  width: "100%", height: 96, borderRadius: 12,
                  background: "var(--glass-2)",
                  display: "flex", alignItems: "flex-end", overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(8, Math.round((d.minutes / max) * 90))}px`,
                    background: "linear-gradient(180deg, rgba(99,102,241,0.95), rgba(99,102,241,0.35))",
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1 }}>{d.date.slice(5)}</span>
              <span style={{ fontSize: 11, color: "var(--text-1)", fontWeight: 600, lineHeight: 1.2, textAlign: "center", minHeight: 28 }}>
                {formatMinutes(d.minutes)}
              </span>
            </div>
          ))}
        </div>
        {total === 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>
            No data yet. Start a focus session to populate this chart.
          </div>
        )}
      </div>

      {/* Contribution heatmap ── */}
      <div
        style={{
          background: "var(--glass-1)", border: "1px solid var(--glass-border)",
          borderRadius: 20, padding: 16, scrollSnapAlign: "start",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>Contribution history</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Monthly activity split into clean cards</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>
            <span>Less</span>
            {HEAT_LEVELS.map((l) => (
              <span
                key={l}
                style={{
                  width: 11, height: 11, borderRadius: 3,
                  background: colorFor(l), display: "inline-block",
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 320px))",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {monthCards.map((month) => (
              <div
                key={month.key}
                style={{
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 16,
                  padding: 10,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600 }}>{month.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>{month.rows} wk</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 8 }}>
                  {DAY_LABELS.map((d, idx) => (
                    <div key={`${month.key}-${d}-${idx}`} style={{ fontSize: 9, color: "var(--text-3)", textAlign: "center" }}>
                      {d}
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: GAP, justifyItems: "center" }}>
                  {month.cells.map((cell) => (
                    <div
                      key={cell.date}
                      title={cell.blank ? "" : `${cell.date} — ${formatMinutes(cell.minutes)}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 4,
                        background: cell.blank ? "transparent" : colorFor(cell.minutes),
                        boxShadow: cell.blank ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.02)",
                        opacity: cell.blank ? 0 : 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
