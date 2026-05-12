// ~/naelo-app/lib/SacredGeometry.tsx
// Sacred geometry overlay — концентричне коло, радіальні лінії, точки-зірки.
// Накладається ПОВЕРХ сфери-фону. Опціональне повільне обертання (rotate).

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Defs, RadialGradient, Stop, Path } from "react-native-svg";
import { COLORS } from "./theme";

type Props = {
  /** Загальний розмір (height === width). За замовчуванням 360px. */
  size?: number;
  /** Колір сітки (default — золотий primary). */
  color?: string;
  /** Базова прозорість сітки 0..1. Default 0.55. */
  opacity?: number;
  /** Кількість радіальних ліній. Default 12 — симетрично, по 30°. */
  radialLines?: number;
  /** Кількість точок-зірок на колі. Default 12 (узгоджено з radialLines). */
  starDots?: number;
  /** Включити повільне обертання (90s loop). Default true. */
  rotate?: boolean;
};

export default function SacredGeometry({
  size = 360,
  color = COLORS.primary,
  opacity = 0.55,
  radialLines = 12,
  starDots = 12,
  rotate = true,
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!rotate) return;
    // Дуже повільне обертання — 90 секунд на повний оберт. Майже непомітно,
    // але дає відчуття "живості" сцени.
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 90000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotate]);

  const rotateStr = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const cx = size / 2;
  const cy = size / 2;
  // Великий зовнішній радіус — рамка сітки (≈45% від size).
  const rOuter = size * 0.45;
  // Внутрішній радіус — невелике коло близько до сфери (≈30%).
  const rInner = size * 0.30;
  // Радіус точок-зірок на колі.
  const dotR = 3;

  // Координати точок (полярні → декартові)
  const polar = (r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;  // -90 щоб 0° = вгорі
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  // Радіальні лінії — від внутрішнього кола до зовнішнього
  const lines = Array.from({ length: radialLines }).map((_, i) => {
    const angle = (360 / radialLines) * i;
    const start = polar(rInner, angle);
    const end   = polar(rOuter, angle);
    return { id: i, ...start, x2: end.x, y2: end.y };
  });

  // Точки-зірки — на зовнішньому колі
  const stars = Array.from({ length: starDots }).map((_, i) => {
    const angle = (360 / starDots) * i + (360 / starDots) / 2;  // зсув на пів-сектора
    return { id: i, ...polar(rOuter, angle) };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { width: size, height: size, transform: rotate ? [{ rotate: rotateStr }] : [] },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Радіальний градієнт для зовнішнього кола — fade від центру */}
          <RadialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={color} stopOpacity="0" />
            <Stop offset="85%"  stopColor={color} stopOpacity={opacity * 0.4} />
            <Stop offset="100%" stopColor={color} stopOpacity={opacity * 0.15} />
          </RadialGradient>
        </Defs>

        {/* Зовнішнє коло (тонке) */}
        <Circle
          cx={cx}
          cy={cy}
          r={rOuter}
          stroke={color}
          strokeWidth={0.8}
          strokeOpacity={opacity * 0.65}
          fill="none"
        />

        {/* Внутрішнє коло (ще тонше) */}
        <Circle
          cx={cx}
          cy={cy}
          r={rInner}
          stroke={color}
          strokeWidth={0.5}
          strokeOpacity={opacity * 0.35}
          fill="none"
        />

        {/* Glow заливка зовнішнього кола */}
        <Circle cx={cx} cy={cy} r={rOuter} fill="url(#rimGlow)" />

        {/* Радіальні лінії */}
        {lines.map((l) => (
          <Line
            key={l.id}
            x1={l.x}
            y1={l.y}
            x2={l.x2}
            y2={l.y2}
            stroke={color}
            strokeWidth={0.5}
            strokeOpacity={opacity * 0.45}
          />
        ))}

        {/* Точки-зірки на зовнішньому колі */}
        {stars.map((s) => (
          <React.Fragment key={s.id}>
            {/* Сяйво навколо точки */}
            <Circle
              cx={s.x}
              cy={s.y}
              r={dotR * 2.5}
              fill={color}
              opacity={opacity * 0.15}
            />
            {/* Сама точка */}
            <Circle
              cx={s.x}
              cy={s.y}
              r={dotR}
              fill={color}
              opacity={opacity * 0.95}
            />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
