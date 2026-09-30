# CLAUDE.md

Telegram Mini App «24 DAYS»: 24-дневные курсы по книгам. «Продуктивный год» (Крис Бейли, «Мой продуктивный год») «Атомные привычки» (Джеймс Клир) и «Дела в порядке» (Дэвид Аллен, «Как привести дела в порядок»). UI и тексты на русском.

## Команды

- `npm run dev`: Vite dev server на порту 5173 (конфиг `24days-dev` в `.claude/launch.json`)
- `npm run build`: `tsc -b && vite build`, это же проверка типов (фронт и `api/`)
- Тестов и линтера нет

## Архитектура

- **Фронтенд**: React 18 + Vite + TypeScript, без UI-библиотек. Стили в `src/index.css`, цвета из Telegram `themeParams` (`--tg-theme-*`) с фолбэками для тёмной и светлой темы.
- **Курсы**: `src/courses.ts` (`COURSES`), контент в `src/data/days.json` (year) `src/data/habits.json` (habits) и `src/data/gtd.json` (gtd). 24 дня, 4 блока по 6, дни 6/12/18/24 обзорные, опциональный `metric`. У year свои `actions` на каждый фокус (`product|study|health`). У habits и gtd одно `action` и `examples` по фокусу; у habits в текстах плейсхолдер `{привычка}` (подставляет `fillHabit`). Привычка собирается конструктором как «Что Сколько Когда» с заглавной буквы, поэтому `{привычка}` ставим в «кавычки» или после двоеточия, не после глагола. Опциональный `template` у дня: заготовка заметки для кнопки «Заполнить по шаблону», `…` отмечает места для ввода. Новый курс: JSON, запись в `COURSES`, цвета блоков в `src/blocks.ts`, id в `api/_lib/courses.ts`, `COURSE_DAYS` в `api/remind.ts` и в check-констрейнтах миграции.
- **Прогресс**: `src/hooks/useCloudStorage.ts`, Telegram CloudStorage (лимит 4096 символов на значение). Ключи `course`, `focus`, `habit`, `habit_log` (JSON-массив дат ежедневной отметки привычки, до 300 шт.) и `<keyPrefix>day_N`. Сброс курса пишет в ключи дней пустую строку: при загрузке она читается как «день не начат». У year префикс пустой ради совместимости со старым прогрессом; нет `course`, но есть `focus`, значит пользователь на year. Вне Telegram SDK бросает `WebAppMethodUnsupported`, поэтому стоит try/catch с фолбэком на localStorage.
- **Цепочка привычки** (`softChain` в `src/dates.ts`): правило «не пропускать дважды», одиночный пропуск её не рвёт, два подряд рвут.
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
