// ~/luma/app/chat.tsx
// AI Чат з Naelo — з реальним контекстом користувача

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { auth } from "../lib/firebase";
import { COLORS, SIZES, CONTENT_PAD_H, CONTENT_MAX_W, isTablet } from "../lib/theme";
import BottomNav from "../lib/BottomNav";
import { logScreen, logEvent } from "../lib/analytics";
import { checkPremium } from "../lib/purchases";

const API_URL = "https://mynaelo.com/api";

type Message = { id: string; role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Як у мене справи?",
  "Я відчуваю стрес",
  "Як підвищити енергію?",
  "Що мені робити далі?",
];

export default function ChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", text: "Привіт! Я Naelo — твій особистий провідник.\nЯ бачу твій стан і готова допомогти. Про що хочеш поговорити?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [userName, setUserName] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [goal, setGoal] = useState("");
  const [energy, setEnergy] = useState("");
  const [recentCheckins, setRecentCheckins] = useState("");
  const [giversDrains, setGiversDrains] = useState("");
  const [practicesCount, setPracticesCount] = useState(0);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [aiConsentGiven, setAiConsentGiven] = useState(false);

  useEffect(() => { logScreen("Chat"); }, []);
  useEffect(() => { loadContext(); checkAiConsent(); }, []);

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

  const loadContext = async () => {
    const name = await AsyncStorage.getItem("naelo_name") || "";
    const g = await AsyncStorage.getItem("naelo_goal") || "";
    const e = await AsyncStorage.getItem("naelo_energy") || "";
    // Швидкий локальний score поки не завантажився Supabase
    const localScore = await AsyncStorage.getItem("naelo_score");
    if (localScore) setScore(parseInt(localScore, 10) || 0);
    setUserName(name); setGoal(g); setEnergy(e);

    // Завантажити опори з онбордингу
    try {
      const gRaw = await AsyncStorage.getItem("naelo_givers");
      const dRaw = await AsyncStorage.getItem("naelo_drains");
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
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || auth.currentUser?.uid;
      if (!uid) return;
      const { data: profile } = await supabase.from("profiles").select("score, streak, momentum, name, goal, energy_level").eq("id", uid).single();
      if (profile) {
        setScore(profile.score || 0); setStreak(profile.streak || 0); setMomentum(profile.momentum || 0);
        if (profile.name) setUserName(profile.name);
        if (profile.goal) setGoal(profile.goal);
        if (profile.energy_level) setEnergy(profile.energy_level);
      }

      // Контекст чекінів: Premium = 30 днів, Free = 7 днів
      const premium = await checkPremium();
      const contextDays = premium ? 30 : 7;
      const contextSince = new Date();
      contextSince.setDate(contextSince.getDate() - contextDays);
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("date, question, note, hints, energy, delta")
        .eq("user_id", uid)
        .gte("date", contextSince.toISOString().split("T")[0])
        .order("date", { ascending: false })
        .limit(premium ? 15 : 5);
      if (checkins && checkins.length > 0) {
        setRecentCheckins(checkins.map(c => {
          const hints = c.hints ? JSON.parse(c.hints).join(", ") : "";
          return `${c.date} (${c.energy}%): ${c.note || hints || "тап"}`;
        }).join(" | "));
      }

      const today = new Date().toISOString().split("T")[0];
      const { data: practices } = await supabase.from("practice_logs").select("id").eq("user_id", uid).gte("completed_at", today + "T00:00:00");
      setPracticesCount(practices?.length || 0);
    } catch (e) {}
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

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput(""); setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 сек таймаут

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, name: userName, score, goal, energy, context: buildContext(), streak, momentum, practices_today: practicesCount }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: data.reply || "Вибач, щось пішло не так" }]);
    } catch (e: any) {
      clearTimeout(timeoutId);
      const isTimeout = e?.name === "AbortError";
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        text: isTimeout
          ? "Naelo не відповідає — схоже сервер перевантажено. Спробуй ще раз через хвилину 🙏"
          : "Схоже є проблема зі з'єднанням. Перевір інтернет і спробуй ще раз",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── AI Disclosure Modal (Apple Guideline 5.1.2) ── */}
      <Modal visible={showAiConsent} transparent animationType="fade">
        <View style={styles.consentOverlay}>
          <View style={styles.consentBox}>
            <Text style={styles.consentIcon}>🤖</Text>
            <Text style={styles.consentTitle}>AI-чат Naelo</Text>
            <Text style={styles.consentBody}>
              Для відповідей Naelo використовує штучний інтелект від{" "}
              <Text style={{ color: COLORS.primary }}>Anthropic (Claude)</Text>.{"\n\n"}
              Твої повідомлення, ім'я, емоційний стан та контекст надсилаються до захищеного API Anthropic для генерації відповідей.{"\n\n"}
              Дані не використовуються для навчання AI і не передаються третім сторонам. Детальніше — у Політиці конфіденційності.
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

      {/* KAV не охоплює BottomNav — offset = висота BottomNav (~78px) */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Naelo AI</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>онлайн</Text>
            </View>
          </View>
        </View>

        <View style={styles.contextBar}>
          <Text style={styles.contextText}>
            Score: <Text style={{ color: score >= 60 ? COLORS.success : COLORS.danger }}>{score}%</Text>
            {"  "}Вогник душі
            {momentum !== 0 && (
              <Text style={{ color: momentum > 0 ? COLORS.success : COLORS.danger }}>
                {"  "}{momentum > 0 ? "↑" : "↓"}{Math.abs(momentum)}
              </Text>
            )}
            {practicesCount > 0 && (
              <Text style={{ color: COLORS.primary }}>{"  "}{practicesCount} практик</Text>
            )}
          </Text>
        </View>

        <ScrollView ref={scrollRef} style={styles.messagesList} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
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
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => sendMessage(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Запитай Naelo про свій стан..." placeholderTextColor={COLORS.textPlaceholder} value={input} onChangeText={setInput} multiline returnKeyType="send" onSubmitEditing={() => sendMessage(input)} />
          <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={() => sendMessage(input)} disabled={!input.trim() || loading}>
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* BottomNav поза KAV — залишається внизу, не впливає на клавіатуру */}
      <BottomNav active="chat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  kav: { flex: 1, marginBottom: 90 },
  header: { alignItems: "center", paddingHorizontal: CONTENT_PAD_H, paddingTop: SIZES.paddingTop, paddingBottom: 12, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },
  headerCenter: { alignItems: "center" },
  headerTitle: { color: COLORS.text, fontSize: SIZES.fontLG, fontWeight: "700" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  onlineText: { color: COLORS.success, fontSize: SIZES.fontXS },
  contextBar: { paddingHorizontal: CONTENT_PAD_H, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderFaint, backgroundColor: COLORS.cardFaint, alignItems: "center" as const },
  contextText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
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
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: CONTENT_PAD_H, paddingVertical: 12, gap: 10, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },
  input: { flex: 1, backgroundColor: COLORS.cardLighter, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 18, paddingVertical: 12, color: COLORS.text, fontSize: SIZES.fontMD, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "rgba(255,179,0,0.25)" },
  sendIcon: { color: "#000", fontSize: 20, fontWeight: "700" },
  // AI Consent
  consentOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  consentBox: { backgroundColor: COLORS.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, alignItems: "center" },
  consentIcon: { fontSize: 40, marginBottom: 12 },
  consentTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginBottom: 14, textAlign: "center" },
  consentBody: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 24 },
  consentAccept: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center", marginBottom: 10 },
  consentAcceptText: { color: "#000", fontSize: 16, fontWeight: "700" },
  consentDecline: { paddingVertical: 10, alignItems: "center" },
  consentDeclineText: { color: COLORS.textFaint, fontSize: 13 },
});
