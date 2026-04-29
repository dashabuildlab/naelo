// ~/luma/app/my-path.tsx
// Мій шлях — графік енергії + 🟢 Додай / 🔴 Відпусти + стрічка відповідей

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Image, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { COLORS, SIZES, SHARED } from "../lib/theme";
import BottomNav from "../lib/BottomNav";
import Header from "../lib/Header";

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

  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [givers, setGivers] = useState<string[]>([]);
  const [drains, setDrains] = useState<string[]>([]);
  const [giversText, setGiversText] = useState("");
  const [drainsText, setDrainsText] = useState("");
  const [currentScore, setCurrentScore] = useState(50);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Завантажити персональні дані
        const gRaw = await AsyncStorage.getItem("luma_givers");
        if (gRaw) setGivers(JSON.parse(gRaw));
        const dRaw = await AsyncStorage.getItem("luma_drains");
        if (dRaw) setDrains(JSON.parse(dRaw));
        const gtRaw = await AsyncStorage.getItem("luma_givers_text");
        if (gtRaw) setGiversText(gtRaw);
        const dtRaw = await AsyncStorage.getItem("luma_drains_text");
        if (dtRaw) setDrainsText(dtRaw);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const uid = session.user.id;

          const { data: profile } = await supabase
            .from("profiles")
            .select("score")
            .eq("id", uid)
            .single();
          if (profile) setCurrentScore(profile.score || 50);

          // Останні 30 днів чекінів
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const { data: entries } = await supabase
            .from("daily_checkins")
            .select("*")
            .eq("user_id", uid)
            .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
            .order("date", { ascending: false });

          if (entries) setCheckins(entries);
        }
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, []));

  // --- Міні-графік енергії (останні 7 днів) ---
  const last7 = checkins.slice(0, 7).reverse();
  const maxE = Math.max(...last7.map(c => c.energy), 1);

  // --- Emoji для опор ---
  const EMOJI_MAP: Record<string, string> = {
    "Прогулянка": "🚶", "Медитація": "🧘", "Музика": "🎵", "Кава": "☕",
    "Читання": "📚", "Спорт": "🏃", "Природа": "🌿", "Ванна": "🛁",
    "Смачна їжа": "🍓", "Хороший сон": "💤", "Ігри": "🎮", "Творчість": "✍️",
    "Тварини": "🐕", "Друзі": "👥", "Соцмережі": "📱", "Пізній сон": "😴",
    "Конфлікти": "😤", "Перевтома": "🏢", "Новини": "📰", "Фастфуд": "🍔",
    "Самотність": "😔", "Фінансовий стрес": "💸", "Шум": "🔇", "Прокрастинація": "⏰",
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Мій шлях" absolute />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        <View style={{ height: SIZES.paddingTop + 56 }} />

        {/* ═══ Вогник душі зараз ═══ */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Вогник душі</Text>
          <Text style={[styles.scoreValue, { color: scoreColor(currentScore) }]}>
            {currentScore}%
          </Text>
          {checkins.length >= 3 && (
            <Text style={styles.scoreTrend}>
              {checkins[0]?.energy >= checkins[2]?.energy ? "📈 Зростає" : "📉 Падає"} за 3 дні
            </Text>
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
            <Text style={styles.halfTitle}>🟢 Додай</Text>
            <Text style={styles.halfSub}>Це тобі дає сили</Text>
            {givers.length > 0 ? (
              <View style={styles.chipsWrap}>
                {givers.map(g => (
                  <View key={g} style={[styles.chip, styles.chipGreen]}>
                    <Text style={styles.chipText}>{EMOJI_MAP[g] || "✨"} {g}</Text>
                  </View>
                ))}
              </View>
            ) : giversText ? (
              <Text style={styles.halfText}>{giversText}</Text>
            ) : (
              <Text style={styles.halfEmpty}>Розкажеш на головній</Text>
            )}
          </View>

          {/* Відпусти */}
          <View style={[styles.halfCard, styles.halfCardRed]}>
            <Text style={styles.halfTitle}>🔴 Відпусти</Text>
            <Text style={styles.halfSub}>Це висмоктує</Text>
            {drains.length > 0 ? (
              <View style={styles.chipsWrap}>
                {drains.map(d => (
                  <View key={d} style={[styles.chip, styles.chipRed]}>
                    <Text style={styles.chipText}>{EMOJI_MAP[d] || "💀"} {d}</Text>
                  </View>
                ))}
              </View>
            ) : drainsText ? (
              <Text style={styles.halfText}>{drainsText}</Text>
            ) : (
              <Text style={styles.halfEmpty}>Розкажеш на головній</Text>
            )}
          </View>
        </View>

        {/* ═══ Стрічка відповідей ═══ */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>📖 Моя історія</Text>
          {checkins.length === 0 && !loading && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>✨</Text>
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
                  <Text style={[styles.entryScore, { color: scoreColor(c.energy) }]}>
                    ⚡ {c.energy}%
                    {c.delta !== 0 && (
                      <Text style={{ color: c.delta > 0 ? "#4ADE80" : "#FF6B6B" }}>
                        {" "}{c.delta > 0 ? "+" : ""}{c.delta}
                      </Text>
                    )}
                  </Text>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav active="my-path" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: SIZES.paddingH },

  // Вогник зараз
  scoreCard: {
    alignItems: "center", paddingVertical: 20,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 16,
  },
  scoreLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14, letterSpacing: 1, marginBottom: 4 },
  scoreValue: { fontSize: 48, fontWeight: "800" },
  scoreTrend: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 },

  // Графік
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, marginBottom: 16,
  },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 110 },
  chartCol: { alignItems: "center", flex: 1, gap: 4 },
  chartBar: { width: 20, borderRadius: 6, minHeight: 8 },
  chartPercent: { fontSize: 11, fontWeight: "600" },
  chartDay: { color: "rgba(255,255,255,0.4)", fontSize: 11 },

  // 🟢🔴 блоки
  dualBlock: { flexDirection: "row", gap: 10, marginBottom: 16 },
  halfCard: {
    flex: 1, borderRadius: SIZES.radiusLarge, padding: 14, gap: 6,
    borderWidth: 1,
  },
  halfCardGreen: { backgroundColor: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.2)" },
  halfCardRed: { backgroundColor: "rgba(255,107,107,0.06)", borderColor: "rgba(255,107,107,0.2)" },
  halfTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  halfSub: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
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
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 14, marginBottom: 10, gap: 6,
  },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryDate: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  entryScore: { fontSize: 14, fontWeight: "700" },
  entryQuestion: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
  entryNote: { color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 20, fontStyle: "italic" },
  entryHintsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  entryHint: { color: "rgba(255,255,255,0.5)", fontSize: 12, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

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
