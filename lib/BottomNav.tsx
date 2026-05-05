// ~/luma/lib/BottomNav.tsx
// Спільна навігація — єдиний компонент для всіх екранів

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, CONTENT_MAX_W, SIZES, isTablet } from "./theme";

type TabKey = "home" | "my-path" | "pharmacy" | "dream-path" | "chat";

const TABS: { key: TabKey; label: string; route: string; icon: any; iconActive: any }[] = [
  { key: "home",       label: "Вогник",   route: "/home",       icon: "flame-outline",       iconActive: "flame" },
  { key: "my-path",    label: "Шлях",     route: "/my-path",    icon: "bar-chart-outline",   iconActive: "bar-chart" },
  { key: "pharmacy",   label: "Фокус",    route: "/pharmacy",   icon: "flash-outline",       iconActive: "flash" },
  { key: "dream-path", label: "Мрії",     route: "/dream-path", icon: "star-outline",        iconActive: "star" },
  { key: "chat",       label: "Naelo",    route: "/chat",       icon: "ellipse-outline",     iconActive: "ellipse" },
];

const ICON_SIZE  = isTablet ? 26 : 22;
const LABEL_SIZE = isTablet ? 11 : 10;

type Props = {
  active: TabKey;
};

export default function BottomNav({ active }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // На Android з edgeToEdgeEnabled потрібен відступ за системну навігаційну панель
  const bottomPad = Math.max(insets.bottom, 10) + 4;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {/* Центруємо вміст по максимальній ширині контенту на iPad */}
      <View style={styles.inner}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.item}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={ICON_SIZE}
                  color={isActive ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive, { fontSize: LABEL_SIZE }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    justifyContent: "center",
    backgroundColor: "rgba(8,6,16,0.97)",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 10,
  },
  // Обмежує ширину іконок — на iPad контент не розтягується на всю ширину екрану
  inner: {
    flexDirection: "row",
    width: "100%",
    maxWidth: CONTENT_MAX_W,
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 2,
  },
  iconWrap: {
    width: isTablet ? 48 : 40,
    height: isTablet ? 36 : 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: "rgba(255,179,0,0.12)",
  },
  label: {
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
