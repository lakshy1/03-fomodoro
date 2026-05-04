"use client";

import { useMemo, useState } from "react";
import LoadingButton from "../LoadingButton";
import { SkeletonCard, type FriendRecord, type FriendRequest } from "./shared";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "F";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const imageStyle = avatarUrl
    ? {
        backgroundImage: `url(${avatarUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(6,182,212,0.9))",
        color: "white",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.06em",
        boxShadow: "0 8px 18px rgba(99,102,241,0.22)",
        ...imageStyle,
      }}
    >
      {avatarUrl ? null : initials(name)}
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--glass-border)",
        background: "var(--glass-1)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

export function FriendsPanel({
  friends,
  requests,
  loadingFriends,
  loadingRequests,
  onSend,
  onRemoveFriend,
  onAccept,
  onDecline,
}: {
  friends: FriendRecord[];
  requests: FriendRequest[];
  loadingFriends: boolean;
  loadingRequests: boolean;
  onSend: (code: string) => Promise<void> | void;
  onRemoveFriend: (id: string) => Promise<void> | void;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const incomingRequests = useMemo(() => requests.filter((r) => r.direction === "incoming"), [requests]);
  const outgoingRequests = useMemo(() => requests.filter((r) => r.direction === "outgoing"), [requests]);

  const stats = [
    { label: "Friends", value: friends.length, accent: "var(--green)" },
    { label: "Incoming", value: incomingRequests.length, accent: "#f59e0b" },
    { label: "Outgoing", value: outgoingRequests.length, accent: "var(--accent)" },
  ];

  return (
    <div className="fade-in flex flex-col gap-5 w-full h-full min-h-0">
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          border: "1px solid var(--glass-border)",
          background:
            "radial-gradient(120% 120% at 0% 0%, rgba(99,102,241,0.22), transparent 52%), radial-gradient(120% 120% at 100% 0%, rgba(6,182,212,0.16), transparent 48%), var(--glass-1)",
          padding: 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent-text)" }}>
            Friends
          </div>
          <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: "-0.03em", color: "var(--text-1)" }}>
            Manage your circle in one place
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 760, lineHeight: 1.6 }}>
            Send a request, review pending invites, and keep your active connections tidy without bouncing between screens.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {stats.map((stat) => (
            <StatChip key={stat.label} label={stat.label} value={stat.value} accent={stat.accent} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              flex: "1 1 320px",
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: 10,
              borderRadius: 16,
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent-text)",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Send Request
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter friend code"
                spellCheck={false}
                autoComplete="off"
                style={{
                  width: "100%",
                  marginTop: 6,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--text-1)",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                }}
              />
            </div>
            <LoadingButton
              loading={sending}
              onClick={async () => {
                if (!code.trim()) return;
                setSending(true);
                try {
                  await onSend(code.trim());
                  setCode("");
                } finally {
                  setSending(false);
                }
              }}
              style={{
                minWidth: 136,
                borderRadius: 14,
                border: "1px solid var(--accent-border)",
                background: "linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)",
                color: "white",
                fontWeight: 700,
                padding: "12px 16px",
                boxShadow: "0 14px 30px rgba(99,102,241,0.24)",
              }}
            >
              Send Request
            </LoadingButton>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 16,
        }}
      >
        <section
          style={{
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 24,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)" }}>Existing Friends</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Remove any connection you no longer need.</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {friends.length} total
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingFriends ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            ) : friends.length ? (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid var(--glass-border)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Avatar name={friend.name} avatarUrl={friend.avatarUrl} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {friend.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {friend.publicId}
                      </div>
                    </div>
                  </div>

                  <LoadingButton
                    loading={busyId === friend.id}
                    onClick={async () => {
                      setBusyId(friend.id);
                      try {
                        await onRemoveFriend(friend.id);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    title="Remove friend"
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(239,68,68,0.24)",
                      background: "rgba(239,68,68,0.10)",
                      color: "#f87171",
                      padding: "10px 12px",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Remove
                  </LoadingButton>
                </div>
              ))
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  border: "1px dashed var(--glass-border)",
                  color: "var(--text-3)",
                  background: "rgba(255,255,255,0.02)",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No friends yet. Send your first request above.
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 24,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)" }}>Pending Requests</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Accept incoming invites or clear old outgoing ones.</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {requests.length} total
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {loadingRequests ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            ) : requests.length ? (
              requests.map((req) => {
                const incoming = req.direction === "incoming";
                return (
                  <div
                    key={req.id}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      border: `1px solid ${incoming ? "rgba(245,158,11,0.22)" : "var(--glass-border)"}`,
                      background: incoming ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <Avatar name={req.name} avatarUrl={null} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{req.name}</div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              padding: "5px 8px",
                              borderRadius: 999,
                              background: incoming ? "rgba(245,158,11,0.14)" : "rgba(99,102,241,0.14)",
                              color: incoming ? "#fbbf24" : "var(--accent-text)",
                            }}
                          >
                            {incoming ? "Incoming" : "Outgoing"}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{req.publicId}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {incoming ? (
                        <>
                          <LoadingButton
                            loading={busyId === req.id}
                            onClick={async () => {
                              setBusyId(req.id);
                              try {
                                await onDecline(req.id);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid rgba(239,68,68,0.24)",
                              background: "rgba(239,68,68,0.10)",
                              color: "#f87171",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            Decline
                          </LoadingButton>
                          <LoadingButton
                            loading={busyId === req.id}
                            onClick={async () => {
                              setBusyId(req.id);
                              try {
                                await onAccept(req.id);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid var(--green-border)",
                              background: "linear-gradient(135deg, rgba(16,185,129,0.22), rgba(16,185,129,0.12))",
                              color: "var(--green)",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            Accept
                          </LoadingButton>
                        </>
                      ) : (
                        <LoadingButton
                          loading={busyId === req.id}
                          onClick={async () => {
                            setBusyId(req.id);
                            try {
                              await onDecline(req.id);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid var(--glass-border)",
                            background: "rgba(255,255,255,0.03)",
                            color: "var(--text-2)",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          Cancel Request
                        </LoadingButton>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  border: "1px dashed var(--glass-border)",
                  color: "var(--text-3)",
                  background: "rgba(255,255,255,0.02)",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No pending requests. You&apos;re all caught up.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
