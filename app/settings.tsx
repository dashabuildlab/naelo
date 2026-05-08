// ~/luma/app/settings.tsx
// Налаштування акаунту — профіль, ім'я, вихід

import { useState, useCallback, useEffect } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteUser, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const API_URL = "https://mynaelo.com/api";
import { COLORS, SIZES, SHARED, CONTENT_PAD_H, CONTENT_MAX_W } from "../lib/theme";
import { useAppStore } from "../lib/AppContext";
import { Ionicons } from "@expo/vector-icons";
import Header from "../lib/Header";
import {
  getReminderSettings,
  scheduleCheckinReminder,
  cancelCheckinReminder,
  requestNotificationPermission,
} from "../lib/notifications";

export default function SettingsScreen() {
  const router = useRouter();
  const { setScore, setUserName: setCtxUserName, setStreak } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Відстежуємо стан авторизації
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      if (user?.email) setEmail(user.email);
    });
    return unsub;
  }, []);

  // Нагадування
  const [reminderOn, setReminderOn]       = useState(false);
  const [reminderHour, setReminderHour]   = useState(20);
  const [reminderMin, setReminderMin]     = useState(0);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      const savedName = await AsyncStorage.getItem("naelo_name") || "";
      setName(savedName);
      if (auth.currentUser?.email) setEmail(auth.currentUser.email);
      // Нагадування
      const rem = await getReminderSettings();
      setReminderOn(rem.enabled);
      setReminderHour(rem.hour);
      setReminderMin(rem.minute);
    };
    load();
  }, []));

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      setCtxUserName(name.trim()); // → контекст + AsyncStorage
      const uid = auth.currentUser?.uid;
      if (uid) {
        await fetch(`${API_URL}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: uid, name: name.trim() }),
        });
      }
      setEditingName(false);
    } catch (e) {}
    setSaving(false);
  };

  const toggleReminder = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert("Дозвіл відхилено", "Дозволь сповіщення в налаштуваннях пристрою, щоб отримувати нагадування.");
        return;
      }
      await scheduleCheckinReminder(reminderHour, reminderMin);
    } else {
      await cancelCheckinReminder();
    }
    setReminderOn(value);
  };

  const changeHour = async (delta: number) => {
    const h = (reminderHour + delta + 24) % 24;
    setReminderHour(h);
    if (reminderOn) await scheduleCheckinReminder(h, reminderMin);
  };

  const changeMin = async (delta: number) => {
    const m = (reminderMin + delta + 60) % 60;
    setReminderMin(m);
    if (reminderOn) await scheduleCheckinReminder(reminderHour, m);
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Вийти з акаунту?",
      "Ваші дані залишаться збереженими в хмарі.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Вийти",
          onPress: async () => {
            try {
              await firebaseSignOut(auth);
              await AsyncStorage.multiRemove([
                "naelo_onboarded", "naelo_name", "naelo_score",
                "naelo_goal", "naelo_energy", "naelo_givers",
                "naelo_drains", "naelo_concerns",
              ]);
              // Скидаємо контекст — щоб наступний юзер не бачив чужий score
              setScore(50);
              setCtxUserName("");
              setStreak(0);
              router.replace("/auth");
            } catch (e: any) {
              Alert.alert("Помилка", e?.message || "Не вдалося вийти");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Видалити акаунт?",
      "Всі твої дані — вогник, історія, налаштування — будуть стерті назавжди. Це незворотня дія.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              if (uid) {
                await fetch(`${API_URL}/profile?user_id=${uid}`, { method: "DELETE" }).catch(() => {});
              }
              if (auth.currentUser) {
                await deleteUser(auth.currentUser);
              }
              await AsyncStorage.clear();
              setScore(50);
              setCtxUserName("");
              setStreak(0);
              router.replace("/auth");
            } catch (e: any) {
              if (e?.code === "auth/requires-recent-login") {
                Alert.alert("Потрібна повторна авторизація", "Вийди та увійди знову, потім спробуй видалити акаунт.");
              } else {
                Alert.alert("Помилка", e?.message || "Не вдалося видалити акаунт");
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Налаштування" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ height: SIZES.paddingTop + 56 }} />

        {/* Профіль */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профіль</Text>

          {/* Email (readonly) */}
          {email ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{email}</Text>
            </View>
          ) : null}

          {/* Ім'я */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Ім'я</Text>
            {editingName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={30}
                  placeholder="Твоє ім'я"
                  placeholderTextColor={COLORS.textPlaceholder}
                />
                <TouchableOpacity style={styles.saveBtn} onPress={saveName} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? "..." : "Зберегти"}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.editTap} onPress={() => setEditingName(true)}>
                <Text style={styles.fieldValue}>{name || "Не вказано"}</Text>
                <Text style={styles.editIcon}>✎</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Нагадування */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Нагадування</Text>
          <View style={styles.fieldRow}>
            <View style={styles.reminderRow}>
              <View style={styles.iconWrap}><Ionicons name="notifications-outline" size={20} color={COLORS.textMuted} /></View>
              <Text style={styles.actionText}>Щоденний чекін</Text>
              <Switch
                value={reminderOn}
                onValueChange={toggleReminder}
                thumbColor={reminderOn ? COLORS.primary : "#888"}
                trackColor={{ false: "rgba(255,255,255,0.15)", true: "rgba(255,179,0,0.4)" }}
              />
            </View>
          </View>
          {reminderOn && (
            <View style={styles.timePickerRow}>
              {/* Години */}
              <TouchableOpacity style={styles.timeBtn} onPress={() => changeHour(-1)}>
                <Text style={styles.timeBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>{String(reminderHour).padStart(2, "0")}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => changeHour(1)}>
                <Text style={styles.timeBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.timeSep}>:</Text>
              {/* Хвилини */}
              <TouchableOpacity style={styles.timeBtn} onPress={() => changeMin(-5)}>
                <Text style={styles.timeBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>{String(reminderMin).padStart(2, "0")}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => changeMin(5)}>
                <Text style={styles.timeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Акаунт */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Акаунт</Text>

          {isLoggedIn && (
            <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
              <View style={styles.iconWrap}><Ionicons name="log-out-outline" size={20} color={COLORS.textMuted} /></View>
              <Text style={styles.actionText}>Вийти з акаунту</Text>
            </TouchableOpacity>
          )}

          {isLoggedIn && (
            <TouchableOpacity style={[styles.actionRow, styles.actionDanger]} onPress={handleDeleteAccount}>
              <View style={styles.iconWrap}><Ionicons name="trash-outline" size={20} color={COLORS.danger} /></View>
              <Text style={[styles.actionText, { color: COLORS.danger }]}>Видалити акаунт</Text>
            </TouchableOpacity>
          )}

          {!isLoggedIn && (
            <TouchableOpacity style={styles.actionRow} onPress={() => router.replace("/auth")}>
              <View style={styles.iconWrap}><Ionicons name="log-in-outline" size={20} color={COLORS.textMuted} /></View>
              <Text style={styles.actionText}>Увійти в акаунт</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Інформація */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Інформація</Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/privacy")}>
            <View style={styles.iconWrap}><Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textMuted} /></View>
            <Text style={styles.actionText}>Політика конфіденційності</Text>
          </TouchableOpacity>

          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Naelo v1.5.1</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { paddingHorizontal: CONTENT_PAD_H, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },

  section: {
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontXS,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },

  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  fieldLabel: { color: COLORS.textMuted, fontSize: SIZES.fontSM, marginBottom: 4 },
  fieldValue: { color: COLORS.text, fontSize: SIZES.fontMD },

  editTap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editIcon: { color: COLORS.textMuted, fontSize: 16 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  nameInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: SIZES.fontMD,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  saveBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: SIZES.fontSM },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  actionDanger: { },
  iconWrap: { width: 24, alignItems: "center" as const },
  actionText: { color: COLORS.text, fontSize: SIZES.fontMD, flex: 1 },

  reminderRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12,
  },
  timePickerRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
  },
  timeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center" as const, justifyContent: "center" as const,
  },
  timeBtnText: { color: COLORS.primary, fontSize: 20, fontWeight: "600" as const, lineHeight: 22 },
  timeValue: { color: COLORS.text, fontSize: 28, fontWeight: "700" as const, minWidth: 40, textAlign: "center" as const },
  timeSep: { color: COLORS.textMuted, fontSize: 28, fontWeight: "700" as const, marginHorizontal: 4 },

  versionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  versionText: { color: COLORS.textFaint, fontSize: SIZES.fontSM },
});
