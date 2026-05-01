// ~/luma/app/welcome.tsx
// Перший екран — привітання, відео фон
// Тут буде: paywall, контракт, соціальний доказ

import { useRef, useEffect } from "react";
import {
  Animated, Dimensions, Easing, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const player = useVideoPlayer(require("../assets/screens/welcome.mp4"), p => {
    p.loop   = true;
    p.muted  = true;
    p.play();
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      router.replace("/onboarding");
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Відео фон */}
      <VideoView
        player={player}
        style={styles.videoBg}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Затемнення знизу */}
      <View style={styles.gradient} />

      {/* Контент */}
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.contentInner}>
          <Text style={styles.title}>Привіт! Я Naelo ✨</Text>
          <Text style={styles.subtitle}>
            Я допоможу тобі бачити свою енергію{"\n"}і покращувати її щодня
          </Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleStart}>
            <Text style={styles.btnText}>Почати →</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoBg: { position: "absolute", top: 0, left: 0, width, height },
  gradient: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.45,
    backgroundColor: "transparent",
  },
  content: {
    position: "absolute", bottom: height * 0.30, left: 0, right: 0,
    alignItems: "center", paddingHorizontal: 30,
  },
  contentInner: {
    width: "100%", maxWidth: 460, alignItems: "center",
  },
  title: {
    color: "#fff", fontSize: 30, fontWeight: "700",
    textAlign: "center", marginBottom: 12, letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)", fontSize: 16, textAlign: "center",
    lineHeight: 24, marginBottom: 32,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  btnPrimary: {
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30,
    borderWidth: 1.5, borderColor: "#FFB300",
    backgroundColor: "rgba(255,179,0,0.12)",
  },
  btnText: { color: "#FFB300", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
});
