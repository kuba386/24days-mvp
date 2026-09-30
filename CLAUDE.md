# CLAUDE.md

Telegram Mini App «24 DAYS»: 24-дневные курсы по книгам. «Продуктивный год» (Крис Бейли, «Мой продуктивный год») и «Атомные привычки» (Джеймс Клир). UI и тексты на русском.

## Команды

- `npm run dev`: Vite dev server на порту 5173 (конфиг `24days-dev` в `.claude/launch.json`)
- `npm run build`: `tsc -b && vite build`, это же проверка типов (фронт и `api/`)
- Тестов и линтера нет

## Архитектура

- **Фронтенд**: React 18 + Vite + TypeScript, без UI-библиотек. Стили в `src/index.css`, цвета из Telegram `themeParams` (`--tg-theme-*`) с фолбэками для тёмной и светлой темы.
- **Курсы**: `src/courses.ts` (`COURSES`), контент в `src/data/days.json` (year) и `src/data/habits.json` (habits). 24 дня, 4 блока по 6, дни 6/12/18/24 обзорные, опциональный `metric`. У year свои `actions` на каждый фокус (`product|study|health`). У habits одно `action` с плейсхолдером `{привычка}` (подставляет `fillHabit`) и `examples` по фокусу. Новый курс: JSON, запись в `COURSES`, цвета блоков в `src/blocks.ts`, id в `api/_lib/courses.ts` и в check-констрейнтах миграции.
- **Прогресс**: `src/hooks/useCloudStorage.ts`, Telegram CloudStorage (лимит 4096 символов на значение). Ключи `course`, `focus`, `habit` и `<keyPrefix>day_N`. У year префикс пустой ради совместимости со старым прогрессом; нет `course`, но есть `focus`, значит пользователь на year. Вне Telegram SDK бросает `WebAppMethodUnsupported`, поэтому стоит try/catch с фолбэком на localStorage.
- **Правила дней** (`src/App.tsx`): открывается один день в календарные сутки. Следующий день доступен, если предыдущий выполнен и `doneAt !== todayKey()`. Даты локальные `YYYY-MM-DD` (`src/dates.ts`).
- **Бэкенд**: Vercel functions в `api/` (Web `Request`/`Response`, ESM). Относительные импорты обязательно с `.js`, JSON через `with { type: 'json' }`, иначе на Vercel `FUNCTION_INVOCATION_FAILED`.
  - Авторизация: заголовок `Authorization: tma <initData>`, HMAC проверяется в `api/_lib/telegram.ts`
  - БД: Supabase REST с service role (`api/_lib/db.ts`). Схема в `supabase/migrations/`. Таблицы `days24_users`, `days24_posts` (уникальность по `telegram_id, course, day`), `days24_reactions` с RLS без политик, доступ только с сервера
  - `api/telegram.ts`: вебхук бота (/start, /stop), проверяет `x-telegram-bot-api-secret-token`
  - `api/remind.ts`: ежедневный cron (`vercel.json`, `0 4 * * *`), `Bearer CRON_SECRET`
  - Переменные окружения описаны в `.env.example`
- Тред дня (`DayThread.tsx`) скрыт вне Telegram, когда `initData` пустой.

## Деплой

- Git remote называется `24` (не `origin`). Пушим прямо в `main`: `git push 24 HEAD:main`, спросив пользователя перед пушем.
- Vercel-проект `24days-mvp` (scope `kuban1`) автодеплоится из `main`, прод: https://24days-mvp.vercel.app
- Supabase: переезд в отдельный проект (в общем `logocrm` таблицы пропали). Новый проект поднимается миграцией `supabase/migrations/0001_init.sql`.
