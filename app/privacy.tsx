// ~/naelo-app/app/privacy.tsx
// Політика конфіденційності — обов'язкова вимога App Store & Google Play

import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS, SIZES, CONTENT_PAD_H, CONTENT_MAX_W } from "../lib/theme";

const LAST_UPDATED = "29 квітня 2026 р.";
const CONTACT_EMAIL = "privacy@naelo.app";

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Хедер */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Політика конфіденційності</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Оновлено: {LAST_UPDATED}</Text>

        <Section title="1. Про застосунок">
          Naelo — персональний застосунок для відстеження енергії та емоційного стану. Ми серйозно ставимось до захисту твоїх персональних даних. Ця Політика пояснює, які дані ми збираємо, як використовуємо і як захищаємо.
        </Section>

        <Section title="2. Які дані ми збираємо">
          <BulletItem>Ім'я (вводиться під час реєстрації або онбордингу)</BulletItem>
          <BulletItem>Email-адреса (при реєстрації через Email або Google)</BulletItem>
          <BulletItem>Унікальний ідентифікатор акаунту (Firebase UID)</BulletItem>
          <BulletItem>Відповіді на щоденні запитання (нотатки, теги до 300 символів)</BulletItem>
          <BulletItem>Показник "Вогник душі" (числовий score від 5 до 95)</BulletItem>
          <BulletItem>Особисті цілі та пріоритети (обираються в онбордингу)</BulletItem>
          <BulletItem>Джерела енергії та тригери виснаження (обираються в онбордингу)</BulletItem>
          <BulletItem>Виконані практики (назва, тривалість, дата)</BulletItem>
          <BulletItem>Мрії та кроки до них (назва, дедлайн, статус)</BulletItem>
          <BulletItem>Статистика активності (дати входу, стрік)</BulletItem>
        </Section>

        <Section title="3. Чого ми НЕ збираємо">
          <BulletItem>Геолокація (не запитується і не використовується)</BulletItem>
          <BulletItem>Камера та мікрофон (не використовуються)</BulletItem>
          <BulletItem>Контакти телефонної книги</BulletItem>
          <BulletItem>Дані про здоров'я (HealthKit, Google Fit)</BulletItem>
          <BulletItem>Рекламні ідентифікатори (IDFA, GAID)</BulletItem>
          <BulletItem>Фінансові дані</BulletItem>
        </Section>

        <Section title="4. Як ми використовуємо дані">
          <BulletItem>Персоналізація твого досвіду в застосунку</BulletItem>
          <BulletItem>Збереження прогресу між сесіями і пристроями</BulletItem>
          <BulletItem>Формування контексту для AI-чату Naelo (ім'я, score, цілі, останні відповіді)</BulletItem>
          <BulletItem>Розрахунок показника "Вогник душі" та динаміки</BulletItem>
          <BulletItem>Ніяка реклама — ніколи</BulletItem>
        </Section>

        <Section title="5. Передача даних третім сторонам">
          {"\n"}Ми працюємо з такими сервісами:{"\n"}

          <SubItem title="Firebase (Google LLC)">
            Авторизація (Google Sign-In, Apple Sign-In, Email). Дані: email, UID, ім'я. Firebase Privacy Policy: policies.google.com/privacy
          </SubItem>

          <SubItem title="Supabase Inc.">
            База даних для зберігання профілю, check-in'ів, практик, мрій. Дані зберігаються в регіоні EU (Франкфурт). Supabase Privacy Policy: supabase.com/privacy
          </SubItem>

          <SubItem title="Naelo AI API (mynaelo.com)">
            AI-асистент Naelo отримує контекст для відповідей: ім'я, score, стрік, мета, останні відповіді. Дані передаються по HTTPS і не зберігаються на сервері після генерації відповіді.
          </SubItem>

          Ми не продаємо, не здаємо в оренду і не передаємо твої дані іншим сторонам.
        </Section>

        <Section title="6. Безпека даних">
          <BulletItem>Всі передачі даних захищені TLS/HTTPS</BulletItem>
          <BulletItem>Токени авторизації зберігаються в захищеному сховищі пристрою (Keychain / Keystore)</BulletItem>
          <BulletItem>Supabase Row Level Security (RLS) — кожен користувач бачить тільки свої дані</BulletItem>
          <BulletItem>Firebase Authentication — галузевий стандарт авторизації</BulletItem>
        </Section>

        <Section title="7. Зберігання та видалення даних">
          Твої дані зберігаються до моменту видалення акаунту.{"\n\n"}
          Ти можеш видалити акаунт у будь-який час: розділ "Мій шлях" → кнопка "Видалити акаунт". При видаленні повністю стираються: профіль, всі check-in'и, практики, мрії та Firebase-акаунт.
        </Section>

        <Section title="8. Твої права (GDPR / CCPA)">
          <BulletItem>Право на доступ — запитай копію своїх даних</BulletItem>
          <BulletItem>Право на видалення — видали акаунт в застосунку</BulletItem>
          <BulletItem>Право на виправлення — оновлюй ім'я та дані в профілі</BulletItem>
          <BulletItem>Право на заперечення — припини використання застосунку та видали акаунт</BulletItem>
          <BulletItem>Право на портабельність — напиши нам для отримання експорту</BulletItem>
        </Section>

        <Section title="9. Діти">
          Naelo не призначений для дітей віком до 13 років (COPPA) та до 16 років на території ЄС (GDPR). Ми свідомо не збираємо дані осіб молодше цього віку. Якщо ти вважаєш, що дитина зареєструвалась — напиши нам.
        </Section>

        <Section title="10. Медичний дисклеймер">
          Naelo не є медичним засобом і не надає медичних консультацій. Практики в розділі "Енергетична аптечка" носять інформаційний та загальнооздоровчий характер. При наявності психічних або фізичних розладів здоров'я зверніться до кваліфікованого спеціаліста.
        </Section>

        <Section title="11. Зміни до Політики">
          Ми можемо оновлювати цю Політику. Про суттєві зміни повідомимо в застосунку або на email. Продовження використання застосунку після змін означає згоду з новою редакцією.
        </Section>

        <Section title="12. Контакти">
          З питань щодо конфіденційності:{"\n"}
          <Text style={styles.email}>{CONTACT_EMAIL}</Text>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Компоненти ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bullet}>{"• "}{children}{"\n"}</Text>;
}

function SubItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Text style={styles.sectionBody}>
      <Text style={styles.subTitle}>{title}:{"\n"}</Text>
      {children}{"\n\n"}
    </Text>
  );
}

// ── Стилі ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bgDark ?? "#0a0812" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: SIZES.paddingTop, paddingBottom: 12, paddingHorizontal: CONTENT_PAD_H,
    borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.08)",
    maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const,
  },
  backBtn:      { width: 70 },
  backText:     { color: "#FFB300", fontSize: 15, fontWeight: "600" },
  headerTitle:  { color: "#fff", fontSize: 16, fontWeight: "700" },

  content:      { paddingHorizontal: CONTENT_PAD_H, paddingTop: 20, maxWidth: CONTENT_MAX_W, alignSelf: "center" as const, width: "100%" as const },
  updated:      { color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center", marginBottom: 24 },

  section:      { marginBottom: 24 },
  sectionTitle: { color: "#FFB300", fontSize: 14, fontWeight: "700", marginBottom: 8, letterSpacing: 0.3 },
  sectionBody:  { color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 22 },

  bullet:       { color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 22 },
  subTitle:     { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  email:        { color: "#FFB300", textDecorationLine: "underline" },
});
