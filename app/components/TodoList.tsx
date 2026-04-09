"use client";

import { useState, useEffect, useRef } from "react";
import LoadingButton from "./LoadingButton";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("studylin_tasks");
      if (saved) setTasks(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem("studylin_tasks", JSON.stringify(tasks));
  }, [tasks]);

  function addTask() {
    const text = input.trim();
    if (!text) return;
    setTasks((t) => [
      { id: uid(), text, done: false, priority, createdAt: Date.now() },
      ...t,
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  function toggleTask(id: string) {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function deleteTask(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
  }

  function clearDone() {
    setTasks((t) => t.filter((x) => !x.done));
  }

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const activeCount = tasks.length - doneCount;

  return (
    <div className="fade-in flex flex-col gap-5 w-full max-w-xl mx-auto py-4">
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
      <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
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
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = PRIORITY_META[task.priority];

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
      style={{
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border)",
        opacity: task.done ? 0.55 : 1,
      }}
    >
      {/* Priority dot */}
      <div
        className="w-1.5 rounded-full flex-shrink-0 self-stretch"
        style={{ background: meta.dot, opacity: task.done ? 0.4 : 0.8 }}
      />

      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        className="flex-shrink-0"
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
