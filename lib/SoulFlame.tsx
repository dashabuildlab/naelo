// ~/luma/lib/SoulFlame.tsx
// Вогник душі — єдиний спільний компонент для всіх екранів

import { useEffect, useRef } from "react";
import { Animated, Easing, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

type Props = {
  /** Діаметр сфери в пікселях (default 160) */
  size?: number;
  /** Показувати пульсуючі кільця навколо (default true) */
  showRings?: boolean;
  style?: ViewStyle;
};

export default function SoulFlame({ size = 160, showRings = true, style }: Props) {
  const RS = size / 2;

  // Сфера
  const pulse = useRef(new Animated.Value(1)).current;
  const aura  = useRef(new Animated.Value(0.08)).current;

  // Кільця
  const ring1P = useRef(new Animated.Value(1)).current;
  const ring1G = useRef(new Animated.Value(0.35)).current;
  const ring2P = useRef(new Animated.Value(1)).current;
  const ring2G = useRef(new Animated.Value(0.2)).current;
  const ring3P = useRef(new Animated.Value(1)).current;
  const ring3G = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    // Пульс сфери
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.0,  duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    // Аура
    Animated.loop(Animated.sequence([
      Animated.timing(aura, { toValue: 0.22, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aura, { toValue: 0.06, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    if (!showRings) return;

    // Кільце 1
    Animated.loop(Animated.sequence([
      Animated.timing(ring1P, { toValue: 1.08, duration: 2500, useNativeDriver: true }),
      Animated.timing(ring1P, { toValue: 1.0,  duration: 2500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring1G, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
      Animated.timing(ring1G, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
    ])).start();

    // Кільце 2
    Animated.loop(Animated.sequence([
      Animated.timing(ring2P, { toValue: 1.12, duration: 3200, useNativeDriver: true }),
      Animated.timing(ring2P, { toValue: 1.0,  duration: 3200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring2G, { toValue: 0.6, duration: 2800, useNativeDriver: true }),
      Animated.timing(ring2G, { toValue: 0.1, duration: 2800, useNativeDriver: true }),
    ])).start();

    // Кільце 3
    Animated.loop(Animated.sequence([
      Animated.timing(ring3P, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
      Animated.timing(ring3P, { toValue: 1.0,  duration: 4000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring3G, { toValue: 0.45, duration: 3500, useNativeDriver: true }),
      Animated.timing(ring3G, { toValue: 0.08, duration: 3500, useNativeDriver: true }),
    ])).start();
  }, []);

  // Розміри кілець пропорційні до сфери
  const R1 = size * 0.56;
  const R2 = size * 1.0;
  const R3 = size * 1.5;
  const WRAP = size * 2; // контейнер охоплює всі кільця

  return (
    <View style={[{ width: WRAP, height: WRAP, alignItems: "center", justifyContent: "center" }, style]}>

      {/* Помаранчева аура */}
      <Animated.View style={{
        position: "absolute",
        width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7,
        backgroundColor: "#FF8C00", opacity: aura,
      }} />
      <Animated.View style={{
        position: "absolute",
        width: size * 0.85, height: size * 0.85, borderRadius: size * 0.425,
        backgroundColor: "#FFD700", opacity: aura,
      }} />

      {/* Пульсуючі кільця */}
      {showRings && (
        <>
          <Animated.View style={{
            position: "absolute",
            width: R1, height: R1, borderRadius: R1 / 2,
            borderWidth: 1.5, borderColor: "rgba(255,179,0,0.6)",
            opacity: ring1G, transform: [{ scale: ring1P }],
          }} />
          <Animated.View style={{
            position: "absolute",
            width: R2, height: R2, borderRadius: R2 / 2,
            borderWidth: 1, borderColor: "rgba(255,179,0,0.35)",
            opacity: ring2G, transform: [{ scale: ring2P }],
          }} />
          <Animated.View style={{
            position: "absolute",
            width: R3, height: R3, borderRadius: R3 / 2,
            borderWidth: 0.8, borderColor: "rgba(255,179,0,0.2)",
            opacity: ring3G, transform: [{ scale: ring3P }],
          }} />
        </>
      )}

      {/* SVG-сфера */}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="sfGrad" cx="38%" cy="32%" r="70%">
              <Stop offset="0%"   stopColor="#FFF5B0" stopOpacity="1" />
              <Stop offset="25%"  stopColor="#FFD050" stopOpacity="1" />
              <Stop offset="55%"  stopColor="#FFB300" stopOpacity="1" />
              <Stop offset="80%"  stopColor="#FF6A00" stopOpacity="1" />
              <Stop offset="100%" stopColor="#3D0F00" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="sfVig" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#000000" stopOpacity="0" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
            </RadialGradient>
          </Defs>
          {/* Сфера */}
          <Circle cx={RS} cy={RS} r={RS * 0.88} fill="url(#sfGrad)" />
          {/* Відблиск (великий) */}
          <Circle cx={RS * 0.62} cy={RS * 0.55} r={RS * 0.18} fill="rgba(255,252,200,0.7)" />
          {/* Відблиск (точка) */}
          <Circle cx={RS * 0.62} cy={RS * 0.55} r={RS * 0.08} fill="rgba(255,255,255,0.9)" />
          {/* Вінет */}
          <Circle cx={RS} cy={RS} r={RS * 0.88} fill="url(#sfVig)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
