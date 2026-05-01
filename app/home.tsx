// ~/luma/app/home.tsx
// Головний екран — Вогник душі + питання дня + порада Naelo

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Image, Keyboard,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { auth } from "../lib/firebase";
import { COLORS, SIZES, SHARED, scoreColor, CONTENT_PAD_H, CONTENT_MAX_W, isTablet } from "../lib/theme";
import BottomNav from "../lib/BottomNav";
import KeyboardScreen from "../lib/KeyboardScreen";
import { Ionicons } from "@expo/vector-icons";
import { logScreen, logEvent } from "../lib/analytics";

const { width, height } = Dimensions.get("window");

// --- Світлячки ---
const SPARKS = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  x: width * 0.15 + Math.random() * width * 0.7,
  y: height * 0.08 + Math.random() * height * 0.35,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 3000,
  duration: Math.random() * 2000 + 1500,
}));

const Spark = ({ x, y, size, delay, duration }: typeof SPARKS[0]) => {
  const anim = useRef(new Animated.Value(0)).current;
  const moveY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      anim.setValue(0); moveY.setValue(0);
      setTimeout(() => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: duration / 2, useNativeDriver: true }),
          ]),
          Animated.timing(moveY, { toValue: -25, duration, useNativeDriver: true }),
        ]).start(loop);
      }, delay);
    };
    loop();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: size,
      backgroundColor: COLORS.spark,
      opacity: anim,
      transform: [{ translateY: moveY }],
    }} />
  );
};

// --- Питання дня (ротація) ---
const DAILY_QUESTIONS = [
  { q: "Як пройшов твій день?", placeholder: "Розкажи що сталося...", hints: ["Добре", "Так собі", "Важко", "Супер"] },
  { q: "Що сьогодні дало тобі сили?", placeholder: "Що тебе зарядило...", hints: ["Прогулянка", "Кава", "Музика", "Друзі"] },
  { q: "Що забрало енергію?", placeholder: "Що виснажило...", hints: ["Соцмережі", "Конфлікт", "Робота", "Недосип"] },
  { q: "Що хочеш змінити завтра?", placeholder: "Одна маленька зміна...", hints: ["Раніше встати", "Менше телефону", "Погуляти", "Помедитувати"] },
  { q: "Хто сьогодні був поруч?", placeholder: "Розкажи про людей навколо...", hints: ["Кохана людина", "Друзі", "Сім'я", "Улюбленець"] },
  { q: "Як ти спав?", placeholder: "Розкажи про свій сон...", hints: ["Чудово", "Нормально", "Погано", "Мало"] },
  { q: "Що тебе здивувало цього тижня?", placeholder: "Щось несподіване...", hints: ["Приємне", "Дивне", "Відкриття", "Зустріч"] },
];

// --- Поради (поки статичні, потім AI) ---
type Advice = { icon: string; text: string };
const getAdvice = (score: number, userName: string): Advice => {
  if (score >= 75) return { icon: "flame",         text: `${userName}, твій вогник палає! Так тримати` };
  if (score >= 55) return { icon: "bulb-outline",  text: `Вогник стабільний. Одна маленька дія — і буде яскравіше` };
  if (score >= 35) return { icon: "leaf-outline",  text: `Вогник трохи притух. Зроби сьогодні щось лише для себе` };
  return           { icon: "heart-outline",        text: `Я поруч. Розкажи що відбувається — разом розпалимо` };
};

export default function HomeScreen() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [score, setScore] = useState(50);
  const [streak, setStreak] = useState(0);
  const [answeredToday, setAnsweredToday] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [scoreChange, setScoreChange] = useState(0);

  // Анімації сфери
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const glow2 = useRef(new Animated.Value(0.2)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const glow3 = useRef(new Animated.Value(0.15)).current;
  const glowCore = useRef(new Animated.Value(0.5)).current;
  const thankYouAnim = useRef(new Animated.Value(0)).current;

  // Питання дня (ротація по даті)
  const todayIndex = new Date().getDate() % DAILY_QUESTIONS.length;
  const dailyQ = DAILY_QUESTIONS[todayIndex];

  useEffect(() => { logScreen("Home"); }, []);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      const name = await AsyncStorage.getItem("naelo_name");
      if (name) setUserName(name);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id || auth.currentUser?.uid;
        if (uid) {

          const { data: profile } = await supabase
            .from("profiles")
            .select("score, name, streak")
            .eq("id", uid)
            .single();

          if (profile) {
            setScore(profile.score || 50);
            setStreak(profile.streak || 0);
            if (profile.name) setUserName(profile.name);
          }

          // Перевірити чи є відповідь сьогодні
          const today = new Date().toISOString().split("T")[0];
          const { data: checkin } = await supabase
            .from("daily_checkins")
            .select("id")
            .eq("user_id", uid)
            .eq("date", today)
            .maybeSingle();
          setAnsweredToday(!!checkin);

          // Синхронізувати дані онбордингу в профіль (один раз)
          if (profile && !profile.score) {
            const goalRaw = await AsyncStorage.getItem("naelo_goal");
            const scoreRaw = await AsyncStorage.getItem("naelo_score");
            const drainsRaw = await AsyncStorage.getItem("naelo_drains");
            const drainsTextRaw = await AsyncStorage.getItem("naelo_drains_text");
            const concernsRaw = await AsyncStorage.getItem("naelo_concerns");
            const concernsTextRaw = await AsyncStorage.getItem("naelo_concerns_text");
            const giversTextRaw = await AsyncStorage.getItem("naelo_givers_text");
            const giversRaw = await AsyncStorage.getItem("naelo_givers");
            await supabase.from("profiles").update({
              goal: goalRaw || "",
              energy_drains: drainsRaw || "[]",
              drains_text: drainsTextRaw || "",
              concerns: concernsRaw || "[]",
              concerns_text: concernsTextRaw || "",
              givers_text: giversTextRaw || "",
              energy_givers: giversRaw || "[]",
              score: scoreRaw ? Number(scoreRaw) : 50,
            }).eq("id", uid);
          }
        } else {
          const savedScore = await AsyncStorage.getItem("naelo_score");
          if (savedScore) setScore(Number(savedScore));
        }
      } catch (e) {}
    };
    load();
  }, []));

  // Анімації сфери
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 2500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 2500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse2, { toValue: 1.12, duration: 3200, useNativeDriver: true }),
      Animated.timing(pulse2, { toValue: 1.0, duration: 3200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow2, { toValue: 0.6, duration: 2800, useNativeDriver: true }),
      Animated.timing(glow2, { toValue: 0.1, duration: 2800, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse3, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
      Animated.timing(pulse3, { toValue: 1.0, duration: 4000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow3, { toValue: 0.45, duration: 3500, useNativeDriver: true }),
      Animated.timing(glow3, { toValue: 0.08, duration: 3500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowCore, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(glowCore, { toValue: 0.4, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);

  const API_URL = "https://mynaelo.com/api";

  // --- Оцінити відповідь → змінити score ---
  const insertHint = (hint: string) => {
    const separator = answerText.trim() ? ", " : "";
    setAnswerText(prev => prev.trim() + separator + hint);
  };

  // Keyword-based fallback
  const evaluateLocal = (text: string): number => {
    const positive = ["добре", "супер", "чудово", "гуляв", "друзі", "кава", "музика", "кохан", "радість", "сміх", "відпочи", "прогулянк", "йога", "природ", "приємн"];
    const negative = ["важко", "стрес", "конфлікт", "погано", "втом", "недосип", "тривога", "самот", "злість", "сварк", "соцмереж"];
    const lower = text.toLowerCase();
    let delta = 0;
    positive.forEach(w => { if (lower.includes(w)) delta += 3; });
    negative.forEach(w => { if (lower.includes(w)) delta -= 3; });
    if (text.trim().length > 20) delta += 2;
    if (delta === 0 && text.trim()) delta = 2;
    return Math.max(-15, Math.min(15, delta));
  };

  // --- Зберегти відповідь ---
  const submitAnswer = async () => {
    if (!answerText.trim()) return;
    Keyboard.dismiss();

    // Спочатку показати результат з локальним розрахунком, потім оновити AI
    const localDelta = evaluateLocal(answerText);
    const newScore = Math.max(5, Math.min(95, score + localDelta));
    setScoreChange(localDelta);
    setScore(newScore);
    setAnsweredToday(true);
    setShowThankYou(true);
    logEvent("checkin_submit", { text_length: answerText.trim().length });

    Animated.sequence([
      Animated.timing(thankYouAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(thankYouAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowThankYou(false));

    // AI оцінка асинхронно
    let delta = localDelta;
    try {
      const evalRes = await fetch(`${API_URL}/ai/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answerText.trim(), question: dailyQ.q }),
      });
      const evalJson = await evalRes.json();
      if (typeof evalJson.delta === "number") {
        delta = evalJson.delta;
        const aiScore = Math.max(5, Math.min(95, score + delta));
        setScore(aiScore);
        setScoreChange(delta);
      }
    } catch (e) { /* fallback до local */ }

    const finalScore = Math.max(5, Math.min(95, score + delta));

    // Оновити UI з фінальним score
    setScore(finalScore);
    setScoreChange(delta);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const uid = session.user.id;
        const today = new Date().toISOString().split("T")[0];

        // Зберегти чекін
        await supabase.from("daily_checkins").upsert({
          user_id: uid,
          date: today,
          note: answerText.trim() || null,
          hints: null,
          question: dailyQ.q,
          energy: finalScore,
          delta,
        }, { onConflict: "user_id,date" });

        // Розрахувати streak автоматично
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const { data: profile } = await supabase
          .from("profiles")
          .select("streak, last_activity")
          .eq("id", uid)
          .single();

        let newStreak = 1;
        if (profile) {
          const lastActivity = profile.last_activity
            ? new Date(profile.last_activity).toISOString().split("T")[0]
            : null;
          if (lastActivity === yesterdayStr) {
            newStreak = (profile.streak || 0) + 1;
          } else if (lastActivity === today) {
            newStreak = profile.streak || 1;
          }
        }

        await supabase.from("profiles").update({
          score: finalScore,
          streak: newStreak,
          momentum: delta,
          last_activity: new Date().toISOString(),
        }).eq("id", uid);
      }
    } catch (e) {}

    setAnswerText("");
  };

  // --- Динамічний фон ---
  const BG_LEVELS = [
    require("../assets/screens/home-1.jpg"),
    require("../assets/screens/home-2.jpg"),
    require("../assets/screens/home-3.jpg"),
    require("../assets/screens/home-4.jpg"),
  ];
  const bgIndex = score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
  const advice = getAdvice(score, userName || "друже");

  return (
    <KeyboardScreen style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Image source={BG_LEVELS[bgIndex]} style={styles.absoluteBg} resizeMode="cover" />

      {SPARKS.map((s) => <Spark key={s.id} {...s} />)}

      <Animated.View style={[styles.glowCore, { opacity: glowCore }]} />
      <Animated.View style={[styles.pulseRing1, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />
      <Animated.View style={[styles.pulseRing2, { opacity: glow2, transform: [{ scale: pulse2 }] }]} />
      <Animated.View style={[styles.pulseRing3, { opacity: glow3, transform: [{ scale: pulse3 }] }]} />

      <TouchableOpacity style={styles.sphereTap} activeOpacity={0.8} onPress={() => router.push("/chat")} />

      {/* Хедер */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Привіт, {userName || "друже"}</Text>
        <TouchableOpacity style={styles.premiumBtn} onPress={() => router.push("/paywall")} activeOpacity={0.8}>
          <Ionicons name="diamond" size={16} color={COLORS.primary} />
          <Text style={styles.premiumBtnText}>Premium</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
        {/* Простір для сфери */}
        <View style={{ height: height * 0.22 }} />

        {/* Вогник душі */}
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>Вогник душі</Text>
          <Text style={[styles.scoreValue, { color: scoreColor(score) }]}>{score}%</Text>
          {streak > 0 && (
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={14} color={COLORS.primary} />
              <Text style={styles.streakText}>{streak} {streak === 1 ? "день" : streak < 5 ? "дні" : "днів"} поспіль</Text>
            </View>
          )}
        </View>

        {/* Порада Naelo */}
        <View style={styles.adviceCard}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Ionicons name={advice.icon as any} size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.adviceText, { flex: 1 }]}>{advice.text}</Text>
          </View>
        </View>

        {/* Анімація подяки */}
        {showThankYou && (
          <Animated.View style={[styles.thankYouCard, { opacity: thankYouAnim }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name={scoreChange >= 0 ? "flame" : "heart-outline"} size={16} color={scoreChange >= 0 ? COLORS.primary : COLORS.danger} />
              <Text style={styles.thankYouText}>
                Вогник {scoreChange >= 0 ? "спалахнув" : "почув тебе"}{scoreChange !== 0 ? ` (${scoreChange > 0 ? "+" : ""}${scoreChange})` : ""}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Питання дня */}
        {!answeredToday ? (
          <View style={styles.questionCard}>
            <Text style={styles.questionTitle}>{dailyQ.q}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.questionInput}
                placeholder={dailyQ.placeholder}
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={answerText}
                onChangeText={setAnswerText}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !answerText.trim() && styles.sendBtnDisabled]}
                onPress={submitAnswer}
                disabled={!answerText.trim()}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hintsRow}>
              {dailyQ.hints.map((h) => (
                <TouchableOpacity key={h} style={styles.hintChip} onPress={() => insertHint(h)}>
                  <Text style={styles.hintText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.answeredCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.answeredTitle}>Ти вже відповів сьогодні</Text>
            </View>
            <Text style={styles.answeredSub}>Завтра Naelo запитає щось нове</Text>
            <TouchableOpacity style={styles.chatBtn} onPress={() => router.push("/chat")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                <Text style={styles.chatBtnText}>Поговорити з Naelo</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav active="home" />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  absoluteBg: { position: "absolute", top: 0, left: 0, width, height: width * 1.16 },

  // Сфера
  glowCore: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.glow, top: height * 0.248 + 17 - 20, left: (width - 40) / 2 + width * 0.01 },
  sphereTap: { position: "absolute", top: height * 0.248 + 17 - 110, left: (width - 220) / 2, width: 220, height: 220, alignItems: "center", justifyContent: "center", zIndex: 10 },
  pulseRing1: { position: "absolute", width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, borderColor: COLORS.ring1, top: height * 0.248 + 17 - 35, left: (width - 70) / 2 + width * 0.01 },
  pulseRing2: { position: "absolute", width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: COLORS.ring2, top: height * 0.248 + 17 - 65, left: (width - 130) / 2 + width * 0.01 },
  pulseRing3: { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 0.8, borderColor: COLORS.ring3, top: height * 0.248 + 17 - 100, left: (width - 200) / 2 + width * 0.01 },

  // Хедер
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: SIZES.paddingTop, paddingBottom: 8, zIndex: 10 },
  headerTitle: { color: COLORS.text, fontSize: SIZES.fontLG, fontWeight: "600", letterSpacing: 0.3, flex: 1 },
  premiumBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,179,0,0.12)", borderWidth: 1, borderColor: "rgba(255,179,0,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  premiumBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  // Скрол
  scroll: { flex: 1 },
  scrollInner: { alignItems: "center", paddingHorizontal: CONTENT_PAD_H },

  // Вогник душі
  scoreBlock: { alignItems: "center", marginBottom: 16 },
  scoreLabel: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600", letterSpacing: 1.5, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, overflow: "hidden", marginBottom: 4 },
  scoreValue: { fontSize: 52, fontWeight: "800", letterSpacing: 1 },
  streakRow: { marginTop: 4 },
  streakText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  // Порада
  adviceCard: { width: "100%", maxWidth: CONTENT_MAX_W, paddingVertical: 12, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: "rgba(255,179,0,0.08)", borderWidth: 1, borderColor: "rgba(255,179,0,0.15)", marginBottom: 16 },
  adviceText: { color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Подяка
  thankYouCard: { width: "100%", paddingVertical: 10, alignItems: "center", marginBottom: 8 },
  thankYouText: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },

  // Питання дня
  questionCard: { width: "100%", maxWidth: CONTENT_MAX_W, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: SIZES.radiusLarge, padding: 20, gap: 14 },
  questionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  questionInput: { flex: 1, minHeight: 56, maxHeight: 120, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 16, lineHeight: 22 },

  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "rgba(255,255,255,0.1)" },
  sendIcon: { color: "#0a0812", fontSize: 20, fontWeight: "800" },

  hintsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hintChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  hintText: { color: "rgba(255,255,255,0.6)", fontSize: 13 },

  // Вже відповів
  answeredCard: { width: "100%", maxWidth: CONTENT_MAX_W, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: SIZES.radiusLarge, padding: 24, alignItems: "center", gap: 10 },
  answeredTitle: { color: COLORS.text, fontSize: 17, fontWeight: "600" },
  answeredSub: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  chatBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, borderRadius: SIZES.radiusLarge, borderWidth: 1, borderColor: COLORS.primaryGlow, backgroundColor: COLORS.primaryFaint },
  chatBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
});
