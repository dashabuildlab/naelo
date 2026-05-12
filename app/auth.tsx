// ~/naelo-app/app/auth.tsx
// Авторизація: Google (нативний SDK), Apple, Email — через Firebase

import { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const API_URL = "https://mynaelo.com/api";

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

// В Expo Go нативні модулі не доступні
const isExpoGo = Constants.appOwnership === "expo";

// GoogleSignin завантажується динамічно — статичний import одразу краша в Expo Go
// бо TurboModule RNGoogleSignin не зареєстрований
let GoogleSignin: any = null;
let statusCodes: any = { SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED", IN_PROGRESS: "IN_PROGRESS", PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE" };

if (!isExpoGo) {
  try {
    const gsi = require("@react-native-google-signin/google-signin");
    GoogleSignin = gsi.GoogleSignin;
    statusCodes  = gsi.statusCodes;
    GoogleSignin.configure({
      webClientId: "839119458174-eehh9uo3qikrki66cs32fi5cha2ee2gt.apps.googleusercontent.com",
      iosClientId: "839119458174-enj35mto47av9hqh8cttrdrqh0ljb4t2.apps.googleusercontent.com",
      offlineAccess: false,
      scopes: ["profile", "email"],
    });
  } catch (e) {
    console.warn("GoogleSignin native module not available:", e);
  }
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Google Sign-In (нативний SDK) ────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Google Sign-In",
        "Вхід через Google доступний тільки в нативній збірці (EAS / TestFlight).",
        [{ text: "Зрозуміло" }]
      );
      return;
    }
    setLoading(true);
    try {
      // Перевіряємо Google Play Services (обов'язково на Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Нативний діалог вибору акаунту Google
      const response = await GoogleSignin.signIn();

      // API v13+: response.data.idToken; старіший — response.idToken
      const idToken: string | null =
        (response as any)?.data?.idToken ?? (response as any)?.idToken ?? null;

      if (!idToken) throw new Error("Не вдалось отримати Google ID token");

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      await syncProfile(result.user.uid, result.user.displayName || "");
      router.replace("/home");
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // Користувач закрив діалог — нічого не робимо
      } else if (e.code === statusCodes.IN_PROGRESS) {
        // Вхід вже виконується
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Помилка", "Google Play Services недоступні на цьому пристрої");
      } else {
        Alert.alert("Помилка входу через Google", e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Apple Sign-In (тільки iOS) ───────────────────────────────────
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const rawNonce    = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      // expo-crypto гарантує надійний SHA-256 в будь-якому середовищі
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const apple = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      const credential = new OAuthProvider("apple.com").credential({
        idToken: apple.identityToken!,
        rawNonce,
      });
      const result = await signInWithCredential(auth, credential);
      const name = apple.fullName
        ? `${apple.fullName.givenName || ""} ${apple.fullName.familyName || ""}`.trim()
        : result.user.displayName || "";
      await syncProfile(result.user.uid, name);
      router.replace("/home");
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") Alert.alert("Помилка", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Скидання пароля ─────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Введи email", "Спочатку введи свій email у поле вище");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Лист надіслано", `Перевір пошту ${email.trim()} — там буде посилання для скидання пароля`);
    } catch (e: any) {
      const msg =
        e?.code === "auth/user-not-found" ? "Акаунт з таким email не знайдено"
        : e?.code === "auth/invalid-email" ? "Неправильний формат email"
        : e?.message ?? "Спробуй ще раз";
      Alert.alert("Помилка", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Email ────────────────────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Помилка", "Введи email та пароль (мін. 6 символів)");
      return;
    }
    setLoading(true);
    try {
      let uid = "";
      if (mode === "register") {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        uid = user.uid;
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
        uid = user.uid;
      }
      await syncProfile(uid, "");
      router.replace("/home");
    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use" ? "Цей email вже зареєстровано"
        : e?.code === "auth/user-not-found" || e?.code === "auth/wrong-password"
          ? "Неправильний email або пароль"
          : e?.message ?? "Спробуй ще раз";
      Alert.alert("Помилка", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Синхронізація профілю ────────────────────────────────────────
  const syncProfile = async (uid: string, displayName: string) => {
    const name = displayName || await AsyncStorage.getItem("naelo_name") || "";
    const score = Number(await AsyncStorage.getItem("naelo_score") || 50);
    try {
      await fetch(`${API_URL}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, name, score, streak: 0 }),
      });
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <Text style={styles.logo}>Naelo</Text>
        <Text style={styles.title}>
          {mode === "register" ? "Створити акаунт" : "Увійти в Naelo"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "register"
            ? "Твій прогрес буде збережено в хмарі"
            : "З поверненням"}
        </Text>

        <View style={styles.form}>

          {/* Google */}
          <TouchableOpacity
            style={[styles.btnSocial, loading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.btnSocialText}>Продовжити через Google</Text>
          </TouchableOpacity>

          {/* Apple — тільки iOS */}
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.btnApple, loading && styles.btnDisabled]}
              onPress={handleAppleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.btnAppleText}>Продовжити через Apple</Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>або через email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "register" && styles.modeBtnActive]}
              onPress={() => setMode("register")}
            >
              <Text style={[styles.modeBtnText, mode === "register" && styles.modeBtnTextActive]}>
                Реєстрація
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
              onPress={() => setMode("login")}
            >
              <Text style={[styles.modeBtnText, mode === "login" && styles.modeBtnTextActive]}>
                Вхід
              </Text>
            </TouchableOpacity>
          </View>

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
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Пароль (мін. 6 символів)"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(v => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="rgba(255,255,255,0.45)"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFB300" />
              : <Text style={styles.btnText}>
                  {mode === "register" ? "Зареєструватись →" : "Увійти →"}
                </Text>
            }
          </TouchableOpacity>

          {mode === "login" && (
            <TouchableOpacity
              style={styles.btnForgot}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Забули пароль?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnSkip} onPress={() => router.replace("/home")}>
            <Text style={styles.skipText}>Пропустити поки що →</Text>
          </TouchableOpacity>

          <View style={styles.privacyRow}>
            <Text style={styles.privacyText}>
              Використовуючи Naelo, ти погоджуєшся з{" "}
              <Text style={styles.privacyLink} onPress={() => router.push("/terms")}>Умовами використання</Text>
              {" "}та{" "}
              <Text style={styles.privacyLink} onPress={() => router.push("/privacy")}>Політикою конфіденційності</Text>
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#0a0812" },
  content:         { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  logo:            { fontSize: 36, marginBottom: 24 },
  title:           { color: "#fff", fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle:        { color: "rgba(255,255,255,0.75)", fontSize: 15, marginTop: 8, marginBottom: 32, textAlign: "center" },
  form:            { width: "100%", maxWidth: 460, gap: 12 },

  btnSocial:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 30, backgroundColor: "#4285F4" },
  btnSocialText:   { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnApple:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 30, backgroundColor: "#fff" },
  btnAppleText:    { color: "#000", fontSize: 15, fontWeight: "700" },

  divider:         { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine:     { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText:     { color: "rgba(255,255,255,0.5)", fontSize: 13 },

  modeRow:         { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 30, padding: 3 },
  modeBtn:         { flex: 1, paddingVertical: 10, borderRadius: 30, alignItems: "center" },
  modeBtnActive:   { backgroundColor: "#FFB300" },
  modeBtnText:     { color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "600" },
  modeBtnTextActive: { color: "#000", fontWeight: "700" },

  input:           { width: "100%", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16 },
  passwordRow:     { width: "100%", flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)" },
  passwordInput:   { flex: 1, paddingVertical: 16, paddingHorizontal: 20, color: "#fff", fontSize: 16 },
  eyeBtn:          { paddingHorizontal: 16, paddingVertical: 16 },

  btnPrimary:      { paddingVertical: 16, borderRadius: 30, borderWidth: 1.5, borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.1)", alignItems: "center" },
  btnDisabled:     { opacity: 0.5 },
  btnText:         { color: "#FFB300", fontSize: 16, fontWeight: "700" },

  btnSkip:         { paddingVertical: 14, alignItems: "center" },
  skipText:        { color: "rgba(255,255,255,0.55)", fontSize: 14 },

  btnForgot:       { alignItems: "center", paddingVertical: 4 },
  forgotText:      { color: "rgba(255,179,0,0.6)", fontSize: 13, textDecorationLine: "underline" },

  privacyRow:      { paddingTop: 4, paddingBottom: 8, alignItems: "center" },
  privacyText:     { color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center", lineHeight: 18 },
  privacyLink:     { color: "rgba(255,179,0,0.5)", textDecorationLine: "underline" },
});
