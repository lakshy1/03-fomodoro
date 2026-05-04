"use client";

const HIDDEN_FRIENDS_KEY = "fomodoro_hidden_friends_v1";

type HiddenFriendMap = Record<string, string[]>;

function getKey(userId?: string | null): string {
  return userId ? `${HIDDEN_FRIENDS_KEY}_${userId}` : HIDDEN_FRIENDS_KEY;
}

function readHiddenMap(userId?: string | null): HiddenFriendMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HiddenFriendMap;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeHiddenMap(map: HiddenFriendMap, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(userId), JSON.stringify(map));
  } catch {
    // ignore local cache write failures
  }
}

export function getHiddenFriendIds(userId?: string | null): string[] {
  const map = readHiddenMap(userId);
  return Object.values(map).flat();
}

export function hideFriendLocally(userId: string | null | undefined, friendId: string): void {
  if (!userId || !friendId) return;
  const map = readHiddenMap(userId);
  const bucket = map.hidden || [];
  if (!bucket.includes(friendId)) {
    map.hidden = [...bucket, friendId];
    writeHiddenMap(map, userId);
  }
}

export function unhideFriendLocally(userId: string | null | undefined, friendId: string): void {
  if (!userId || !friendId) return;
  const map = readHiddenMap(userId);
  const bucket = (map.hidden || []).filter((id) => id !== friendId);
  if (bucket.length) {
    map.hidden = bucket;
  } else {
    delete map.hidden;
  }
  writeHiddenMap(map, userId);
}

export function filterHiddenFriends<T extends { id: string }>(
  friends: T[],
  userId?: string | null
): T[] {
  const hidden = new Set(getHiddenFriendIds(userId));
  if (!hidden.size) return friends;
  return friends.filter((friend) => !hidden.has(friend.id));
}

