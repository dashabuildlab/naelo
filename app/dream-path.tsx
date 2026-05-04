// ~/luma/app/dream-path.tsx
// Навігатор мрії — API (PostgreSQL) + маяк, кроки, фільтр істинності

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated, Dimensions, Easing, Image,
  Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { COLORS, SIZES, SHARED, SHADOWS, CONTENT_PAD_H, CONTENT_MAX_W } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../lib/BottomNav";
import { logScreen, logEvent } from "../lib/analytics";

const API_URL = "https://mynaelo.com/api";

const { width, height } = Dimensions.get("window");

const SPARKS = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  x: width * 0.2 + Math.random() * width * 0.6,
  y: height * 0.08 + Math.random() * height * 0.22,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 3000,
  duration: Math.random() * 2000 + 1500,
}));

const PATH_DOTS = [
  { x: width * 0.18, y: height * 0.18 },
  { x: width * 0.75, y: height * 0.16 },
  { x: width * 0.12, y: height * 0.28 },
  { x: width * 0.80, y: height * 0.26 },
  { x: width * 0.30, y: height * 0.34 },
];

type Step = { id: string; title: string; done: boolean };
type Dream = { id: string; title: string; why: string; deadline: string; steps: Step[]; verified: boolean };

const TRUTH_FILTER = [
  "Це моя власна мрія, а не чужа?",
  "Я буду щасливий в процесі, а не тільки після?",
  "Ця мрія відповідає моїм цінностям?",
  "Я готовий платити ціну за цю мрію?",
  "Через 5 років я не пошкодую про цей вибір?",
];

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
          Animated.timing(moveY, { toValue: -30, duration, useNativeDriver: true }),
        ]).start(loop);
      }, delay);
    };
    loop();
  }, []);
  return (
    <Animated.View style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: size,
      backgroundColor: COLORS.spark, opacity: anim,
      transform: [{ translateY: moveY }],
    }} />
  );
};

const GlowDot = ({ x, y, index }: { x: number; y: number; index: number }) => {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 1000 + index * 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.3, duration: 1000 + index * 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: "absolute", left: x - 6, top: y - 6,
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: COLORS.ring3, opacity: anim,
      shadowColor: COLORS.ring2, shadowRadius: 6, shadowOpacity: 1,
    }} />
  );
};

export default function DreamPathScreen() {
  const router = useRouter();
  const [dreams, setDreams] = useState<Dream[]>([]);

  const bgPlayer = useVideoPlayer(require("../assets/screens/dream-path.mp4"), p => {
    p.loop  = true;
    p.muted = true;
    try { (p as any).audioMixingMode = "mixWithOthers"; } catch {} // не переривати музику
    p.play(); // play() завжди виконується
  });
  const [loading, setLoading] = useState(true);
  const [showAddDream, setShowAddDream] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showAddStep, setShowAddStep] = useState<string | null>(null);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [filterAnswers, setFilterAnswers] = useState<boolean[]>([]);
  const [currentFilterQ, setCurrentFilterQ] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const [newDreamTitle, setNewDreamTitle] = useState("");
  const [newDreamWhy, setNewDreamWhy] = useState("");
  const [newDreamDeadline, setNewDreamDeadline] = useState("");
  const [newStepTitle, setNewStepTitle] = useState("");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const glowCore = useRef(new Animated.Value(0.5)).current;
  const posterOpacity = useRef(new Animated.Value(1)).current; // poster поки відео не готове

  useEffect(() => { logScreen("DreamPath"); }, []);

  // Ховаємо poster коли відео готове до відтворення
  useEffect(() => {
    let sub: any;
    try {
      sub = bgPlayer.addListener("statusChange", ({ status }: { status: string }) => {
        if (status === "readyToPlay") {
          Animated.timing(posterOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start();
        }
      });
    } catch {}
    // Fallback таймаут якщо подія не прийшла
    const fallback = setTimeout(() => {
      Animated.timing(posterOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start();
    }, 1500);
    return () => { sub?.remove?.(); clearTimeout(fallback); };
  }, []);

  // Слухати Firebase auth — чекати поки сесія відновиться
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Firebase не має сесії — перевірити Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUserId(session?.user?.id || null);
        });
      }
    });
    return unsubscribe;
  }, []);

  useFocusEffect(useCallback(() => { loadDreams(); }, []));

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.2, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowCore, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowCore, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const getUserId = async (): Promise<string | null> => {
    // Спочатку Firebase, потім Supabase
    if (auth.currentUser?.uid) return auth.currentUser.uid;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  };

  const loadDreams = async () => {
    setLoading(true);
    try {
      const uid = await getUserId();
      setUserId(uid);
      if (!uid) { setDreams([]); setLoading(false); return; }
      const res = await fetch(`${API_URL}/dreams?user_id=${encodeURIComponent(uid)}`);
      const json = await res.json();
      if (json.dreams) {
        setDreams(json.dreams.map((d: any) => ({
          id: d.id, title: d.title, why: d.why || "", deadline: d.deadline || "",
          steps: (d.steps || []).map((s: any) => ({ id: s.id, title: s.title, done: s.done })),
          verified: d.verified || false,
        })));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const addDream = async () => {
    if (!newDreamTitle.trim()) {
      Alert.alert("Введи назву мрії", "Поле 'Яка твоя мрія?' є обов'язковим");
      return;
    }
    // Якщо userId ще не завантажився — отримати зараз
    const uid = userId || await getUserId();
    if (!uid) {
      Alert.alert("Увійди в акаунт", "Для збереження мрій потрібно увійти в акаунт");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/dreams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, title: newDreamTitle.trim(), why: newDreamWhy.trim() || null, deadline: newDreamDeadline.trim() || null }),
      });
      const json = await res.json();
      if (json.dream) {
        setDreams((prev) => [...prev, { id: json.dream.id, title: json.dream.title, why: newDreamWhy.trim(), deadline: newDreamDeadline.trim(), steps: [], verified: false }]);
        setNewDreamTitle(""); setNewDreamWhy(""); setNewDreamDeadline(""); setShowAddDream(false);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Помилка", "Не вдалось зберегти мрію. Перевір з'єднання.");
    }
  };

  const addStep = async (dreamId: string) => {
    if (!newStepTitle.trim() || !userId) return;
    const dream = dreams.find(d => d.id === dreamId);
    try {
      const res = await fetch(`${API_URL}/dreams/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dream_id: dreamId, user_id: userId, title: newStepTitle.trim(), sort_order: dream ? dream.steps.length : 0 }),
      });
      const json = await res.json();
      if (json.step) {
        setDreams(prev => prev.map(d => d.id === dreamId
          ? { ...d, steps: [...d.steps, { id: json.step.id, title: json.step.title, done: false }] }
          : d
        ));
      }
    } catch (e) { console.error(e); }
    setNewStepTitle(""); setShowAddStep(null);
  };

  const toggleStep = async (dreamId: string, stepId: string) => {
    const step = dreams.find(d => d.id === dreamId)?.steps.find(s => s.id === stepId);
    if (!step) return;
    const newDone = !step.done;
    setDreams(prev => prev.map(d => d.id === dreamId
      ? { ...d, steps: d.steps.map(s => s.id === stepId ? { ...s, done: newDone } : s) }
      : d
    ));
    fetch(`${API_URL}/dreams/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    }).catch(console.error);
  };

  const startFilter = (dream: Dream) => { setSelectedDream(dream); setFilterAnswers([]); setCurrentFilterQ(0); setShowFilter(true); };

  const answerFilter = async (answer: boolean) => {
    const newAnswers = [...filterAnswers, answer];
    setFilterAnswers(newAnswers);
    if (currentFilterQ < TRUTH_FILTER.length - 1) { setCurrentFilterQ(currentFilterQ + 1); }
    else {
      const allYes = newAnswers.every((a) => a);
      if (selectedDream) {
        setDreams(prev => prev.map(d => d.id === selectedDream.id ? { ...d, verified: allYes } : d));
        fetch(`${API_URL}/dreams/${selectedDream.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified: allYes }),
        }).catch(console.error);
      }
      setShowFilter(false);
    }
  };

  const deleteDream = async (dreamId: string) => {
    Alert.alert("Видалити мрію?", "Мрія та всі її кроки будуть видалені", [
      { text: "Скасувати", style: "cancel" },
      { text: "Видалити", style: "destructive", onPress: async () => {
        setDreams(prev => prev.filter(d => d.id !== dreamId));
        fetch(`${API_URL}/dreams/${dreamId}`, { method: "DELETE" }).catch(console.error);
      }},
    ]);
  };

  const progress = (dream: Dream) => dream.steps.length === 0 ? 0 : dream.steps.filter((s) => s.done).length / dream.steps.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <VideoView
        player={bgPlayer}
        style={styles.absoluteBg}
        contentFit="cover"
        nativeControls={false}
      />
      {/* Poster: показується миттєво, зникає коли відео готове */}
      <Animated.Image
        source={require("../assets/screens/dream-path.jpg")}
        style={[styles.absoluteBg, { opacity: posterOpacity }]}
        resizeMode="cover"
      />
      {SPARKS.map((s) => <Spark key={s.id} {...s} />)}
      {PATH_DOTS.map((d, i) => <GlowDot key={i} x={d.x} y={d.y} index={i} />)}
      <Animated.View style={[styles.glowCore, { opacity: glowCore }]} />
      <Animated.View style={[styles.pulseRing, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: dreams.length > 0 ? height * 0.32 : height * 0.58 }} />

        <View style={styles.contentBackdrop}>
          <Text style={styles.lighthouseTitle}>Твій маяк</Text>
          <Text style={styles.lighthouseSubtitle}>
            {dreams.length === 0 ? "Куди ти прямуєш?\nДодай свою першу мрію" : `${dreams.length} ${dreams.length === 1 ? "мрія" : "мрій"} на горизонті`}
          </Text>

          {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}

          {dreams.map((dream) => (
            <View key={dream.id} style={styles.dreamCard}>
              <View style={styles.dreamHeader}>
                <View style={styles.dreamTitleRow}>
                  {dream.verified && <Text style={styles.verifiedBadge}>✓ Справжня</Text>}
                  <Text style={styles.dreamTitle}>{dream.title}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteDream(dream.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              {dream.why ? (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                  <Ionicons name="bulb-outline" size={15} color={COLORS.textSoft} style={{ marginTop: 1 }} />
                  <Text style={[styles.dreamWhy, { flex: 1, marginBottom: 0 }]}>{dream.why}</Text>
                </View>
              ) : null}
              {dream.deadline ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Ionicons name="calendar-outline" size={15} color="rgba(255,179,0,0.7)" />
                  <Text style={[styles.dreamDeadline, { marginBottom: 0 }]}>{dream.deadline}</Text>
                </View>
              ) : null}
              {dream.steps.length > 0 && (
                <View style={styles.progressRow}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress(dream) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{dream.steps.filter((s) => s.done).length}/{dream.steps.length}</Text>
                </View>
              )}
              {dream.steps.map((step) => (
                <TouchableOpacity key={step.id} style={styles.stepRow} onPress={() => toggleStep(dream.id, step.id)}>
                  <View style={[styles.stepCheck, step.done && styles.stepCheckDone]}>
                    {step.done && <Text style={styles.stepCheckMark}>✓</Text>}
                  </View>
                  <Text style={[styles.stepText, step.done && styles.stepTextDone]}>{step.title}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.dreamActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAddStep(dream.id)}>
                  <Text style={styles.actionBtnText}>+ Крок</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, dream.verified && styles.actionBtnVerified]} onPress={() => startFilter(dream)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons
                      name={dream.verified ? "checkmark-circle" : "filter-outline"}
                      size={14}
                      color={dream.verified ? COLORS.success : COLORS.textMuted}
                    />
                    <Text style={[styles.actionBtnText, dream.verified && { color: COLORS.success }]}>
                      {dream.verified ? "Перевірено" : "Фільтр"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              {showAddStep === dream.id && (
                <View style={styles.addStepForm}>
                  <TextInput style={[SHARED.input, { flex: 1, fontSize: 14 }]} placeholder="Опиши крок..." placeholderTextColor={COLORS.textPlaceholder} value={newStepTitle} onChangeText={setNewStepTitle} autoFocus returnKeyType="done" onSubmitEditing={() => addStep(dream.id)} />
                  <TouchableOpacity style={styles.addStepBtn} onPress={() => addStep(dream.id)}>
                    <Text style={styles.addStepBtnText}>Додати</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {!loading && (
            <TouchableOpacity style={styles.addDreamBtn} onPress={() => setShowAddDream(true)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="star-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addDreamBtnText}>Додати мрію</Text>
              </View>
            </TouchableOpacity>
          )}
          {!userId && !loading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 16 }}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textFaint} />
              <Text style={styles.noAuthHint}>Увійди в акаунт щоб зберігати мрії в хмарі</Text>
            </View>
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Модаль додавання мрії */}
      <Modal visible={showAddDream} animationType="slide" transparent onRequestClose={() => { setShowAddDream(false); setNewDreamTitle(""); setNewDreamWhy(""); setNewDreamDeadline(""); }}>
        <KeyboardAwareScrollView contentContainerStyle={SHARED.modalOverlay as any} bottomOffset={20} keyboardShouldPersistTaps="handled">
          <View style={SHARED.modalContainer as any}>
            {/* Заголовок з кнопкою закриття */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="star-outline" size={22} color={COLORS.primary} />
                <Text style={modal.title}>Нова мрія</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowAddDream(false); setNewDreamTitle(""); setNewDreamWhy(""); setNewDreamDeadline(""); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput style={SHARED.input} placeholder="Яка твоя мрія? *" placeholderTextColor={COLORS.textPlaceholder} value={newDreamTitle} onChangeText={setNewDreamTitle} autoFocus />
            <TextInput style={SHARED.input} placeholder="Чому ця мрія важлива для тебе?" placeholderTextColor={COLORS.textPlaceholder} value={newDreamWhy} onChangeText={setNewDreamWhy} multiline />
            <TextInput style={SHARED.input} placeholder="Коли хочеш досягти? (напр. 2026)" placeholderTextColor={COLORS.textPlaceholder} value={newDreamDeadline} onChangeText={setNewDreamDeadline} />
            <View style={modal.btns}>
              <TouchableOpacity style={[SHARED.btnPrimary as any, !newDreamTitle.trim() && { opacity: 0.45 }]} onPress={addDream}>
                <Text style={SHARED.btnPrimaryText}>Додати →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </Modal>

      {/* Фільтр істинності */}
      <Modal visible={showFilter} animationType="fade" transparent onRequestClose={() => setShowFilter(false)}>
        <View style={SHARED.modalOverlayCenter as any}>
          <View style={SHARED.modalContainerCenter as any}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Ionicons name="filter-outline" size={18} color={COLORS.primary} />
              <Text style={filter.badge}>Фільтр істинності</Text>
            </View>
            <Text style={filter.progress}>{currentFilterQ + 1} / {TRUTH_FILTER.length}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentFilterQ) / TRUTH_FILTER.length) * 100}%` }]} />
            </View>
            <Text style={filter.question}>{TRUTH_FILTER[currentFilterQ]}</Text>
            <View style={filter.btns}>
              <TouchableOpacity style={filter.btnYes} onPress={() => answerFilter(true)}>
                <Text style={filter.btnYesText}>Так ✓</Text>
              </TouchableOpacity>
              <TouchableOpacity style={filter.btnNo} onPress={() => answerFilter(false)}>
                <Text style={filter.btnNoText}>Ні ✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowFilter(false)}>
              <Text style={filter.skip}>Пропустити</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav active="dream-path" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  absoluteBg: { position: "absolute", top: 0, left: 0, width, height: width * 1.07 },
  scroll: { paddingHorizontal: CONTENT_PAD_H, paddingBottom: 100 },
  contentBackdrop: { backgroundColor: "rgba(10,8,18,0.8)", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(255,179,0,0.15)", paddingHorizontal: SIZES.paddingH, paddingTop: 24, paddingBottom: 10, marginHorizontal: -SIZES.paddingH, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },
  glowCore: { position: "absolute", width: 35, height: 35, borderRadius: 18, backgroundColor: COLORS.glow, top: "14%", left: "51%", marginLeft: -17, opacity: 0.7 },
  pulseRing: { position: "absolute", width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: COLORS.ring1, top: "12.5%", left: "51%", marginLeft: -30 },
  lighthouseTitle: { color: COLORS.primary, fontSize: 20, fontWeight: "700", textAlign: "center" },
  lighthouseSubtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20, marginBottom: 16 },
  dreamCard: { ...SHARED.cardNeutral, marginBottom: 14 },
  dreamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  dreamTitleRow: { flex: 1, gap: 4 },
  verifiedBadge: { color: COLORS.success, fontSize: SIZES.fontXS, fontWeight: "600" },
  dreamTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700", flex: 1 },
  deleteBtn: { color: COLORS.textFaint, fontSize: 16, paddingLeft: 12 },
  dreamWhy: { color: COLORS.textSoft, fontSize: SIZES.fontSM, marginBottom: 6 },
  dreamDeadline: { color: "rgba(255,179,0,0.7)", fontSize: SIZES.fontSM, marginBottom: 10 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  progressBar: { flex: 1, height: 4, backgroundColor: COLORS.borderLight, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  progressText: { color: COLORS.textMuted, fontSize: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  stepCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  stepCheckDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepCheckMark: { color: "#000", fontSize: 12, fontWeight: "700" },
  stepText: { color: COLORS.textSoft, fontSize: 14, flex: 1 },
  stepTextDone: { textDecorationLine: "line-through", color: COLORS.textFaint },
  dreamActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.cardFaint },
  actionBtnVerified: { borderColor: COLORS.success, backgroundColor: COLORS.successDim },
  actionBtnText: { color: COLORS.textMuted, fontSize: SIZES.fontSM },
  addStepForm: { flexDirection: "row", gap: 10, marginTop: 12 },
  addStepBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusSmall, backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.primary },
  addStepBtnText: { color: COLORS.primary, fontWeight: "600", fontSize: SIZES.fontSM },
  addDreamBtn: { paddingVertical: 16, borderRadius: SIZES.radiusLarge, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft, alignItems: "center", marginTop: 8 },
  addDreamBtnText: { color: COLORS.primary, fontSize: SIZES.fontMD, fontWeight: "700" },
  noAuthHint: { color: COLORS.textFaint, fontSize: 12, textAlign: "center" },
});

const modal = StyleSheet.create({
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
  btns: { gap: 12, marginTop: 8 },
  btnCancel: { color: COLORS.textMuted, fontSize: 14, textAlign: "center" },
});

const filter = StyleSheet.create({
  badge: { color: COLORS.primary, fontSize: 16, fontWeight: "700", textAlign: "center" },
  progress: { color: COLORS.textMuted, fontSize: SIZES.fontSM, textAlign: "center" },
  question: { color: COLORS.text, fontSize: SIZES.fontLG, fontWeight: "600", textAlign: "center", lineHeight: 26 },
  btns: { flexDirection: "row", gap: 12 },
  btnYes: { flex: 1, paddingVertical: 14, borderRadius: SIZES.radiusLarge, borderWidth: 1.5, borderColor: COLORS.success, backgroundColor: COLORS.successDim, alignItems: "center" },
  btnYesText: { color: COLORS.success, fontSize: 16, fontWeight: "700" },
  btnNo: { flex: 1, paddingVertical: 14, borderRadius: SIZES.radiusLarge, borderWidth: 1.5, borderColor: COLORS.danger, backgroundColor: COLORS.dangerDim, alignItems: "center" },
  btnNoText: { color: COLORS.danger, fontSize: 16, fontWeight: "700" },
  skip: { color: COLORS.textFaint, fontSize: SIZES.fontSM, textAlign: "center" },
});
