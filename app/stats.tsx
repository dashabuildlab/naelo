// ~/luma/app/stats.tsx
// Повна статистика — графік, streak-календар, практики

import React, { useCallback, useState } from "react";
import {
  Dimensions, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Polyline, Circle, G, Line, Text as SvgText } from "react-native-svg";
import { useRouter, useFocusEffect } from "expo-router";
import { auth } from "../lib/firebase";
import { COLORS, SIZES, CONTENT_PAD_H, CONTENT_MAX_W, scoreColor } from "../lib/theme";
import { checkPremium } from "../lib/purchases";
import BottomNav from "../lib/BottomNav";

const { width } = Dimensions.get("window");
const API_URL = "https://mynaelo.com/api";

const MONTHS = ["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"];

const PRACTICE_LABELS: Record<string, string> = {
  stress:  "Стрес",
  fatigue: "Втома",
  focus:   "Фокус",
  anxiety: "Тривога",
};
const PRACTICE_COLORS: Record<string, string> = {
  stress:  COLORS.danger,
  fatigue: COLORS.purple,
  focus:   COLORS.success,
  anxiety: COLORS.info,
};

type CheckinData  = { date: string; energy: number };
type PracticeData = { category: string };

function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export default function StatsScreen() {
  const router = useRouter();
  const [checkins, setCheckins]   = useState<CheckinData[]>([]);
  const [practices, setPractices] = useState<PracticeData[]>([]);
  const [streak, setStreak]       = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading]     = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) { setLoading(false); return; }

        const premium = await checkPremium();
        setIsPremium(premium);

        const days = premium ? 30 : 7;
        const resp = await fetch(`${API_URL}/stats?user_id=${uid}&days=${days}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (data.checkins)  setCheckins(data.checkins);
        if (data.practices) setPractices(data.practices);
        setStreak(data.streak || 0);
      } catch {}
      setLoading(false);
    })();
  }, []));

  // ── Розрахунки ─────────────────────────────────────────────────
  const avg   = checkins.length > 0 ? Math.round(checkins.reduce((s, c) => s + c.energy, 0) / checkins.length) : 0;
  const best  = checkins.length > 0 ? checkins.reduce((a, b) => a.energy >= b.energy ? a : b) : null;
  const worst = checkins.length > 0 ? checkins.reduce((a, b) => a.energy <= b.energy ? a : b) : null;
  const practiceCounts = practices.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1; return acc;
  }, {});
  const totalPractices = practices.length;

  // ── Календар — 7 або 30 днів ───────────────────────────────────
  const today  = new Date();
  const calLen = isPremium ? 30 : 7;
  const calDays = Array.from({ length: calLen }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (calLen - 1 - i));
    return d.toISOString().split("T")[0];
  });
  const checkinMap = Object.fromEntries(checkins.map(c => [c.date, c.energy]));

  // ── SVG лінійний графік ────────────────────────────────────────
  const chartW = Math.min(CONTENT_MAX_W, width) - 48;
  const chartH = 140;
  const padL   = 28, padR = 8, padT = 10, padB = 22;
  const plotW  = chartW - padL - padR;
  const plotH  = chartH - padT - padB;
  const gridVals = [25, 50, 75, 100];

  const pts = checkins.length > 1 ? checkins.map((c, i) => ({
    x: padL + (i / (checkins.length - 1)) * plotW,
    y: padT + (1 - (c.energy - 5) / 90) * plotH,
    energy: c.energy,
  })) : [];

  const polyStr = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaStr = pts.length > 1
    ? `${padL},${padT + plotH} ${polyStr} ${pts[pts.length - 1].x},${padT + plotH}`
    : "";

  const rangeLabel = isPremium ? "30 днів" : "7 днів";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Статистика</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Підсумок ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: scoreColor(avg) }]}>{checkins.length > 0 ? avg + "%" : "—"}</Text>
            <Text style={styles.summaryLabel}>Середній{"\n"}вогник</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{checkins.length}</Text>
            <Text style={styles.summaryLabel}>Чекінів за{"\n"}{rangeLabel}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{streak}</Text>
            <Text style={styles.summaryLabel}>Streak{"\n"}зараз</Text>
          </View>
        </View>

        {/* ── Преміум-банер (тільки для безкоштовних) ── */}
        {!isPremium && (
          <TouchableOpacity style={styles.upsellBanner} onPress={() => router.push("/paywall")} activeOpacity={0.85}>
            <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.upsellTitle}>Статистика обмежена — 7 днів</Text>
              <Text style={styles.upsellSub}>Преміум: повна статистика за весь час + кореляції</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* ── Лінійний графік ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Вогник душі — {rangeLabel}</Text>
          {checkins.length < 2 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyHint}>
                {loading ? "Завантаження..." : "Потрібно мінімум 2 чекіни для графіку"}
              </Text>
            </View>
          ) : (
            <>
              <Svg width={chartW} height={chartH}>
                {gridVals.map(v => {
                  const gy = padT + (1 - (v - 5) / 90) * plotH;
                  return (
                    <G key={v}>
                      <Line x1={padL} y1={gy} x2={chartW - padR} y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                      <SvgText x={padL - 4} y={gy + 4} fontSize={9} fill="rgba(255,255,255,0.28)" textAnchor="end">{v}</SvgText>
                    </G>
                  );
                })}
                <Line x1={padL} y1={padT + plotH} x2={chartW - padR} y2={padT + plotH} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                {areaStr && <Polyline points={areaStr} fill="rgba(255,179,0,0.08)" stroke="none" />}
                <Polyline points={polyStr} fill="none" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <Circle key={i} cx={p.x} cy={p.y} r={3} fill={scoreColor(p.energy)} />
                ))}
              </Svg>

              {best && (
                <View style={styles.bestWorst}>
                  <Text style={styles.bestText}>Найкращий: {best.energy}% · {formatDate(best.date)}</Text>
                  {worst && worst.date !== best.date && (
                    <Text style={styles.worstText}>Найважчий: {worst.energy}% · {formatDate(worst.date)}</Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Streak-календар ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Активність — {rangeLabel}</Text>
          <View style={styles.calGrid}>
            {calDays.map(day => {
              const energy = checkinMap[day];
              const has = energy !== undefined;
              const d = new Date(day + "T00:00:00");
              return (
                <View key={day} style={styles.calCell}>
                  <View style={[styles.calDot, { backgroundColor: has ? scoreColor(energy) : "rgba(255,255,255,0.07)" }]} />
                  <Text style={styles.calDay}>{d.getDate()}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.calLegend}>
            {[
              { color: COLORS.success,  label: "Висока" },
              { color: COLORS.scoreMid, label: "Середня" },
              { color: COLORS.danger,   label: "Низька" },
              { color: "rgba(255,255,255,0.07)", label: "Немає" },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.calDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Практики ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Практики за {rangeLabel}</Text>
          {totalPractices === 0 ? (
            <Text style={styles.emptyHint}>Практики ще не виконувались</Text>
          ) : (
            <>
              {Object.entries(PRACTICE_LABELS).map(([key, label]) => {
                const count = practiceCounts[key] || 0;
                const ratio = count / totalPractices;
                return (
                  <View key={key} style={styles.practiceRow}>
                    <Text style={styles.practiceLabel}>{label}</Text>
                    <View style={styles.practiceBarBg}>
                      <View style={[styles.practiceBarFill, { width: `${ratio * 100}%` as any, backgroundColor: PRACTICE_COLORS[key] }]} />
                    </View>
                    <Text style={[styles.practiceCount, { color: PRACTICE_COLORS[key] }]}>{count}</Text>
                  </View>
                );
              })}
              <Text style={styles.practiceTotal}>Всього: {totalPractices} практик</Text>
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav active="my-path" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: SIZES.paddingTop, paddingBottom: 12, paddingHorizontal: CONTENT_PAD_H,
    borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.08)",
    maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const,
  },
  backBtn:     { width: 70 },
  backText:    { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700" },

  scroll: {
    paddingHorizontal: CONTENT_PAD_H, paddingTop: 20, paddingBottom: 40,
    maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const,
  },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 14, alignItems: "center", gap: 4,
  },
  summaryValue: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  summaryLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", lineHeight: 15 },

  card: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16, marginBottom: 16, gap: 12,
  },
  cardTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },

  emptyWrap: { paddingVertical: 16, alignItems: "center" },
  emptyHint: { color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center" },

  bestWorst: { gap: 3 },
  bestText:  { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  worstText: { color: "rgba(255,255,255,0.45)", fontSize: 12 },

  calGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  calCell:    { alignItems: "center", gap: 2, width: 28 },
  calDot:     { width: 22, height: 22, borderRadius: 11 },
  calDay:     { color: "rgba(255,255,255,0.25)", fontSize: 9 },
  calLegend:  { flexDirection: "row", gap: 14, flexWrap: "wrap", marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { color: "rgba(255,255,255,0.4)", fontSize: 11 },

  practiceRow:     { flexDirection: "row", alignItems: "center", gap: 10 },
  practiceLabel:   { color: "rgba(255,255,255,0.6)", fontSize: 13, width: 64 },
  practiceBarBg:   { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  practiceBarFill: { height: 6, borderRadius: 3 },
  practiceCount:   { fontSize: 13, fontWeight: "700", width: 24, textAlign: "right" as const },
  practiceTotal:   { color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "right" as const, marginTop: 4 },

  upsellBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,179,0,0.07)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,179,0,0.25)",
    padding: 14, marginBottom: 16,
  },
  upsellTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  upsellSub:   { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});
