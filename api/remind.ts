import yearDays from '../src/data/days.json' with { type: 'json' };
import habitsDays from '../src/data/habits.json' with { type: 'json' };
import { env, appUrl } from './_lib/env.js';
import { escapeHtml, openAppKeyboard, sendMessage } from './_lib/telegram.js';
import { listRemindable, setReminders, type UserRow } from './_lib/db.js';

type Focus = 'product' | 'study' | 'health';
type Day = {
  day: number;
  title: string;
  focus: string;
  tasks: string[];
  actions?: Record<Focus, string>;
  action?: string;
  metric?: { label: string };
};

const COURSE_DAYS: Record<string, Day[]> = { year: yearDays, habits: habitsDays };

const fillHabit = (text: string, habit: string | null | undefined) =>
  text.split('{привычка}').join(habit?.trim() || 'твоя привычка');

// Локальная дата пользователя: getTimezoneOffset() в JS — это минуты, которые надо вычесть из UTC
const localDate = (tzOffsetMin: number | null | undefined) =>
  new Date(Date.now() - (tzOffsetMin ?? 0) * 60_000).toISOString().slice(0, 10);

function buildText(user: UserRow, day: Day, total: number) {
  const focus = (user.focus ?? 'product') as Focus;
  const fill = (text: string) => escapeHtml(fillHabit(text, user.habit));
  const lines = [
    `<b>День ${day.day} из ${total}: ${escapeHtml(day.title)}</b>`,
    escapeHtml(day.focus),
    '',
    `Сегодня: ${fill(day.tasks[0])}`,
  ];
  if (day.metric) lines.push(`Замер дня: ${escapeHtml(day.metric.label)}`);
  lines.push('', fill(day.action ?? day.actions?.[focus] ?? ''));
  return lines.join('\n');
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${env('CRON_SECRET')}`) {
    return new Response('forbidden', { status: 403 });
  }

  const users = await listRemindable();
  let sent = 0;
  let skipped = 0;
  let blocked = 0;

  for (const user of users) {
    const days = COURSE_DAYS[user.course ?? 'year'] ?? COURSE_DAYS.year;
    const dayNumber = user.current_day ?? 1;
    const day = days[dayNumber - 1];
    if (!day || user.last_done_at === localDate(user.tz_offset_min)) {
      skipped++;
      continue;
    }

    const status = await sendMessage(user.chat_id, buildText(user, day, days.length), openAppKeyboard(appUrl()));
    if (status === 403) {
      await setReminders(user.telegram_id, false);
      blocked++;
    } else {
      sent++;
    }
  }

  return Response.json({ sent, skipped, blocked });
}
