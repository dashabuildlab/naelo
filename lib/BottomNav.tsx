// ~/luma/lib/BottomNav.tsx
// Спільна навігація — єдиний компонент для всіх екранів

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "./theme";

const TABS = [
  { icon: "⌂", label: "Вогник",    route: "/home" },
  { icon: "☰", label: "Мій шлях",  route: "/my-path" },
  { icon: "⚡", label: "Фокус",     route: "/pharmacy" },
  { icon: "✦", label: "Мрії",      route: "/dream-path" },
  { icon: "◉", label: "Naelo",     route: "/chat" },
] as const;

type Props = {
  active: "home" | "my-path" | "pharmacy" | "dream-path" | "chat";
};

export default function BottomNav({ active }: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.route === `/${active}`;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.item}
            onPress={() => router.push(tab.route as any)}
          >
            <Text style={[styles.icon, isActive && styles.active]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.active]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(10,8,18,0.95)",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.borderLight,
    paddingBottom: 28,
    paddingTop: 12,
  },
  item: { flex: 1, alignItems: "center", gap: 4 },
  icon: { fontSize: 20, color: COLORS.textMuted },
  label: { fontSize: 11, color: COLORS.textMuted },
  active: { color: COLORS.primary },
});
