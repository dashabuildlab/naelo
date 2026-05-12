# Naelo — Повна документація проєкту

> Версія: 1.1.0 · Дата: травень 2026 · Expo SDK 54 · React Native 0.81.5

---

## Зміст

1. [Проектний огляд](#1-проектний-огляд)
2. [Архітектура](#2-архітектура)
3. [Налаштування середовища](#3-налаштування-середовища)
4. [Вимоги до розробки](#4-вимоги-до-розробки)
5. [Модулі та екрани](#5-модулі-та-екрани)
6. [API](#6-api)
7. [Управління станом](#7-управління-станом)
8. [Навігація](#8-навігація)
9. [Бази даних](#9-бази-даних)
10. [Ключові функції](#10-ключові-функції)
11. [Firebase Crashlytics, Analytics, Performance](#11-firebase-crashlytics-analytics-performance)
12. [Підтримка iPad](#12-підтримка-ipad)
13. [Тестування](#13-тестування)
14. [Деплой та CI/CD](#14-деплой-та-cicd)
15. [Troubleshooting](#15-troubleshooting)
16. [Додаткова інформація](#16-додаткова-інформація)
17. [App Store / Google Play Listing](#17-app-store--google-play-listing)

---

## 1. Проектний огляд

**Naelo** — персональний AI-провідник для відстеження енергії та емоційного стану. Мобільний застосунок допомагає користувачу розуміти свій внутрішній стан через щоденні чекіни, практики та AI-діалог.

### Ключові концепції

| Концепція | Опис |
|---|---|
| **Вогник душі** | Числовий показник енергетичного стану (5–95). Змінюється на основі щоденних чекінів |
| **Streak** | Кількість днів поспіль з активністю в додатку |
| **Momentum** | Дельта зміни score за останній чекін |
| **Питання дня** | Ротаційне питання (7 варіантів), яке змінюється щодня |
| **Naelo AI** | AI-чат на базі Claude claude-haiku-4-5 з повним контекстом користувача |
| **Практики** | Енергетична «аптечка» — дихальні та релаксаційні техніки з таймером |
| **Мрії** | Навігатор мрій з кроками та дедлайнами |

### Платформи

- **Android** — основна (мін. API 26 / Android 8.0)
- **iOS** — підтримується (supportsTablet: true)
- **Web** — обмежена підтримка (static export)

### Продакшн

- **Домен:** [https://mynaelo.com](https://mynaelo.com)
- **Сервер:** BuildLab VPS · IP `89.167.40.15`
- **Директорія:** `/srv/apps/luma-64/`
- **API порт:** `8012`
- **GitHub:** `dashabuildlab/naelo`

---

## 2. Архітектура

### Загальна схема

```
┌─────────────────────────────────────────────────────────┐
│                  Expo RN App (клієнт)                    │
│  app/              lib/              assets/             │
│  ├── index.tsx     ├── supabase.ts   ├── screens/        │
│  ├── welcome.tsx   ├── firebase.ts   ├── privacy.html    │
│  ├── onboarding.tsx├── theme.ts      ├── policy.html     │
│  ├── auth.tsx      ├── BottomNav.tsx └── delete-acc.html │
│  ├── home.tsx      ├── Header.tsx                        │
│  ├── chat.tsx      └── KeyboardScreen.tsx                │
│  ├── pharmacy.tsx                                        │
│  ├── my-path.tsx                                         │
│  ├── dream-path.tsx                                      │
│  └── privacy.tsx                                         │
└───────────────────┬─────────────────────────────────────┘
                    │  HTTPS
          ┌─────────▼──────────┐
          │   Caddy (nginx)    │  mynaelo.com
          │  /api/* → :8012    │
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │  Express API :8012 │
          │  api/index.js      │
          │  api/ai.js         │
          │  api/score.js      │
          └──┬──────────────┬──┘
             │              │
   ┌──────────▼─┐    ┌──────▼──────┐
   │ Anthropic  │    │  Supabase   │
   │ Claude     │    │ PostgreSQL  │
   │ claude-opus│    │ profiles    │
   │ -4-5       │    │ daily_chk.  │
   └────────────┘    │ practice_lg │
                     └─────────────┘
             
   ┌─────────────────┐
   │ Firebase Auth   │
   │ email/Google/   │
   │ Apple Sign-In   │
   └─────────────────┘
```

### Стек технологій

| Шар | Технологія | Версія |
|---|---|---|
| Framework | Expo | ~54.0.33 |
| Runtime | React Native | 0.81.5 |
| React | React | 19.1.0 |
| Мова | TypeScript | ~5.9.2 |
| Роутер | expo-router | ~6.0.23 |
| Автентифікація | Firebase Auth | ^12.12.1 |
| База даних | Supabase (PostgreSQL) | ^2.97.0 |
| AI | Anthropic Claude claude-opus-4-5 | @anthropic-ai/sdk |
| Бекенд | Express.js | — |
| Відео | expo-video | ~3.0.16 |
| Анімації | react-native-reanimated | ~4.1.1 |
| Клавіатура | react-native-keyboard-controller | 1.18.5 |
| SVG | react-native-svg | 15.12.1 |
| Сповіщення | expo-notifications | ~0.31.0 |
| Підписки | react-native-purchases | ^10.0.1 |
| Сховище | AsyncStorage | 2.2.0 |
| Secure Store | expo-secure-store | ~15.0.8 |
| Веб-браузер | expo-web-browser | ~15.0.10 |

---

## 3. Налаштування середовища

### Клонування та встановлення

```bash
git clone https://github.com/dashabuildlab/naelo.git
cd naelo
npm install
```

### Змінні середовища

Створи файл `.env` в корені проєкту:

```env
# Firebase
EXPO_PUBLIC_FB_API_KEY=...
EXPO_PUBLIC_FB_AUTH_DOMAIN=...
EXPO_PUBLIC_FB_PROJECT_ID=...
EXPO_PUBLIC_FB_STORAGE_BUCKET=...
EXPO_PUBLIC_FB_SENDER_ID=...
EXPO_PUBLIC_FB_APP_ID=...

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://cqaoiiditrxnwshgpfrf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_OmLWSrr3qliba_BXVeVyzQ_HNX_dXvV

# API (бекенд)
ANTHROPIC_API_KEY=sk-ant-...
```

> **Увага:** `ANTHROPIC_API_KEY` — тільки на сервері (в `api/.env`), ніколи в клієнтській частині.

### Запуск для розробки

```bash
# Expo Go (dev)
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios
```

### Запуск API-сервера локально

```bash
cd api
node index.js
# Слухає на порту 8012
```

---

## 4. Вимоги до розробки

### Локальне середовище

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (для Android емулятора)
- **Xcode** (для iOS, тільки macOS)

### Android мінімальні вимоги

| Параметр | Значення |
|---|---|
| `minSdkVersion` | 26 (Android 8.0) |
| `targetSdkVersion` | 35 (Android 15) |
| `compileSdkVersion` | 35 |
| Package name | `com.mynaelo.app` |

### iOS мінімальні вимоги

| Параметр | Значення |
|---|---|
| `bundleIdentifier` | `com.mynaelo.app` |
| `usesAppleSignIn` | true |
| `supportsTablet` | true |

### Дозволи Android

Дозволи які **додаються** автоматично Expo:
- `INTERNET`
- `ACCESS_NETWORK_STATE`

Дозволи які **видаляються** кастомним плагіном (`plugins/removeAudioPermission.js`):
- `RECORD_AUDIO` ← видалено, бо `expo-video` його запитує, але додаток не записує аудіо
- `MODIFY_AUDIO_SETTINGS`

---

## 5. Модулі та екрани

### Структура файлів

```
C:\Users\dell\Desktop\Job\Projects\naelo-app\
├── app/                    # Екрани (expo-router)
│   ├── _layout.tsx         # Root Layout (Stack навігатор)
│   ├── index.tsx           # Entry point (редирект)
│   ├── welcome.tsx         # Welcome screen (відео фон)
│   ├── onboarding.tsx      # Онбординг квіз (7 кроків)
│   ├── auth.tsx            # Авторизація (Firebase)
│   ├── home.tsx            # Головний екран (Вогник душі)
│   ├── chat.tsx            # AI чат з Naelo
│   ├── pharmacy.tsx        # Енергетична аптечка
│   ├── my-path.tsx         # Мій шлях (звички/активності)
│   ├── dream-path.tsx      # Навігатор мрій
│   ├── stats.tsx           # Повна статистика (SVG-графік, календар, категорії)
│   ├── paywall.tsx         # Преміум підписка (RevenueCat)
│   └── privacy.tsx         # Сторінка приватності (in-app)
├── lib/                    # Спільні компоненти та утиліти
│   ├── supabase.ts         # Supabase клієнт
│   ├── firebase.ts         # Firebase Auth клієнт
│   ├── theme.ts            # Design system (кольори, розміри)
│   ├── notifications.ts    # Push-сповіщення (expo-notifications)
│   ├── purchases.ts        # RevenueCat підписки (react-native-purchases)
│   ├── BottomNav.tsx       # Нижня навігація
│   ├── Header.tsx          # Хедер компонент
│   └── KeyboardScreen.tsx  # Обгортка для клавіатури
├── api/                    # Express.js бекенд
│   ├── index.js            # Головний сервер (порт 8012)
│   ├── ai.js               # Claude AI роутер (/ai/chat)
│   └── score.js            # Score утиліта
├── assets/                 # Статичні ресурси
│   ├── screens/            # Фонові зображення та відео
│   │   ├── welcome.mp4
│   │   ├── onboarding.mp4
│   │   ├── home-1.jpg – home-4.jpg
│   │   └── dream.mp4
│   ├── images/             # Іконки додатку
│   ├── index.html          # Лендінг mynaelo.com
│   ├── privacy.html        # Політика конфіденційності
│   ├── policy.html         # Умови використання
│   └── delete-account.html # Видалення акаунту
├── plugins/
│   └── removeAudioPermission.js  # Кастомний Expo Config Plugin
├── app.json                # Expo конфігурація
├── eas.json                # EAS Build профілі (development / preview / production)
├── package.json            # NPM залежності
├── tsconfig.json           # TypeScript конфігурація
└── expo-tunnel.bat         # Скрипт деплою через rsync
```

### Опис екранів

#### `app/index.tsx` — Entry point
Перевіряє:
1. Активна Supabase сесія → `/home`
2. `naelo_onboarded === "true"` в AsyncStorage → `/home`
3. Інше → `/welcome`

#### `app/welcome.tsx` — Welcome screen
- Відеофон (`welcome.mp4`) через `expo-video`
- Кнопки «Почати» → `/onboarding` та «Вже є акаунт» → `/auth`

#### `app/onboarding.tsx` — Онбординг (7 кроків)
| Крок | Зміст |
|---|---|
| 1 | Ім'я користувача |
| 2 | Головна ціль (вибір із 4: Більше енергії / Менше стресу / Фокус / Баланс) |
| 3 | Поточний рівень енергії (Виснажений / Втомлений / Нормально / Сповнений сил) |
| 4 | Що турбує (множинний вибір + текст) |
| 5 | Що дає сили (множинний вибір + текст) |
| 6 | Що виснажує (множинний вибір + текст) |
| 7 | Готово → `naelo_onboarded = "true"` → `/auth` |

- Відеофон (`onboarding.mp4`) з fade-in анімацією при першому кадрі
- На кроках 4-6: glass card overlay для читабельності (`rgba(10,8,18,0.72)`)
- Дані зберігаються в AsyncStorage: `naelo_name`, `naelo_goal`, `naelo_energy`, `naelo_givers`, `naelo_drains`, тощо

#### `app/auth.tsx` — Авторизація
Методи входу:
- **Email + пароль** (Firebase `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`)
- **Google Sign-In** (через `WebBrowser.openAuthSessionAsync`, PKCE flow без нативних модулів)
- **Apple Sign-In** (через `expo-apple-authentication`)

> **Важливо:** Google OAuth використовує implicit `id_token` flow замість PKCE, щоб уникнути краш `ExpoCryptoAES` в Expo Go SDK 54.

Після успішного входу:
1. Синхронізує дані Firebase → Supabase (`profiles` таблиця)
2. Перенаправляє на `/home`

#### `app/home.tsx` — Головний екран
- Анімована сфера з 3 пульсуючими кільцями + 20 частинками-світлячками
- Динамічний фон: 4 рівні зображень залежно від score (`home-1.jpg` → `home-4.jpg`)
- **Вогник душі**: числовий score (5–95) з кольором (gold/orange/red)
- **Питання дня**: ротація 7 питань по даті (`new Date().getDate() % 7`)
- **Підказки**: 4 тег-чіпи для швидкої відповіді
- **Score алгоритм**: `evaluateAnswer()` — аналіз ключових слів (+3/-3) + бонус за довжину (>20 символів: +2, >60: +2)
- Score обмежений: `Math.max(5, Math.min(95, score + delta))`
- Натиснення на сферу → перехід до `/chat`

#### `app/chat.tsx` — AI чат
- Надсилає повний контекст користувача до API: `score`, `streak`, `momentum`, `goal`, `energy`, останні 5 чекінів, практики сьогодні, givers/drains
- 4 швидкі підказки при старті чату
- Індикатор «аналізую твій стан...» під час очікування відповіді
- **API endpoint:** `POST https://mynaelo.com/api/ai/chat`

#### `app/pharmacy.tsx` — Енергетична аптечка
- 4 категорії: Стрес / Втома / Фокус / Тривога
- 3+ практики в кожній категорії з детальними кроками
- Таймер з анімованим прогрес-колом (SVG)
- Збереження завершених практик у Supabase (`practice_logs`)
- Haptic feedback при завершенні

#### `app/my-path.tsx` — Мій шлях
- Трекінг активностей / звичок користувача
- Підключений до Supabase

#### `app/dream-path.tsx` — Навігатор мрій
- Мрії з кроками та дедлайнами
- Відеофон (`dream.mp4`) через `expo-video`
- Збереження в Supabase

#### `app/stats.tsx` — Повна статистика
- Лінійний SVG-графік енергії за 30 днів (Polyline + кольорові точки)
- Календарна сітка 30 днів з кольором по score (scoreColor)
- Горизонтальні бари за категоріями практик (Стрес / Втома / Фокус / Тривога)
- Зведений рядок: середній score, кількість чекінів, поточний streak
- Доступ: кнопка «Повна статистика» в `my-path.tsx`
- Дані: `daily_checkins`, `practice_logs`, `profiles` (Supabase)

#### `app/paywall.tsx` — Преміум підписка
- Порівняння Free vs Premium (картки зі списком можливостей)
- Пакети від RevenueCat: annual (за замовчуванням, «Найвигідніше») + monthly
- Розрахунок ціни на місяць для річного плану
- «Підключити Premium» → `purchasePackage()` → оновлення кешу AsyncStorage
- «Відновити покупки» → `restorePurchases()`
- Юридичний рядок про авто-поновлення

#### `app/privacy.tsx` — Приватність (in-app)
- In-app версія сторінки приватності

---

## 6. API

### Базовий URL

```
Прямий: http://89.167.40.15:8012
Через домен: https://mynaelo.com/api
```

### Ендпоінти

#### `GET /health` або `GET /api/health`
Перевірка стану сервера.

**Response:**
```json
{ "ok": true, "app": "naelo-api", "ts": 1234567890 }
```

---

#### `POST /api/ai/chat`
AI-чат з Naelo. Приймає повний контекст користувача.

**Request body:**
```json
{
  "message": "Як у мене справи?",
  "name": "Аня",
  "score": 65,
  "streak": 5,
  "momentum": 3,
  "goal": "Менше стресу",
  "energy": "Нормально",
  "context": "Ім'я: Аня\nВогник душі: 65/100\nStreak: 5 днів\nОстанні відповіді: 2026-04-29 (⚡65): Добре",
  "practices_today": 2
}
```

**Response:**
```json
{ "reply": "Аня, твій вогник стабільний! 65% — це хороший рівень..." }
```

**Errors:**
```json
{ "error": "Internal server error message" }
```

**Деталі реалізації (`api/ai.js`):**
- Модель: `claude-opus-4-5`
- `max_tokens`: 400
- Системний промпт включає контекст користувача
- Мова відповіді: українська
- Стиль: тепла подруга, 2-4 речення, без медичних діагнозів

---

#### `GET /api/privacy`
Повертає HTML-сторінку політики конфіденційності.

#### `GET /api/policy`
Повертає HTML-сторінку умов використання.

#### `GET /api/delete-account`
Повертає HTML-сторінку для видалення акаунту.

#### `GET /user/score/:userId`
Повертає score конкретного користувача.

**Response:**
```json
{ "score": 65 }
```

### Caddy конфігурація (продакшн)

Caddy маршрутизує запити:
- `mynaelo.com/api/*` → `localhost:8012`
- Статичні файли (`index.html`, `privacy.html`, тощо) — через `file_server` або Express static

```
# Спрощена логіка:
/api/* → reverse_proxy localhost:8012
/* → file_server або reverse_proxy localhost:8012
```

---

## 7. Управління станом

Naelo **не використовує глобальний state менеджер** (Redux, Zustand, тощо). Стан управляється локально через:

### `useState` / `useEffect` (React)
Кожен екран управляє своїм локальним станом.

### AsyncStorage (персистентність на пристрої)

| Ключ | Тип | Опис |
|---|---|---|
| `naelo_onboarded` | `"true"` | Чи пройдений онбординг |
| `naelo_name` | `string` | Ім'я користувача |
| `naelo_goal` | `string` | Вибрана ціль |
| `naelo_energy` | `string` | Рівень енергії (онбординг) |
| `naelo_score` | `string` (number) | Локальний score (без авторизації) |
| `naelo_givers` | `JSON string[]` | Що дає сили (список) |
| `naelo_givers_text` | `string` | Що дає сили (вільний текст) |
| `naelo_drains` | `JSON string[]` | Що виснажує (список) |
| `naelo_drains_text` | `string` | Що виснажує (вільний текст) |
| `naelo_concerns` | `JSON string[]` | Що турбує (список) |
| `naelo_concerns_text` | `string` | Що турбує (вільний текст) |
| `naelo_reminder_enabled` | `"true"` / `"false"` | Увімкнені push-нагадування |
| `naelo_reminder_time` | `"HH:MM"` | Час щоденного нагадування |
| `naelo_premium` | `"true"` / `"false"` | Локальний кеш преміум-статусу |

### Supabase (хмарна БД)
Авторизовані користувачі: повний профіль, чекіни, практики синхронізуються з Supabase.

### Supabase Auth Session
`supabase.auth.getSession()` — перевірка сесії при кожному запуску (index.tsx).

---

## 8. Навігація

### Stack навігатор (expo-router)

```
_layout.tsx
├── index          (редирект, без UI)
├── welcome        (Welcome screen)
├── onboarding     (Онбординг)
├── auth           (Авторизація)
├── home           (Головна)
├── chat           (AI чат)
├── pharmacy       (Аптечка)
├── my-path        (Мій шлях)
├── dream-path     (Мрії)
├── stats          (Повна статистика)
├── paywall        (Преміум підписка)
└── privacy        (Приватність)
```

- Анімація між екранами: `fade`
- Хедери приховані: `headerShown: false`
- Клавіатура: `KeyboardProvider` (react-native-keyboard-controller) обгортає весь Stack

### Нижня навігація (BottomNav)

Компонент `lib/BottomNav.tsx` відображається на основних екранах:

| Таб | Іконка | Маршрут |
|---|---|---|
| Вогник | ⌂ | `/home` |
| Мій шлях | ☰ | `/my-path` |
| Фокус | ⚡ | `/pharmacy` |
| Мрії | ✦ | `/dream-path` |
| Naelo | ◉ | `/chat` |

---

## 9. Бази даних

### Firebase (Authentication)

Використовується **тільки** для авторизації:
- Email/password
- Google OAuth (через WebBrowser, implicit id_token flow)
- Apple Sign-In

Конфігурація через `EXPO_PUBLIC_FB_*` env змінні.  
Персистентність: `getReactNativePersistence(AsyncStorage)`

### Supabase (PostgreSQL)

**URL:** `https://cqaoiiditrxnwshgpfrf.supabase.co`

#### Таблиця `profiles`

| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid (PK) | Firebase UID |
| `name` | text | Ім'я користувача |
| `score` | integer | Вогник душі (5–95) |
| `streak` | integer | Днів поспіль |
| `momentum` | integer | Остання дельта score |
| `goal` | text | Ціль (з онбордингу) |
| `energy_level` | text | Рівень енергії |
| `energy_givers` | text (JSON) | Що дає сили |
| `givers_text` | text | Текст про сили |
| `energy_drains` | text (JSON) | Що виснажує |
| `drains_text` | text | Текст про виснаження |
| `concerns` | text (JSON) | Що турбує |
| `concerns_text` | text | Текст про турботи |
| `last_activity` | timestamptz | Остання активність |

#### Таблиця `daily_checkins`

| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `date` | date | Дата чекіну |
| `question` | text | Питання дня |
| `note` | text | Відповідь користувача |
| `hints` | text (JSON) | Вибрані підказки |
| `energy` | integer | Score після чекіну |
| `delta` | integer | Зміна score |

Унікальний constraint: `(user_id, date)` — один чекін на день.

#### Таблиця `practice_logs`

| Колонка | Тип | Опис |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `completed_at` | timestamptz | Час завершення |
| (practice_id?) | text | ID практики |

---

## 10. Ключові функції

### Score алгоритм

```typescript
// Аналіз тексту чекіну
const evaluateAnswer = (text: string, hints: string[]): number => {
  // Позитивні ключові слова → +3 кожне
  const positive = ["добре", "супер", "чудово", "гуляв", "друзі", ...];
  // Негативні ключові слова → -3 кожне  
  const negative = ["важко", "стрес", "конфлікт", "погано", ...];
  
  let delta = 0;
  // Аналіз тексту + підказок
  // Бонус за розгорнуту відповідь: >20 символів +2, >60 символів +4
  
  return Math.max(-15, Math.min(15, delta)); // обмеження ±15
};

// Score обмежений між 5 і 95
const newScore = Math.max(5, Math.min(95, score + delta));
```

### AI контекст

Перед кожним повідомленням в чат збирається контекст:

```typescript
const buildContext = () => {
  const parts = [];
  parts.push(`Ім'я: ${userName}`);
  parts.push(`Вогник душі: ${score}/100`, `Streak: ${streak} днів`);
  if (momentum !== 0) parts.push(`Momentum: ${momentum}`);
  if (goal) parts.push(`Мета: ${goal}`);
  if (energy) parts.push(`Рівень енергії: ${energy}`);
  if (giversDrains) parts.push(giversDrains);        // з онбордингу
  if (recentCheckins) parts.push(`Останні відповіді: ${recentCheckins}`);
  if (practicesCount > 0) parts.push(`Практик сьогодні: ${practicesCount}`);
  return parts.join("\n");
};
```

### Відео (expo-video)

```typescript
// Правильний патерн (SDK 54)
import { VideoView, useVideoPlayer } from "expo-video";

const player = useVideoPlayer(require("../assets/screens/video.mp4"), p => {
  p.loop = true;
  p.muted = true;
  p.play();
});

// JSX
<VideoView
  player={player}
  style={styles.videoBg}
  contentFit="cover"
  nativeControls={false}
/>
```

> **Увага:** `expo-av` видалено — використовуй тільки `expo-video`.

### Google OAuth (без PKCE)

```typescript
// Безпечний flow для Expo Go SDK 54 (без ExpoCryptoAES)
const handleGoogleSignIn = async () => {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const redirect = Linking.createURL("auth/callback");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirect,
    response_type: "id_token",    // implicit flow
    scope: "openid profile email",
    nonce,
  });
  const result = await WebBrowser.openAuthSessionAsync(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    redirect
  );
  // Парсимо id_token з URL fragment → signInWithCredential
};
```

### Design system

Вся стилізація централізована в `lib/theme.ts`:

```typescript
// Основні кольори
COLORS.primary = "#FFB300"   // золотий
COLORS.bg = "#0a0812"        // темно-фіолетовий
COLORS.success = "#4ADE80"   // зелений
COLORS.danger = "#FF6B6B"    // червоний

// Score кольори
scoreColor(score) → gold (≥80) | orange (≥40) | red (<40)

// Розміри
SIZES.paddingH = 20
SIZES.paddingTop = 60
SIZES.fontMD = 15
SIZES.fontLG = 18
```

---

## 11. Push-сповіщення

### Бібліотека

`expo-notifications` (~0.31.0) — локальні заплановані сповіщення. **Не потребує FCM/APNs сервера** — лише нативні local triggers.

### `lib/notifications.ts` — API

```typescript
// Ініціалізація Android-каналу (викликається в _layout.tsx)
setupNotificationChannel(): Promise<void>

// Запит дозволу (iOS + Android 13+)
requestNotificationPermission(): Promise<boolean>

// Запланувати щоденне нагадування о заданому часі
scheduleCheckinReminder(hour: number, minute: number): Promise<void>

// Скасувати всі заплановані нагадування
cancelCheckinReminder(): Promise<void>

// Зчитати збережені налаштування з AsyncStorage
getReminderSettings(): Promise<{ enabled: boolean; hour: number; minute: number }>
```

### Тригер

```typescript
// DAILY trigger — fires кожен день о вказаному часі
{
  type: SchedulableTriggerInputTypes.DAILY,
  hour,
  minute,
  channelId: "checkin",   // Android only
}
```

### Налаштування в `app/settings.tsx`

- Toggle «Щоденний чекін» → `scheduleCheckinReminder` / `cancelCheckinReminder`
- Кастомний time picker: `−` / `+` кнопки для годин (±1) та хвилин (±5)
- Зміна часу при увімкненому toggle → автоматично перепланує

### Важливо

- `expo-notifications` не підтримується в **Expo Go** на iOS. Тестувати через `eas build --profile development` або `expo run:android`.
- `notification-icon.png` потрібен в `assets/images/` (PNG 96×96, лише білі пікселі на прозорому фоні).

---

## 11a. RevenueCat (Преміум підписка)

### Бібліотека

`react-native-purchases` (^10.0.1) — native SDK RevenueCat. **Не підтримується в Expo Go** — потрібен нативний білд.

### `lib/purchases.ts` — API

```typescript
// Ініціалізація SDK (викликається в _layout.tsx)
initPurchases(): Promise<void>

// Перевірка преміум-статусу (кеш AsyncStorage → RevenueCat)
checkPremium(): Promise<boolean>

// Отримати доступні пакети підписки
getOfferings(): Promise<PurchasesOfferings | null>

// Купити пакет підписки
purchasePackage(pkg: PurchasesPackage): Promise<boolean>

// Відновити покупки (cross-device)
restorePurchases(): Promise<boolean>
```

### Entitlement

RevenueCat entitlement ID: **`"premium"`**

```typescript
// Перевірка активного entitlement
const info = await Purchases.getCustomerInfo();
const isPremium = !!info.entitlements.active["premium"];
```

### Premium gates

| Функція | Free | Premium |
|---|---|---|
| Практики на день | 3 | Необмежено |
| AI-контекст (чекіни) | 7 днів (5 записів) | 30 днів (15 записів) |
| Статистика | — | Доступна (кнопка в my-path) |

### API ключі

Вкажи реальні ключі в `lib/purchases.ts`:
```typescript
const API_KEY = Platform.OS === "ios"
  ? "appl_XXXXXXXXXXXXXXXXXXXXXXXXXX"   // ← з RevenueCat Dashboard → Apps → iOS
  : "goog_XXXXXXXXXXXXXXXXXXXXXXXXXX";  // ← з RevenueCat Dashboard → Apps → Android
```

### Налаштування продуктів

1. **App Store Connect** → In-App Purchases → New Subscription Group → додай Annual / Monthly
2. **Google Play Console** → Monetize → Subscriptions → додай відповідні продукти
3. **RevenueCat Dashboard** → Products → додай bundle ID + product ID → Entitlements → прив'яж до `"premium"`

---

## 12. Firebase Crashlytics, Analytics, Performance

### Пакети

| Пакет | Версія | Призначення |
|---|---|---|
| `@react-native-firebase/app` | 24.0.0 | Базовий native SDK |
| `@react-native-firebase/crashlytics` | 24.0.0 | Crash reporting |
| `@react-native-firebase/analytics` | 24.0.0 | Event analytics |
| `@react-native-firebase/perf` | 24.0.0 | Performance monitoring |

### Файли конфігурації

| Файл | Призначення |
|---|---|
| `android/app/google-services.json` | Firebase config для Android (project_id: luma-7c644) |
| `android/build.gradle` | Classpaths: `google-services:4.4.2`, `firebase-crashlytics-gradle:3.0.2`, `perf-plugin:1.4.2` |
| `android/app/build.gradle` | Plugins: `com.google.gms.google-services`, `com.google.firebase.crashlytics`, `com.google.firebase.firebase-perf` |
| `app.json` | Expo plugins: `@react-native-firebase/app`, `@react-native-firebase/crashlytics` |

### `lib/analytics.ts` — API

```typescript
// Ідентифікація користувача (Analytics + Crashlytics)
setAnalyticsUser(userId: string, name?: string): Promise<void>

// Трекінг екрану
logScreen(screenName: string): Promise<void>

// Кастомна подія
logEvent(name: string, params?: Record<string, any>): Promise<void>

// Non-fatal помилка → Crashlytics
logError(error: Error, context?: string): void

// Breadcrumb повідомлення
logMessage(message: string): void

// Performance trace
startTrace(name: string): Promise<Trace>
```

### Глобальна ініціалізація (`app/_layout.tsx`)

```typescript
useEffect(() => {
  // Перехоплення JS-краш → Crashlytics
  const orig = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    crashlytics().recordError(error);
    orig?.(error, isFatal);
  });

  // Авто-ідентифікація при вході
  const unsub = auth.onAuthStateChanged(async (user) => {
    if (user) await setAnalyticsUser(user.uid, user.displayName);
  });
  return unsub;
}, []);
```

### Трекінг по екранах

| Екран | Screen view | Кастомна подія |
|---|---|---|
| `home.tsx` | `logScreen("Home")` | `checkin_submit` з `{text_length}` |
| `pharmacy.tsx` | `logScreen("Pharmacy")` | `practice_complete` з `{practice_id, category, duration_sec}` |
| `chat.tsx` | `logScreen("Chat")` | — |
| `dream-path.tsx` | `logScreen("DreamPath")` | — |

### Android gradle конфігурація

**`android/build.gradle` — додано в `buildscript.dependencies`:**
```groovy
classpath('com.google.gms:google-services:4.4.2')
classpath('com.google.firebase:firebase-crashlytics-gradle:3.0.2')
classpath('com.google.firebase:perf-plugin:1.4.2')
```

**`android/app/build.gradle` — додано після інших `apply plugin`:**
```groovy
apply plugin: "com.google.gms.google-services"
apply plugin: "com.google.firebase.crashlytics"
apply plugin: "com.google.firebase.firebase-perf"
```

### Firebase проєкт

| Параметр | Значення |
|---|---|
| Project ID | `luma-7c644` |
| Project Number | `839119458174` |
| App ID (Android) | `1:839119458174:android:c3efc90332d9d7418a6d2f` |
| Package | `com.mynaelo.app` |
| API Key | `AIzaSyBfEMFune-HP6OLMh0GsTWpsxDorTqPszY` |

> **Примітка:** Дані Firebase Analytics з'являються у Firebase Console через ~24 год після першого реального запуску на пристрої.

---

## 12. Підтримка iPad

### Принципи

1. **Орієнтація:** `"orientation": "portrait"` в `app.json` — локі до вертикальної орієнтації. Landscape не підтримується.
2. **Breakpoint:** `width ≥ 600pt` = планшет.
3. **Контентна колонка:** максимальна ширина `680pt`, центрується горизонтально. Формула: `Math.min(680, width * 0.82)`.
4. **Горизонтальні відступи:** рівномірні відступи по боках центрують контент (`(width - maxW) / 2`).
5. **`supportsTablet: true`** — вже в `app.json → ios`.

### Константи в `lib/theme.ts`

```typescript
// true якщо ширина екрану ≥ 600pt (iPad в portrait)
export const isTablet: boolean

// Максимальна ширина контенту: 680 на iPad, width на телефоні
export const CONTENT_MAX_W: number

// Горизонтальні відступи що центрують контент
export const CONTENT_PAD_H: number

// Реактивний хук для компонентів з динамічним лейаутом
export function useLayout(): { width, height, tablet, maxW, padH }
```

### Що змінилось по компонентах

#### `lib/BottomNav.tsx`
- Додано внутрішній `<View style={styles.inner}>` з `maxWidth: CONTENT_MAX_W`
- Розмір іконок: `isTablet ? 26 : 22`
- Розмір міток: `isTablet ? 11 : 10`
- Розмір iconWrap: `isTablet ? 48×36 : 40×32`

#### `lib/Header.tsx`
- Внутрішній контент обгорнуто в `<View style={styles.inner}>` з `maxWidth: CONTENT_MAX_W`
- Горизонтальний відступ: `isTablet ? 32 : 20`
- Розмір стрілки «назад»: `isTablet ? 28 : 24`
- Розмір заголовку: `isTablet ? 20 : 18`

#### `lib/theme.ts` → `SHARED.modalContainerCenter`
- Додано `maxWidth: 520` — модальні діалоги не розтягуються на весь iPad

#### Екрани

| Екран | Зміна |
|---|---|
| `home.tsx` | `scrollInner` → `paddingHorizontal: CONTENT_PAD_H`; картки adviceCard, questionCard, answeredCard → `maxWidth: CONTENT_MAX_W` |
| `my-path.tsx` | `scrollInner` → `paddingHorizontal: CONTENT_PAD_H`, `maxWidth: CONTENT_MAX_W`, `alignSelf: "center"` |
| `pharmacy.tsx` | Scroll content → центрований з `maxWidth`; TimerModal → `maxWidth: isTablet ? 520 : undefined`; категорії → `paddingHorizontal: CONTENT_PAD_H` |
| `chat.tsx` | Header, messages, inputRow → `maxWidth: CONTENT_MAX_W`, `alignSelf: "center"`; бульбашки → `maxWidth: isTablet ? 560 : "85%"` |
| `dream-path.tsx` | Scroll → `paddingHorizontal: CONTENT_PAD_H`; `contentBackdrop` → `maxWidth: CONTENT_MAX_W`, `alignSelf: "center"` |
| `settings.tsx` | Scroll content → `maxWidth: CONTENT_MAX_W`, `alignSelf: "center"` |
| `auth.tsx` | Form → `maxWidth: 460` |
| `welcome.tsx` | Контентний блок → обгорнуто в `contentInner` з `maxWidth: 460` |
| `onboarding.tsx` | Розмір SVG-сфери → `Math.min(width * 0.42, 180)`; `stepContainer` → `maxWidth: 560`, `alignSelf: "center"` |
| `privacy.tsx` | Header + content → `maxWidth: CONTENT_MAX_W`, `paddingHorizontal: CONTENT_PAD_H` |

### Приклад паттерну (ScrollView)

```typescript
import { CONTENT_MAX_W, CONTENT_PAD_H } from "../lib/theme";

// Для ScrollView з вирівнюванням по центру
<ScrollView contentContainerStyle={styles.scrollInner}>

const styles = StyleSheet.create({
  scrollInner: {
    paddingHorizontal: CONTENT_PAD_H,
    maxWidth: CONTENT_MAX_W,
    alignSelf: "center",
    width: "100%",
  },
});
```

### Приклад паттерну (картка)

```typescript
// Картка яка сама центрується всередині scrollInner
<View style={styles.card}>

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: CONTENT_MAX_W,
    backgroundColor: ...,
    borderRadius: ...,
  },
});
```

> **Примітка:** `Dimensions.get("window")` у файлах залишається — orientation заблокована на portrait, тому статичні розміри коректні. Для майбутньої підтримки landscape використовуй `useLayout()` хук.

---

## 13. Тестування

### Ручне тестування (поточний стан)

Автоматизованих тестів немає. Тестування відбувається через:

1. **Expo Go** — розробка та швидка перевірка
2. **EAS Build** — тестовий APK для Android
3. **TestFlight** — тестування iOS

### Чеклист перед релізом

- [ ] Онбординг: всі 7 кроків, AsyncStorage зберігає дані
- [ ] Авторизація: email, Google, Apple
- [ ] Home: score відображається, питання дня змінюється, чекін зберігається
- [ ] Chat: відповідь приходить від Claude, контекст передається
- [ ] Pharmacy: таймер працює, практика записується в Supabase
- [ ] Dream-path: мрії зберігаються
- [ ] Відео: fade-in на welcome та onboarding
- [ ] Push-сповіщення: увімкнути в Settings, перевірити отримання на пристрої
- [ ] Статистика: перейти з my-path → stats, перевірити SVG-графік і календар
- [ ] Paywall: відкрити `/paywall`, перевірити відображення пакетів RevenueCat
- [ ] Premium gate: pharmacy — 4-та практика → перехід на paywall
- [ ] API health: `GET https://mynaelo.com/api/health` → `{"ok":true}`
- [ ] Статичні сторінки: `/api/privacy`, `/api/policy`, `/api/delete-account`

### Перевірка API

```bash
# Health check
curl https://mynaelo.com/api/health

# AI chat
curl -X POST https://mynaelo.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Привіт","name":"Тест","score":60}'
```

---

## 14. Деплой та CI/CD

### Деплой бекенду (сервер)

Використовується `expo-tunnel.bat` — WSL rsync скрипт.

```bat
# C:\Users\dell\Desktop\Job\Projects\naelo-app\expo-tunnel.bat
wsl rsync -avz --exclude node_modules --exclude .git --exclude .expo \
  -e "ssh -o StrictHostKeyChecking=no -i /root/.ssh/naelo_key" \
  /mnt/host/c/Users/dell/Desktop/Job/Projects/naelo-app/ deployer@89.167.40.15:/srv/apps/luma-64/
```

**Запуск деплою:**
```
Запусти C:\Users\dell\Desktop\Job\Projects\naelo-app\expo-tunnel.bat
```

**Після rsync на сервері:**
```bash
# SSH
ssh deployer@89.167.40.15

# Перезапустити API
pm2 restart luma-api  # або: cd /srv/apps/luma-64/api && node index.js
```

### Структура сервера

```
/srv/apps/luma-64/
├── api/
│   ├── index.js
│   ├── ai.js
│   ├── score.js
│   └── .env         ← ANTHROPIC_API_KEY тут
├── assets/
│   ├── index.html
│   ├── privacy.html
│   ├── policy.html
│   └── delete-account.html
└── plugins/
    └── removeAudioPermission.js
```

### Caddy конфіг

```
# /etc/caddy/sites/mynaelo.conf (виправляє admin)
mynaelo.com {
  handle /api/* {
    reverse_proxy localhost:8012
  }
  handle {
    root * /srv/apps/luma-64/assets
    try_files {path} /index.html
    file_server
  }
}
```

> **Примітка:** Caddy конфіг змінює тільки root користувач BuildLab. Поточна конфігурація маршрутизує `/api/*` → 8012 і статику через file_server.

### EAS Build (мобільний)

```bash
# Встановити EAS CLI
npm install -g eas-cli

# Авторизація
eas login

# Dev build (з DevClient, нативні модулі, simulator)
eas build --platform android --profile development
eas build --platform ios --profile development

# Android APK для внутрішнього тестування
eas build --platform android --profile preview

# Production AAB (Google Play)
eas build --platform android --profile production

# Production IPA (App Store)
eas build --platform ios --profile production

# Сабміт в App Store
eas submit --platform ios --profile production
```

### `eas.json` профілі

| Профіль | Android | iOS | Призначення |
|---|---|---|---|
| `development` | APK (debug) | Simulator | Локальна розробка з нативними модулями |
| `preview` | APK (release) | IPA (device) | Внутрішнє тестування |
| `production` | AAB | IPA | Публікація в Google Play / App Store |

### Google Play

1. **Package:** `com.mynaelo.app`
2. **Privacy Policy URL:** `https://mynaelo.com/api/privacy`
3. **Дозволи:** `RECORD_AUDIO` видалено через `removeAudioPermission.js`
4. **Target SDK:** 35

### App Store

1. **Bundle ID:** `com.mynaelo.app`
2. **Apple Sign-In:** увімкнено
3. **Privacy URL:** `https://mynaelo.com/api/privacy`

---

## 15. Troubleshooting

### `Native module RevenueCat not found` / `expo-notifications` не працює в Expo Go

**Причина:** `react-native-purchases` та `expo-notifications` містять нативний код і не підтримуються в стандартному **Expo Go**.

**Рішення:** Зібрати development build з нативними модулями:
```bash
# Android
eas build --platform android --profile development
# Або локально:
npx expo run:android
```

> Після встановлення development build — сканувати його QR-код замість Expo Go.

---

### `Cannot find native module 'ExpoCryptoAES'`

**Причина:** `expo-auth-session/providers/google` намагається використати `ExpoCryptoAES` з `expo-crypto`, який недоступний в Expo Go SDK 54.

**Рішення:** У `app/auth.tsx` Google OAuth реалізований через `WebBrowser.openAuthSessionAsync` з implicit `id_token` flow — без `expo-auth-session` і без нативного модуля.

---

### AI чат показує «проблема зі з'єднанням»

**Причина:** `API_URL` вказаний неправильно.

**Перевірка:**
```typescript
// app/chat.tsx — має бути:
const API_URL = "https://mynaelo.com/api";
// Тоді: fetch(`${API_URL}/ai/chat`) → https://mynaelo.com/api/ai/chat
// Caddy бачить /api/* → port 8012 ✓
```

---

### `No space left on device` при rsync

Сервер переповнений (75 GB). Потрібно звернутись до BuildLab для очищення диску.

---

### `RECORD_AUDIO` в Google Play Console

**Причина:** `expo-av` (deprecated) автоматично додавав `RECORD_AUDIO` в AndroidManifest.

**Рішення:**
1. Видалити `expo-av` з `package.json`
2. Додати `expo-video` замість нього
3. Додати плагін `"./plugins/removeAudioPermission"` в `app.json`
4. Перебудувати APK через EAS

---

### Онбординг відео не з'являється одразу

**Рішення:** `VideoView` монтується разом з компонентом (не всередині `Animated.View`), `onFirstFrameRender` запускає fade-in анімацію через `Animated.timing`.

---

### `Route './auth.tsx' is missing the required default export`

**Причина:** Помилки імпорту в auth.tsx — зазвичай пов'язано з відсутніми залежностями.

**Перевірка:** Видали `expo-auth-session` та `expo-crypto` імпорти, якщо вони залишились у файлі.

---

### SSH доступ до сервера

**Restricted shell** — доступні тільки: `rsync`, `expo-tunnel`, `shell`, `psql`, `db-tunnel`, `deploy`, `check-exist`, `logs`.

```bash
# Доступні команди:
ssh deployer@89.167.40.15 shell "pm2 list"
ssh deployer@89.167.40.15 logs luma-api
```

---

### `Cannot read properties of undefined (reading 'manifest')` при `expo prebuild`

**Причина:** Неправильна форма виклику `withAndroidManifest` в `plugins/removeAudioPermission.js`. Куррована форма `withAndroidManifest(callback)` не передає `modResults` в callback на етапі конфігурації.

**Неправильно (викликає помилку):**
```javascript
module.exports = withAndroidManifest(config => {
  const manifest = config.modResults.manifest; // ← config.modResults = undefined
  ...
});
```

**Правильно:**
```javascript
const removeAudioPermission = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest; // ✓
    ...
    return modConfig;
  });
};
module.exports = removeAudioPermission;
```

---

### `SDK location not found` після кожного `expo prebuild --clean`

**Причина:** Прапор `--clean` повністю видаляє папку `android/` разом з `local.properties`. При кожному новому prebuild файл потрібно створювати заново.

**Рішення:** Після кожного `expo prebuild --clean` — перед запуском Gradle — створити файл `C:\Users\dell\Desktop\Job\Projects\naelo-app\android\local.properties`:

```
sdk.dir=C\:\\Users\\dell\\AppData\\Local\\Android\\Sdk
```

> **Важливо:** `local.properties` не комітити в git (він вже в `.gitignore`). Але пам'ятати що він зникає після кожного `--clean`.

---

### `>>> WARNING: expo export failed with exit code 1` при деплої через expo-tunnel.bat

**Причина:** BuildLab deploy скрипт після rsync намагається запустити `expo export` для веб-версії, але в нашому проєкті веб не налаштований повністю.

**Статус:** Не критично — API сервер і тунель запускаються нормально. Попередження можна ігнорувати.

---

### `PluginError: react-native-purchases — Cannot find module 'react-native-purchases/app.plugin.js'`

**Причина:** `react-native-purchases` v10 **не має** `app.plugin.js` — він використовує Expo autolinking. Якщо додати його в `plugins` масив `app.json`, Expo кидає помилку при запуску.

**Рішення:** Видалити `"react-native-purchases"` з масиву `plugins` в `app.json`:

```json
// ❌ Неправильно:
"plugins": ["react-native-purchases", ...]

// ✅ Правильно — його тут НЕ має бути:
"plugins": ["expo-notifications", "@react-native-firebase/app", ...]
```

`react-native-purchases` підключається автоматично через autolinking при нативному білді.

---

### `[Error: Native module RNFBAppModule not found]` — Firebase краш при старті в Expo Go

**Причина:** `@react-native-firebase/*` містить нативний код. Статичний `import crashlytics from "@react-native-firebase/crashlytics"` на верхньому рівні файлу ламає Expo Go — нативний модуль не знаходиться при завантаженні.

**Рішення:** Lazy-require з `isExpoGo` перевіркою в `lib/analytics.ts`:

```typescript
import Constants from "expo-constants";
const isExpoGo = Constants.appOwnership === "expo";

let _crashlytics: any = null;
if (!isExpoGo) {
  try { _crashlytics = require("@react-native-firebase/crashlytics").default; } catch {}
}

// Використовувати через геттер, НЕ через прямий імпорт:
export function getCrashlyticsInstance() {
  if (!_crashlytics) return { recordError: () => {}, log: () => {} };
  try { return _crashlytics(); } catch { return { recordError: () => {} }; }
}
```

В `app/_layout.tsx` — замінити прямий імпорт на геттер:
```typescript
// ❌ Було:
import crashlytics from "@react-native-firebase/crashlytics";
crashlytics().recordError(error);

// ✅ Стало:
import { getCrashlyticsInstance } from "../lib/analytics";
getCrashlyticsInstance().recordError(error);
```

---

### `[RC] init failed: Invalid API key` — RevenueCat краш в Expo Go

**Причина:** `Purchases.configure()` і всі RevenueCat методи вимагають нативного модуля, який недоступний в Expo Go.

**Рішення:** `isExpoGo` guard в `lib/purchases.ts` — застосований до **всіх** функцій:

```typescript
const isExpoGo = Constants.appOwnership === "expo";

export async function initPurchases() {
  if (isExpoGo) return;   // ← ранній вихід
  Purchases.configure({ apiKey: ... });
}

export async function checkPremium() {
  if (isExpoGo) return false;  // ← Expo Go = завжди free
  // ... RevenueCat getCustomerInfo()
}
// Те саме для: getOfferings, purchasePackage, restorePurchases
```

---

### Поле вводу в чаті зникає після першого повідомлення

**Причина:** `ScrollView` без `style={{ flex: 1 }}` розтягується на весь доступний простір, виштовхуючи `inputRow` за межі екрану.

**Рішення:** Додати `style={styles.messagesList}` до `ScrollView` з `flex: 1`:

```typescript
// app/chat.tsx
<ScrollView ref={scrollRef} style={styles.messagesList} ...>

const styles = StyleSheet.create({
  messagesList: { flex: 1 },  // ← обов'язково!
});
```

---

### Клавіатура в чаті: 78px відступ між полем вводу та клавіатурою

**Причина:** `BottomNav` (висота ~78px) знаходився **всередині** `KeyboardAvoidingView`, через що KAV враховував його висоту двічі.

**Рішення:** Правильна структура — `BottomNav` **поза** KAV, з `keyboardVerticalOffset` рівним висоті BottomNav:

```typescript
// ✅ Правильна структура:
<View style={styles.container}>
  <KeyboardAvoidingView
    style={styles.kav}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 78 : 0}  // висота BottomNav
  >
    <View style={styles.header}>...</View>
    <ScrollView style={styles.messagesList}>...</ScrollView>  {/* flex: 1 */}
    <View style={styles.inputRow}>...</View>  {/* без paddingBottom: 78 */}
  </KeyboardAvoidingView>
  <BottomNav active="chat" />  {/* ← поза KAV! */}
</View>
```

---

### Score = 0 в чаті хоча на головній показує реальне значення

**Причина:** Supabase `getSession()` повертає `null` коли користувач авторизований тільки через Firebase. Код `session?.user?.id` давав `undefined` → запит до Supabase не виконувався → `score` залишався 0.

**Рішення:** Firebase UID як fallback — застосовано до всіх екранів де є Supabase-запити:

```typescript
import { auth } from "../lib/firebase";

// ✅ Правильний патерн:
const { data: { session } } = await supabase.auth.getSession();
const uid = session?.user?.id || auth.currentUser?.uid;
if (!uid) return;
```

Застосовано в: `chat.tsx`, `home.tsx`, `my-path.tsx`, `pharmacy.tsx`.

---

### Емодзі в інтерфейсі замість іконок

**Причина:** Весь UI використовував Unicode-емодзі (🔥, ✨, ⚡, ✅ тощо) замість векторних іконок.

**Рішення:** Глобальна заміна на `Ionicons` з `@expo/vector-icons` по всіх екранах:

```typescript
import { Ionicons } from "@expo/vector-icons";

// Замість: <Text>🔥</Text>
<Ionicons name="flame" size={20} color={COLORS.primary} />

// Замість: emoji в об'єктах даних (практики, поради тощо)
// type Practice = { emoji: string }  →  { icon: string }
// practice.emoji  →  <Ionicons name={practice.icon as any} size={28} />
```

Файли оновлені: `home.tsx`, `my-path.tsx`, `pharmacy.tsx`, `chat.tsx`, `onboarding.tsx`, `auth.tsx`, `welcome.tsx`, `dream-path.tsx`.

---

### Gradle білд: команди для Google Play (AAB)

**Повний порядок дій для нового білду:**

```powershell
# 1. Regenerate android/
cd C:\Users\dell\Desktop\Job\Projects\naelo-app
npx expo prebuild --platform android --clean

# 2. Відновити local.properties (видаляється --clean)
# Створити C:\Users\dell\Desktop\Job\Projects\naelo-app\android\local.properties з вмістом:
# sdk.dir=C\:\\Users\\dell\\AppData\\Local\\Android\\Sdk

# 3. Зібрати підписаний AAB
cd C:\Users\dell\Desktop\Job\Projects\naelo-app\android
.\gradlew.bat bundleRelease `
  "-Pandroid.injected.signing.store.file=C:\Users\dell\Downloads\Telegram Desktop\@deusn__ingredify (2).jks" `
  "-Pandroid.injected.signing.store.password=<пароль>" `
  "-Pandroid.injected.signing.key.alias=<alias>" `
  "-Pandroid.injected.signing.key.password=<пароль>"
```

**Готовий AAB:**
```
C:\Users\dell\Desktop\Job\Projects\naelo-app\android\app\build\outputs\bundle\release\app-release.aab
```

> Перший білд займає ~40 хвилин (компіляція C++). Повторні білди — 3-7 хвилин (кеш Gradle).

---

### Версія застосунку для Google Play

При кожному новому завантаженні в Google Play Console **`versionCode` має бути більшим** ніж у попередній версії.

В `app.json`:
```json
"version": "1.0.2",          // рядок для користувачів
"android": {
  "versionCode": 3            // ціле число, тільки збільшувати
}
```

Після зміни версії — обов'язково запустити `prebuild --clean` + новий Gradle білд.

---

## 16. Додаткова інформація

### Ресурси

| Сервіс | URL |
|---|---|
| Supabase Dashboard | https://supabase.com/dashboard/project/cqaoiiditrxnwshgpfrf |
| Firebase Console | https://console.firebase.google.com |
| Anthropic Console | https://console.anthropic.com |
| Google Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |
| GitHub | https://github.com/dashabuildlab/naelo |

### Важливі URL продакшн

| Ендпоінт | URL |
|---|---|
| Лендінг | https://mynaelo.com |
| API health | https://mynaelo.com/api/health |
| AI chat | https://mynaelo.com/api/ai/chat |
| Приватність | https://mynaelo.com/api/privacy |
| Умови | https://mynaelo.com/api/policy |
| Видалення акаунту | https://mynaelo.com/api/delete-account |

### Google Cloud Console — необхідна налаштовка

Для Google Sign-In потрібно додати Authorized Redirect URI:

```
# В Google Cloud Console → OAuth 2.0 Credentials:
Authorized redirect URIs:
  naelo://auth/callback
  exp://...   (для Expo Go, якщо потрібно)
```

### Готовність застосунку (травень 2026)

#### Реалізовано ✅
| Функція | Деталі |
|---|---|
| Welcome + Onboarding | Повністю |
| Авторизація | Firebase Auth — email + Google OAuth |
| Home (Вогник Душі) | Чекін, питання дня (7 ротацій), score, поради |
| My Path | Графік енергії, стрічка записів, Додай/Відпусти |
| Pharmacy (Практики) | 4 категорії, таймер, трекінг в Supabase |
| Dream Path | Мрії, кроки, прогрес, фільтр істинності |
| AI Chat (Naelo AI) | Claude haiku-4-5, реальний контекст користувача |
| Навігація | Bottom Nav, expo-router |
| Supabase БД | profiles, checkins, practice_logs |
| API сервер | Node.js + Express на mynaelo.com:8012 |
| Статичні сторінки | Privacy, Policy, Delete Account |
| Google Play AAB | Підписаний білд v1.0.2 / versionCode 3 |

#### Реалізовано (оновлено травень 2026) ✅
| Функція | Деталі |
|---|---|
| Таблиці dreams / dream_steps | Локальний PostgreSQL на сервері, API роутер `/api/dreams/*` |
| Streak автооновлення | Розраховується автоматично при щоденному чекіні |
| AI score алгоритм | `/api/ai/evaluate` — Claude haiku аналізує текст відповіді |
| Екран налаштувань акаунту | `settings.tsx` — ім'я, вихід, видалення акаунту |
| Firebase Crashlytics | Нативний SDK v24, автоперехоплення JS-краш, ідентифікація по userId |
| Firebase Analytics | Screen views + custom events (checkin_submit, practice_complete) |
| Firebase Performance | `perf-plugin:1.4.2`, готовий `startTrace()` хелпер |
| Підтримка iPad | Responsive layout: `CONTENT_MAX_W=680`, `CONTENT_PAD_H`, всі 10 екранів адаптовані |
| Push-сповіщення | `lib/notifications.ts` — щоденний DAILY trigger, налаштування в settings.tsx |
| Повна статистика | `app/stats.tsx` — SVG-графік 30 днів, календар, категорії практик |
| Преміум підписка | `lib/purchases.ts` + `app/paywall.tsx` — RevenueCat, free/premium gates |
| App Store конфіг | `app.json` infoPlist, privacyManifests; `eas.json` build profiles |

#### Не реалізовано ❌
| Функція | Пріоритет | Деталі |
|---|---|---|
| RevenueCat API ключі | 🔴 Обов'язково | Замінити placeholder ключі в `lib/purchases.ts` |
| App Store продукти | 🔴 Обов'язково | Створити підписки в App Store Connect + Google Play Console |
| notification-icon.png | 🟡 Android | `assets/images/notification-icon.png` (96×96, білі пікселі) |
| App Store публікація | 🟠 Після налаштування | Apple Developer account + EAS submit |
| Widgets (iOS/Android) | ⚪ Майбутнє | |
| Офлайн-режим | ⚪ Майбутнє | |

**Загальна готовність: ~97%**
Для публічного релізу: вказати реальні RevenueCat API ключі + створити продукти в сторах.

### API Dreams (травень 2026)

Таблиці `dreams` та `dream_steps` — в локальному PostgreSQL на сервері (`app_luma_64`).
Доступ через API: `https://mynaelo.com/api/dreams`.

| Ендпоінт | Метод | Опис |
|---|---|---|
| `/api/dreams?user_id=X` | GET | Всі мрії з кроками |
| `/api/dreams` | POST | Нова мрія |
| `/api/dreams/:id` | PATCH | Оновити `verified` |
| `/api/dreams/:id` | DELETE | Видалити (CASCADE) |
| `/api/dreams/steps` | POST | Додати крок |
| `/api/dreams/steps/:id` | PATCH | Перемкнути `done` |

### Anthropic Claude — модель
- Поточна модель: **claude-haiku-4-5** (найдешевша, $1/$5 за MTok)
- Попередня: claude-opus-4-5 (замінена травень 2026)
- Deprecated (до 15 червня 2026): claude-sonnet-4-0, claude-opus-4-0

### Майбутні плани

- [x] Таблиці dreams / dream_steps (PostgreSQL на сервері)
- [x] Streak автооновлення (при щоденному чекіні)
- [x] AI score алгоритм (Claude haiku оцінює відповідь)
- [x] Екран налаштувань акаунту
- [x] Push-сповіщення (нагадування про чекін) — `lib/notifications.ts`
- [x] Повна статистика та графіки score — `app/stats.tsx`
- [x] Преміум підписка (RevenueCat) — `lib/purchases.ts` + `app/paywall.tsx`
- [x] App Store конфіг — `app.json` + `eas.json`
- [ ] RevenueCat реальні API ключі (встановити в `lib/purchases.ts`)
- [ ] Продукти підписки в App Store Connect / Google Play Console
- [ ] App Store публікація (iOS) — через `eas submit`
- [ ] Web-версія (expo web output: static)

### Changelog

| Версія | Дата | Зміни |
|---|---|---|
| 1.0.0 | Квітень 2026 | Перший реліз. Онбординг, Home, Chat, Pharmacy, Dream-path, My-path |
| — | Квітень 2026 | Міграція `expo-av` → `expo-video` |
| — | Квітень 2026 | Fix: Google OAuth (ExpoCryptoAES crash в Expo Go) |
| — | Квітень 2026 | Fix: AI chat routing через Caddy |
| — | Квітень 2026 | Fix: Package name `com.mynaelo.app`, видалення `RECORD_AUDIO` |
| — | Квітень 2026 | Додано лендінг mynaelo.com + HTML сторінки (privacy/policy/delete-account) |
| 1.0.2 | Травень 2026 | Firebase Crashlytics/Analytics/Perf; підтримка iPad (CONTENT_MAX_W); Settings screen; UI cleanup (Ionicons, без емодзі) |
| 1.1.0 | Травень 2026 | Push-сповіщення (expo-notifications, DAILY trigger); Повна статистика (stats.tsx, SVG); RevenueCat підписка (paywall.tsx, purchases.ts); App Store конфіг (eas.json, privacyManifests); premium gates (pharmacy 3/day, chat 7→30 днів); Fix: react-native-purchases видалено з plugins (autolinking); Fix: Firebase lazy-require — безпечно в Expo Go; Fix: RevenueCat isExpoGo guard у всіх функціях; Fix: chat keyboard (KAV+BottomNav патерн, flex:1 на ScrollView); Fix: score=0 в чаті (Firebase UID fallback); Fix: кнопку назад видалено з чату; Заміна всіх емодзі → Ionicons по 8 екранах; Іконка застосунку (flame+lighthouse); notification-icon (96×96 white) |

---

## 17. App Store / Google Play Listing

### Назви та підзаголовки (ASO)

| Платформа | Мова | Назва (30 chars) | Підзаголовок (30 chars) |
|---|---|---|---|
| App Store / Google Play | English | Naelo: Mood Tracker & Journal | Self-care, anxiety & gratitude |
| App Store / Google Play | Українська | Naelo: Щоденник Настрою | Турбота про себе і емоції |
| App Store / Google Play | Українська alt | Naelo: Настрій і Щоденник | Турбота, спокій, вдячність |

### Google Play — Коротке опис (UA, 80 символів)

```
Щоденні чекіни, практики та навігатор мрій з AI-підтримкою для внутрішнього балансу
```

### Google Play — Повний опис (UA)

```
Naelo — персональний AI-провідник для розуміння свого внутрішнього стану.

Відстежуй енергію, формуй звички та рухайся до своїх мрій — без тиску і провини.

Вогник Душі

Числовий показник твоєї енергії від 5 до 95. Щодня відповідай на питання дня, фіксуй свій стан і спостерігай, як змінюється твій внутрішній вогник протягом тижнів і місяців.

Щоденні чекіни

Сім питань, що чергуються. Кожне — запрошення зупинитися й відчути себе тут і зараз. Жодного тиску, жодних правильних відповідей — тільки ти і твій стан.

Практики

Дихальні вправи та техніки релаксації з таймером. Інструменти для будь-якого стану: тривога, втома, розсіяність. Обирай практику під свій момент і повертайся до рівноваги.

Навігатор мрій

Додавай мрії, ділі їх на конкретні кроки та відстежуй прогрес. Фільтр істинності — п'ять питань, які допомагають зрозуміти: ця мрія справді твоя?

Naelo AI

Персональний AI-помічник, який знає твій контекст: рівень енергії, streak, настрій і попередні записи. Говори про те, що важливо — отримуй підтримку і ясність.

Streak без провини

Відзначай кожен день з додатком. Пропустив — нічого страшного. Naelo не карає за паузи, а підтримує повернення.

Для кого Naelo

Для тих, хто хоче розуміти себе, а не просто відстежувати звички. Для тих, хто шукає підтримку в моменти тривоги, втоми або невизначеності. Для тих, хто йде до своїх мрій і хоче бачити реальний прогрес.

Naelo — це не черговий трекер. Це дзеркало твого внутрішнього стану і провідник до усвідомленого життя.

Почни з одного чекіну. Відчуй різницю.
```

### Google Play — Data Safety (заповнено квітень 2026)

| Питання | Відповідь |
|---|---|
| Збір / передача даних | Так |
| Всі дані передаються зашифровано | Так |
| Запит на видалення даних | Так — https://mynaelo.com/api/delete-account |
| Спосіб реєстрації | Email + пароль, OAuth (Google) |
| Цільова вікова група | 18+ |
| Тип додатку | Здоровье и фитнес |
| Дані: Email | Збирає + передає, не тимчасово, обов'язково, мета: функції / акаунт / безпека |
| Дані: User ID | Збирає, не тимчасово, обов'язково, мета: функції / акаунт / персоналізація |
| Дані: Повідомлення (AI-чат) | Збирає + передає (Anthropic), не тимчасово, опційно, мета: функції / персоналізація |
| Дані: Дії в застосунку | Збирає, не тимчасово, обов'язково, мета: функції / персоналізація |
| Дані: Контент користувача | Збирає, не тимчасово, опційно, мета: функції / персоналізація |

---

*© 2026 Naelo · privacy@naelo.app*
