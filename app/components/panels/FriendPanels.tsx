"use client";

import { useState } from "react";
import LoadingButton from "../LoadingButton";
import { SkeletonCard, type FriendRequest } from "./shared";

// ─── RequestsPanel ────────────────────────────────────────────────────────────

export function RequestsPanel({
  requests,
  loading,
  onAccept,
  onDecline,
}: {
  requests: FriendRequest[];
  loading: boolean;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}) {
  const [busyIds, setBusyIds] = useState<string[]>([]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div
        style={{
          background: "var(--glass-1)", border: "1px solid var(--glass-border)",
          borderRadius: 18, padding: 20, color: "var(--text-3)",
        }}
      >
        No pending friend requests yet.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--glass-1)", border: "1px solid var(--glass-border)",
        borderRadius: 18, padding: 20,
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      {requests.map((req) => {
        const isBusy = busyIds.includes(req.id);
        return (
          <div
            key={req.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", borderRadius: 12,
              background: "var(--glass-2)", border: "1px solid var(--glass-border)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{req.name}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{req.publicId}</span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {req.direction === "incoming" ? (
                <>
                  <LoadingButton
                    compact
                    loading={isBusy}
                    onClick={async () => {
                      setBusyIds((s) => [...s, req.id]);
                      await onDecline(req.id);
                      setBusyIds((s) => s.filter((id) => id !== req.id));
                    }}
                    title="Decline"
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: "none",
                      background: "rgba(239,68,68,0.15)", color: "#ef4444",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", padding: 0, overflow: "hidden",
                    }}
                  >
                    {isBusy ? "" : "✕"}
                  </LoadingButton>
                  <LoadingButton
                    compact
                    loading={isBusy}
                    onClick={async () => {
                      setBusyIds((s) => [...s, req.id]);
                      await onAccept(req.id);
                      setBusyIds((s) => s.filter((id) => id !== req.id));
                    }}
                    title="Accept"
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: "none",
                      background: "rgba(34,197,94,0.15)", color: "#22c55e",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", padding: 0, overflow: "hidden",
                    }}
                  >
                    {isBusy ? "" : "✓"}
                  </LoadingButton>
                </>
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>Pending</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AddFriendPanel ───────────────────────────────────────────────────────────

export function AddFriendPanel({ onSend }: { onSend: (code: string) => Promise<void> | void }) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <div
      style={{
        background: "var(--glass-1)", border: "1px solid var(--glass-border)",
        borderRadius: 18, padding: 20,
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>Add a friend</div>
      <input
        placeholder="Enter friend code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        style={{
          background: "var(--glass-2)", border: "1px solid var(--glass-border)",
          borderRadius: 10, padding: "10px 12px",
          color: "var(--text-1)", outline: "none",
        }}
      />
      <LoadingButton
        loading={sending}
        onClick={async () => {
          if (!code.trim()) return;
          setSending(true);
          await onSend(code.trim());
          setCode("");
          setSending(false);
        }}
        style={{
          border: "none", borderRadius: 10,
          background: "var(--accent)", color: "white",
          padding: "10px 12px", fontWeight: 600,
          cursor: "pointer", width: "fit-content",
        }}
      >
        Send Request
      </LoadingButton>
    </div>
  );
}
