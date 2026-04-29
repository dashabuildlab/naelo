// ~/luma/app/luma/lib/theme.ts
// Єдине джерело стилів для всього додатку

import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// ============= КОЛЬОРИ =============
export const COLORS = {
  // Основні
  primary: "#FFB300",
  primaryDim: "rgba(255,179,0,0.12)",
  primaryBorder: "rgba(255,179,0,0.4)",
  primaryFaint: "rgba(255,179,0,0.06)",
  primaryGlow: "rgba(255,179,0,0.2)",
  primarySoft: "rgba(255,179,0,0.08)",

  // Фони
  bg: "#0a0812",
  bgDark: "#000",
  bgModal: "#13102A",
  card: "rgba(0,0,0,0.45)",
  cardLight: "rgba(255,255,255,0.05)",
  cardLighter: "rgba(255,255,255,0.06)",
  cardFaint: "rgba(255,255,255,0.03)",

  // Тексти
  text: "#fff",
  textSoft: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.45)",
  textFaint: "rgba(255,255,255,0.3)",
  textPlaceholder: "rgba(255,255,255,0.35)",
  textDisabled: "rgba(255,255,255,0.25)",

  // Бордери
  border: "rgba(255,255,255,0.2)",
  borderLight: "rgba(255,255,255,0.1)",
  borderFaint: "rgba(255,255,255,0.08)",
  borderPrimary: "rgba(255,179,0,0.3)",

  // Статуси
  success: "#4ADE80",
  successDim: "rgba(74,222,128,0.12)",
  successBorder: "rgba(74,222,128,0.3)",
  danger: "#FF6B6B",
  dangerDim: "rgba(255,107,107,0.12)",
  dangerBorder: "rgba(255,107,107,0.3)",
  info: "#60A5FA",
  purple: "#9B8FFF",

  // Score кольори
  scoreHigh: "#FFD700",
  scoreMid: "#FFA500",
  scoreLow: "#FF6B6B",

  // Сфера / маяк
  glow: "#FFF5B0",
  ring1: "#FFE066",
  ring2: "#FFB300",
  ring3: "#FF8C00",
  spark: "#FFD700",
} as const;

// ============= РОЗМІРИ =============
export const SIZES = {
  width,
  height,

  // Відступи
  paddingH: 20,
  paddingTop: 60,

  // Радіуси
  radiusSmall: 12,
  radius: 16,
  radiusLarge: 20,
  radiusRound: 30,

  // Шрифти
  fontXS: 11,
  fontSM: 13,
  fontMD: 15,
  fontLG: 18,
  fontXL: 22,
  fontXXL: 28,
  fontTitle: 30,
} as const;

// ============= ТІНІ =============
export const SHADOWS = {
  text: {
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  textLight: {
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
} as const;

// ============= СПІЛЬНІ СТИЛІ =============
export const SHARED = {
  // --- Контейнери ---
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  } as const,

  screenDark: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  } as const,

  // --- Інпути ---
  input: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: SIZES.fontMD,
  } as const,

  // --- Кнопки ---
  btnPrimary: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center" as const,
  },

  btnPrimaryText: {
    color: COLORS.primary,
    fontSize: SIZES.fontLG,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },

  btnSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  btnSecondaryText: {
    color: COLORS.textSoft,
    fontSize: SIZES.fontMD,
  },

  // --- Картки ---
  card: {
    width: "100%" as const,
    backgroundColor: COLORS.primaryFaint,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    borderRadius: SIZES.radiusLarge,
    padding: 16,
    alignItems: "center" as const,
    gap: 8,
  },

  cardNeutral: {
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 18,
  },

  // --- Теги ---
  tag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  tagActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },

  // --- Прогрес-бар ---
  progressBar: {
    width: "100%" as const,
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },

  progressFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // --- Текст з тінню (для відео фонів) ---
  questionTitle: {
    color: COLORS.text,
    fontSize: SIZES.fontXL,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    lineHeight: 30,
    ...SHADOWS.text,
  },

  questionSub: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSM + 1,
    textAlign: "center" as const,
    ...SHADOWS.textLight,
  },

  // --- Чекбокс ---
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  checkboxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  checkmark: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700" as const,
  },

  // --- Модальне вікно ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end" as const,
  },

  modalContainer: {
    backgroundColor: COLORS.bgModal,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },

  modalContainerCenter: {
    backgroundColor: COLORS.bgModal,
    borderRadius: 24,
    padding: 28,
    width: "100%" as const,
    gap: 16,
  },
} as const;

// ============= УТИЛІТИ =============
export const scoreColor = (score: number) =>
  score >= 80 ? COLORS.scoreHigh : score >= 40 ? COLORS.scoreMid : COLORS.scoreLow;
