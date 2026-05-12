// ~/naelo-app/lib/KeyboardScreen.tsx
// Стандартна обгортка для екранів з клавіатурою
// Використовує react-native-keyboard-controller — індустріальний стандарт
//
// Використання:
// <KeyboardScreen>
//   <Text>Контент</Text>
//   <TextInput ... />
//   <Button ... />
// </KeyboardScreen>

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Keyboard, TouchableWithoutFeedback, StyleSheet } from "react-native";

type Props = {
  children: React.ReactNode;
  style?: any;
  bottomOffset?: number;  // відступ від клавіатури (default 20)
};

export default function KeyboardScreen({ children, style, bottomOffset = 20 }: Props) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        style={[styles.container, style]}
        contentContainerStyle={styles.scroll}
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scroll: { flexGrow: 1 },
});
