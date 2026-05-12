// ~/naelo-app/lib/analytics.ts
// Firebase Analytics + Crashlytics + Performance helpers
// Graceful no-op fallback when running in Expo Go (no native Firebase modules)

import Constants from "expo-constants";

// In Expo Go, @react-native-firebase native modules are unavailable.
// We lazy-require them so a failed require is caught and all helpers become no-ops.
const isExpoGo = Constants.appOwnership === "expo";

let _crashlytics: any = null;
let _analytics: any = null;
let _perf: any = null;

if (!isExpoGo) {
  try { _crashlytics = require("@react-native-firebase/crashlytics").default; } catch {}
  try { _analytics  = require("@react-native-firebase/analytics").default;   } catch {}
  try { _perf       = require("@react-native-firebase/perf").default;        } catch {}
}

/** Set user identity across Analytics + Crashlytics */
export async function setAnalyticsUser(userId: string, name?: string) {
  try {
    if (_analytics)   await _analytics().setUserId(userId);
    if (_crashlytics) await _crashlytics().setUserId(userId);
    if (_analytics && name) await _analytics().setUserProperty("name", name);
  } catch {}
}

/** Log a screen view */
export async function logScreen(screenName: string) {
  try {
    if (_analytics) {
      await _analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
    }
  } catch {}
}

/** Log a custom event */
export async function logEvent(name: string, params?: Record<string, any>) {
  try {
    if (_analytics) await _analytics().logEvent(name, params);
  } catch {}
}

/** Record a non-fatal error in Crashlytics */
export function logError(error: Error, context?: string) {
  try {
    if (_crashlytics) {
      if (context) _crashlytics().setAttribute("context", context);
      _crashlytics().recordError(error);
    }
  } catch {}
}

/** Add a breadcrumb message to Crashlytics */
export function logMessage(message: string) {
  try {
    if (_crashlytics) _crashlytics().log(message);
  } catch {}
}

/** Start a Performance Monitoring trace */
export async function startTrace(name: string) {
  try {
    if (_perf) return await _perf().startTrace(name);
  } catch {}
  return { stop: async () => {}, putAttribute: () => {}, putMetric: () => {} };
}

/** Direct crashlytics instance (or no-op proxy) — use in _layout.tsx error handler */
export function getCrashlyticsInstance() {
  if (!_crashlytics) {
    return { recordError: () => {}, log: () => {}, setAttribute: () => {} };
  }
  try { return _crashlytics(); } catch { return { recordError: () => {}, log: () => {}, setAttribute: () => {} }; }
}
