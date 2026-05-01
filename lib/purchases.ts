// ~/luma/lib/purchases.ts
// RevenueCat premium підписка — ініціалізація та перевірка

import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ── RevenueCat API Keys (замінити на реальні з dashboard) ──────────
const RC_IOS_KEY     = "appl_XXXXXXXXXXXXXXXXXXXXXXXXXX";
const RC_ANDROID_KEY = "goog_XXXXXXXXXXXXXXXXXXXXXXXXXX";

export const ENTITLEMENT_ID    = "premium";
export const STORAGE_KEY_PREM  = "naelo_premium";

// В Expo Go нативний стор недоступний — пропускаємо ініціалізацію
const isExpoGo = Constants.appOwnership === "expo";

// ── Ініціалізація (викликати один раз в _layout.tsx) ───────────────
export async function initPurchases(): Promise<void> {
  if (isExpoGo) return;          // ← не ініціалізуємо в Expo Go
  try {
    Purchases.configure({
      apiKey: Platform.OS === "ios" ? RC_IOS_KEY : RC_ANDROID_KEY,
    });
  } catch (e) {
    console.warn("[RC] init failed:", e);
  }
}

// ── Перевірка активного преміуму ──────────────────────────────────
export async function checkPremium(): Promise<boolean> {
  // Локальний кеш для швидкості
  const cached = await AsyncStorage.getItem(STORAGE_KEY_PREM);
  if (cached === "true") return true;
  if (isExpoGo) return false;    // ← Expo Go: завжди free
  try {
    const info = await Purchases.getCustomerInfo();
    const active = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    if (active) await AsyncStorage.setItem(STORAGE_KEY_PREM, "true");
    return active;
  } catch {
    return false;
  }
}

// ── Офферінги (пакети підписок) ────────────────────────────────────
export async function getOfferings() {
  if (isExpoGo) return null;
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

// ── Купити пакет ──────────────────────────────────────────────────
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    if (active) await AsyncStorage.setItem(STORAGE_KEY_PREM, "true");
    return active;
  } catch {
    return false;
  }
}

// ── Відновити покупки ─────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const info = await Purchases.restorePurchases();
    const active = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    await AsyncStorage.setItem(STORAGE_KEY_PREM, active ? "true" : "false");
    return active;
  } catch {
    return false;
  }
}
