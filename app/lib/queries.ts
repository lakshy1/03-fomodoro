import { supabase } from "./supabaseClient";

type ProfileRecord = {
  name: string;
  publicId: string;
  avatarUrl: string | null;
};

type DayDatum = { date: string; minutes: number };
type LeaderboardEntry = { name: string; days: DayDatum[]; total: number };
type FriendRequestRow = {
  id: string;
  direction: "incoming" | "outgoing";
  name: string;
  publicId: string;
  createdAt: string;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

const getUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
};

// Fetch the active user and their profile row.
export async function fetchProfile(): Promise<{ userId: string; profile: ProfileRecord } | null> {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("name, public_id, avatar_url")
    .eq("id", user.id)
    .single();
  if (error || !data) {
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.email ? user.email.split("@")[0] : "User");
    await supabase.from("profiles").upsert({
      id: user.id,
      name: fallbackName,
      public_id: null,
      avatar_url: null,
    });
    return {
      userId: user.id,
      profile: { name: fallbackName, publicId: "------", avatarUrl: null },
    };
  }
  return {
    userId: user.id,
    profile: {
      name: data.name || "User",
      publicId: (data.public_id || "------").toString(),
      avatarUrl: data.avatar_url || null,
    },
  };
}

// Ensure the user has a unique 6-character public code.
export async function ensureProfilePublicId(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("public_id").eq("id", userId).single();
  if (data?.public_id) return data.public_id;
  for (let i = 0; i < 12; i++) {
    const code = makeCode();
    const { data: exists } = await supabase
      .from("profiles")
      .select("id")
      .eq("public_id", code)
      .maybeSingle();
    if (!exists) {
      await supabase.from("profiles").update({ public_id: code }).eq("id", userId);
      return code;
    }
  }
  return null;
}

// Update profile data and optionally upload a new avatar.
export async function updateProfile(
  userId: string,
  patch: { name?: string; avatar_url?: string | null; avatar_file?: File }
) {
  if (!userId) return;
  let avatarUrl = patch.avatar_url ?? undefined;
  if (patch.avatar_file) {
    const ext = patch.avatar_file.name.split(".").pop() || "png";
    const path = `avatars/${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, patch.avatar_file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }
  }
  await supabase
    .from("profiles")
    .update({
      ...(patch.name ? { name: patch.name } : {}),
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", userId);
}

// Fetch focus sessions for a date range.
export async function fetchCalendarRange(userId: string, from: string, to: string): Promise<DayDatum[]> {
  const { data } = await supabase
    .from("study_sessions")
    .select("date, minutes")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);
  return (data || []).map((d: { date: string; minutes: number }) => ({
    date: d.date,
    minutes: d.minutes || 0,
  }));
}

// Fetch leaderboard data for the user + friends for a date range.
export async function fetchLeaderboardRange(
  userId: string,
  from: string,
  to: string,
  days: string[]
): Promise<LeaderboardEntry[]> {
  const { data: friends } = await supabase.from("friends").select("friend_id").eq("user_id", userId);
  const ids = Array.from(new Set([userId, ...(friends || []).map((f: { friend_id: string }) => f.friend_id)]));
  const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", ids);
  const names = new Map((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const { data } = await supabase
    .from("study_sessions")
    .select("user_id, date, minutes")
    .in("user_id", ids)
    .gte("date", from)
    .lte("date", to);
  const byUser = new Map<string, Map<string, number>>();
  (data || []).forEach((row: { user_id: string; date: string; minutes: number }) => {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, new Map());
    const map = byUser.get(row.user_id)!;
    map.set(row.date, (map.get(row.date) || 0) + (row.minutes || 0));
  });
  const rows = ids.map((id) => {
    const map = byUser.get(id) || new Map();
    const daysData = days.map((d) => ({ date: d, minutes: map.get(d) || 0 }));
    const total = daysData.reduce((a, b) => a + b.minutes, 0);
    return {
      name: id === userId ? "You" : names.get(id) || "Friend",
      days: daysData,
      total,
    };
  });
  return rows.sort((a, b) => b.total - a.total);
}

// Fetch pending friend requests both incoming and outgoing.
export async function fetchFriendRequests(userId: string): Promise<FriendRequestRow[]> {
  const { data } = await supabase
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("status", "pending")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const ids = Array.from(
    new Set(
      (data || []).flatMap((r: { requester_id: string; addressee_id: string }) => [
        r.requester_id,
        r.addressee_id,
      ])
    )
  );
  const { data: profiles } = await supabase.from("profiles").select("id, name, public_id").in("id", ids);
  const map = new Map(
    (profiles || []).map((p: { id: string; name: string; public_id: string }) => [
      p.id,
      { name: p.name, publicId: p.public_id },
    ])
  );
  return (data || []).map((r: { id: string; requester_id: string; addressee_id: string; created_at: string }) => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const meta = map.get(otherId) || { name: "Friend", publicId: "------" };
    return {
      id: r.id,
      direction: (r.addressee_id === userId ? "incoming" : "outgoing") as "incoming" | "outgoing",
      name: meta.name,
      publicId: meta.publicId,
      createdAt: r.created_at,
    };
  });
}

// Create a friend request using a public code.
export async function createFriendRequestByCode(userId: string, code: string) {
  const normalized = code.toUpperCase();
  const { data, error } = await supabase.from("profiles").select("id").eq("public_id", normalized).single();
  if (error || !data) {
    throw new Error("No user found for that code.");
  }
  if (data.id === userId) {
    throw new Error("You cannot add yourself.");
  }
  const { data: alreadyFriends } = await supabase
    .from("friends")
    .select("id")
    .eq("user_id", userId)
    .eq("friend_id", data.id)
    .maybeSingle();
  if (alreadyFriends) {
    throw new Error("You are already friends.");
  }
  const { data: existing } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("requester_id", userId)
    .eq("addressee_id", data.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    throw new Error("Request already sent.");
  }
  const { error: insertError } = await supabase.from("friend_requests").insert({
    requester_id: userId,
    addressee_id: data.id,
    status: "pending",
    created_at: new Date().toISOString(),
  });
  if (insertError) {
    throw new Error("Unable to send request.");
  }
}

// Accept a friend request, then create a mutual friend link.
export async function acceptFriendRequest(userId: string, requestId: string) {
  const { data, error } = await supabase.from("friend_requests").select("*").eq("id", requestId).single();
  if (error || !data || data.addressee_id !== userId) {
    throw new Error("Request not found.");
  }
  const { error: updateError } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
  if (updateError) {
    throw new Error("Unable to accept request.");
  }
  const { error: insertError } = await supabase.from("friends").insert([
    { user_id: data.requester_id, friend_id: data.addressee_id },
    { user_id: data.addressee_id, friend_id: data.requester_id },
  ]);
  if (insertError) {
    throw new Error("Unable to create friend link.");
  }
}

// Decline a friend request.
export async function declineFriendRequest(userId: string, requestId: string) {
  const { data, error } = await supabase.from("friend_requests").select("*").eq("id", requestId).single();
  if (error || !data || (data.addressee_id !== userId && data.requester_id !== userId)) {
    throw new Error("Request not found.");
  }
  const { error: updateError } = await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
  if (updateError) {
    throw new Error("Unable to decline request.");
  }
}

// Sign the user out.
export async function signOutUser() {
  await supabase.auth.signOut();
}
