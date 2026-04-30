// ~/luma/app/chat.tsx
// AI Чат з Naelo — з реальним контекстом користувача

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { COLORS, SIZES } from "../lib/theme";
import BottomNav from "../lib/BottomNav";

const API_URL = "https://mynaelo.com/api";

type Message = { id: string; role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Як у мене справи? 📊",
  "Я відчуваю стрес 😟",
  "Як підвищити енергію? ⚡",
  "Що мені робити далі? 🧠",
];

export default function ChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", text: "Привіт! Я Naelo — твій особистий провідник ✨\nЯ бачу твій стан і готова допомогти. Про що хочеш поговорити?" },
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

  useEffect(() => { loadContext(); }, []);

  const loadContext = async () => {
    const name = await AsyncStorage.getItem("naelo_name") || "";
    const g = await AsyncStorage.getItem("naelo_goal") || "";
    const e = await AsyncStorage.getItem("naelo_energy") || "";
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
      if (!session?.user?.id) return;
      const uid = session.user.id;
      const { data: profile } = await supabase.from("profiles").select("score, streak, momentum, name, goal, energy_level").eq("id", uid).single();
      if (profile) {
        setScore(profile.score || 0); setStreak(profile.streak || 0); setMomentum(profile.momentum || 0);
        if (profile.name) setUserName(profile.name);
        if (profile.goal) setGoal(profile.goal);
        if (profile.energy_level) setEnergy(profile.energy_level);
      }

      // Останні 5 чекінів замість звичок
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("date, question, note, hints, energy, delta")
        .eq("user_id", uid)
        .order("date", { ascending: false })
        .limit(5);
      if (checkins && checkins.length > 0) {
        setRecentCheckins(checkins.map(c => {
          const hints = c.hints ? JSON.parse(c.hints).join(", ") : "";
          return `${c.date} (⚡${c.energy}): ${c.note || hints || "тап"}`;
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
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, name: userName, score, goal, energy, context: buildContext(), streak, momentum, practices_today: practicesCount }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: data.reply || "Вибач, щось пішло не так 🙏" }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: "Схоже є проблема зі з'єднанням. Спробуй ще раз 🙏" }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/home")}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>✨ Naelo AI</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>онлайн</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
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
          {practicesCount > 0 && `  ⚡${practicesCount}`}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
            {msg.role === "assistant" && <Text style={styles.aiLabel}>Naelo ✨</Text>}
            <Text style={[styles.bubbleText, msg.role === "user" && styles.bubbleTextUser]}>{msg.text}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.aiLabel}>Naelo ✨</Text>
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
      <BottomNav active="chat" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SIZES.paddingH, paddingTop: SIZES.paddingTop, paddingBottom: 12 },
  back: { color: COLORS.primary, fontSize: 24 },
  headerCenter: { alignItems: "center" },
  headerTitle: { color: COLORS.text, fontSize: SIZES.fontLG, fontWeight: "700" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  onlineText: { color: COLORS.success, fontSize: SIZES.fontXS },
  contextBar: { paddingHorizontal: SIZES.paddingH, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderFaint, backgroundColor: COLORS.cardFaint },
  contextText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
  messages: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  bubble: { maxWidth: "85%", padding: 14, borderRadius: 18 },
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
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 78, gap: 10, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight },
  input: { flex: 1, backgroundColor: COLORS.cardLighter, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 18, paddingVertical: 12, color: COLORS.text, fontSize: SIZES.fontMD, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "rgba(255,179,0,0.25)" },
  sendIcon: { color: "#000", fontSize: 20, fontWeight: "700" },
});
