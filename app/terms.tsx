// ~/luma/app/terms.tsx
// Умови використання — обов'язкова вимога App Store & Google Play

import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS, SIZES, CONTENT_PAD_H, CONTENT_MAX_W } from "../lib/theme";

const LAST_UPDATED = "2 травня 2026 р.";
const CONTACT_EMAIL = "support@naelo.app";
const APP_NAME = "Naelo";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.bullet}>{"• "}{children}</Text>
  );
}

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Хедер */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Умови використання</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Оновлено: {LAST_UPDATED}</Text>

        <Section title="1. Прийняття умов">
          Використовуючи застосунок {APP_NAME}, ти погоджуєшся з цими Умовами використання. Якщо ти не погоджуєшся з будь-яким пунктом — будь ласка, не використовуй застосунок.
        </Section>

        <Section title="2. Опис сервісу">
          {APP_NAME} — персональний застосунок для відстеження емоційного стану, енергії та особистого розвитку. Застосунок надає інструменти для щоденних чекінів, AI-чату, постановки цілей та відстеження прогресу.
        </Section>

        <Section title="3. Акаунт та реєстрація">
          <BulletItem>Для використання застосунку необхідно створити акаунт через Email, Google або Apple ID.</BulletItem>
          <BulletItem>Ти несеш відповідальність за збереження конфіденційності свого акаунту.</BulletItem>
          <BulletItem>Ти зобов'язаний надавати достовірну інформацію при реєстрації.</BulletItem>
          <BulletItem>Застосунок призначений для осіб віком від 13 років. Особи молодші 13 років не мають права використовувати {APP_NAME}.</BulletItem>
        </Section>

        <Section title="4. Підписки та оплата">
          <BulletItem>Частина функцій {APP_NAME} доступна лише за платною підпискою ({APP_NAME} Premium).</BulletItem>
          <BulletItem>Підписка оформлюється через App Store або Google Play і поновлюється автоматично щотижня, щомісяця або щорічно — залежно від обраного плану.</BulletItem>
          <BulletItem>Скасувати підписку можна в налаштуваннях App Store або Google Play за 24 години до завершення поточного розрахункового періоду.</BulletItem>
          <BulletItem>Поновлення підписки відбувається протягом 24 годин до кінця поточного розрахункового періоду.</BulletItem>
          <BulletItem>Якщо ти раніше оформлював підписку, її можна відновити через кнопку "Відновити покупки" в розділі Premium.</BulletItem>
          <BulletItem>Повернення коштів здійснюється відповідно до правил App Store або Google Play.</BulletItem>
        </Section>

        <Section title="5. Правила використання">
          Забороняється:{"\n"}
          <BulletItem>Використовувати застосунок у незаконних цілях.</BulletItem>
          <BulletItem>Намагатися отримати несанкціонований доступ до серверів або даних інших користувачів.</BulletItem>
          <BulletItem>Поширювати шкідливе програмне забезпечення через застосунок.</BulletItem>
          <BulletItem>Копіювати, модифікувати або поширювати контент застосунку без дозволу.</BulletItem>
        </Section>

        <Section title="6. Інтелектуальна власність">
          Весь контент, логотипи, дизайн та функціональність {APP_NAME} є власністю розробника та захищені законодавством про авторські права. Використання застосунку не надає тобі жодних прав власності на нього.
        </Section>

        <Section title="7. AI-функціональність">
          {APP_NAME} використовує штучний інтелект для персоналізованих рекомендацій та чату. AI-відповіді надаються виключно в інформаційних цілях та не є медичною, психологічною або будь-якою іншою професійною консультацією.
        </Section>

        <Section title="8. Медичний дисклеймер">
          {APP_NAME} не є медичним застосунком. Контент застосунку призначений лише для загального інформування та особистого розвитку. Не використовуй застосунок як заміну професійної медичної або психологічної допомоги. У разі проблем зі здоров'ям — звертайся до лікаря.
        </Section>

        <Section title="9. Обмеження відповідальності">
          {APP_NAME} надається "як є". Ми не гарантуємо безперервну роботу сервісу та не несемо відповідальності за будь-які прямі чи непрямі збитки, що виникли внаслідок використання або неможливості використання застосунку.
        </Section>

        <Section title="10. Видалення акаунту">
          Ти маєш право видалити свій акаунт у будь-який час через Налаштування → Видалити акаунт. Після видалення всі твої дані будуть безповоротно видалені з наших серверів протягом 30 днів.
        </Section>

        <Section title="11. Зміни умов">
          Ми залишаємо за собою право змінювати ці Умови. Про суттєві зміни ми повідомимо через застосунок або електронну пошту. Подальше використання застосунку після зміни умов означає твою згоду з новою редакцією.
        </Section>

        <Section title="12. Контакт">
          З питань щодо цих Умов звертайся: {CONTACT_EMAIL}
        </Section>

        <Text style={styles.footer}>© 2026 {APP_NAME}. Всі права захищені.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  header:      {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: CONTENT_PAD_H, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn:     { padding: 4, minWidth: 70 },
  backText:    { color: COLORS.primary, fontSize: 15 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", textAlign: "center", flex: 1 },
  content:     { paddingHorizontal: CONTENT_PAD_H, paddingTop: 20, paddingBottom: 48, maxWidth: CONTENT_MAX_W, alignSelf: "center", width: "100%" },
  updated:     { color: COLORS.textFaint, fontSize: 12, marginBottom: 24, textAlign: "center" },
  section:     { marginBottom: 24 },
  sectionTitle:{ color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  sectionBody: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22 },
  bullet:      { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, marginLeft: 8, marginBottom: 4 },
  footer:      { color: COLORS.textFaint, fontSize: 12, textAlign: "center", marginTop: 16 },
});
