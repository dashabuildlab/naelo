// ~/naelo-app/app/chat.tsx
// AI Чат з Naelo — з реальним контекстом та історією сесій

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";
import { COLORS, SIZES, CONTENT_PAD_H, CONTENT_MAX_W, isTablet } from "../lib/theme";
import BottomNav from "../lib/BottomNav";
import { logScreen, logEvent } from "../lib/analytics";
import { checkPremium } from "../lib/purchases";
import {
  type ChatMessage,
  type ChatSession,
  createNewSession,
  generateTitle,
  getAllSessions,
  saveSession,
  deleteSession,
  formatSessionDate,
} from "../lib/chatHistory";
import { useAppStore } from "../lib/AppContext";

const API_URL = "https://mynaelo.com/api";

const WELCOME_MSG: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Привіт! Я Naelo — твій особистий провідник.\nЯ бачу твій стан і готова допомогти. Про що хочеш поговорити?",
};

const SUGGESTIONS = [
  "Як у мене справи?",
  "Я відчуваю стрес",
  "Як підвищити енергію?",
  "Що мені робити далі?",
];

export default function ChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  // ── Повідомлення поточної сесії ──────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Поточна сесія ─────────────────────────────────────────────────────
  const [currentSession, setCurrentSession] = useState<ChatSession>(createNewSession);
  const sessionRef = useRef<ChatSession>(currentSession);

  // ── Модал з історією ─────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // ── Контекст користувача ─────────────────────────────────────────────
  const { score, setScore, userName, setUserName, streak, setStreak } = useAppStore();
  const [momentum, setMomentum] = useState(0);
  const [goal, setGoal] = useState("");
  const [energy, setEnergy] = useState("");
  const [recentCheckins, setRecentCheckins] = useState("");
  const [giversDrains, setGiversDrains] = useState("");
  const [practicesCount, setPracticesCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [aiConsentGiven, setAiConsentGiven] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => { logScreen("Chat"); }, []);
  useEffect(() => { loadContext(); checkAiConsent(); loadLastSession(); }, []);

  // ── Синхронізуємо ref щоб мати доступ у замиканнях ──────────────────
  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);

  // ── Завантажити останню сесію або відкрити нову ──────────────────────
  const loadLastSession = async () => {
    const all = await getAllSessions();
    if (all.length > 0) {
      const last = all[0];
      // Якщо остання сесія має повідомлення — відновлюємо її
      if (last.messages.length > 0) {
        setCurrentSession(last);
        setMessages([WELCOME_MSG, ...last.messages]);
        return;
      }
    }
    // Інакше — нова сесія
    const fresh = createNewSession();
    setCurrentSession(fresh);
    setMessages([WELCOME_MSG]);
  };

  // ── AI Consent ────────────────────────────────────────────────────────
  const checkAiConsent = async () => {
    const consent = await AsyncStorage.getItem("naelo_ai_consent");
    if (consent === "true") { setAiConsentGiven(true); return; }
    setShowAiConsent(true);
  };

  const acceptAiConsent = async () => {
    await AsyncStorage.setItem("naelo_ai_consent", "true");
    setAiConsentGiven(true);
    setShowAiConsent(false);
  };

  const declineAiConsent = () => {
    setShowAiConsent(false);
    router.back();
  };

  // ── Контекст профілю ─────────────────────────────────────────────────
  const loadContext = async () => {
    const g = await AsyncStorage.getItem("naelo_goal") || "";
    const e = await AsyncStorage.getItem("naelo_energy") || "";
    setGoal(g); setEnergy(e);

    try {
      const gRaw  = await AsyncStorage.getItem("naelo_givers");
      const dRaw  = await AsyncStorage.getItem("naelo_drains");
      const gtRaw = await AsyncStorage.getItem("naelo_givers_text");
      const dtRaw = await AsyncStorage.getItem("naelo_drains_text");
      const givers = gRaw ? JSON.parse(gRaw) : [];
      const drains = dRaw ? JSON.parse(dRaw) : [];
      const parts: string[] = [];
      if (givers.length > 0) parts.push(`Дає сили: ${givers.join(", ")}`);
      if (gtRaw) parts.push(`Про сили: "${gtRaw}"`);
      if (drains.length > 0) parts.push(`Забирає: ${drains.join(", ")}`);
      if (dtRaw) parts.push(`Про виснаження: "${dtRaw}"`);
      setGiversDrains(parts.join(". "));
    } catch {}

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const profileResp = await fetch(`${API_URL}/profile?user_id=${uid}`);
      const profileData = await profileResp.json();
      if (profileData.profile) {
        const profile = profileData.profile;
        setScore(profile.score || 0); setStreak(profile.streak || 0); setMomentum(profile.momentum || 0);
        if (profile.name) setUserName(profile.name);
        if (profile.goal) setGoal(profile.goal);
        if (profile.energy_level) setEnergy(profile.energy_level);
      }
      const premium = await checkPremium();
      setIsPremium(premium);
      const contextDays = premium ? 30 : 3;
      const checkinsResp = await fetch(`${API_URL}/checkins?user_id=${uid}&days=${contextDays}`);
      const checkinsData = await checkinsResp.json();
      const checkins = (checkinsData.checkins || []).slice(0, premium ? 15 : 4);
      if (checkins.length > 0) {
        setRecentCheckins(checkins.map((c: any) => {
          const hints = c.hints ? JSON.parse(c.hints).join(", ") : "";
          return `${c.date} (${c.energy}%): ${c.note || hints || "тап"}`;
        }).join(" | "));
      }
      const practicesResp = await fetch(`${API_URL}/practices/today?user_id=${uid}`);
      const practicesData = await practicesResp.json();
      setPracticesCount(practicesData.logs?.length || 0);
    } catch {}
  };

  const buildContext = () => {
    const parts: string[] = [];
    if (userName) parts.push(`Ім'я: ${userName}`);
    parts.push(`Вогник душі: ${score}/100`, `Streak: ${streak} днів`);
    if (momentum !== 0) parts.push(`Momentum: ${momentum > 0 ? "+" : ""}${momentum}`);
    if (goal) parts.push(`Мета: ${goal}`);
    if (energy) parts.push(`Рівень енергії: ${energy}`);
    if (giversDrains) parts.push(giversDrains);
    if (recentCheckins) parts.push(`Останні відповіді: ${recentCheckins}`);
    if (practicesCount > 0) parts.push(`Практик сьогодні: ${practicesCount}`);
    return parts.join("\n");
  };

  // ── Зберегти поточну сесію ────────────────────────────────────────────
  const persistSession = useCallback(async (sess: ChatSession, msgs: ChatMessage[]) => {
    // Не зберігаємо порожні сесії
    const userMsgs = msgs.filter(m => m.id !== "welcome");
    if (userMsgs.length === 0) return;
    const updated: ChatSession = {
      ...sess,
      messages: userMsgs,
      updatedAt: Date.now(),
    };
    await saveSession(updated);
    setCurrentSession(updated);
    sessionRef.current = updated;
  }, []);

  // ── Надіслати повідомлення ─────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text };
    let updatedMsgs: ChatMessage[] = [];

    setMessages((prev) => {
      // Автозаголовок — якщо перше повідомлення юзера
      const userMsgsCount = prev.filter(m => m.role === "user").length;
      if (userMsgsCount === 0 && sessionRef.current.title === "Нова розмова") {
        const title = generateTitle(text);
        setCurrentSession(s => ({ ...s, title }));
        sessionRef.current = { ...sessionRef.current, title };
      }
      updatedMsgs = [...prev, userMsg];
      return updatedMsgs;
    });
    setInput(""); setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text, name: userName, score, goal, energy,
          context: buildContext(), streak, momentum,
          practices_today: practicesCount, is_premium: isPremium,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.reply || "Вибач, щось пішло не так",
      };
      setMessages((prev) => {
        const next = [...prev, aiMsg];
        // Зберігаємо після кожної AI відповіді
        persistSession(sessionRef.current, next);
        return next;
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      const isTimeout = e?.name === "AbortError";
      const isHttpErr = e?.message?.startsWith("HTTP ");
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "assistant",
        text: isTimeout
          ? "Naelo не відповідає — сервер перевантажено. Спробуй ще раз через хвилину"
          : isHttpErr
          ? `Сервер тимчасово недоступний (${e.message}). Спробуй ще раз пізніше`
          : "Не вдалось підключитись до сервера. Перевір інтернет і спробуй ще раз",
      };
      setMessages((prev) => {
        const next = [...prev, errMsg];
        persistSession(sessionRef.current, next);
        return next;
      });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ── Новий чат ─────────────────────────────────────────────────────────
  const startNewChat = () => {
    const fresh = createNewSession();
    setCurrentSession(fresh);
    sessionRef.current = fresh;
    setMessages([WELCOME_MSG]);
    setInput("");
  };

  // ── Відкрити модал з історією ─────────────────────────────────────────
  const openHistory = async () => {
    const all = await getAllSessions();
    setSessions(all);
    setShowHistory(true);
    logEvent("chat_history_opened");
  };

  // ── Завантажити обрану сесію ──────────────────────────────────────────
  const loadSession = (sess: ChatSession) => {
    setCurrentSession(sess);
    sessionRef.current = sess;
    setMessages([WELCOME_MSG, ...sess.messages]);
    setInput("");
    setShowHistory(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  };

  // ── Видалити сесію зі списку ──────────────────────────────────────────
  const handleDeleteSession = (sess: ChatSession) => {
    Alert.alert(
      "Видалити розмову?",
      `"${sess.title}"`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити", style: "destructive",
          onPress: async () => {
            await deleteSession(sess.id);
            setSessions(prev => prev.filter(s => s.id !== sess.id));
            // Якщо видалили поточну — відкриваємо новий чат
            if (sess.id === sessionRef.current.id) startNewChat();
          },
        },
      ]
    );
  };

  const isNewChat = messages.filter(m => m.id !== "welcome").length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Меню (Нова розмова + Історія) ── */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); startNewChat(); }}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Нова розмова</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); openHistory(); }}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Історія розмов</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── AI Disclosure Modal ── */}
      <Modal visible={showAiConsent} transparent animationType="fade">
        <View style={styles.consentOverlay}>
          <View style={styles.consentBox}>
            <View style={styles.consentIconWrap}>
              <Ionicons name="sparkles-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.consentTitle}>AI-чат Naelo</Text>
            <Text style={styles.consentBody}>
              Для відповідей Naelo використовує штучний інтелект від{" "}
              <Text style={{ color: COLORS.primary }}>Anthropic (Claude)</Text>.{"\n\n"}
              Твої повідомлення, ім'я, емоційний стан та контекст надсилаються до захищеного API Anthropic для генерації відповідей.{"\n\n"}
              Дані не використовуються для навчання AI і не передаються третім сторонам.
            </Text>
            <TouchableOpacity style={styles.consentAccept} onPress={acceptAiConsent}>
              <Text style={styles.consentAcceptText}>Погоджуюсь →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.consentDecline} onPress={declineAiConsent}>
              <Text style={styles.consentDeclineText}>Не хочу використовувати AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Модал історії чатів ── */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={styles.historyOverlay}>
          <View style={styles.historySheet}>
            {/* Хедер модалу */}
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Історія розмов</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.historyClose}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Кнопка нової розмови */}
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => { setShowHistory(false); startNewChat(); }}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.newChatBtnText}>Нова розмова</Text>
            </TouchableOpacity>

            {/* Список сесій */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.sessionList}>
              {sessions.length === 0 ? (
                <Text style={styles.emptyText}>Розмов ще немає</Text>
              ) : (
                sessions.map((sess) => {
                  const lastMsg = sess.messages[sess.messages.length - 1];
                  const isActive = sess.id === currentSession.id;
                  return (
                    <TouchableOpacity
                      key={sess.id}
                      style={[styles.sessionItem, isActive && styles.sessionItemActive]}
                      onPress={() => loadSession(sess)}
                      onLongPress={() => handleDeleteSession(sess)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.sessionItemInner}>
                        <View style={styles.sessionMeta}>
                          <Text style={styles.sessionTitle} numberOfLines={1}>
                            {isActive && <Text style={{ color: COLORS.primary }}>● </Text>}
                            {sess.title}
                          </Text>
                          <Text style={styles.sessionDate}>{formatSessionDate(sess.updatedAt)}</Text>
                        </View>
                        {lastMsg && (
                          <Text style={styles.sessionPreview} numberOfLines={1}>
                            {lastMsg.role === "user" ? "Ти: " : "Naelo: "}{lastMsg.text}
                          </Text>
                        )}
                        <Text style={styles.sessionCount}>
                          {sess.messages.length} повідомл.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.sessionDeleteBtn}
                        onPress={() => handleDeleteSession(sess)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.textFaint} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Основний чат ── */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Мінімалістичний хедер: Назад + Naelo + ... (опціональне меню) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={26} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>Naelo</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Повідомлення */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
              {msg.role === "assistant" && <Text style={styles.aiLabel}>Naelo</Text>}
              <Text style={[styles.bubbleText, msg.role === "user" && styles.bubbleTextUser]}>{msg.text}</Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.bubble, styles.bubbleAI]}>
              <Text style={styles.aiLabel}>Naelo</Text>
              <View style={styles.typingRow}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.typingText}>аналізую твій стан...</Text>
              </View>
            </View>
          )}
          {isNewChat && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => sendMessage(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Поле вводу */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Запитай Naelo про свій стан..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomNav active="chat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  kav: { flex: 1, marginBottom: 90 },

  // ── Хедер ──
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: CONTENT_PAD_H,
    paddingTop: SIZES.paddingTop, paddingBottom: 12,
    maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: COLORS.text, fontSize: SIZES.fontLG, fontWeight: "600", letterSpacing: 0.4, maxWidth: 200 },

  // ── Меню (dropdown ellipsis) ──
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start" as const, alignItems: "flex-end" as const, paddingTop: SIZES.paddingTop + 56, paddingHorizontal: 12 },
  menuBox: { backgroundColor: "rgba(20,16,32,0.98)", borderRadius: 14, paddingVertical: 6, minWidth: 200, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  menuItem: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  menuItemText: { color: COLORS.text, fontSize: 15, fontWeight: "500" as const },
  menuDivider: { height: 0.5, backgroundColor: "rgba(255,255,255,0.10)", marginHorizontal: 10 },

  // ── Повідомлення ──
  messagesList: { flex: 1 },
  messages: { paddingHorizontal: CONTENT_PAD_H, paddingBottom: 20, gap: 12 },
  bubble: { maxWidth: isTablet ? 560 : "85%", padding: 14, borderRadius: 18 },
  bubbleAI: { alignSelf: "flex-start", backgroundColor: COLORS.cardLighter, borderWidth: 1, borderColor: COLORS.borderLight },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderPrimary },
  aiLabel: { color: COLORS.primary, fontSize: SIZES.fontXS, fontWeight: "600", marginBottom: 6 },
  bubbleText: { color: COLORS.textSoft, fontSize: SIZES.fontMD, lineHeight: 22 },
  bubbleTextUser: { color: COLORS.text },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { color: COLORS.textMuted, fontSize: SIZES.fontSM },
  suggestions: { gap: 8, marginTop: 8 },
  suggestionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusLarge, borderWidth: 1, borderColor: COLORS.borderPrimary, backgroundColor: COLORS.primaryFaint, alignSelf: "flex-start" },
  suggestionText: { color: "rgba(255,179,0,0.8)", fontSize: 14 },

  // ── Поле вводу ──
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: CONTENT_PAD_H, paddingVertical: 12, gap: 10, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },
  input: { flex: 1, backgroundColor: COLORS.cardLighter, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 18, paddingVertical: 12, color: COLORS.text, fontSize: SIZES.fontMD, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "rgba(255,179,0,0.25)" },
  sendIcon: { color: "#000", fontSize: 20, fontWeight: "700" },

  // ── AI Consent ──
  consentOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  consentBox: { backgroundColor: COLORS.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, alignItems: "center" },
  consentIconWrap: { marginBottom: 12, alignItems: "center" as const },
  consentTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginBottom: 14, textAlign: "center" },
  consentBody: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  consentAccept: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center", marginBottom: 10 },
  consentAcceptText: { color: "#000", fontSize: 16, fontWeight: "700" },
  consentDecline: { paddingVertical: 10, alignItems: "center" },
  consentDeclineText: { color: COLORS.textFaint, fontSize: 13 },

  // ── Модал історії ──
  historyOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  historySheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", paddingBottom: 34,
  },
  historyHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.borderFaint,
  },
  historyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  historyClose: { padding: 4 },
  newChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.borderFaint,
  },
  newChatBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  sessionList: { paddingHorizontal: 16, paddingTop: 8 },
  emptyText: { color: COLORS.textFaint, textAlign: "center", marginTop: 40, fontSize: 14 },
  sessionItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.borderFaint,
  },
  sessionItemActive: { backgroundColor: "rgba(255,179,0,0.05)", borderRadius: 12, paddingHorizontal: 8 },
  sessionItemInner: { flex: 1 },
  sessionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  sessionTitle: { color: COLORS.text, fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  sessionDate: { color: COLORS.textFaint, fontSize: 12, flexShrink: 0 },
  sessionPreview: { color: COLORS.textMuted, fontSize: 13, marginBottom: 2 },
  sessionCount: { color: COLORS.textFaint, fontSize: 11 },
  sessionDeleteBtn: { padding: 8, marginLeft: 8 },
});
