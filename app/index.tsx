// ~/luma/app/index.tsx
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      // 1. Перевіряємо чи є активна сесія
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/home");
        return;
      }

      // 2. Перевіряємо онбординг
      const onboarded = await AsyncStorage.getItem("naelo_onboarded");
      if (onboarded === "true") {
        router.replace("/home");
      } else {
        router.replace("/welcome");
      }
    };
    check();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0812", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#FFB300" size="large" />
    </View>
  );
}
