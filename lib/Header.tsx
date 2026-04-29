// ~/luma/lib/Header.tsx
// Стандартний хедер — назад + заголовок + правий слот

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS, SIZES } from "./theme";

type Props = {
  title: string;
  backTo?: string;         // роут для кнопки назад (default: /home)
  right?: React.ReactNode; // правий слот (кнопка редагування тощо)
  absolute?: boolean;      // position: absolute (для dream-path)
};

export default function Header({ title, backTo = "/home", right, absolute }: Props) {
  const router = useRouter();

  return (
    <View style={[styles.container, absolute && styles.absolute]}>
      <TouchableOpacity onPress={() => router.push(backTo as any)} hitSlop={8}>
        <Text style={styles.back}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightSlot}>
        {right || <View style={{ width: 32 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.paddingH,
    paddingTop: SIZES.paddingTop,
    paddingBottom: 16,
  },
  absolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  back: { color: COLORS.primary, fontSize: 24 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  rightSlot: { minWidth: 32, alignItems: "flex-end" },
});
