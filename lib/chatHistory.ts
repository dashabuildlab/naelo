// ~/naelo-app/lib/chatHistory.ts
// Управління історією чатів — зберігання сесій в AsyncStorage

import AsyncStorage from "@react-native-async-storage/async-storage";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "naelo_chat_sessions";
const MAX_SESSIONS = 30;

// ── Генерувати id ────────────────────────────────────────────────────
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Генерувати заголовок із першого повідомлення ─────────────────────
export function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\n/g, " ");
  return cleaned.length > 42 ? cleaned.slice(0, 40) + "…" : cleaned;
}

// ── Нова порожня сесія ────────────────────────────────────────────────
export function createNewSession(): ChatSession {
  const now = Date.now();
  return {
    id: generateSessionId(),
    title: "Нова розмова",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Зчитати всі сесії (відсортовані: нові першими) ───────────────────
export async function getAllSessions(): Promise<ChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: ChatSession[] = JSON.parse(raw);
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

// ── Зберегти / оновити сесію ──────────────────────────────────────────
export async function saveSession(session: ChatSession): Promise<void> {
  try {
    const all = await getAllSessions();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      all[idx] = session;
    } else {
      all.unshift(session);
    }
    // Обрізаємо до MAX_SESSIONS (видаляємо найстаріші)
    const trimmed = all
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ── Видалити сесію ────────────────────────────────────────────────────
export async function deleteSession(id: string): Promise<void> {
  try {
    const all = await getAllSessions();
    const filtered = all.filter((s) => s.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

// ── Форматувати дату для списку ───────────────────────────────────────
export function formatSessionDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const min  = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);

  if (min < 1)   return "щойно";
  if (min < 60)  return `${min} хв тому`;
  if (hour < 24) return `${hour} год тому`;
  if (day === 1) return "вчора";
  if (day < 7)   return `${day} дні тому`;

  const d = new Date(ts);
  const months = ["січ","лют","бер","кві","тра","чер","лип","сер","вер","жов","лис","гру"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
