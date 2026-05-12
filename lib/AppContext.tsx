// ~/naelo-app/lib/AppContext.tsx
// Глобальний стор — score, userName, streak синхронні між усіма екранами

import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AppCtx = {
  score:        number;
  setScore:     (v: number) => void;
  userName:     string;
  setUserName:  (v: string) => void;
  streak:       number;
  setStreak:    (v: number) => void;
};

const AppContext = createContext<AppCtx>({
  score: 50,       setScore:    () => {},
  userName: "",    setUserName: () => {},
  streak: 0,       setStreak:   () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [score,    _setScore]    = useState(50);
  const [userName, _setUserName] = useState("");
  const [streak,   _setStreak]   = useState(0);

  // Завантажуємо з AsyncStorage один раз при старті
  useEffect(() => {
    AsyncStorage.multiGet(["naelo_score", "naelo_name"]).then((pairs) => {
      const s = pairs[0][1];
      const n = pairs[1][1];
      if (s) _setScore(parseInt(s, 10) || 50);
      if (n) _setUserName(n);
    }).catch(() => {});
  }, []);

  // Сеттери — оновлюють стан І AsyncStorage одночасно
  const setScore = (v: number) => {
    _setScore(v);
    AsyncStorage.setItem("naelo_score", String(v)).catch(() => {});
  };

  const setUserName = (v: string) => {
    _setUserName(v);
    AsyncStorage.setItem("naelo_name", v).catch(() => {});
  };

  const setStreak = (v: number) => {
    _setStreak(v);
  };

  return (
    <AppContext.Provider value={{ score, setScore, userName, setUserName, streak, setStreak }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppStore = () => useContext(AppContext);
