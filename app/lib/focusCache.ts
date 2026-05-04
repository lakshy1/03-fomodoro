"use client";

const FOCUS_CACHE_KEY = "fomodoro_focus_cache_v1";

type FocusCache = Record<string, number>;

function getCacheKey(userId?: string | null): string {
  return userId ? `${FOCUS_CACHE_KEY}_${userId}` : FOCUS_CACHE_KEY;
}

function readCache(userId?: string | null): FocusCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FocusCache;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: FocusCache, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(cache));
  } catch {
    // ignore local cache write failures
  }
}

export function getCachedFocusMinutes(date: string, userId?: string | null): number {
  return readCache(userId)[date] || 0;
}

export function addCachedFocusMinutes(date: string, minutes: number, userId?: string | null): number {
  if (!date || !Number.isFinite(minutes) || minutes === 0) {
    return getCachedFocusMinutes(date, userId);
  }
  const cache = readCache(userId);
  const next = Math.max(0, (cache[date] || 0) + minutes);
  if (next === 0) {
    delete cache[date];
  } else {
    cache[date] = next;
  }
  writeCache(cache, userId);
  return next;
}

export function getCachedFocusMap(userId?: string | null): FocusCache {
  return readCache(userId);
}

export function mergeCachedFocusIntoDays(
  days: { date: string; minutes: number }[],
  cache: FocusCache
): { date: string; minutes: number }[] {
  return days.map((day) => ({
    date: day.date,
    minutes: day.minutes + (cache[day.date] || 0),
  }));
}
