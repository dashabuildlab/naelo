// ~/luma/app/pharmacy.tsx
// Енергетична аптечка — з трекінгом практик в Supabase

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Dimensions, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View, Modal, Animated,
  Easing, Vibration,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { auth } from "../lib/firebase";
import { COLORS, SIZES, SHARED, CONTENT_PAD_H, CONTENT_MAX_W, isTablet } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../lib/BottomNav";
import { logScreen, logEvent } from "../lib/analytics";
import { checkPremium } from "../lib/purchases";

const { width } = Dimensions.get("window");

type Practice = {
  id: string; title: string; duration: string; durationSec: number;
  description: string; steps: string[]; color: string; icon: string;
};

const CATEGORIES = [
  { id: "stress",  label: "Стрес",   color: COLORS.danger,  icon: "flame" as const },
  { id: "fatigue", label: "Втома",   color: COLORS.purple,  icon: "moon" as const },
  { id: "focus",   label: "Фокус",   color: COLORS.success, icon: "eye-outline" as const },
  { id: "anxiety", label: "Тривога", color: COLORS.info,    icon: "heart-outline" as const },
];

const PRACTICES: Record<string, Practice[]> = {
  stress: [
    { id: "s1", icon: "body-outline", title: "Дихання 4-7-8", duration: "3 хв", durationSec: 180, color: COLORS.danger, description: "Техніка уповільненого дихання для заспокоєння нервової системи.", steps: ["Сядь зручно і закрий очі", "Вдих через ніс — 4 секунди", "Затримай дихання — 7 секунд", "Видих через рот — 8 секунд", "Повтори 4 рази", "Відчуй як напруга відпускає"] },
    { id: "s2", icon: "hand-left-outline", title: "Заземлення 5-4-3-2-1", duration: "5 хв", durationSec: 300, color: "#FF8C42", description: "Техніка повернення в момент. Допомагає переключити увагу зі стресових думок.", steps: ["Назви 5 речей які бачиш", "Назви 4 речі які можеш доторкнутись", "Назви 3 звуки які чуєш", "Назви 2 запахи які відчуваєш", "Назви 1 смак у роті", "Зроби глибокий вдих — ти тут і зараз"] },
    { id: "s3", icon: "fitness-outline", title: "Прогресивна релаксація", duration: "8 хв", durationSec: 480, color: COLORS.danger, description: "Послідовне напруження і розслаблення м'язів для зняття фізичного напруження.", steps: ["Ляж або сядь зручно", "Напруж ступні на 5 секунд — відпусти", "Напруж гомілки на 5 секунд — відпусти", "Напруж стегна на 5 секунд — відпусти", "Напруж живіт на 5 секунд — відпусти", "Напруж плечі на 5 секунд — відпусти", "Напруж обличчя на 5 секунд — відпусти", "Відчуй повне розслаблення всього тіла"] },
  ],
  fatigue: [
    { id: "f1", icon: "flash-outline", title: "Енергетичне дихання", duration: "2 хв", durationSec: 120, color: COLORS.purple, description: "Швидка дихальна техніка для відчуття бадьорості та підйому енергії.", steps: ["Сядь прямо, плечі розправ", "Зроби 20 швидких вдихів-видихів через ніс", "Потім один глибокий вдих — затримай на 15 секунд", "Повільний видих", "Повтори 3 рази", "Відчуй прилив енергії"] },
    { id: "f2", icon: "sunny-outline", title: "Ранкова активація", duration: "5 хв", durationSec: 300, color: COLORS.primary, description: "Комплекс для запуску енергії зранку або після обіднього спаду.", steps: ["Встань і потягнись всім тілом вгору", "10 глибоких вдихів з підняттям рук", "Потрапай долонями по тілу — руки, ноги, груди", "Зроби 10 стрибків або присідань", "Умийся холодною водою", "Скажи вголос: 'Я сповнений енергії!'"] },
    { id: "f3", icon: "moon-outline", title: "Йога-нідра 10 хв", duration: "10 хв", durationSec: 600, color: COLORS.purple, description: "Глибоке відновлення через усвідомлену релаксацію тіла і розуму.", steps: ["Ляж на спину, очі закрий", "Відчуй тяжкість правої руки... лівої руки...", "Відчуй тяжкість правої ноги... лівої ноги...", "Відчуй тяжкість всього тіла", "Уяви себе на теплому пляжі", "Просто спостерігай за диханням 5 хвилин", "Повільно поверни увагу до тіла", "Потягнись і відкрий очі"] },
  ],
  focus: [
    { id: "fo1", icon: "timer-outline", title: "Техніка Помодоро", duration: "25 хв", durationSec: 1500, color: COLORS.success, description: "Класична техніка продуктивності. Максимальна концентрація на одному завданні.", steps: ["Вибери ОДНЕ завдання", "Встанови таймер на 25 хвилин", "Прибери всі відволікання — телефон в режим польоту", "Працюй тільки над цим завданням", "Коли таймер — зроби перерву 5 хвилин", "Після 4 помодоро — довга перерва 20 хвилин"] },
    { id: "fo2", icon: "eye-outline", title: "Дихання для фокусу", duration: "3 хв", durationSec: 180, color: COLORS.success, description: "Ритмічне дихання для покращення концентрації перед важливою задачею.", steps: ["Сядь прямо, закрий очі", "Вдих через ніс — 4 секунди", "Видих через ніс — 4 секунди", "Повтори 10 разів", "Відкрий очі — ти готовий до роботи", "Одразу переходь до задачі без відволікань"] },
    { id: "fo3", icon: "document-text-outline", title: "Розвантаження мозку", duration: "5 хв", durationSec: 300, color: COLORS.info, description: "Вивільни робочу пам'ять. Коли думки заважають зосередитись.", steps: ["Візьми аркуш паперу або відкрий нотатки", "Протягом 3 хвилин пиши ВСЕ що є в голові", "Не думай — просто пиши", "Потім подивись на список", "Вибери ОДНЕ найважливіше", "Закрий список і почни з нього"] },
  ],
  anxiety: [
    { id: "a1", icon: "square-outline", title: "Квадратне дихання", duration: "4 хв", durationSec: 240, color: COLORS.info, description: "Популярна техніка рівномірного дихання для зниження відчуття тривоги.", steps: ["Вдих — 4 секунди", "Затримка — 4 секунди", "Видих — 4 секунди", "Затримка — 4 секунди", "Повтори 8 разів", "Продовжуй до відчуття спокою"] },
    { id: "a2", icon: "water-outline", title: "Серфінг тривоги", duration: "10 хв", durationSec: 600, color: COLORS.info, description: "Не борись з тривогою — спостерігай за нею. Вона завжди минає.", steps: ["Сядь зручно і закрий очі", "Відчуй тривогу — де вона в тілі?", "Просто спостерігай — не борись", "Уяви тривогу як хвилю в океані", "Хвиля піднімається... і опускається", "Ти — берег. Хвилі приходять і йдуть", "Відчуй як тривога поступово відступає"] },
  ],
};

// --- Timer Modal ---
const TimerModal = ({ practice, onClose, onComplete }: { practice: Practice; onClose: () => void; onComplete: () => void }) => {
  const [phase, setPhase] = useState<"instructions" | "timer">("instructions");
  const [secondsLeft, setSecondsLeft] = useState(practice.durationSec);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const start = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); setRunning(false); setFinished(true); Vibration.vibrate(500); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); };
  const progressPercent = ((practice.durationSec - secondsLeft) / practice.durationSec) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  // ── Фаза 1: Інструкція ──────────────────────────────────────────
  if (phase === "instructions") {
    return (
      <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={timer.overlay}>
          <ScrollView contentContainerStyle={timer.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={timer.container}>
              <TouchableOpacity style={timer.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Ionicons name={practice.icon as any} size={44} color={practice.color} style={{ marginBottom: 8 }} />
              <Text style={timer.title}>{practice.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name="timer-outline" size={14} color={COLORS.textMuted} />
                <Text style={timer.durationLabel}>{practice.duration}</Text>
              </View>
              <Text style={timer.descText}>{practice.description}</Text>

              <View style={timer.instructionBlock}>
                <Text style={timer.instructionTitle}>Як виконувати:</Text>
                {practice.steps.map((step, i) => (
                  <View key={i} style={timer.instructionRow}>
                    <View style={[timer.stepDot, { backgroundColor: practice.color }]}>
                      <Text style={timer.stepDotNum}>{i + 1}</Text>
                    </View>
                    <Text style={timer.instructionStep}>{step}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[timer.btn, { borderColor: practice.color, backgroundColor: practice.color + "20", marginTop: 8 }]}
                onPress={() => setPhase("timer")}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="play" size={18} color={practice.color} />
                  <Text style={[timer.btnText, { color: practice.color }]}>Запустити таймер</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── Фаза 2: Таймер ─────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={timer.overlay}>
        <View style={timer.container}>
          <TouchableOpacity style={timer.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Ionicons name={practice.icon as any} size={40} color={practice.color} style={{ marginBottom: 8 }} />
          <Text style={timer.title}>{practice.title}</Text>
          <Text style={[timer.time, { color: practice.color }]}>{mins}:{secs.toString().padStart(2, "0")}</Text>
          <View style={timer.progressBar}>
            <View style={[timer.progressFill, { width: `${progressPercent}%`, backgroundColor: practice.color }]} />
          </View>
          {/* Всі кроки одночасно під таймером */}
          <ScrollView style={timer.stepsScroll} showsVerticalScrollIndicator={false}>
            {practice.steps.map((step, i) => (
              <View key={i} style={timer.timerStepRow}>
                <View style={[timer.stepDot, { backgroundColor: practice.color }]}>
                  <Text style={timer.stepDotNum}>{i + 1}</Text>
                </View>
                <Text style={timer.timerStepText}>{step}</Text>
              </View>
            ))}
          </ScrollView>
          {finished ? (
            <TouchableOpacity style={[timer.btn, { borderColor: COLORS.success, backgroundColor: COLORS.successDim }]} onPress={() => { onComplete(); onClose(); }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="checkmark" size={18} color={COLORS.success} />
                <Text style={[timer.btnText, { color: COLORS.success }]}>Завершено!</Text>
              </View>
            </TouchableOpacity>
          ) : running ? (
            <TouchableOpacity style={[timer.btn, { borderColor: COLORS.border }]} onPress={pause}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="pause" size={18} color={COLORS.text} />
                <Text style={timer.btnText}>Пауза</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[timer.btn, { borderColor: practice.color, backgroundColor: practice.color + "20" }]} onPress={start}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="play" size={18} color={practice.color} />
                <Text style={[timer.btnText, { color: practice.color }]}>{secondsLeft < practice.durationSec ? "Продовжити" : "Старт"}</Text>
              </View>
            </TouchableOpacity>
          )}
          {!finished && !running && secondsLeft < practice.durationSec && (
            <TouchableOpacity onPress={() => { onComplete(); onClose(); }}>
              <Text style={timer.skipText}>Завершити достроково</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function PharmacyScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("stress");
  const [activePractice, setActivePractice] = useState<Practice | null>(null);
  const [completedToday, setCompletedToday] = useState<Record<string, number>>({});
  const [totalToday, setTotalToday] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { logScreen("Pharmacy"); }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || auth.currentUser?.uid || null;
      setUserId(uid);
      if (!uid) return;
      const today = new Date().toISOString().split("T")[0];
      const { data: logs } = await supabase.from("practice_logs").select("practice_id, category").eq("user_id", uid).gte("completed_at", today + "T00:00:00");
      if (logs) {
        const counts: Record<string, number> = {};
        logs.forEach((l) => { counts[l.practice_id] = (counts[l.practice_id] || 0) + 1; });
        setCompletedToday(counts);
        setTotalToday(logs.length);
      }
    } catch (e) {}
  };

  const completePractice = async (practice: Practice) => {
    if (!userId) return;
    // Premium gate: безкоштовно — 3 практики на день
    const premium = await checkPremium();
    if (!premium && totalToday >= 3) {
      router.push("/paywall");
      return;
    }
    await supabase.from("practice_logs").insert({ user_id: userId, practice_id: practice.id, category: activeCategory, duration_sec: practice.durationSec });
    const { data: profile } = await supabase.from("profiles").select("score").eq("id", userId).single();
    if (profile) {
      const newScore = Math.min((profile.score || 0) + 2, 100);
      await supabase.from("profiles").update({ score: newScore }).eq("id", userId);
      await AsyncStorage.setItem("naelo_score", String(newScore));
    }
    setCompletedToday((prev) => ({ ...prev, [practice.id]: (prev[practice.id] || 0) + 1 }));
    setTotalToday((prev) => prev + 1);
    logEvent("practice_complete", { practice_id: practice.id, category: activeCategory, duration_sec: practice.durationSec });
  };

  const practices = PRACTICES[activeCategory] || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={{ height: SIZES.paddingTop + 8 }} />

      {totalToday > 0 && (
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>Сьогодні: {totalToday} {totalToday === 1 ? "практика" : "практик"}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catBtn, activeCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + "15" }]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons name={cat.icon} size={15} color={activeCategory === cat.id ? cat.color : COLORS.textMuted} />
            <Text style={[styles.catText, activeCategory === cat.id && { color: cat.color }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Дисклеймер */}
        <View style={styles.disclaimer}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} style={{ marginTop: 1 }} />
            <Text style={[styles.disclaimerText, { flex: 1 }]}>Практики носять інформаційний характер і не є медичним засобом. При серйозних симптомах зверніться до лікаря.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{CATEGORIES.find((c) => c.id === activeCategory)?.label} — техніки</Text>

        {practices.map((practice) => {
          const doneCount = completedToday[practice.id] || 0;
          return (
            <TouchableOpacity key={practice.id} style={[styles.practiceCard, doneCount > 0 && { borderColor: practice.color + "40" }]} onPress={() => setActivePractice(practice)}>
              <View style={styles.practiceLeft}>
                <Ionicons name={practice.icon as any} size={28} color={practice.color} style={styles.practiceIcon} />
                <View style={styles.practiceInfo}>
                  <View style={styles.practiceTitleRow}>
                    <Text style={styles.practiceTitle}>{practice.title}</Text>
                    {doneCount > 0 && (
                      <View style={[styles.doneBadge, { backgroundColor: practice.color + "25" }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="checkmark" size={12} color={practice.color} />
                          <Text style={[styles.doneBadgeText, { color: practice.color }]}>{doneCount}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={styles.practiceDuration}>{practice.duration}</Text>
                  <Text style={styles.practiceDesc} numberOfLines={2}>{practice.description}</Text>
                </View>
              </View>
              <Text style={[styles.practiceArrow, { color: practice.color }]}>›</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav active="pharmacy" />

      {activePractice && (
        <TimerModal practice={activePractice} onClose={() => setActivePractice(null)} onComplete={() => completePractice(activePractice)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: CONTENT_PAD_H, paddingBottom: 100, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },
  todayBadge: { alignSelf: "center" as const, width: "100%", maxWidth: CONTENT_MAX_W, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryGlow, marginBottom: 4 },
  todayText: { color: COLORS.primary, fontSize: SIZES.fontSM, fontWeight: "600", textAlign: "center" },
  categories: { paddingHorizontal: CONTENT_PAD_H, paddingVertical: 12, gap: 10 },
  catBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: SIZES.radiusLarge, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.cardLight },
  catText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "500" },
  disclaimer: { marginBottom: 12, marginTop: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  disclaimerText: { color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 17, textAlign: "center" },
  sectionTitle: { color: COLORS.textMuted, fontSize: SIZES.fontSM, letterSpacing: 0.5, marginBottom: 14, marginTop: 4 },
  practiceCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.cardLight, borderRadius: SIZES.radiusLarge - 2, borderWidth: 1, borderColor: COLORS.borderLight, padding: 16, marginBottom: 12 },
  practiceLeft: { flex: 1, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  practiceIcon: { marginTop: 2 },
  practiceInfo: { flex: 1, gap: 4 },
  practiceTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  practiceTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  doneBadgeText: { fontSize: SIZES.fontXS, fontWeight: "700" },
  practiceDuration: { color: COLORS.textMuted, fontSize: 12 },
  practiceDesc: { color: COLORS.textSoft, fontSize: SIZES.fontSM, lineHeight: 18 },
  practiceArrow: { fontSize: 28, fontWeight: "300" },
});

const timer = StyleSheet.create({
  overlay: { ...(SHARED.modalOverlayCenter as any), padding: 16 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
  container: { backgroundColor: COLORS.bgModal, borderRadius: 28, padding: 24, width: "100%", maxWidth: isTablet ? 520 : undefined, alignItems: "center", gap: 12 },
  closeBtn: { position: "absolute", right: 16, top: 16, zIndex: 10 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
  durationLabel: { color: COLORS.textMuted, fontSize: 13 },
  descText: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 4 },
  instructionBlock: { width: "100%", backgroundColor: COLORS.cardLighter, borderRadius: SIZES.radius, padding: 16, gap: 10 },
  instructionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  instructionStep: { color: COLORS.text, fontSize: 15, lineHeight: 22, flex: 1 },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  stepDotNum: { color: "#000", fontSize: 11, fontWeight: "800" },
  time: { fontSize: 56, fontWeight: "800", letterSpacing: 2 },
  progressBar: { width: "100%", height: 4, backgroundColor: COLORS.borderLight, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  stepsScroll: { width: "100%", maxHeight: 180 },
  timerStepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 },
  timerStepText: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, flex: 1 },
  btn: { width: "100%", paddingVertical: 16, borderRadius: SIZES.radiusRound, borderWidth: 1.5, alignItems: "center", marginTop: 4 },
  btnText: { color: COLORS.textSoft, fontSize: 16, fontWeight: "700" },
  skipText: { color: COLORS.textFaint, fontSize: SIZES.fontSM, marginTop: 8 },
});
