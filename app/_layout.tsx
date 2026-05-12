// ~/naelo-app/app/_layout.tsx
import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useEffect } from "react";
import { AppProvider } from "../lib/AppContext";
import * as Notifications from "expo-notifications";
import { auth } from "../lib/firebase";
import { setAnalyticsUser, logMessage, getCrashlyticsInstance } from "../lib/analytics";
import { setupNotificationChannel } from "../lib/notifications";
import { initPurchases } from "../lib/purchases";

// Глобальний хендлер нотифікацій (показувати у foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // Global JS error → Crashlytics
    const origHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      try {
        getCrashlyticsInstance().recordError(error);
        logMessage(`[crash] isFatal=${isFatal} ${error?.message}`);
      } catch {}
      origHandler?.(error, isFatal);
    });

    // Ініціалізація сервісів
    setupNotificationChannel().catch(() => {});
    initPurchases().catch(() => {});

    // Track signed-in user across sessions
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await setAnalyticsUser(user.uid, user.displayName ?? undefined);
        logMessage(`auth:signIn uid=${user.uid}`);
      } else {
        logMessage("auth:signOut");
      }
    });

    return unsub;
  }, []);

  return (
    <AppProvider>
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="home" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="pharmacy" />
        <Stack.Screen name="my-path" />
        <Stack.Screen name="dream-path" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="paywall" />
      </Stack>
    </KeyboardProvider>
    </AppProvider>
  );
}
