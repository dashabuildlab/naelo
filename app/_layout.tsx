// ~/luma/app/_layout.tsx
import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function RootLayout() {
  return (
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
      </Stack>
    </KeyboardProvider>
  );
}
