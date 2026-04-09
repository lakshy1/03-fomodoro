"use client";

import { useState, useEffect, useRef } from "react";
import LoadingButton from "./LoadingButton";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
  color: string;
}

const NOTE_COLORS = [
  { id: "default", bg: "var(--glass-1)", border: "var(--glass-border)", label: "Default" },
  { id: "indigo", bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.25)", label: "Indigo" },
  { id: "green", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)", label: "Green" },
  { id: "amber", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)", label: "Amber" },
  { id: "rose", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)", label: "Rose" },
] as const;

type ColorId = (typeof NOTE_COLORS)[number]["id"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getColor(id: ColorId) {
  return NOTE_COLORS.find((c) => c.id === id) ?? NOTE_COLORS[0];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmTop, setConfirmTop] = useState<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeDeltaX = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studylin_notes");
      if (saved) {
        const parsed: Note[] = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("studylin_notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isMobile || mobileView !== "editor") return;
    const onTouchStart = (e: TouchEvent) => {
      swipeStartX.current = e.touches[0].clientX;
      swipeDeltaX.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (swipeStartX.current === null) return;
      const current = e.touches[0].clientX;
      swipeDeltaX.current = current - swipeStartX.current;
    };
    const onTouchEnd = () => {
      if (swipeDeltaX.current > 60 && (swipeStartX.current ?? 999) <= 24) {
        setMobileView("list");
      }
      swipeStartX.current = null;
      swipeDeltaX.current = 0;
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, mobileView]);

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  function newNote() {
    const note: Note = {
      id: uid(),
      title: "",
      body: "",
      updatedAt: Date.now(),
      color: "default",
    };
    setNotes((n) => [note, ...n]);
    setActiveId(note.id);
    if (isMobile) setMobileView("editor");
    setTimeout(() => bodyRef.current?.focus(), 50);
  }

  function updateNote(id: string, patch: Partial<Note>) {
    setNotes((n) =>
      n.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x))
    );
  }

  function deleteNote(id: string) {
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    setActiveId(remaining[0]?.id ?? null);
    if (isMobile && remaining.length === 0) setMobileView("list");
  }

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase())
  );

  const wordCount = activeNote
    ? activeNote.body.trim().split(/\s+/).filter(Boolean).length
    : 0;

  function openDeleteConfirm(noteId: string, el: HTMLElement) {
    const listEl = listRef.current;
    if (listEl) {
      const itemRect = el.getBoundingClientRect();
      const listRect = listEl.getBoundingClientRect();
      const top = itemRect.top - listRect.top + listEl.scrollTop + itemRect.height / 2;
      setConfirmTop(top);
    } else {
      setConfirmTop(0);
    }
    setConfirmDeleteId(noteId);
  }

  return (
    <div className="flex gap-3 w-full" style={{ flex: 1, minHeight: 0, height: "100%", overflow: "hidden" }}>
      {/* Sidebar: note list */}
      {(!isMobile || mobileView === "list") && (
        <div
          className="flex flex-col rounded-2xl overflow-hidden shrink-0"
          style={{
            width: isMobile ? "100%" : 220,
            background: "var(--glass-1)",
            border: "1px solid var(--glass-border)",
            height: "100%",
          }}
        >
        {/* Search + new */}
        <div className="flex flex-col gap-2 p-3 border-b" style={{ borderColor: "var(--glass-border)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg px-3 py-2 text-xs bg-transparent outline-none"
            style={{
              background: "var(--glass-2)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-1)",
            }}
          />
          <LoadingButton
            onClick={newNote}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2 text-xs font-semibold transition-all duration-200"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New note
          </LoadingButton>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto relative" ref={listRef}>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <span style={{ fontSize: 28 }}>📝</span>
              <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
                No notes yet
              </p>
            </div>
          )}
          {confirmDeleteId && (
            <div
              className="absolute z-10"
              style={{
                top: Math.max(8, confirmTop - 28),
                right: 12,
                background: "rgba(16,18,32,0.98)",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: 12,
                padding: "8px 10px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
                Delete note?
              </p>
              <div className="flex items-center gap-2 mt-2">
                <LoadingButton
                  onClick={() => {
                    deleteNote(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: "rgba(239,68,68,0.18)", color: "#f87171" }}
                >
                  Delete
                </LoadingButton>
                <LoadingButton
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: "rgba(148,163,184,0.15)", color: "var(--text-2)" }}
                >
                  Cancel
                </LoadingButton>
              </div>
            </div>
          )}
          {filtered.map((note) => {
            return (
              <LoadingButton
                key={note.id}
                onClick={() => {
                  setActiveId(note.id);
                  if (isMobile) setMobileView("editor");
                  if (confirmDeleteId) setConfirmDeleteId(null);
                }}
                onTouchStart={(e) => {
                  if (!isMobile) return;
                  const target = e.currentTarget;
                  longPressRef.current = setTimeout(() => {
                    if (longPressRef.current) clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                    openDeleteConfirm(note.id, target);
                  }, 550);
                }}
                onTouchEnd={() => {
                  if (longPressRef.current) clearTimeout(longPressRef.current);
                  longPressRef.current = null;
                }}
                onTouchCancel={() => {
                  if (longPressRef.current) clearTimeout(longPressRef.current);
                  longPressRef.current = null;
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openDeleteConfirm(note.id, e.currentTarget);
                }}
                className="w-full text-left px-3 py-3 transition-all duration-150 border-b"
                style={{
                  background: activeId === note.id ? "var(--glass-2)" : "transparent",
                  borderColor: "var(--glass-border)",
                  borderLeft: activeId === note.id ? `2px solid var(--accent)` : "2px solid transparent",
                }}
              >
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--text-1)" }}
                >
                  {note.title || "Untitled"}
                </p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-3)" }}>
                  {note.body || "No content"}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)", fontSize: 10 }}>
                  {timeAgo(note.updatedAt)}
                </p>
              </LoadingButton>
            );
          })}
        </div>
      </div>
      )}

      {/* Editor */}
      {(!isMobile || mobileView === "editor") && (activeNote ? (
        <div
          className="flex-1 flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: getColor(activeNote.color as ColorId).bg,
            border: `1px solid ${getColor(activeNote.color as ColorId).border}`,
            height: "100%",
          }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
            style={{ borderColor: "var(--glass-border)" }}
          >
            {isMobile && (
              <LoadingButton
                onClick={() => setMobileView("list")}
                className="flex items-center justify-center rounded-lg"
                style={{ width: 28, height: 28, color: "var(--text-2)" }}
                title="Back"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
              </LoadingButton>
            )}
            <input
              value={activeNote.title}
              onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
              placeholder="Note title…"
              className="flex-1 bg-transparent text-sm font-semibold outline-none"
              style={{ color: "var(--text-1)" }}
            />

            {/* Color picker */}
            <div className="flex items-center gap-1">
              {NOTE_COLORS.map((c) => (
                <LoadingButton
                  key={c.id}
                  onClick={() => updateNote(activeNote.id, { color: c.id })}
                  className="rounded-full transition-all duration-150"
                  style={{
                    width: 14,
                    height: 14,
                    background: c.id === "default" ? "rgba(255,255,255,0.2)" : c.border,
                    border: activeNote.color === c.id ? "2px solid white" : "2px solid transparent",
                  }}
                  title={c.label}
                />
              ))}
            </div>

            <LoadingButton
              onClick={() => deleteNote(activeNote.id)}
              className="flex items-center justify-center rounded-lg transition-all duration-150"
              style={{ width: 28, height: 28, color: "var(--text-3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
                <path d="M10,11v6" /><path d="M14,11v6" />
                <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
              </svg>
            </LoadingButton>
          </div>

          {/* Body */}
          <textarea
            ref={bodyRef}
            value={activeNote.body}
            onChange={(e) => updateNote(activeNote.id, { body: e.target.value })}
            placeholder="Start writing… (no distractions, just you and your thoughts)"
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed px-5 py-4"
            style={{ color: "var(--text-1)", caretColor: "var(--accent)" }}
          />

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-2 border-t flex-shrink-0"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Saved automatically
            </span>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center rounded-2xl gap-4"
          style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border)" }}
        >
          <span style={{ fontSize: 40 }}>✍️</span>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            Select a note or create a new one
          </p>
          <LoadingButton
            onClick={newNote}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: "var(--accent)", color: "white" }}
          >
            New note
          </LoadingButton>
        </div>
      ))}
    </div>
  );
}

