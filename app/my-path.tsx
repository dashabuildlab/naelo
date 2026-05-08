// ~/luma/app/my-path.tsx
// Мій шлях — графік енергії + 🟢 Додай / 🔴 Відпусти + стрічка відповідей

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Animated, Dimensions, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";
import { useAppStore } from "../lib/AppContext";

const API_URL = "https://mynaelo.com/api";
import { COLORS, SIZES, SHARED, CONTENT_PAD_H, CONTENT_MAX_W } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../lib/BottomNav";

const { width } = Dimensions.get("window");

// --- Типи ---
type CheckinEntry = {
  id: string;
  date: string;
  question: string;
  note: string | null;
  hints: string | null;
  energy: number;
  delta: number;
};

// --- Допоміжні ---
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const MONTHS = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Сьогодні";
  if (dateStr === yesterdayStr) return "Вчора";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const scoreColor = (s: number) => s >= 70 ? "#4ADE80" : s >= 45 ? "#FFB300" : "#FF6B6B";

export default function MyPathScreen() {
  const router = useRouter();

  const { score: currentScore, setScore: setCurrentScore } = useAppStore();
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);

  // Слухаємо auth — коли uid з'являється, оновлюємо і стейт (для useFocusEffect), і ref
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const id = user?.uid || null;
      userIdRef.current = id;
      setUserId(id);
    });
    return unsub;
  }, []);

  // Derive givers/drains from checkin history
  const { topGivers, topDrains } = useMemo(() => {
    const giverMap: Record<string, number> = {};
    const drainMap: Record<string, number> = {};

    const addToMap = (map: Record<string, number>, note: string | null) => {
      if (!note) return;
      const items = note.split(/,\s*/)
        .map(s => s.trim())
        .filter(s => s.length >= 2 && s.length <= 25);
      items.forEach(item => {
        const key = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
        map[key] = (map[key] || 0) + 1;
      });
    };

    checkins.forEach(c => {
      const isGiverQ = c.question.includes("дало тобі сили");
      const isDrainQ = c.question.includes("забрало енергію");
      if (isGiverQ) addToMap(giverMap, c.note);
      else if (isDrainQ) addToMap(drainMap, c.note);
      else if (c.delta > 2) addToMap(giverMap, c.note);
      else if (c.delta < -2) addToMap(drainMap, c.note);
    });

    const topGivers = Object.entries(giverMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);
    const topDrains = Object.entries(drainMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);

    return { topGivers, topDrains };
  }, [checkins]);

  // Завантажуємо при кожному переході на цей екран (а не лише при появі auth),
  // щоб одразу побачити свіжий запис з /home — навіть якщо DB POST ще не встиг.
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const uid = userIdRef.current || auth.currentUser?.uid;

          // Завжди читаємо локальний кеш — там лежить найсвіжіший чекін
          // (home.tsx пише в нього миттєво, до DB POST).
          const localRaw = await AsyncStorage.getItem("naelo_local_checkins");
          const localCheckins: CheckinEntry[] = localRaw ? JSON.parse(localRaw) : [];

          if (uid) {
            const profileResp = await fetch(`${API_URL}/profile?user_id=${uid}`);
            const profileData = await profileResp.json();
            const dbScore = profileData.profile?.score || 0;
            if (dbScore > 0) setCurrentScore(Math.max(dbScore, currentScore));

            const checkinsResp = await fetch(`${API_URL}/checkins?user_id=${uid}&days=30`);
            const checkinsData = await checkinsResp.json();
            const dbCheckins: CheckinEntry[] = checkinsData.checkins || [];

            // Зливаємо: DB — джерело правди, але якщо локально є запис на дату,
            // якої ще немає в DB (POST ще в дорозі) — додаємо локальний.
            const dbDates = new Set(dbCheckins.map((c) => c.date));
            const merged = [
              ...dbCheckins,
              ...localCheckins.filter((c) => !dbDates.has(c.date)),
            ].sort((a, b) => (a.date < b.date ? 1 : -1));
            setCheckins(merged);
          } else {
            // Не авторизований — лише локальний кеш
            setCheckins(localCheckins);
          }
        } catch (e) {
          // Якщо API впав — показуємо хоча б локальний кеш
          try {
            const localRaw = await AsyncStorage.getItem("naelo_local_checkins");
            if (localRaw) setCheckins(JSON.parse(localRaw));
          } catch {}
        }
        setLoading(false);
      };
      load();
    }, [userId])
  );


  // --- Міні-графік енергії (останні 7 днів) ---
  const last7 = checkins.slice(0, 7).reverse();
  const maxE = Math.max(...last7.map(c => c.energy), 1);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        bounces={true}
      >

        {/* ═══ Вогник душі зараз ═══ */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Вогник душі</Text>
          <Text style={[styles.scoreValue, { color: scoreColor(currentScore) }]}>
            {currentScore}%
          </Text>
          {checkins.length >= 3 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons
                name={checkins[0]?.energy >= checkins[2]?.energy ? "trending-up" : "trending-down"}
                size={14}
                color="rgba(255,255,255,0.5)"
              />
              <Text style={styles.scoreTrend}>
                {checkins[0]?.energy >= checkins[2]?.energy ? "Зростає" : "Падає"} за 3 дні
              </Text>
            </View>
          )}
        </View>

        {/* ═══ Міні-графік тижня ═══ */}
        {last7.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Мій тиждень</Text>
            <View style={styles.chartRow}>
              {last7.map((c, i) => {
                const h = Math.max(8, (c.energy / 100) * 80);
                const d = new Date(c.date + "T00:00:00");
                return (
                  <View key={c.id} style={styles.chartCol}>
                    <Text style={[styles.chartPercent, { color: scoreColor(c.energy) }]}>
                      {c.energy}
                    </Text>
                    <View style={[styles.chartBar, { height: h, backgroundColor: scoreColor(c.energy) }]} />
                    <Text style={styles.chartDay}>{WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ═══ 🟢 Що дає сили / 🔴 Що забирає ═══ */}
        <View style={styles.dualBlock}>
          {/* Додай */}
          <View style={[styles.halfCard, styles.halfCardGreen]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="add-circle" size={18} color={COLORS.success} />
              <Text style={styles.halfTitle}>Додай</Text>
            </View>
            <Text style={styles.halfSub}>Дає сили найчастіше</Text>
            {topGivers.length > 0 ? (
              <View style={styles.chipsWrap}>
                {topGivers.map(g => (
                  <View key={g} style={[styles.chip, styles.chipGreen]}>
                    <Text style={styles.chipText}>{g}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.halfEmpty}>Відповідай на питання дня — з'явиться твій патерн</Text>
            )}
          </View>

          {/* Відпусти */}
          <View style={[styles.halfCard, styles.halfCardRed]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="remove-circle" size={18} color={COLORS.danger} />
              <Text style={styles.halfTitle}>Відпусти</Text>
            </View>
            <Text style={styles.halfSub}>Висмоктує найчастіше</Text>
            {topDrains.length > 0 ? (
              <View style={styles.chipsWrap}>
                {topDrains.map(d => (
                  <View key={d} style={[styles.chip, styles.chipRed]}>
                    <Text style={styles.chipText}>{d}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.halfEmpty}>Відповідай на питання дня — з'явиться твій патерн</Text>
            )}
          </View>
        </View>

        {/* ═══ Стрічка відповідей ═══ */}
        <View style={styles.timelineSection}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="book-outline" size={16} color={COLORS.text} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Моя історія</Text>
          </View>
          {checkins.length === 0 && !loading && (
            <View style={styles.emptyCard}>
              <Ionicons name="sparkles-outline" size={40} color={COLORS.primary} style={{ marginBottom: 4 }} />
              <Text style={styles.emptyTitle}>Поки порожньо</Text>
              <Text style={styles.emptySub}>Відповідай на питання дня{"\n"}і тут зʼявиться твоя історія</Text>
              <TouchableOpacity style={styles.goHomeBtn} onPress={() => router.push("/home")}>
                <Text style={styles.goHomeBtnText}>Відповісти →</Text>
              </TouchableOpacity>
            </View>
          )}
          {checkins.map((c, i) => {
            const hints = c.hints ? JSON.parse(c.hints) : [];
            return (
              <View key={c.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{formatDate(c.date)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="flash" size={13} color={scoreColor(c.energy)} />
                    <Text style={[styles.entryScore, { color: scoreColor(c.energy) }]}>
                      {c.energy}%
                      {c.delta !== 0 && (
                        <Text style={{ color: c.delta > 0 ? "#4ADE80" : "#FF6B6B" }}>
                          {" "}{c.delta > 0 ? "+" : ""}{c.delta}
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
                <Text style={styles.entryQuestion}>{c.question}</Text>
                {c.note ? (
                  <Text style={styles.entryNote}>"{c.note}"</Text>
                ) : hints.length > 0 ? (
                  <View style={styles.entryHintsRow}>
                    {hints.map((h: string) => (
                      <Text key={h} style={styles.entryHint}>{h}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ═══ Зона акаунту ═══ */}
        <View style={styles.accountSection}>
          <TouchableOpacity style={[styles.settingsBtn, styles.statsBtn]} onPress={() => router.push("/stats")} activeOpacity={0.8}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
              <Text style={[styles.settingsBtnText, { color: COLORS.primary }]}>Повна статистика</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/settings")} activeOpacity={0.8}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="settings-outline" size={18} color={COLORS.textSoft} />
              <Text style={styles.settingsBtnText}>Налаштування акаунту</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <BottomNav active="my-path" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { flex: 1 },
  scrollInner: {
    paddingHorizontal: CONTENT_PAD_H,
    paddingTop: SIZES.paddingTop + 8,
    paddingBottom: 110,                 // ⬅️ щоб контент не ховався за BottomNav
    maxWidth: CONTENT_MAX_W,
    alignSelf: "center" as const,
    width: "100%" as const,
  },

  // Вогник зараз
  scoreCard: {
    alignItems: "center", paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10,
  },
  scoreLabel: { color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: 1, marginBottom: 2 },
  scoreValue: { fontSize: 36, fontWeight: "800" },
  scoreTrend: { color: "rgba(255,255,255,0.5)", fontSize: 12 },

  // Графік
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 12, marginBottom: 10,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 76 },
  chartCol: { alignItems: "center", flex: 1, gap: 3 },
  chartBar: { width: 18, borderRadius: 5, minHeight: 6 },
  chartPercent: { fontSize: 10, fontWeight: "600" },
  chartDay: { color: "rgba(255,255,255,0.4)", fontSize: 10 },

  // 🟢🔴 блоки
  dualBlock: { flexDirection: "row", gap: 8, marginBottom: 10 },
  halfCard: {
    flex: 1, borderRadius: SIZES.radiusLarge, padding: 10, gap: 4,
    borderWidth: 1,
  },
  halfCardGreen: { backgroundColor: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.2)" },
  halfCardRed: { backgroundColor: "rgba(255,107,107,0.06)", borderColor: "rgba(255,107,107,0.2)" },
  halfTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  halfSub: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  halfText: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic", lineHeight: 18 },
  halfEmpty: { fontSize: 12, color: "rgba(255,255,255,0.25)" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipGreen: { backgroundColor: "rgba(74,222,128,0.12)" },
  chipRed: { backgroundColor: "rgba(255,107,107,0.12)" },
  chipText: { fontSize: 12, color: "rgba(255,255,255,0.75)" },

  // Стрічка
  timelineSection: { marginTop: 4 },
  entryCard: {
    backgroundColor: "rgba(255,255,255,0.10)",   // ⬆️ було 0.04 — ледь видно на темному
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",       // ⬆️ було 0.06 — рамка тепер чіткіша
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryDate: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" },   // ⬆️ 0.5 → 0.75
  entryScore: { fontSize: 14, fontWeight: "700" },
  entryQuestion: { color: "rgba(255,255,255,0.55)", fontSize: 12 },                  // ⬆️ 0.35 → 0.55
  entryNote: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20, fontStyle: "italic" }, // ⬆️ 0.75 → 0.92
  entryHintsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  entryHint: { color: "rgba(255,255,255,0.75)", fontSize: 12, backgroundColor: "rgba(255,255,255,0.10)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Акаунт / налаштування
  accountSection: { marginTop: 12, alignItems: "center", gap: 8 },
  settingsBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 30, borderWidth: 1.5, borderColor: "rgba(255,179,0,0.3)",
    backgroundColor: "rgba(255,179,0,0.06)", width: "100%" as const,
  },
  statsBtn: {
    borderColor: COLORS.primary, backgroundColor: "rgba(255,179,0,0.1)",
  },
  settingsBtnText: { color: COLORS.textSoft, fontSize: 15, fontWeight: "600" },

  // Пусто
  emptyCard: {
    alignItems: "center", paddingVertical: 40,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  emptySub: { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  goHomeBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: "rgba(255,179,0,0.1)" },
  goHomeBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "700" },
});
