// ~/naelo-app/app/home.tsx
// Головний екран — Вогник душі + питання дня + порада Naelo

import { useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Image, Keyboard,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { COLORS, SIZES, SHARED, scoreColor, CONTENT_PAD_H, CONTENT_MAX_W, isTablet } from "../lib/theme";
import BottomNav from "../lib/BottomNav";
import KeyboardScreen from "../lib/KeyboardScreen";
import { useAppStore } from "../lib/AppContext";
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

  const { score, setScore, userName, setUserName, streak, setStreak } = useAppStore();

  const [answeredToday, setAnsweredToday] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [scoreChange, setScoreChange] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const thankYouAnim = useRef(new Animated.Value(0)).current;

  // Питання дня (ротація по даті)
  const todayIndex = new Date().getDate() % DAILY_QUESTIONS.length;
  const dailyQ = DAILY_QUESTIONS[todayIndex];

  useEffect(() => { logScreen("Home"); }, []);

  // Надійно відстежуємо uid — onAuthStateChanged спрацьовує після відновлення сесії Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const id = user?.uid || null;
      setUserId(id);
      userIdRef.current = id;
    });
    return unsub;
  }, []);

  // Завантажуємо раз при появі auth — не при кожному переході між вкладками
  useEffect(() => {
    const load = async () => {
      // Перевірити чи є відповідь сьогодні локально
      const todayCheck = new Date().toISOString().split("T")[0];
      const answeredLocal = await AsyncStorage.getItem("naelo_answered_today");
      if (answeredLocal === todayCheck) setAnsweredToday(true);

      try {
        const uid = userIdRef.current || auth.currentUser?.uid;
        if (uid) {
          const profileResp = await fetch(`${API_URL}/profile?user_id=${uid}`);
          const profileData = await profileResp.json();
          const profile = profileData.profile;

          if (profile) {
            // DB — джерело правди для score (актуальний стан між девайсами).
            // ВАЖЛИВО: НЕ використовуємо Math.max(profile.score, score) — інакше
            // зменшення score (напр. -3 від драйнера) могло б зреверитись назад
            // на стару (більшу) DB-копію якщо PATCH ще не пройшов до повторного завантаження.
            // typeof check, щоб 0 не перетворився на 50 через `|| 50`.
            if (typeof profile.score === "number") setScore(profile.score);
            setStreak(profile.streak || 0);
            if (profile.name) setUserName(profile.name);
          }

          // answeredToday: локальний флаг вже перевірено вище; якщо немає — перевіряємо DB
          if (answeredLocal !== todayCheck) {
            const checkinResp = await fetch(`${API_URL}/checkins/today?user_id=${uid}`);
            const checkinData = await checkinResp.json();
            setAnsweredToday(!!checkinData.exists);
            if (checkinData.exists) await AsyncStorage.setItem("naelo_answered_today", todayCheck);
          }

          // Синхронізувати дані онбордингу в профіль (один раз)
          if (profile && !profile.score) {
            const goalRaw      = await AsyncStorage.getItem("naelo_goal");
            const drainsRaw    = await AsyncStorage.getItem("naelo_drains");
            const drainsTextRaw= await AsyncStorage.getItem("naelo_drains_text");
            const concernsRaw  = await AsyncStorage.getItem("naelo_concerns");
            const concernsTextRaw = await AsyncStorage.getItem("naelo_concerns_text");
            const giversTextRaw= await AsyncStorage.getItem("naelo_givers_text");
            const giversRaw    = await AsyncStorage.getItem("naelo_givers");
            await fetch(`${API_URL}/profile`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: uid,
                goal: goalRaw || "",
                energy_drains: drainsRaw || "[]",
                drains_text: drainsTextRaw || "",
                concerns: concernsRaw || "[]",
                concerns_text: concernsTextRaw || "",
                givers_text: giversTextRaw || "",
                energy_givers: giversRaw || "[]",
                score,   // значення вже з контексту
              }),
            });
          }
        }
      } catch (e) {}
    };
    load();
  }, [userId]);

  // Коли auth з'являється — синхронізувати локальний чекін у DB
  useEffect(() => {
    if (!userId) return;
    const sync = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const localRaw = await AsyncStorage.getItem("naelo_local_checkins");
        if (!localRaw) return;
        const local: any[] = JSON.parse(localRaw);
        const todayEntry = local.find((e: any) => e.date === todayStr);
        if (!todayEntry) return;
        const existsResp = await fetch(`${API_URL}/checkins/today?user_id=${userId}`);
        const existsData = await existsResp.json();
        if (!existsData.exists) {
          await fetch(`${API_URL}/checkins`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              date: todayEntry.date,
              note: todayEntry.note,
              hints: null,
              question: todayEntry.question,
              energy: todayEntry.energy,
              delta: todayEntry.delta,
            }),
          });
          await fetch(`${API_URL}/profile`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, score: todayEntry.energy }),
          });
        }
      } catch {}
    };
    sync();
  }, [userId]);


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
  // Логіка score: ОДНА змінна `delta` — починається з local evaluation,
  // ОПЦІОНАЛЬНО замінюється на AI delta (лише якщо AI повернув валідне число).
  // ОДНА базова `baselineScore` фіксована на початку — `setScore(baseline + delta)` завжди консистентний.
  const submitAnswer = async () => {
    if (!answerText.trim()) return;
    Keyboard.dismiss();

    const baselineScore = score;                          // ⬅️ зафіксували baseline ОДИН РАЗ
    const todayStr = new Date().toISOString().split("T")[0];
    const noteText = answerText.trim();
    const clamp = (n: number) => Math.max(5, Math.min(95, n));

    // ── Phase 1: миттєвий local feedback ──────────────────────────────
    let delta = evaluateLocal(noteText);
    let resultingScore = clamp(baselineScore + delta);

    setScoreChange(delta);
    setScore(resultingScore);
    setAnsweredToday(true);
    setShowThankYou(true);
    logEvent("checkin_submit", { text_length: noteText.length });

    // Запис у локальний кеш ОДРАЗУ — щоб /my-path побачив запис до DB POST.
    const writeLocalEntry = async (energy: number, d: number) => {
      try {
        const prevRaw = await AsyncStorage.getItem("naelo_local_checkins");
        const prevCheckins: any[] = prevRaw ? JSON.parse(prevRaw) : [];
        const entry = {
          id: `local_${todayStr}`,
          date: todayStr,
          note: noteText || null,
          hints: null,
          question: dailyQ.q,
          energy,
          delta: d,
        };
        await AsyncStorage.setItem(
          "naelo_local_checkins",
          JSON.stringify([entry, ...prevCheckins.filter((e: any) => e.date !== todayStr)].slice(0, 30))
        );
      } catch {}
    };

    try { await AsyncStorage.setItem("naelo_answered_today", todayStr); } catch {}
    await writeLocalEntry(resultingScore, delta);

    Animated.sequence([
      Animated.timing(thankYouAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(thankYouAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowThankYou(false));

    // ── Phase 2: AI refinement (опціонально) ──────────────────────────
    // КРИТИЧНО: переписуємо delta ТІЛЬКИ якщо AI повернув валідне число.
    // null/undefined/error → залишаємо local delta. Це й було причиною
    // регресу до 45% — AI повертав {delta: 0} при помилці і скасовував local -3.
    try {
      const evalRes = await fetch(`${API_URL}/ai/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText, question: dailyQ.q }),
      });
      const evalJson = await evalRes.json();
      if (evalJson.delta !== null && typeof evalJson.delta === "number") {
        delta = evalJson.delta;
        resultingScore = clamp(baselineScore + delta);   // ⬅️ baseline незмінний
        setScore(resultingScore);
        setScoreChange(delta);
      }
    } catch {
      // Network error — залишаємо local delta, нічого не міняємо
    }

    // ── Phase 3: оновити локальний кеш фінальними значеннями ─────────
    await writeLocalEntry(resultingScore, delta);

    // ── Phase 4: sync з DB (best-effort) ─────────────────────────────
    try {
      const uid = userIdRef.current || userId || auth.currentUser?.uid;
      if (uid) {
        await fetch(`${API_URL}/checkins`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: uid,
            date: todayStr,
            note: noteText || null,
            hints: null,
            question: dailyQ.q,
            energy: resultingScore,
            delta,
          }),
        });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const profileResp = await fetch(`${API_URL}/profile?user_id=${uid}`);
        const profileData = await profileResp.json();
        const profile = profileData.profile;

        let newStreak = 1;
        if (profile) {
          const lastActivity = profile.last_activity
            ? new Date(profile.last_activity).toISOString().split("T")[0]
            : null;
          if (lastActivity === yesterdayStr) {
            newStreak = (profile.streak || 0) + 1;
          } else if (lastActivity === todayStr) {
            newStreak = profile.streak || 1;
          }
        }
        setStreak(newStreak);   // ⬅️ було забуто — streak оновлювався тільки в DB

        await fetch(`${API_URL}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: uid,
            score: resultingScore,
            streak: newStreak,
            momentum: delta,
            last_activity: new Date().toISOString(),
          }),
        });
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

      {/* Невидима зона тапу над сферою фону → відкриває чат */}
      <TouchableOpacity style={styles.sphereWrap} activeOpacity={1} onPress={() => router.push("/chat")} />


      {/* Хедер */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Привіт, {userName || "друже"}</Text>
        <TouchableOpacity style={styles.premiumBtn} onPress={() => router.push("/paywall")} activeOpacity={0.8}>
          <Ionicons name="diamond" size={16} color={COLORS.primary} />
          <Text style={styles.premiumBtnText}>Premium</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
        {/* Простір для сфери — зменшено з 0.22 до 0.16, щоб дати "повітря"
            і контенту місце взаємодії (форма питання видніша) */}
        <View style={{ height: height * 0.16 }} />

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

        {/* Порада Naelo — показуємо тільки якщо чекін на сьогодні вже зроблено.
            Інакше це б дублювало CTA з полем питання нижче. */}
        {answeredToday && (
          <View style={styles.adviceCard}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name={advice.icon as any} size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.adviceText, { flex: 1 }]}>{advice.text}</Text>
            </View>
          </View>
        )}

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

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNav active="home" />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  absoluteBg: { position: "absolute", top: 0, left: 0, width, height: width * 1.16 },

  // Зона тапу над сферою фонового зображення → веде в чат
  // Зона тапу зменшена до 200px (раніше 280) — на ~30% менше,
  // щоб точніше збігалась з видимою сферою на фоні і не перехоплювала
  // тапи з контенту нижче.
  sphereWrap: {
    position: "absolute",
    width: 200, height: 200,
    top: height * 0.20 - 100,
    left: (width - 200) / 2,
    zIndex: 10,
  },

  // Хедер
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: SIZES.paddingTop, paddingBottom: 8, zIndex: 10 },
  headerTitle: { color: COLORS.text, fontSize: SIZES.fontLG, fontWeight: "600", letterSpacing: 0.3, flex: 1 },
  premiumBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,179,0,0.12)", borderWidth: 1, borderColor: "rgba(255,179,0,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  premiumBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  // Скрол
  scroll: { flex: 1 },
  scrollInner: { alignItems: "center", paddingHorizontal: CONTENT_PAD_H },

  // Вогник душі
  scoreBlock: { alignItems: "center", marginBottom: 10 },
  scoreLabel: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600", letterSpacing: 1.5, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, overflow: "hidden", marginBottom: 2 },
  scoreValue: { fontSize: 44, fontWeight: "800", letterSpacing: 1 },
  streakRow: { marginTop: 2 },
  streakText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  // Порада
  adviceCard: { width: "100%", maxWidth: CONTENT_MAX_W, paddingVertical: 12, paddingHorizontal: 14, borderRadius: SIZES.radius, backgroundColor: "rgba(15,10,25,0.85)", borderWidth: 1, borderColor: "rgba(255,179,0,0.25)", marginBottom: 10 },
  adviceText: { color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Подяка
  thankYouCard: { width: "100%", paddingVertical: 10, alignItems: "center", marginBottom: 8 },
  thankYouText: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },

  // Питання дня
  questionCard: { width: "100%", maxWidth: CONTENT_MAX_W, backgroundColor: "rgba(15,10,25,0.92)", borderRadius: SIZES.radiusLarge, padding: 14, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  questionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  questionInput: { flex: 1, minHeight: 46, maxHeight: 100, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, lineHeight: 20 },

  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "rgba(255,255,255,0.1)" },
  sendIcon: { color: "#0a0812", fontSize: 20, fontWeight: "800" },

  // Чіпи-підказки — тонша рамка замість заливки, щоб не зливалися з полем вводу
  hintsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hintChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", backgroundColor: "transparent" },
  hintText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" },

  // Вже відповів
  answeredCard: { width: "100%", maxWidth: CONTENT_MAX_W, backgroundColor: "rgba(15,10,25,0.88)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: SIZES.radiusLarge, padding: 16, alignItems: "center", gap: 8 },
  answeredTitle: { color: COLORS.text, fontSize: 17, fontWeight: "600" },
  answeredSub: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  chatBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, borderRadius: SIZES.radiusLarge, borderWidth: 1, borderColor: COLORS.primaryGlow, backgroundColor: COLORS.primaryFaint },
  chatBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
});
