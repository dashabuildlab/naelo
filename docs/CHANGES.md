# Naelo — журнал змін

---

## Сесія 2026-05-05 — Преміум-гейтинг, сервер-API, UX-фікси

### Архітектура БД — перехід на власний сервер

**Рішення:** `stats.tsx` (і новий `api/stats.js`) більше не використовує Supabase.
Дані `daily_checkins`, `practice_logs`, `profiles` зберігаються в PostgreSQL на сервері (`DATABASE_URL`).

**Нові файли:**
- `create_stats_tables.sql` — міграція: таблиці `daily_checkins`, `practice_logs`, `profiles` з індексами
- `api/stats.js` — роутер `GET /api/stats?user_id=xxx&days=7|30`
- `api/index.js` — зареєстровано `/stats` та `/api/stats`

**Ендпоінт:**
```
GET https://mynaelo.com/api/stats?user_id=<uid>&days=7
```
Повертає:
```json
{ "checkins": [{ "date": "2026-05-01", "energy": 72 }], "practices": [{ "category": "focus" }], "streak": 5 }
```

---

### Преміум-гейтинг — Free vs Premium

Введено два рівні доступу через `checkPremium()` з `lib/purchases.ts` (RevenueCat):

| Функція | Free | Premium |
|---|---|---|
| AI-чат контекст | 3 дні / 4 чекіни | 30 днів / 15 чекінів |
| AI-виявлення патернів | — | ✓ (`is_premium` на сервер) |
| Практики на день | 1 | Безліміт |
| Активні мрії | 2 | Безліміт |
| Статистика | 7 днів | 30 днів |

#### chat.tsx
- Контекст для free: `days: 3`, `limit: 4` (було 7/5)
- Додано стейт `isPremium`, передається в тіло запиту як `is_premium`
- Сервер може змінювати тон (виявлення патернів) залежно від флагу

#### pharmacy.tsx
- Ліміт практик для free: `totalToday >= 1` (було `>= 3`)
- При спробі запустити 2-у практику → редирект на `/paywall`
- Padding модального вікна зменшено (`padding: 24 → 16`) — ширший контент, менше зайвого скролу

#### dream-path.tsx
- Free: максимум 2 активні мрії
- При `dreams.length >= 2 && !premium` → кнопка "Преміум для більше мрій →" замість "Додати мрію"
- Валідація: порожня назва мрії → червона рамка (`borderColor: COLORS.danger`) + inline помилка (без Alert)

#### stats.tsx
- Free: запит за 7 днів, calendar 7 комірок
- Premium: запит за 30 днів, calendar 30 комірок
- Золотий банер-апсел для free-юзерів (тап → `/paywall`)
- Видалено весь Supabase — один `fetch` до `api/stats`

#### paywall.tsx
- Оновлено `FREE_FEATURES` (5 пунктів з конкретними лімітами)
- Оновлено `PREMIUM_FEATURES` (6 пунктів, включно з "Ексклюзивна естетика інтерфейсу", іконка `color-palette`)

---

### UX-фікси

#### onboarding.tsx — Читабельність
- Кроки 1, 2, 3, 7 обгорнуто в `<View style={styles.glassCard}>`
- `glassCard`: `backgroundColor: "rgba(10,8,18,0.72)"`, `borderRadius: 24`, `borderColor: "rgba(255,255,255,0.08)"`
- Раніше тільки кроки 4-6 мали підложку, текст на відео не читався

#### auth.tsx — Яскравість тексту
- subtitle: `opacity 0.5 → 0.75`
- modeBtnText: `opacity 0.4 → 0.65`
- dividerText: `opacity 0.3 → 0.5`
- skipText: `opacity 0.3 → 0.55`

#### BottomNav.tsx — Android safe area
- `import { useSafeAreaInsets } from "react-native-safe-area-context"`
- `const bottomPad = Math.max(insets.bottom, 10) + 4`
- Прибрано статичний `paddingBottom: 28` — тепер nav не ховається за Android navigation bar

#### chat.tsx — Повідомлення про помилки
- Розмежовано HTTP-помилку (`HTTP 4xx/5xx`) і мережеву недоступність
- Таймаут: "...сервер перевантажено..."
- HTTP: `Сервер тимчасово недоступний (HTTP 503)...`
- Мережа: "Не вдалось підключитись до сервера..."

#### settings.tsx — Кнопка виходу
- `auth.onAuthStateChanged` → стейт `isLoggedIn`
- Кнопки "Вийти" та "Видалити акаунт" — тільки при `isLoggedIn === true`
- При `isLoggedIn === false` → кнопка "Увійти в акаунт →"

---

### Фікси авторизації

#### Apple Sign In — `auth/missing-or-invalid-nonce`
**Причина:** `sha256hex()` повертала rawNonce як fallback коли `crypto.subtle` недоступний (TestFlight).
Apple вбудовує rawNonce в токен; Firebase очікував SHA-256(rawNonce) ≠ rawNonce → помилка.

**Рішення:**
```tsx
import * as Crypto from "expo-crypto";

const hashedNonce = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256, rawNonce,
);
```
`expo-crypto` (~15.0.9) гарантовано працює в усіх середовищах Expo.

#### Google Sign-In — 400 "доступ заблоковано" на Android
**Причина:** `expo-auth-session` використовує browser OAuth redirect flow.
`androidClientId` — для native SDK, не для web OAuth. `naelo://oauth2redirect` не зареєстровано в Google Console.

**Рішення:** замінено на `@react-native-google-signin/google-signin` — native SDK, без redirect URI.

```tsx
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: "839119458174-eehh9uo3qikrki66cs32fi5cha2ee2gt.apps.googleusercontent.com",
  iosClientId: "839119458174-enj35mto47av9hqh8cttrdrqh0ljb4t2.apps.googleusercontent.com",
  offlineAccess: false,
  scopes: ["profile", "email"],
});
```

`app.json` plugin:
```json
["@react-native-google-signin/google-signin", {
  "iosUrlScheme": "com.googleusercontent.apps.839119458174-enj35mto47av9hqh8cttrdrqh0ljb4t2"
}]
```

---

## Сесія 2026-05-04 (збірка)

### app.json — iOS CocoaPods Firebase помилка

**Помилка при білді:**
```
[!] The following Swift pods cannot yet be integrated as static libraries:
FirebaseCoreInternal depends upon GoogleUtilities (no modules)
FirebaseCrashlytics depends upon GoogleDataTransport, GoogleUtilities, nanopb (no modules)
FirebaseRemoteConfig depends upon FirebaseABTesting, GoogleUtilities (no modules)
FirebaseSessions depends upon GoogleDataTransport, GoogleUtilities, nanopb (no modules)
Exit error: exit status 1
```

**Причина:** Firebase Swift pods не можуть бути вбудовані як статичні бібліотеки без явного налаштування `useFrameworks`.

**Рішення:** Додати в `expo-build-properties` в `app.json`:
```json
"ios": {
  "useFrameworks": "static"
}
```

---

## Сесія 2026-05-04

### auth.tsx — Видимість пароля
- Додано кнопку-оком (eye / eye-off) поруч з полем пароля
- Стан `showPassword` перемикає `secureTextEntry`
- Іконки `eye-outline` / `eye-off-outline` з `@expo/vector-icons`
- Працює однаково при реєстрації та вході

---

### home.tsx — Стабільність стейту при навігації

**Проблема:** `useFocusEffect` запускався при кожному переході між вкладками і скидав `answeredToday` в `false`, бо Supabase-запит не знаходив checkin (uid=null або мережа).

**Рішення:**
- `useFocusEffect` → `useEffect([userId])` — дані завантажуються раз при появі auth, стейт не скидається при переходах
- `answeredToday` зберігається в AsyncStorage (`naelo_answered_today = "YYYY-MM-DD"`), перевіряється першим — без звернення до DB
- Checkin завжди зберігається локально (`naelo_local_checkins`) одразу при submit, незалежно від uid
- Автосинхронізація в Supabase: окремий `useEffect([userId])` — як тільки auth з'являється, pending локальний checkin іде в DB
- Видалено `useFocusEffect` і `useCallback` з імпортів

---

### my-path.tsx — Історія і блоки "Додай / Відпусти"

**Проблема:** Історія не з'являлась після додавання запису.

**Рішення:**
- `useFocusEffect` → `useEffect([userId])` — аналогічно home.tsx
- Додано `userId` state (раніше тільки `userIdRef`) — `onAuthStateChanged` оновлює обидва, тригерить `useEffect`
- Для неавторизованих: якщо uid=null, завантажує checkins з `naelo_local_checkins` (AsyncStorage)

**Блоки "Додай / Відпусти":**
- Більше не читають статичні дані онбордингу
- Автоматично аналізують `daily_checkins` за останні 30 днів
- Логіка: питання "дало тобі сили" → гівери; питання "забрало енергію" → дрейни; інші питання: delta > 2 → гівер, delta < -2 → дрейн
- Рахується частота кожного слова/фрази (split by `,`), показуються топ-6
- Підписи оновлено: "Дає сили найчастіше" / "Висмоктує найчастіше"
- Якщо даних ще нема: "Відповідай на питання дня — з'явиться твій патерн"

---

### dream-path.tsx — Виправлення авторизації та відео

- Додано `onAuthStateChanged` listener — більше не показує "увійди в акаунт" для авторизованих
- `addDream` re-fetches userId якщо стейт null
- Модальне вікно "Нова мрія": кнопка ✕ закриття, валідація (порожній title), кнопка "Додати" сіра до введення назви, поля очищуються при закритті
- Відео: `audioMixingMode = "mixWithOthers"` в try-catch → не блокує `p.play()`
- Постер-заглушка (JPEG) з fade-out при готовності відео — миттєвий візуал

---

### welcome.tsx — Відео

- `audioMixingMode = "mixWithOthers"` в try-catch → відео грає не перериваючи музику

---

### paywall.tsx — Expo Go

- `handlePurchase` і `handleRestore` показують Alert в Expo Go замість crash
- Детектується через `Constants.appOwnership === "expo"`

---

### pharmacy.tsx — Таймер

- Реструктурований `TimerModal`: фаза "instructions" → фаза "timer"
- Фаза instructions: показує іконку, назву, тривалість, опис, всі кроки, кнопку "Запустити таймер"
- Фаза timer: таймер, прогрес-бар, прокручуваний список кроків, кнопки play/pause/finish

---

### chat.tsx — Таймаут

- AbortController з 30-секундним таймаутом на запит до AI
- При таймауті показує окреме повідомлення на відміну від мережевої помилки

---

### Відео (assets/screens/)

- `welcome.mp4`: 8.4 MB → 888 KB (FFmpeg CRF 28, без аудіо, faststart)
- `dream-path.mp4`: 1.5 MB → 611 KB (FFmpeg CRF 30, без аудіо, faststart)
- Оригінали збережено в `*_backup.mp4` (не в репо)

---

### Патерн auth-timing (використовується в home.tsx, my-path.tsx)

```tsx
// Завжди актуальний uid — обходить stale closure у useCallback
const userIdRef = useRef<string | null>(null);
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      userIdRef.current = user.uid;
      setUserId(user.uid);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user?.id || null;
      userIdRef.current = id;
      setUserId(id);
    }
  });
  return unsub;
}, []);

// Завантаження даних — тільки при зміні userId, не при кожному фокусі
useEffect(() => {
  const load = async () => { ... };
  load();
}, [userId]);
```
