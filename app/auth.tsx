// ~/luma/app/auth.tsx
// Авторизація: Google, Apple, Email — через Firebase SDK

import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { supabase } from "../lib/supabase";

import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";

// SHA-256 через вбудований crypto.subtle (Hermes SDK 54, не потребує native модулів)
async function sha256hex(str: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(str);
    const buf  = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return str; // fallback (Apple auth може не спрацювати без SHA-256)
  }
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Google OAuth (WebBrowser, без expo-auth-session/PKCE) ────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
      const nonce    = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const redirect = Linking.createURL("auth/callback");

      const params = new URLSearchParams({
        client_id:     clientId,
        redirect_uri:  redirect,
        response_type: "id_token",
        scope:         "openid profile email",
        nonce,
      });

      const result = await WebBrowser.openAuthSessionAsync(
        `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        redirect,
      );

      if (result.type === "success" && result.url) {
        const fragment = result.url.split("#")[1] ?? "";
        const parsed: Record<string, string> = {};
        fragment.split("&").forEach(p => {
          const [k, v] = p.split("=");
          if (k) parsed[k] = decodeURIComponent(v ?? "");
        });

        if (parsed.id_token) {
          const credential = GoogleAuthProvider.credential(parsed.id_token);
          const fbResult   = await signInWithCredential(auth, credential);
          await syncProfile(fbResult.user.uid, fbResult.user.displayName || "");
          router.replace("/home");
        } else {
          Alert.alert("Помилка", "Google не повернув токен. Перевір redirect URI у Google Console.");
        }
      }
    } catch (e: any) {
      Alert.alert("Помилка", e.message || "Google Sign-In не вдалося");
    } finally {
      setLoading(false);
    }
  };

  // ── Apple Sign-In (тільки iOS) ───────────────────────────────────
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const rawNonce    = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const hashedNonce = await sha256hex(rawNonce);
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
      Alert.alert("Лист надіслано ✉️", `Перевір пошту ${email.trim()} — там буде посилання для скидання пароля`);
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

  // ── Синхронізація профілю в Supabase ────────────────────────────
  const syncProfile = async (uid: string, displayName: string) => {
    const name = displayName || await AsyncStorage.getItem("naelo_name") || "";
    const score = Number(await AsyncStorage.getItem("naelo_score") || 50);
    await supabase.from("profiles").upsert({
      id: uid,
      name,
      score,
      streak: 0,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <Text style={styles.logo}>✨ Naelo</Text>
        <Text style={styles.title}>
          {mode === "register" ? "Створити акаунт" : "Увійти в Naelo"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "register"
            ? "Твій прогрес буде збережено в хмарі"
            : "З поверненням! 🔥"}
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

          {/* Забули пароль? — тільки в режимі login */}
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

          {/* Privacy Policy */}
          <TouchableOpacity style={styles.privacyRow} onPress={() => router.push("/privacy")}>
            <Text style={styles.privacyText}>
              Використовуючи Naelo, ти погоджуєшся з{" "}
              <Text style={styles.privacyLink}>Політикою конфіденційності</Text>
            </Text>
          </TouchableOpacity>
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
  subtitle:        { color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 8, marginBottom: 32, textAlign: "center" },
  form:            { width: "100%", maxWidth: 460, gap: 12 },

  // Social buttons
  btnSocial:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 30, backgroundColor: "#4285F4" },
  btnSocialText:   { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnApple:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 30, backgroundColor: "#fff" },
  btnAppleText:    { color: "#000", fontSize: 15, fontWeight: "700" },

  // Divider
  divider:         { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine:     { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText:     { color: "rgba(255,255,255,0.3)", fontSize: 13 },

  // Mode toggle
  modeRow:         { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 30, padding: 3 },
  modeBtn:         { flex: 1, paddingVertical: 10, borderRadius: 30, alignItems: "center" },
  modeBtnActive:   { backgroundColor: "#FFB300" },
  modeBtnText:     { color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "600" },
  modeBtnTextActive: { color: "#000", fontWeight: "700" },

  // Inputs
  input:           { width: "100%", paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16 },

  // Email button
  btnPrimary:      { paddingVertical: 16, borderRadius: 30, borderWidth: 1.5, borderColor: "#FFB300", backgroundColor: "rgba(255,179,0,0.1)", alignItems: "center" },
  btnDisabled:     { opacity: 0.5 },
  btnText:         { color: "#FFB300", fontSize: 16, fontWeight: "700" },

  btnSkip:         { paddingVertical: 14, alignItems: "center" },
  skipText:        { color: "rgba(255,255,255,0.3)", fontSize: 14 },

  btnForgot:       { alignItems: "center", paddingVertical: 4 },
  forgotText:      { color: "rgba(255,179,0,0.6)", fontSize: 13, textDecorationLine: "underline" },

  privacyRow:      { paddingTop: 4, paddingBottom: 8, alignItems: "center" },
  privacyText:     { color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center", lineHeight: 18 },
  privacyLink:     { color: "rgba(255,179,0,0.5)", textDecorationLine: "underline" },
});
