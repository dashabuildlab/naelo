// ~/luma/app/paywall.tsx
// Пейвол — RevenueCat premium підписка

import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { PurchasesPackage } from "react-native-purchases";
import { getOfferings, purchasePackage, restorePurchases } from "../lib/purchases";
import { COLORS, SIZES, CONTENT_PAD_H, CONTENT_MAX_W } from "../lib/theme";

// ── Mock пакети для Expo Go / скріншотів ─────────────────────────
const MOCK_PACKAGES = [
  { identifier: "weekly",  packageType: "WEEKLY",  product: { title: "Тижневий", price: 1.99, priceString: "$1.99",  currencyCode: "USD" } },
  { identifier: "monthly", packageType: "MONTHLY", product: { title: "Місячний", price: 4.99, priceString: "$4.99",  currencyCode: "USD" } },
  { identifier: "annual",  packageType: "ANNUAL",  product: { title: "Річний",   price: 29.99, priceString: "$29.99", currencyCode: "USD" } },
];

// ── Описи планів ─────────────────────────────────────────────────
const FREE_FEATURES = [
  "Щоденні чекіни та Вогник душі",
  "AI-чат (7 днів контексту)",
  "3 практики в день",
  "Навігатор мрій",
  "Базова статистика (30 днів)",
];

const PREMIUM_FEATURES: { text: string; icon: string }[] = [
  { text: "Повний AI-контекст (без ліміту)", icon: "infinite-outline" },
  { text: "Необмежені практики в день",      icon: "flash"            },
  { text: "Повна статистика та аналітика",   icon: "stats-chart"      },
  { text: "Streak-відновлення раз на місяць", icon: "flame"           },
  { text: "Все з безкоштовного плану",        icon: "checkmark-circle" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [packages, setPackages]     = useState<PurchasesPackage[]>([]);
  const [selected, setSelected]     = useState<PurchasesPackage | null>(null);
  const [loading, setLoading]       = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => { loadOfferings(); }, []);

  const loadOfferings = async () => {
    const o = await getOfferings();
    const pkgs: PurchasesPackage[] = o?.current?.availablePackages ?? [];
    // Якщо RevenueCat недоступний (Expo Go) — показуємо mock для скріншотів
    const finalPkgs = pkgs.length > 0 ? pkgs : (MOCK_PACKAGES as any);
    setPackages(finalPkgs);
    const annual = finalPkgs.find((p: any) => p.packageType === "ANNUAL");
    setSelected(annual ?? finalPkgs[0] ?? null);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selected || purchasing) return;
    setPurchasing(true);
    try {
      const ok = await purchasePackage(selected);
      if (ok) {
        Alert.alert("Naelo Premium активовано!", "Дякуємо ✨ Твій вогник тепер без меж.", [
          { text: "Чудово!", onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert("Помилка покупки", "Спробуй ще раз або зверніться до підтримки.");
      }
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const ok = await restorePurchases();
      Alert.alert(
        ok ? "Відновлено! ✓" : "Покупок не знайдено",
        ok ? "Твій Premium знову активний." : "Жодних попередніх покупок не знайдено."
      );
      if (ok) router.back();
    } catch {
      Alert.alert("Помилка", "Не вдалось відновити покупки.");
    }
    setPurchasing(false);
  };

  const isAnnual = (pkg: PurchasesPackage) => pkg.packageType === "ANNUAL";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Герой ── */}
        <View style={styles.hero}>
          <View style={styles.diamondWrap}>
            <Ionicons name="diamond" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Naelo Premium</Text>
          <Text style={styles.heroSub}>Розкрий повний потенціал свого вогника</Text>
        </View>

        {/* ── Порівняння планів ── */}
        <View style={styles.compareRow}>
          {/* Безкоштовний */}
          <View style={styles.freeCard}>
            <Text style={styles.planLabel}>Безкоштовно</Text>
            {FREE_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark" size={13} color={COLORS.textMuted} style={{ marginTop: 1 }} />
                <Text style={styles.featureTextFree}>{f}</Text>
              </View>
            ))}
          </View>
          {/* Premium */}
          <View style={styles.premiumCard}>
            <Text style={styles.planLabelPremium}>Premium ✦</Text>
            {PREMIUM_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name={f.icon as any} size={13} color={COLORS.primary} style={{ marginTop: 1 }} />
                <Text style={styles.featureTextPremium}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Пакети підписок ── */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} size="large" />
        ) : packages.length === 0 ? (
          <View style={styles.noOfferingsWrap}>
            <Ionicons name="cloud-offline-outline" size={32} color={COLORS.textFaint} />
            <Text style={styles.noOfferingsText}>Підписки тимчасово недоступні</Text>
          </View>
        ) : (
          <View style={styles.packagesWrap}>
            <Text style={styles.packagesTitle}>Обери план</Text>
            {packages.map((pkg) => {
              const isSelected = selected?.identifier === pkg.identifier;
              const annual = isAnnual(pkg);
              const monthlyPrice = annual
                ? `${pkg.product.currencyCode} ${(pkg.product.price / 12).toFixed(2)} / міс`
                : null;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.pkgCard, isSelected && styles.pkgCardActive]}
                  onPress={() => setSelected(pkg)}
                  activeOpacity={0.8}
                >
                  {annual && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>Найвигідніше</Text>
                    </View>
                  )}
                  <View style={styles.pkgLeft}>
                    <View style={[styles.radio, isSelected && styles.radioActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text style={styles.pkgName}>{annual ? "Рік" : pkg.packageType === "WEEKLY" ? "Тиждень" : "Місяць"}</Text>
                      {monthlyPrice && <Text style={styles.pkgSub}>{monthlyPrice}</Text>}
                    </View>
                  </View>
                  <Text style={[styles.pkgPrice, isSelected && { color: COLORS.primary }]}>
                    {pkg.product.priceString}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[styles.ctaBtn, (purchasing || !selected) && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selected}
          activeOpacity={0.85}
        >
          {purchasing
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.ctaText}>Підключити Premium →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restoreText}>Відновити покупки</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Підписка поновлюється автоматично. Скасувати — у налаштуваннях магазину до кінця поточного періоду.
        </Text>
        <TouchableOpacity onPress={() => router.push("/terms")}>
          <Text style={styles.legalLink}>Умови використання</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  topBar: { paddingTop: SIZES.paddingTop, paddingHorizontal: 16, paddingBottom: 4, alignItems: "flex-end" },
  closeBtn: { padding: 8 },

  scroll: {
    paddingHorizontal: CONTENT_PAD_H, paddingBottom: 40,
    maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const,
  },

  // Hero
  hero: { alignItems: "center", paddingVertical: 20, gap: 10 },
  diamondWrap: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: "rgba(255,179,0,0.1)", borderWidth: 1.5,
    borderColor: "rgba(255,179,0,0.3)", alignItems: "center", justifyContent: "center",
  },
  heroTitle: { color: COLORS.text, fontSize: 26, fontWeight: "800", letterSpacing: 0.5 },
  heroSub:   { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Comparison
  compareRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  freeCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 14, gap: 8,
  },
  premiumCard: {
    flex: 1, backgroundColor: "rgba(255,179,0,0.05)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1, borderColor: "rgba(255,179,0,0.25)", padding: 14, gap: 8,
  },
  planLabel:        { color: COLORS.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 2 },
  planLabelPremium: { color: COLORS.primary,   fontSize: 12, fontWeight: "700", marginBottom: 2 },
  featureRow:         { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  featureTextFree:    { color: COLORS.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
  featureTextPremium: { color: COLORS.textSoft,  fontSize: 11, flex: 1, lineHeight: 16 },

  // Packages
  packagesWrap:  { marginBottom: 20, gap: 10 },
  packagesTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  pkgCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: SIZES.radiusLarge,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", padding: 16,
  },
  pkgCardActive:  { borderColor: COLORS.primary, backgroundColor: "rgba(255,179,0,0.06)" },
  bestBadge: {
    position: "absolute" as const, top: -10, right: 14,
    backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  bestBadgeText: { color: "#000", fontSize: 11, fontWeight: "800" },
  pkgLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  radio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.borderLight, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: COLORS.primary },
  radioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  pkgName:   { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  pkgSub:    { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  pkgPrice:  { color: COLORS.textSoft, fontSize: 17, fontWeight: "700" },

  noOfferingsWrap: { alignItems: "center", paddingVertical: 32, gap: 12 },
  noOfferingsText: { color: COLORS.textMuted, fontSize: 14 },

  // CTA
  ctaBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusRound,
    paddingVertical: 16, alignItems: "center", marginBottom: 14, marginTop: 4,
  },
  ctaBtnDisabled: { backgroundColor: "rgba(255,179,0,0.3)" },
  ctaText: { color: "#000", fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },

  restoreBtn: { alignItems: "center", paddingVertical: 10, marginBottom: 12 },
  restoreText: { color: COLORS.textMuted, fontSize: 14, textDecorationLine: "underline" },

  legal: { color: "rgba(255,255,255,0.18)", fontSize: 11, textAlign: "center", lineHeight: 16 },
  legalLink: { color: "rgba(255,179,0,0.4)", fontSize: 11, textAlign: "center", marginTop: 6, textDecorationLine: "underline" },
});
