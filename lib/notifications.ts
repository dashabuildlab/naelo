// ~/naelo-app/lib/notifications.ts
// Щоденні нагадування про check-in через expo-notifications

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY_ENABLED = "naelo_reminder_enabled";
const KEY_TIME    = "naelo_reminder_time"; // "HH:MM"

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("checkin", {
      name: "Щоденне нагадування",
      description: "Нагадування про щоденний чекін",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleCheckinReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setupNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Naelo — час для себе ✨",
      body: "Як ти зараз? Зроби маленький чекін і відчуй свій вогник.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: "checkin",
    },
  });
  await AsyncStorage.setItem(KEY_ENABLED, "true");
  await AsyncStorage.setItem(KEY_TIME, `${hour}:${minute}`);
}

export async function cancelCheckinReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(KEY_ENABLED, "false");
  await AsyncStorage.removeItem(KEY_TIME);
}

export async function getReminderSettings(): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
}> {
  const [enabled, time] = await Promise.all([
    AsyncStorage.getItem(KEY_ENABLED),
    AsyncStorage.getItem(KEY_TIME),
  ]);
  let hour = 20, minute = 0;
  if (time) {
    const [h, m] = time.split(":").map(Number);
    if (!isNaN(h)) hour = h;
    if (!isNaN(m)) minute = m;
  }
  return { enabled: enabled === "true", hour, minute };
}
