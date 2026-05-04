# Naelo — журнал змін

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
