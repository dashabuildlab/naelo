// ~/naelo-app/app/home.tsx
// Головний екран — Вогник душі + питання дня + символ дня + сьогодні твій фокус

import { useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Image, Keyboard,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { COLORS, SIZES } from "../lib/theme";
import BottomNav from "../lib/BottomNav";
import KeyboardScreen from "../lib/KeyboardScreen";
import { useAppStore } from "../lib/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { logScreen, logEvent } from "../lib/analytics";

const { width, height } = Dimensions.get("window");

// Композитне фонове зображення для /home: сфера-вогник з геометричною сіткою,
// маяк праворуч, нічне небо, океан унизу. Все в одному JPG для швидкого рендеру.
const HERO_BG = require("../assets/screens/home-hero.jpg");

// Зображення для блоків (із 3D-ефектами та свічінням від дизайнера):
const STREAK_ARCH    = require("../assets/screens/streak-arch.jpg");      // брама зі сходами для streak
const SYMBOL_BRIDGE  = require("../assets/screens/symbol-bridge.jpg");    // міст для "Символ дня" (Міст)

// --- Світлячки (sparks навколо сфери) ---
const SPARKS = Array.from({ length: 16 }).map((_, i) => ({
  id: i,
  x: width * 0.15 + Math.random() * width * 0.7,
  y: height * 0.10 + Math.random() * height * 0.30,
  size: Math.random() * 2.5 + 1,
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

// --- Привітання за часом доби ---
const getTimeGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12)  return "Доброго ранку";
  if (h >= 12 && h < 17) return "Добрий день";
  if (h >= 17 && h < 22) return "Добрий вечір";
  return "Доброї ночі";
};

// --- Питання дня (ротація) ---
const DAILY_QUESTIONS = [
  { q: "Як пройшов твій день?",          hints: ["Добре", "Так собі", "Важко", "Супер"] },
  { q: "Що сьогодні дало тобі сили?",     hints: ["Спілкування", "Прогулянка", "Музика", "Відпочинок"] },
  { q: "Що забрало енергію?",             hints: ["Соцмережі", "Конфлікт", "Робота", "Недосип"] },
  { q: "Що хочеш змінити завтра?",        hints: ["Раніше встати", "Менше телефону", "Погуляти", "Помедитувати"] },
  { q: "Хто сьогодні був поруч?",         hints: ["Кохана людина", "Друзі", "Сім'я", "Улюбленець"] },
  { q: "Як ти спав?",                     hints: ["Чудово", "Нормально", "Погано", "Мало"] },
  { q: "Що тебе здивувало цього тижня?",  hints: ["Приємне", "Дивне", "Відкриття", "Зустріч"] },
];

// --- Символ дня (ротація) ---
// TODO: коли будуть готові реальні зображення — підставити в SYMBOLS[i].image
const SYMBOLS = [
  { title: "Міст",      icon: "git-network-outline" as const, text: "Іноді головне — не перейти одразу, а дозволити собі наблизитись." },
  { title: "Маяк",      icon: "navigate-outline"  as const, text: "Світло знаходить тебе навіть у тумані. Просто продовжуй світити." },
  { title: "Стежка",    icon: "trail-sign-outline" as const, text: "Шлях створюється кроком. Не поспішай — він уже починається." },
  { title: "Тиша",      icon: "moon-outline" as const,      text: "У тиші чути те, що інакше тонуло б у шумі. Дозволь їй говорити." },
  { title: "Вода",      icon: "water-outline" as const,     text: "Гнучкість — це не слабкість. Вода точить камінь не силою, а постійністю." },
  { title: "Корінь",    icon: "leaf-outline" as const,      text: "Сильні корені не помітні. Але саме вони тримають тебе у вітрі." },
  { title: "Світанок",  icon: "sunny-outline" as const,     text: "Кожен ранок — нова можливість почати спочатку. Без минулих помилок." },
];

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
  const today = new Date();
  const todayIndex = today.getDate() % DAILY_QUESTIONS.length;
  const dailyQ = DAILY_QUESTIONS[todayIndex];
  const symbolIndex = today.getDate() % SYMBOLS.length;
  const todaySymbol = SYMBOLS[symbolIndex];
  const greeting = getTimeGreeting();

  useEffect(() => { logScreen("Home"); }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const id = user?.uid || null;
      setUserId(id);
      userIdRef.current = id;
    });
    return unsub;
  }, []);

  const API_URL = "https://mynaelo.com/api";

  // Завантажуємо профіль/чекін
  useEffect(() => {
    const load = async () => {
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
            if (typeof profile.score === "number") setScore(profile.score);
            setStreak(profile.streak || 0);
            if (profile.name) setUserName(profile.name);
          }

          if (answeredLocal !== todayCheck) {
            const checkinResp = await fetch(`${API_URL}/checkins/today?user_id=${uid}`);
            const checkinData = await checkinResp.json();
            setAnsweredToday(!!checkinData.exists);
            if (checkinData.exists) await AsyncStorage.setItem("naelo_answered_today", todayCheck);
          }

          // Sync onboarding data → profile (one-time)
          if (profile && !profile.score) {
            const goalRaw          = await AsyncStorage.getItem("naelo_goal");
            const drainsRaw        = await AsyncStorage.getItem("naelo_drains");
            const drainsTextRaw    = await AsyncStorage.getItem("naelo_drains_text");
            const concernsRaw      = await AsyncStorage.getItem("naelo_concerns");
            const concernsTextRaw  = await AsyncStorage.getItem("naelo_concerns_text");
            const giversTextRaw    = await AsyncStorage.getItem("naelo_givers_text");
            const giversRaw        = await AsyncStorage.getItem("naelo_givers");
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
                score,
              }),
            });
          }
        }
      } catch (e) {}
    };
    load();
  }, [userId]);

  // Sync local checkin → DB when auth resolves
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

  // Insert hint into answer text
  const insertHint = (hint: string) => {
    const separator = answerText.trim() ? ", " : "";
    setAnswerText(prev => prev.trim() + separator + hint);
  };

  // Keyword-based fallback evaluator
  const evaluateLocal = (text: string): number => {
    const positive = ["добре", "супер", "чудово", "гуляв", "друзі", "кава", "музика", "кохан", "радість", "сміх", "відпочи", "прогулянк", "йога", "природ", "приємн", "спілкуван"];
    const negative = ["важко", "стрес", "конфлікт", "погано", "втом", "недосип", "тривога", "самот", "злість", "сварк", "соцмереж"];
    const lower = text.toLowerCase();
    let delta = 0;
    positive.forEach(w => { if (lower.includes(w)) delta += 3; });
    negative.forEach(w => { if (lower.includes(w)) delta -= 3; });
    if (text.trim().length > 20) delta += 2;
    if (delta === 0 && text.trim()) delta = 2;
    return Math.max(-15, Math.min(15, delta));
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!answerText.trim()) return;
    Keyboard.dismiss();

    const baselineScore = score;
    const todayStr = new Date().toISOString().split("T")[0];
    const noteText = answerText.trim();
    const clamp = (n: number) => Math.max(5, Math.min(95, n));

    let delta = evaluateLocal(noteText);
    let resultingScore = clamp(baselineScore + delta);

    setScoreChange(delta);
    setScore(resultingScore);
    setAnsweredToday(true);
    setShowThankYou(true);
    logEvent("checkin_submit", { text_length: noteText.length });

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

    // AI refinement
    try {
      const evalRes = await fetch(`${API_URL}/ai/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText, question: dailyQ.q }),
      });
      const evalJson = await evalRes.json();
      if (evalJson.delta !== null && typeof evalJson.delta === "number") {
        delta = evalJson.delta;
        resultingScore = clamp(baselineScore + delta);
        setScore(resultingScore);
        setScoreChange(delta);
      }
    } catch {}

    await writeLocalEntry(resultingScore, delta);

    // DB sync
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
          if (lastActivity === yesterdayStr) newStreak = (profile.streak || 0) + 1;
          else if (lastActivity === todayStr) newStreak = profile.streak || 1;
        }
        setStreak(newStreak);

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

  // --- Динамічне затемнення фонової композиції ---
  // Одне базове зображення (сфера + сітка + маяк + океан).
  // Опасити чорного overlay змінюється від score: чим нижчий вогник — тим темніше.
  // score=95 → dim=0   (повна яскравість)
  // score=50 → dim=0.30
  // score=5  → dim=0.60 (приглушений вогник)
  const dimOpacity = Math.max(0, Math.min(0.60, (95 - score) / 150));
  const showDelta = scoreChange !== 0;

  return (
    <KeyboardScreen style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ═════ HERO: сфера з фоном + хедер + score ═════ */}
      <View style={styles.hero}>
        {/* Готова композиція: сфера + сітка + маяк + океан вже в одному JPG.
            resizeMode="cover" — обріже бокові краї у portrait, центрує по сфері. */}
        <Image source={HERO_BG} style={styles.heroBg} resizeMode="cover" />

        {/* Затемнення поверх — динамічно темніше при низькому score
            (вогник "притухає"). При повному score — 0, при найнижчому — 0.55. */}
        <View style={[styles.heroDim, { backgroundColor: `rgba(10,8,18,${dimOpacity})` }]} pointerEvents="none" />

        {SPARKS.map((s) => <Spark key={s.id} {...s} />)}

        {/* Затемнення низу — плавний перехід у контент */}
        <LinearGradient
          colors={["transparent", "rgba(10,8,18,0.6)", COLORS.bgDark]}
          locations={[0, 0.65, 1]}
          style={styles.heroFade}
          pointerEvents="none"
        />

        {/* Хедер */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerHi}>Привіт, {userName || "друже"}</Text>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Ionicons name="sparkles-outline" size={11} color={COLORS.primary} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.premiumBtn}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.85}
          >
            <Ionicons name="diamond" size={14} color={COLORS.primary} />
            <Text style={styles.premiumBtnText}>Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Сфера: тап → чат */}
        <TouchableOpacity
          style={styles.sphereTap}
          activeOpacity={0.9}
          onPress={() => router.push("/chat")}
        >
          <View style={styles.sphereLabelRow}>
            <Text style={styles.sphereLabel}>Вогник душі</Text>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.45)" />
          </View>
          <Text style={styles.sphereScore}>{score}%</Text>
          {showDelta && (
            <View style={styles.deltaBadge}>
              <Text style={styles.deltaText}>
                {scoreChange > 0 ? "+" : ""}{scoreChange} сьогодні
              </Text>
              <Ionicons
                name={scoreChange >= 0 ? "arrow-up" : "arrow-down"}
                size={11}
                color="#0a0812"
              />
            </View>
          )}
          {showThankYou && (
            <Animated.View style={[styles.thankYouBadge, { opacity: thankYouAnim }]}>
              <Ionicons
                name={scoreChange >= 0 ? "flame" : "heart-outline"}
                size={13}
                color={scoreChange >= 0 ? COLORS.primary : COLORS.danger}
              />
              <Text style={styles.thankYouText}>
                Вогник {scoreChange >= 0 ? "спалахнув" : "почув тебе"}
              </Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {/* ═════ Контент ═════ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Banner-порада */}
        <TouchableOpacity
          style={styles.adviceCard}
          onPress={() => router.push("/chat")}
          activeOpacity={0.85}
        >
          <View style={styles.adviceIconBox}>
            <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.adviceTitle}>Ти на правильному шляху.</Text>
            <Text style={styles.adviceSub}>Маленькі кроки створюють великі зміни.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,179,0,0.5)" />
        </TouchableOpacity>

        {/* Питання дня */}
        {!answeredToday ? (
          <View style={styles.questionCard}>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={styles.cardLabel}>Питання дня</Text>
              <Text style={styles.questionTitle}>{dailyQ.q}</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="Опиши вільно або обери підказку"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={answerText}
                onChangeText={setAnswerText}
                maxLength={300}
                multiline
              />
              <TouchableOpacity
                style={[styles.ctaPrimary, !answerText.trim() && styles.ctaPrimaryDim]}
                onPress={submitAnswer}
                disabled={!answerText.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={17} color="#0a0812" />
                <Text style={styles.ctaPrimaryText}>Написати відповідь</Text>
              </TouchableOpacity>
            </View>

            {/* Streak-брама — реальне зображення з gold glow rim */}
            {streak > 0 && (
              <View style={styles.streakSide}>
                <View style={styles.streakImage}>
                  <Image source={STREAK_ARCH} style={styles.streakImageInner} resizeMode="cover" />
                  {/* Inner glow overlay для відчуття 3D */}
                  <LinearGradient
                    colors={["rgba(255,179,0,0.10)", "transparent", "rgba(0,0,0,0.4)"]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />
                </View>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={11} color={COLORS.primary} />
                  <Text style={styles.streakBadgeText}>
                    {streak} день поспіль
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.answeredCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.answeredTitle}>Ти вже відповів сьогодні</Text>
            </View>
            <Text style={styles.answeredSub}>Завтра Naelo запитає щось нове</Text>
            <TouchableOpacity style={styles.answeredChatBtn} onPress={() => router.push("/chat")}>
              <Ionicons name="chatbubble-outline" size={15} color={COLORS.primary} />
              <Text style={styles.answeredChatText}>Поговорити з Naelo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Підказки (під карткою питання) */}
        {!answeredToday && (
          <View style={styles.hintsBlock}>
            <Text style={styles.hintsLabel}>або обери підказку</Text>
            <View style={styles.hintsRow}>
              {dailyQ.hints.map((h) => (
                <TouchableOpacity key={h} style={styles.hintChip} onPress={() => insertHint(h)}>
                  <Text style={styles.hintText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Символ дня */}
        <View style={styles.symbolCard}>
          <View style={styles.symbolHeader}>
            <Text style={styles.cardLabel}>Символ дня</Text>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} />
          </View>
          <View style={styles.symbolRow}>
            <View style={styles.symbolImage}>
              {/* Якщо символ дня — Міст: використовуємо реальне зображення.
                  Інакше fallback на Ionicons (для інших 6 символів асети будуть пізніше) */}
              {todaySymbol.title === "Міст" ? (
                <>
                  <Image source={SYMBOL_BRIDGE} style={styles.symbolImageInner} resizeMode="cover" />
                  <LinearGradient
                    colors={["rgba(255,179,0,0.08)", "transparent"]}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />
                </>
              ) : (
                <Ionicons name={todaySymbol.icon} size={36} color="rgba(255,179,0,0.5)" />
              )}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.symbolTitle}>{todaySymbol.title}</Text>
              <Text style={styles.symbolText}>{todaySymbol.text}</Text>
            </View>
          </View>
          <View style={styles.symbolActions}>
            <TouchableOpacity style={styles.symbolBtn} activeOpacity={0.7}>
              <Ionicons name="bookmark-outline" size={14} color={COLORS.primary} />
              <Text style={styles.symbolBtnText}>Зберегти</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.symbolBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/chat")}
            >
              <Text style={styles.symbolBtnText}>Розкрити зміст</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Сьогодні твій фокус — 3 картки */}
        <View style={styles.focusSection}>
          <Text style={styles.cardLabel}>Сьогодні твій фокус</Text>
          <View style={styles.focusRow}>
            <TouchableOpacity
              style={styles.focusCard}
              onPress={() => router.push("/pharmacy")}
              activeOpacity={0.85}
            >
              <View style={[styles.focusIconBox, { backgroundColor: "rgba(80,200,120,0.10)" }]}>
                <Ionicons name="leaf-outline" size={20} color="#5BC97A" />
              </View>
              <Text style={styles.focusTitle}>Практика дня</Text>
              <Text style={styles.focusSub}>Дихання{"\n"}4-7-8</Text>
              <View style={styles.focusBottom}>
                <Text style={styles.focusDuration}>5 хв</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.focusCard}
              onPress={() => router.push("/chat")}
              activeOpacity={0.85}
            >
              <View style={[styles.focusIconBox, { backgroundColor: "rgba(150,170,255,0.10)" }]}>
                <Ionicons name="document-text-outline" size={20} color="#9AAEFF" />
              </View>
              <Text style={styles.focusTitle}>Запис дня</Text>
              <Text style={styles.focusSub}>Твій{"\n"}простір</Text>
              <View style={styles.focusBottom}>
                <Text style={styles.focusDuration}>2 хв</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.focusCard}
              onPress={() => router.push("/dream-path")}
              activeOpacity={0.85}
            >
              <View style={[styles.focusIconBox, { backgroundColor: "rgba(255,179,0,0.12)" }]}>
                <Ionicons name="star-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.focusTitle}>Крок мрії</Text>
              <Text style={styles.focusSub}>1 маленький крок сьогодні</Text>
              <View style={styles.focusBottom}>
                <Text />
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav active="home" />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  // ═════ HERO ═════
  hero: {
    position: "relative",
    height: height * 0.50,
    overflow: "hidden",
  },
  heroBg: {
    position: "absolute", top: 0, left: 0,
    width, height: height * 0.50,
  },
  heroFade: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: height * 0.22,
  },

  // Динамічне затемнення поверх композиції — затемнюється коли score падає.
  // Покриває всю hero-зону. Сонячне відтворення цвіту через RGB(10,8,18) — наш bgDark.
  heroDim: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },

  // Хедер
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: SIZES.paddingTop,
    zIndex: 10,
  },
  headerHi: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: 0.2 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  greetingText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "400" },
  premiumBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,179,0,0.08)",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.32)",
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 7,
  },
  premiumBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },

  // Сфера-tap (центральна область)
  sphereTap: {
    position: "absolute",
    top: height * 0.18,
    left: 0, right: 0,
    alignItems: "center",
    zIndex: 5,
  },
  sphereLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 6,
  },
  sphereLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14, fontWeight: "500", letterSpacing: 0.3,
  },
  sphereScore: {
    color: "#fff", fontSize: 60, fontWeight: "300",
    letterSpacing: 1, lineHeight: 70,
    textShadowColor: "rgba(255,179,0,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  deltaBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 16, marginTop: 6,
  },
  deltaText: { color: "#0a0812", fontSize: 12, fontWeight: "700" },
  thankYouBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(15,12,28,0.85)",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.4)",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, marginTop: 8,
  },
  thankYouText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },

  // ═════ SCROLL ═════
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: 16, paddingTop: 0, gap: 14 },

  // Спільний лейбл секції
  cardLabel: {
    color: COLORS.primary, fontSize: 13, fontWeight: "600", letterSpacing: 0.3,
  },

  // ═════ Banner-порада (glass + gold glow) ═════
  adviceCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(18,18,24,0.72)",         // ← per design spec
    borderWidth: 1, borderColor: "rgba(255,179,0,0.18)",
    borderRadius: 18, padding: 14,
    // 3D depth + subtle gold glow
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  adviceIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,179,0,0.14)",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.28)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  adviceTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  adviceSub: { color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 17 },

  // ═════ Question card (glass + depth) ═════
  questionCard: {
    flexDirection: "row", gap: 12,
    backgroundColor: "rgba(18,18,24,0.78)",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.16)",
    borderRadius: 18, padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  questionTitle: {
    color: "#fff", fontSize: 19, fontWeight: "700", lineHeight: 25,
  },
  questionInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    color: "#fff", fontSize: 14, minHeight: 44, maxHeight: 100,
  },
  ctaPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 28, marginTop: 4,
    // Виразне золоте свічіння — головна CTA
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  ctaPrimaryDim: { opacity: 0.78, shadowOpacity: 0.20 },
  ctaPrimaryText: { color: "#0a0812", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },

  // Streak side (брама + бейдж) — з gold glow
  streakSide: {
    width: 100,
    alignItems: "center",
    position: "relative",
  },
  streakImage: {
    width: 100, height: 152,
    borderRadius: 16,
    backgroundColor: "#0a0812",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.25)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    // Gold glow — iOS shadow + Android elevation
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  streakImageInner: {
    width: "100%", height: "100%",
  },
  streakBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(10,8,18,0.92)",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.45)",
    borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4,
    position: "absolute", top: 8, left: -2, right: -2,
    justifyContent: "center",
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  streakBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "700" },

  // ═════ Hints ═════
  hintsBlock: { gap: 10, paddingHorizontal: 4 },
  hintsLabel: { color: "rgba(255,255,255,0.55)", fontSize: 13 },
  hintsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hintChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "transparent",
  },
  hintText: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500" },

  // ═════ Symbol of day (glass + depth) ═════
  symbolCard: {
    backgroundColor: "rgba(18,18,24,0.78)",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.16)",
    borderRadius: 18, padding: 16, gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  symbolHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  symbolRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  symbolImage: {
    width: 96, height: 84, borderRadius: 12,
    backgroundColor: "#0a0812",
    borderWidth: 1, borderColor: "rgba(255,179,0,0.22)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 6,
  },
  symbolImageInner: {
    width: "100%", height: "100%",
  },
  symbolTitle: { color: "#fff", fontSize: 19, fontWeight: "700" },
  symbolText: { color: "rgba(255,255,255,0.68)", fontSize: 13, lineHeight: 18 },
  symbolActions: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 2,
  },
  symbolBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  symbolBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  // ═════ Сьогодні твій фокус ═════
  focusSection: { gap: 12 },
  focusRow: { flexDirection: "row", gap: 10 },
  focusCard: {
    flex: 1,
    backgroundColor: "rgba(18,18,24,0.78)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 12, gap: 6,
    minHeight: 148,
    // depth shadow — щоб 3 картки "лежали" над фоном
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  focusIconBox: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    // subtle glow з кольору самої іконки (буде overriddenable inline)
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  focusTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  focusSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 14, flex: 1 },
  focusBottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 4,
  },
  focusDuration: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "500" },

  // ═════ Answered (after checkin) ═════
  answeredCard: {
    backgroundColor: "rgba(15,12,28,0.88)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18, padding: 18, alignItems: "center", gap: 8,
  },
  answeredTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  answeredSub: { color: "rgba(255,255,255,0.55)", fontSize: 13 },
  answeredChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 4, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,179,0,0.4)",
    backgroundColor: "rgba(255,179,0,0.08)",
  },
  answeredChatText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
});
