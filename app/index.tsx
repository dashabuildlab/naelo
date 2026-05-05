// ~/luma/app/index.tsx
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        router.replace("/home");
        return;
      }
      const onboarded = await AsyncStorage.getItem("naelo_onboarded");
      router.replace(onboarded === "true" ? "/home" : "/welcome");
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0812", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#FFB300" size="large" />
    </View>
  );
}
