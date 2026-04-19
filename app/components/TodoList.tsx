"use client";

import { useState, useEffect, useRef } from "react";
import LoadingButton from "./LoadingButton";
import { sendTaskToKanban, setPinnedTaskId, getPinnedTaskId, SHARED_TASKS_CHANGED } from "./useSharedTasks";
import { hapticLight, hapticMedium } from "../lib/haptics";

type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  createdAt: number;
}

const PRIORITY_META: Record<Priority, { label: string; color: string; dot: string }> = {
  low:    { label: "Low",    color: "var(--text-3)",  dot: "var(--glass-border-hover)" },
  medium: { label: "Medium", color: "var(--amber)",   dot: "var(--amber)" },
  high:   { label: "High",   color: "var(--red)",     dot: "var(--red)" },
};

type Filter = "all" | "active" | "done";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studylin_tasks");
      if (saved) setTasks(JSON.parse(saved));
    } catch { /* ignore */ }
    setPinnedId(getPinnedTaskId());
  }, []);

  useEffect(() => {
    localStorage.setItem("studylin_tasks", JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(SHARED_TASKS_CHANGED, { detail: { type: "tasks" } }));
  }, [tasks]);

  // Keep pinnedId in sync when other components change it
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "pinned") setPinnedId(getPinnedTaskId());
    };
    window.addEventListener(SHARED_TASKS_CHANGED, handler);
    return () => window.removeEventListener(SHARED_TASKS_CHANGED, handler);
  }, []);

  function addTask() {
    const text = input.trim();
    if (!text) return;
    hapticLight();
    setTasks((t) => [
      { id: uid(), text, done: false, priority, createdAt: Date.now() },
      ...t,
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  function toggleTask(id: string) {
    hapticLight();
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function deleteTask(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
    if (pinnedId === id) {
      setPinnedTaskId(null);
      setPinnedId(null);
    }
  }

  function clearDone() {
    setTasks((t) => t.filter((x) => !x.done));
  }

  function handleSendToKanban(task: Task) {
    hapticMedium();
    sendTaskToKanban(task);
  }

  function handlePinTask(id: string) {
    hapticLight();
    const next = pinnedId === id ? null : id;
    setPinnedTaskId(next);
    setPinnedId(next);
  }

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const doneCount   = tasks.filter((t) => t.done).length;
  const activeCount = tasks.length - doneCount;

  return (
    <div
      className="fade-in flex flex-col gap-5 w-full h-full max-w-none"
      style={{ minHeight: 0 }}
    >
      {/* Stats */}
      <div className="flex items-center gap-3">
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "var(--accent-dim)", color: "var(--accent-text)", border: "1px solid var(--accent-border)" }}
        >
          {activeCount} remaining
        </span>
        {doneCount > 0 && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-border)" }}
          >
            {doneCount} completed
          </span>
        )}
        {pinnedId && tasks.find((t) => t.id === pinnedId) && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold ml-auto"
            style={{ background: "rgba(245,158,11,0.1)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            📌 Task pinned to timer
          </span>
        )}
      </div>

      {/* Input row */}
      <div
        className="flex gap-2 p-2 rounded-2xl task-input-row"
        style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
      >
        {/* Priority picker */}
        <div className="flex items-center">
          {(["low", "medium", "high"] as Priority[]).map((p) => (
            <LoadingButton
              key={p}
              onClick={() => setPriority(p)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150"
              title={PRIORITY_META[p].label}
              style={{
                background: priority === p ? PRIORITY_META[p].dot : "transparent",
                border: `2px solid ${PRIORITY_META[p].dot}`,
                marginRight: 4,
                opacity: priority === p ? 1 : 0.4,
              }}
            >
              <span style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
                {PRIORITY_META[p].label}
              </span>
            </LoadingButton>
          ))}
        </div>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a study task…"
          className="flex-1 bg-transparent text-sm outline-none task-input"
          style={{ color: "var(--text-1)", caretColor: "var(--accent)" }}
        />
        <LoadingButton
          onClick={addTask}
          disabled={!input.trim()}
          className="flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 task-add-btn"
          style={{
            background: input.trim() ? "var(--accent)" : "var(--glass-2)",
            color: input.trim() ? "white" : "var(--text-3)",
            boxShadow: input.trim() ? "0 2px 16px var(--accent-glow)" : "none",
          }}
        >
          Add
        </LoadingButton>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "active", "done"] as Filter[]).map((f) => (
          <LoadingButton
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150"
            style={
              filter === f
                ? { background: "var(--accent-dim)", color: "var(--accent-text)", border: "1px solid var(--accent-border)" }
                : { color: "var(--text-2)", border: "1px solid transparent" }
            }
          >
            {f}
          </LoadingButton>
        ))}
        {doneCount > 0 && (
          <LoadingButton
            onClick={clearDone}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{ color: "var(--text-3)", border: "1px solid transparent" }}
          >
            Clear done
          </LoadingButton>
        )}
      </div>

      {/* Task list */}
      <div
        className="flex flex-col gap-2 flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl"
            style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
          >
            <span style={{ fontSize: 32 }}>📋</span>
            <p className="mt-3 text-sm" style={{ color: "var(--text-3)" }}>
              {filter === "done" ? "No completed tasks yet" : "No tasks yet — add one above"}
            </p>
          </div>
        )}
        {filtered.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            pinned={pinnedId === task.id}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
            onSendToKanban={() => handleSendToKanban(task)}
            onPin={() => handlePinTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  pinned,
  onToggle,
  onDelete,
  onSendToKanban,
  onPin,
}: {
  task: Task;
  pinned: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSendToKanban: () => void;
  onPin: () => void;
}) {
  const meta = PRIORITY_META[task.priority];
  const [kanbanSent, setKanbanSent] = useState(false);

  function handleKanban() {
    onSendToKanban();
    setKanbanSent(true);
    setTimeout(() => setKanbanSent(false), 2000);
  }

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
      style={{
        background: pinned ? "rgba(245,158,11,0.06)" : "var(--glass-1)",
        border: `1px solid ${pinned ? "rgba(245,158,11,0.25)" : "var(--glass-border)"}`,
        opacity: task.done ? 0.55 : 1,
      }}
    >
      {/* Priority dot */}
      <div
        className="w-1.5 rounded-full shrink-0 self-stretch"
        style={{ background: meta.dot, opacity: task.done ? 0.4 : 0.8 }}
      />

      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        className="shrink-0"
      />

      <span
        className="flex-1 text-sm leading-snug"
        style={{
          color: task.done ? "var(--text-3)" : "var(--text-1)",
          textDecoration: task.done ? "line-through" : "none",
        }}
      >
        {task.text}
      </span>

      <span
        className="text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "var(--glass-2)", color: meta.color }}
      >
        {meta.label}
      </span>

      {/* Pin to timer */}
      {!task.done && (
        <LoadingButton
          onClick={onPin}
          title={pinned ? "Unpin from timer" : "Pin to timer"}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
          style={{
            width: 28,
            height: 28,
            color: pinned ? "var(--amber)" : "var(--text-3)",
            background: pinned ? "rgba(245,158,11,0.12)" : "transparent",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
        </LoadingButton>
      )}

      {/* Send to Kanban */}
      {!task.done && (
        <LoadingButton
          onClick={handleKanban}
          title="Send to Kanban"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg text-xs font-semibold px-2"
          style={{
            height: 28,
            color: kanbanSent ? "var(--green)" : "var(--text-3)",
            background: kanbanSent ? "var(--green-dim)" : "transparent",
            border: kanbanSent ? "1px solid var(--green-border)" : "1px solid transparent",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
          }}
        >
          {kanbanSent ? "✓ Added" : "→ Board"}
        </LoadingButton>
      )}

      <LoadingButton
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
        style={{ width: 28, height: 28, color: "var(--text-3)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,6 5,6 21,6" />
          <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
          <path d="M10,11v6" />
          <path d="M14,11v6" />
          <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
        </svg>
      </LoadingButton>
    </div>
  );
}
