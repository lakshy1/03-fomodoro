"use client";

import React, { createContext, useContext, useState } from "react";
import type { ProfileRecord } from "./panels/shared";

type Theme = "dark" | "light";

interface AppContextValue {
  userId: string | null;
  profile: ProfileRecord;
  theme: Theme;
  todayFocusMinutes: number;
  setUserId: (id: string | null) => void;
  setProfile: (p: ProfileRecord) => void;
  setTheme: (t: Theme) => void;
  setTodayFocusMinutes: (m: number) => void;
}

const defaultProfile: ProfileRecord = {
  name: "",
  publicId: "",
  avatarUrl: null,
  dailyGoal: 8,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

const AppContext = createContext<AppContextValue>({
  userId: null,
  profile: defaultProfile,
  theme: "dark",
  todayFocusMinutes: 0,
  setUserId: () => {},
  setProfile: () => {},
  setTheme: () => {},
  setTodayFocusMinutes: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord>(defaultProfile);
  const [theme, setTheme] = useState<Theme>("dark");
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);

  return (
    <AppContext.Provider value={{ userId, profile, theme, todayFocusMinutes, setUserId, setProfile, setTheme, setTodayFocusMinutes }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
