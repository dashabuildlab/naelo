// ~/luma/app/auth.tsx
// Екран авторизації — вхід та реєстрація з збереженням профілю

import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveProfile = async (userId: string) => {
    const name = await AsyncStorage.getItem("luma_name") || "";
    const score = Number(await AsyncStorage.getItem("luma_score") || 50);
    const goal = await AsyncStorage.getItem("luma_goal") || "";
    const energy = await AsyncStorage.getItem("luma_energy") || "";

    await supabase.from("profiles").upsert({
      id: userId,
      name,
      score,
      goal,
      energy_level: energy,
      streak: 0,
    });
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Введи email та пароль");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await saveProfile(data.user.id);
        }
        router.replace("/home");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await saveProfile(data.user.id);
        }
        router.replace("/home");
      }
    } catch (e: any) {
      Alert.alert("Помилка", e.message || "Спробуй ще раз");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    router.replace("/home");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <Text style={styles.logo}>✨ Luma</Text>
        <Text style={styles.title}>
          {mode === "register" ? "Створити акаунт" : "Увійти в Luma"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "register"
            ? "Твій прогрес буде збережено в хмарі"
            : "З поверненням! 🔥"}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Пароль (мін. 6 символів)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFB300" />
              : <Text style={styles.btnText}>
                  {mode === "register" ? "Зареєструватись →" : "Увійти →"}
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")}>
            <Text style={styles.switchText}>
              {mode === "register"
                ? "Вже є акаунт? Увійти"
                : "Немає акаунту? Зареєструватись"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>або</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnSkip} onPress={handleSkip}>
            <Text style={styles.skipText}>Пропустити поки що →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0812" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  logo: { fontSize: 36, marginBottom: 24 },
  title: { color: "#fff", fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 8, marginBottom: 32, textAlign: "center" },
  form: { width: "100%", gap: 14 },
  input: { width: "100%", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16 },
  btnPrimary: { paddingVertical: 16, borderRadius: 30, borderWidth: 1.5, borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.1)", alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#FFB300", fontSize: 16, fontWeight: "700" },
  switchText: { color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  btnSkip: { paddingVertical: 14, alignItems: "center" },
  skipText: { color: "rgba(255,255,255,0.3)", fontSize: 14 },
});
