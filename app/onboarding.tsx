// ~/luma/app/onboarding.tsx
// Онбординг квіз — кроки 1-7 (персоналізація)

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated, Dimensions, Easing, Image, Keyboard, Linking,
  StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import SoulFlame from "../lib/SoulFlame";
import { useAppStore } from "../lib/AppContext";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import KeyboardScreen from "../lib/KeyboardScreen";

const { width, height } = Dimensions.get("window");
// На iPad обмежуємо розмір сфери щоб вона не займала пів-екрану
const S  = Math.min(width * 0.42, 180);
const RS = S / 2;

// --- Дані для екранів ---

const GOALS = [
  { label: "Більше енергії" },
  { label: "Менше стресу" },
  { label: "Фокус і продуктивність" },
  { label: "Баланс і спокій" },
];

const ENERGY_LEVELS = [
  { label: "Виснажений", value: 20 },
  { label: "Втомлений", value: 40 },
  { label: "Нормально", value: 60 },
  { label: "Сповнений сил", value: 85 },
];

const CONCERNS = [
  { label: "Стрес", penalty: 8 },
  { label: "Втома", penalty: 8 },
  { label: "Тривога", penalty: 7 },
  { label: "Не можу сфокусуватись", penalty: 6 },
  { label: "Низький настрій", penalty: 7 },
  { label: "Все ок", penalty: 0 },
];

const ENERGY_GIVERS = [
  { label: "Прогулянка" },
  { label: "Медитація" },
  { label: "Музика" },
  { label: "Кава" },
  { label: "Читання" },
  { label: "Спорт" },
  { label: "Природа" },
  { label: "Ванна" },
  { label: "Смачна їжа" },
  { label: "Хороший сон" },
  { label: "Ігри" },
  { label: "Творчість" },
  { label: "Тварини" },
  { label: "Друзі" },
];

const ENERGY_DRAINS = [
  { label: "Соцмережі" },
  { label: "Пізній сон" },
  { label: "Конфлікти" },
  { label: "Перевтома" },
  { label: "Новини" },
  { label: "Фастфуд" },
  { label: "Самотність" },
  { label: "Фінансовий стрес" },
  { label: "Шум" },
  { label: "Прокрастинація" },
];

// --- Компоненти ---

const Stars = () => {
  const stars = useRef(
    Array.from({ length: 60 }).map((_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.6 + 0.2,
    }))
  ).current;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((s) => (
        <View key={s.id} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: s.size,
          backgroundColor: "rgba(255,255,255,0.85)", opacity: s.opacity,
        }} />
      ))}
    </View>
  );
};

const MiniSphere = ({ pulse, aura }: { pulse: Animated.Value; aura: Animated.Value }) => (
  <View style={{ alignItems: "center", justifyContent: "center", width: S * 1.5, height: S * 1.5 }}>
    <Animated.View style={{
      position: "absolute", width: S * 1.5, height: S * 1.5, borderRadius: S * 1.5,
      backgroundColor: "#FF8C00", opacity: aura,
    }} />
    <Animated.View style={{
      position: "absolute", width: S, height: S, borderRadius: S,
      backgroundColor: "#FFD700", opacity: aura,
    }} />
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Svg width={S} height={S}>
        <Defs>
          <RadialGradient id="sg" cx="38%" cy="32%" r="70%">
            <Stop offset="0%" stopColor="#FFF5B0" stopOpacity="1" />
            <Stop offset="25%" stopColor="#FFD050" stopOpacity="1" />
            <Stop offset="55%" stopColor="#FFB300" stopOpacity="1" />
            <Stop offset="80%" stopColor="#FF6A00" stopOpacity="1" />
            <Stop offset="100%" stopColor="#3D0F00" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="vig" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
          </RadialGradient>
        </Defs>
        <Circle cx={RS} cy={RS} r={RS * 0.88} fill="url(#sg)" />
        <Circle cx={RS * 0.62} cy={RS * 0.55} r={RS * 0.18} fill="rgba(255,252,200,0.7)" />
        <Circle cx={RS * 0.62} cy={RS * 0.55} r={RS * 0.08} fill="rgba(255,255,255,0.9)" />
        <Circle cx={RS} cy={RS} r={RS * 0.88} fill="url(#vig)" />
      </Svg>
    </Animated.View>
  </View>
);

// --- Головний компонент ---

export default function OnboardingScreen() {
  const router = useRouter();
  const { setScore: setCtxScore, setUserName: setCtxUserName } = useAppStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [concernsText, setConcernsText] = useState("");
  const [givers, setGivers] = useState<string[]>([]);
  const [giversText, setGiversText] = useState("");
  const [drains, setDrains] = useState<string[]>([]);
  const [drainsText, setDrainsText] = useState("");
  const [score, setLocalScore] = useState(0);

  const pulse     = useRef(new Animated.Value(1)).current;
  const aura      = useRef(new Animated.Value(0.08)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const handleVideoReady = useCallback(() => {
    Animated.timing(videoOpacity, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  }, []);

  const player = useVideoPlayer(require("../assets/screens/onboarding.mp4"), p => {
    p.loop  = true;
    p.muted = true;
    p.play();
  });

  // Зупиняємо відео на кроці результату (не потрібно)
  useEffect(() => {
    if (step >= 7) player.pause();
    else if (player.status === "paused") player.play();
  }, [step]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(aura, { toValue: 0.22, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aura, { toValue: 0.06, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const fadeToNext = (nextStep: number) => {
    Keyboard.dismiss();
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };

  const toggleTag = (tag: string, list: string[], setter: (v: string[]) => void) => {
    // "Все ок" — виключає інші
    if (tag === "Все ок") {
      setter(list.includes(tag) ? [] : [tag]);
      return;
    }
    // Якщо вибрано "Все ок" — прибираємо
    const filtered = list.filter(t => t !== "Все ок");
    if (filtered.includes(tag)) {
      setter(filtered.filter(t => t !== tag));
    } else {
      setter([...filtered, tag]);
    }
  };

  const calculateFinalScore = () => {
    let base = energyLevel || 50;

    // Зменшуємо за concerns
    const totalPenalty = concerns.reduce((sum, c) => {
      const item = CONCERNS.find(x => x.label === c);
      return sum + (item?.penalty || 0);
    }, 0);
    base -= totalPenalty;
    // Якщо написав текст про турботи — теж трохи зменшуємо
    if (concernsText.trim().length > 10) base -= 4;

    // Бонус за кількість givers (має ресурси)
    base += Math.min(givers.length * 2, 10);
    // Якщо написав текст про ресурси — бонус
    if (giversText.trim().length > 10) base += 4;

    // Пенальті за drains
    base -= Math.min(drains.length * 1.5, 8);
    if (drainsText.trim().length > 10) base -= 3;

    return Math.max(5, Math.min(95, Math.round(base)));
  };

  const goToResult = () => {
    const s = calculateFinalScore();
    setLocalScore(s);
    fadeToNext(7);
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem("naelo_onboarded", "true");
    // Записуємо в контекст — він сам пише в AsyncStorage
    setCtxScore(score);
    setCtxUserName(name);
    await AsyncStorage.setItem("naelo_goal", goal || customGoal);
    await AsyncStorage.setItem("naelo_energy", energyLevel?.toString() || "50");
    await AsyncStorage.setItem("naelo_givers", JSON.stringify(givers));
    await AsyncStorage.setItem("naelo_givers_text", giversText);
    await AsyncStorage.setItem("naelo_drains", JSON.stringify(drains));
    await AsyncStorage.setItem("naelo_drains_text", drainsText);
    await AsyncStorage.setItem("naelo_concerns", JSON.stringify(concerns));
    await AsyncStorage.setItem("naelo_concerns_text", concernsText);
    router.replace("/auth");
  };

  // Кількість кроків для прогресу (2-6 = 5 кроків)
  const TOTAL_STEPS = 6;
  const currentProgress = Math.max(0, step - 1); // step 2 = progress 1, step 7 = done

  return (
    <KeyboardScreen style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Відео монтується одразу і проявляється плавно коли готове */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <VideoView
          player={player}
          style={styles.welcomeBg}
          contentFit="cover"
          nativeControls={false}
          allowsVideoFrameAnalysis={false}
          allowsPictureInPicture={false}
          allowsFullscreen={false}
          onFirstFrameRender={handleVideoReady}
        />
      </Animated.View>

      <Stars />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

            {/* Сфера прибрана — використовуємо фони */}

            {/* ============= КРОК 1 — Ім'я ============= */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.glassCard}>
                <Text style={styles.questionTitle}>Як тебе звати?</Text>
                <Text style={styles.questionSub}>Я хочу звертатись до тебе особисто</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Твоє ім'я..."
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="done"
                  onSubmitEditing={() => name.trim() && fadeToNext(2)}
                />
                <TouchableOpacity
                  style={[styles.btnPrimary, !name.trim() && styles.btnDisabled]}
                  onPress={() => name.trim() && fadeToNext(2)}
                >
                  <Text style={styles.btnText}>Далі →</Text>
                </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ============= КРОК 2 — Мета ============= */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <View style={styles.glassCard}>
                <ProgressBar current={1} total={TOTAL_STEPS} />
                <Text style={styles.questionTitle}>Що для тебе зараз{"\n"}найважливіше, {name}?</Text>
                <View style={styles.optionsGrid}>
                  {GOALS.map((g) => (
                    <TouchableOpacity
                      key={g.label}
                      style={[styles.optionBtn, goal === g.label && styles.optionBtnActive]}
                      onPress={() => { setGoal(g.label); setTimeout(() => fadeToNext(3), 300); }}
                    >
                      <Text style={[styles.optionText, goal === g.label && styles.optionTextActive]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                  {/* Своє */}
                  <View style={[styles.optionBtn, styles.customRow]}>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Своє..."
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={customGoal}
                      onChangeText={setCustomGoal}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (customGoal.trim()) {
                          setGoal(customGoal.trim());
                          fadeToNext(3);
                        }
                      }}
                    />
                    {customGoal.trim() ? (
                      <TouchableOpacity onPress={() => { setGoal(customGoal.trim()); fadeToNext(3); }}>
                        <Text style={{ color: "#FFB300", fontSize: 16, fontWeight: "700" }}>Далі →</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                </View>
              </View>
            )}

            {/* ============= КРОК 3 — Як ти зараз? ============= */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.glassCard}>
                <ProgressBar current={2} total={TOTAL_STEPS} />
                <Text style={styles.questionTitle}>Як ти себе почуваєш{"\n"}прямо зараз?</Text>
                <View style={styles.energyRow}>
                  {ENERGY_LEVELS.map((e) => (
                    <TouchableOpacity
                      key={e.label}
                      style={[styles.energyBtn, energyLevel === e.value && styles.energyBtnActive]}
                      onPress={() => { setEnergyLevel(e.value); setTimeout(() => fadeToNext(4), 300); }}
                    >
                      <Text style={[styles.energyLabel, energyLevel === e.value && styles.energyLabelActive]}>{e.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                </View>
              </View>
            )}

            {/* ============= КРОК 4 — Що турбує? ============= */}
            {step === 4 && (
              <View style={styles.stepContainer}>
                <View style={styles.glassCard}>
                <ProgressBar current={3} total={TOTAL_STEPS} />
                <Text style={styles.questionTitle}>Що тебе зараз турбує?</Text>
                <Text style={styles.questionSub}>Розкажи своїми словами</Text>
                <TextInput
                  style={styles.openInput}
                  placeholder="Напр. не можу нормально спати вже тиждень..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={concernsText}
                  onChangeText={setConcernsText}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.hintLabel}>або обери:</Text>
                <View style={styles.tagsWrap}>
                  {CONCERNS.map((c) => (
                    <TouchableOpacity
                      key={c.label}
                      style={[styles.tag, concerns.includes(c.label) && styles.tagActive]}
                      onPress={() => toggleTag(c.label, concerns, setConcerns)}
                    >
                      <Text style={[styles.tagText, concerns.includes(c.label) && styles.tagTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.btnPrimary, (concerns.length === 0 && !concernsText.trim()) && styles.btnDisabled]}
                  onPress={() => (concerns.length > 0 || concernsText.trim()) && fadeToNext(5)}
                >
                  <Text style={styles.btnText}>Далі →</Text>
                </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ============= КРОК 5 — Що дає енергію ============= */}
            {step === 5 && (
              <View style={styles.stepContainer}>
                <View style={styles.glassCard}>
                <ProgressBar current={4} total={TOTAL_STEPS} />
                <Text style={styles.questionTitle}>Що тобі дає сили?</Text>
                <Text style={styles.questionSub}>Розкажи що тебе заряджає</Text>
                <TextInput
                  style={styles.openInput}
                  placeholder="Напр. люблю гуляти з собакою Бімом біля озера..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={giversText}
                  onChangeText={setGiversText}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.hintLabel}>або обери:</Text>
                <View style={styles.tagsWrap}>
                  {ENERGY_GIVERS.map((g) => (
                    <TouchableOpacity
                      key={g.label}
                      style={[styles.tag, givers.includes(g.label) && styles.tagActive]}
                      onPress={() => toggleTag(g.label, givers, setGivers)}
                    >
                      <Text style={[styles.tagText, givers.includes(g.label) && styles.tagTextActive]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.btnPrimary, (givers.length === 0 && !giversText.trim()) && styles.btnDisabled]}
                  onPress={() => (givers.length > 0 || giversText.trim()) && fadeToNext(6)}
                >
                  <Text style={styles.btnText}>Далі →</Text>
                </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ============= КРОК 6 — Що забирає ============= */}
            {step === 6 && (
              <View style={styles.stepContainer}>
                <View style={styles.glassCard}>
                <ProgressBar current={5} total={TOTAL_STEPS} />
                <Text style={styles.questionTitle}>А що висмоктує{"\n"}твою енергію?</Text>
                <Text style={styles.questionSub}>Що тебе виснажує найбільше?</Text>
                <TextInput
                  style={styles.openInput}
                  placeholder="Напр. надто багато скролю інсту перед сном..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={drainsText}
                  onChangeText={setDrainsText}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.hintLabel}>або обери:</Text>
                <View style={styles.tagsWrap}>
                  {ENERGY_DRAINS.map((d) => (
                    <TouchableOpacity
                      key={d.label}
                      style={[styles.tag, styles.tagDrain, drains.includes(d.label) && styles.tagDrainActive]}
                      onPress={() => toggleTag(d.label, drains, setDrains)}
                    >
                      <Text style={[styles.tagText, drains.includes(d.label) && styles.tagTextDrainActive]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.btnPrimary, (drains.length === 0 && !drainsText.trim()) && styles.btnDisabled]}
                  onPress={() => (drains.length > 0 || drainsText.trim()) && goToResult()}
                >
                  <Text style={styles.btnText}>Далі →</Text>
                </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ============= КРОК 7 — Результат ============= */}
            {step === 7 && (
              <View style={styles.stepContainer}>
                <SoulFlame size={130} showRings={false} style={{ marginBottom: -10 }} />
                <View style={styles.glassCard}>
                <Text style={styles.resultTitle}>
                  {name}, твій вогник запалено!
                </Text>
                <Text style={styles.resultScore}>{score}%</Text>
                <Text style={styles.resultLabel}>Початковий Naelo Score</Text>
                <Text style={styles.resultSub}>
                  {score >= 70
                    ? "Чудово! Твоя енергія вже сильна. Підтримаємо цей рівень разом."
                    : score >= 45
                    ? "Гарний початок! Разом ми розпалимо твоє внутрішнє світло."
                    : "Я тут поруч. Почнемо м'яко і відновимо твою силу крок за кроком."}
                </Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultDetailText}>
                    Ціль: {goal || customGoal}
                  </Text>
                  <Text style={styles.resultDetailText}>
                    {givers.length > 0 ? `${givers.length} джерел енергії` : "Твої джерела сили"} → стануть твоїми звичками
                  </Text>
                  <Text style={styles.resultDetailText}>
                    {drains.length > 0 ? `${drains.length} загроз` : "Твої виклики"} → Naelo слідкуватиме
                  </Text>
                </View>
                <TouchableOpacity style={styles.btnPrimary} onPress={finishOnboarding}>
                  <Text style={styles.btnText}>Увійти в Naelo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.privacyConsent}
                  onPress={() => router.push("/privacy")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.privacyConsentText}>
                    Натискаючи кнопку, ти погоджуєшся з{"\n"}
                    <Text style={styles.privacyConsentLink}>Політикою конфіденційності Naelo</Text>
                  </Text>
                </TouchableOpacity>
                </View>
              </View>
            )}

          </Animated.View>
    </KeyboardScreen>
  );
}

// --- Прогрес-бар ---
const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <View style={styles.progressRow}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[
        styles.progressDot,
        i + 1 === current && styles.progressDotActive,
        i + 1 < current && styles.progressDotDone,
      ]} />
    ))}
  </View>
);

// --- Стилі ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0812" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40, minHeight: "100%" },
  sphereWrap: { marginBottom: 4 },
  welcomeBg: { position: "absolute", top: 0, left: 0, width: width, height: height },
  sphereWrapSmall: { marginBottom: 12, transform: [{ scale: 0.7 }] },
  stepContainer: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, alignItems: "center", gap: 14 },

  // Привітання
  welcomeTitle: { color: "#fff", fontSize: 28, fontWeight: "700", textAlign: "center" },
  welcomeSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 16, textAlign: "center", lineHeight: 24 },

  // Питання
  questionTitle: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", lineHeight: 30, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  questionSub: { color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center", marginTop: -6, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },

  // Прогрес
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)" },
  progressDotActive: { backgroundColor: "#FFB300" },
  progressDotDone: { backgroundColor: "rgba(255,179,0,0.4)" },

  // Опції (мета)
  optionsGrid: { width: "100%", gap: 10 },
  optionBtn: { width: "100%", flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(0,0,0,0.45)" },
  optionBtnActive: { borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.12)" },
  optionText: { color: "rgba(255,255,255,0.75)", fontSize: 15, flex: 1 },
  optionTextActive: { color: "#FFB300", fontWeight: "600" },
  customRow: { gap: 8 },
  customInput: { flex: 1, color: "#fff", fontSize: 15, paddingVertical: 0 },

  // Енергія
  energyRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  energyBtn: { flexBasis: "47%", flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 22, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" },
  energyBtnActive: { borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.12)" },
  energyLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500", textAlign: "center" },
  energyLabelActive: { color: "#FFB300", fontWeight: "700" },

  // Теги (givers/concerns)
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { flexBasis: "47%", flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(0,0,0,0.45)" },
  tagActive: { borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.15)" },
  tagDrain: { borderColor: "rgba(255,255,255,0.12)" },
  tagDrainActive: { borderColor: "#FF6B6B", backgroundColor: "rgba(255,107,107,0.12)" },
  tagText: { color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center" },
  tagTextActive: { color: "#FFB300", fontWeight: "600" },
  tagTextDrainActive: { color: "#FF6B6B", fontWeight: "600" },

  // Відкрите текстове поле (кроки 4-6)
  openInput: { width: "100%", minHeight: 70, maxHeight: 100, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 15, lineHeight: 22 },
  hintLabel: { color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 2 },

  // Ім'я
  nameInput: { width: "100%", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 16, textAlign: "center" },

  // Кнопки
  btnPrimary: { marginTop: 4, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 30, borderWidth: 1.5, borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.1)" },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: "#FFB300", fontSize: 16, fontWeight: "700" },
  hintText: { color: "rgba(255,179,0,0.5)", fontSize: 12 },

  // Privacy consent
  privacyConsent: { paddingTop: 2, paddingBottom: 4, alignItems: "center" },
  privacyConsentText: { color: "rgba(255,255,255,0.22)", fontSize: 12, textAlign: "center", lineHeight: 18 },
  privacyConsentLink: { color: "rgba(255,179,0,0.45)", textDecorationLine: "underline" },

  // Скляна картка — читабельність поверх відео (кроки 4-6)
  glassCard: {
    width: "100%", gap: 14,
    backgroundColor: "rgba(10,8,18,0.72)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 20,
  },

  // Результат
  resultTitle: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" },
  resultScore: { color: "#FFB300", fontSize: 64, fontWeight: "800", textAlign: "center", width: "100%" },
  resultLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: -8 },
  resultSub: { color: "rgba(255,255,255,0.6)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  resultDetails: { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, gap: 8, marginTop: 4 },
  resultDetailText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
});
