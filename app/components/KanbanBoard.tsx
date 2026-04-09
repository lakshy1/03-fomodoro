"use client";

import { useState, useEffect, useRef } from "react";
import LoadingButton from "./LoadingButton";

type Status = "todo" | "doing" | "done";

interface Card {
  id: string;
  text: string;
  status: Status;
  createdAt: number;
}

const COLUMNS: { id: Status; label: string; emoji: string; color: string; bg: string; border: string }[] = [
  {
    id: "todo",
    label: "To Do",
    emoji: "📋",
    color: "var(--text-2)",
    bg: "var(--glass-1)",
    border: "var(--glass-border)",
  },
  {
    id: "doing",
    label: "In Progress",
    emoji: "⚡",
    color: "var(--amber)",
    bg: "var(--amber-dim)",
    border: "var(--amber-border)",
  },
  {
    id: "done",
    label: "Done",
    emoji: "✅",
    color: "var(--green)",
    bg: "var(--green-dim)",
    border: "var(--green-border)",
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function KanbanBoard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [inputs, setInputs] = useState<Record<Status, string>>({ todo: "", doing: "", done: "" });
  const [adding, setAdding] = useState<Status | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studylin_kanban");
      if (saved) setCards(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("studylin_kanban", JSON.stringify(cards));
  }, [cards]);

  function addCard(status: Status) {
    const text = inputs[status].trim();
    if (!text) return;
    setCards((c) => [...c, { id: uid(), text, status, createdAt: Date.now() }]);
    setInputs((i) => ({ ...i, [status]: "" }));
    setAdding(null);
  }

  function deleteCard(id: string) {
    setCards((c) => c.filter((x) => x.id !== id));
  }

  function moveCard(id: string, to: Status) {
    setCards((c) => c.map((x) => (x.id === id ? { ...x, status: to } : x)));
  }

  // Drag handlers
  function onDragStart(id: string) {
    setDragging(id);
  }
  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
  }
  function onDrop(status: Status) {
    if (dragging) moveCard(dragging, status);
    setDragging(null);
    setDragOver(null);
  }

  const totalDone = cards.filter((c) => c.status === "done").length;
  const totalCards = cards.length;
  const progress = totalCards > 0 ? Math.round((totalDone / totalCards) * 100) : 0;

  return (
    <div className="fade-in flex flex-col gap-5 h-full w-full">
      {/* Progress bar */}
      {totalCards > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--glass-2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "var(--green)" }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--green)" }}>
            {progress}% complete
          </span>
        </div>
      )}

      {/* Columns */}
      <div className="kanban-columns flex flex-col md:flex-row gap-4 flex-1 overflow-y-auto md:overflow-hidden">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.status === col.id);
          const isOver = dragOver === col.id;

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl overflow-hidden w-full md:flex-1 transition-all duration-200"
              style={{
                background: isOver ? col.bg : "var(--glass-1)",
                border: `1px solid ${isOver ? col.border : "var(--glass-border)"}`,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(col.id)}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>{col.emoji}</span>
                  <span className="text-sm font-semibold" style={{ color: col.color }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}
                >
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-3">
                {colCards.map((card) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    isDragging={dragging === card.id}
                    onDragStart={() => onDragStart(card.id)}
                    onDragEnd={onDragEnd}
                    onDelete={() => deleteCard(card.id)}
                    onMove={(to) => moveCard(card.id, to)}
                    currentStatus={col.id}
                  />
                ))}

                {/* Empty drop zone hint */}
                {colCards.length === 0 && dragOver !== col.id && (
                  <div
                    className="flex items-center justify-center rounded-xl py-8 text-xs"
                    style={{ color: "var(--text-3)", border: `1px dashed var(--glass-border)` }}
                  >
                    Drop here
                  </div>
                )}

                {/* Add card */}
                {adding === col.id ? (
                  <div
                    className="flex flex-col gap-2 p-3 rounded-xl"
                    style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border)" }}
                  >
                    <textarea
                      autoFocus
                      value={inputs[col.id]}
                      onChange={(e) => setInputs((i) => ({ ...i, [col.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(col.id); }
                        if (e.key === "Escape") setAdding(null);
                      }}
                      placeholder="Task description…"
                      rows={2}
                      className="w-full bg-transparent text-xs outline-none resize-none"
                      style={{ color: "var(--text-1)" }}
                    />
                    <div className="flex gap-2">
                      <LoadingButton
                        onClick={() => addCard(col.id)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: col.color, color: "white" }}
                      >
                        Add
                      </LoadingButton>
                      <LoadingButton
                        onClick={() => setAdding(null)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: "var(--glass-1)", color: "var(--text-2)", border: "1px solid var(--glass-border)" }}
                      >
                        Cancel
                      </LoadingButton>
                    </div>
                  </div>
                ) : (
                  <LoadingButton
                    onClick={() => setAdding(col.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 mt-1"
                    style={{ color: "var(--text-3)", border: "1px dashed var(--glass-border)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add card
                  </LoadingButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onDelete,
  onMove,
  currentStatus,
}: {
  card: Card;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onMove: (to: Status) => void;
  currentStatus: Status;
}) {
  const otherStatuses = (["todo", "doing", "done"] as Status[]).filter((s) => s !== currentStatus);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group flex flex-col gap-2 p-3 rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing"
      style={{
        background: isDragging ? "var(--accent-dim)" : "var(--glass-2)",
        border: `1px solid ${isDragging ? "var(--accent-border)" : "var(--glass-border)"}`,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-1)" }}>
        {card.text}
      </p>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {otherStatuses.map((s) => {
          const col = COLUMNS.find((c) => c.id === s)!;
          return (
            <LoadingButton
              key={s}
              onClick={() => onMove(s)}
              className="px-2 py-0.5 rounded-md text-xs font-medium transition-all duration-150"
              style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}
            >
              → {col.label}
            </LoadingButton>
          );
        })}
        <LoadingButton
          onClick={onDelete}
          className="ml-auto flex items-center justify-center rounded-md"
          style={{ width: 22, height: 22, color: "var(--text-3)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </LoadingButton>
      </div>
    </div>
  );
}
