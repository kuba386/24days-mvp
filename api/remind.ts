import days from '../src/data/days.json';
import { env, appUrl } from './_lib/env';
import { escapeHtml, openAppKeyboard, sendMessage } from './_lib/telegram';
import { listRemindable, setReminders, type UserRow } from './_lib/db';

type Day = (typeof days)[number];

// Локальная дата пользователя: getTimezoneOffset() в JS — это минуты, которые надо вычесть из UTC
const localDate = (tzOffsetMin: number | null | undefined) =>
  new Date(Date.now() - (tzOffsetMin ?? 0) * 60_000).toISOString().slice(0, 10);

function buildText(user: UserRow, day: Day) {
  const focus = (user.focus ?? 'product') as keyof Day['actions'];
  const lines = [
    `<b>День ${day.day} из ${days.length}: ${escapeHtml(day.title)}</b>`,
    escapeHtml(day.focus),
    '',
    `Сегодня: ${escapeHtml(day.tasks[0])}`,
  ];
  if (day.metric) lines.push(`Замер дня: ${escapeHtml(day.metric.label)}`);
  lines.push('', escapeHtml(day.actions[focus]));
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
    const dayNumber = user.current_day ?? 1;
    const day = days[dayNumber - 1];
    if (!day || user.last_done_at === localDate(user.tz_offset_min)) {
      skipped++;
      continue;
    }

    const status = await sendMessage(user.chat_id, buildText(user, day), openAppKeyboard(appUrl()));
    if (status === 403) {
      await setReminders(user.telegram_id, false);
      blocked++;
    } else {
      sent++;
    }
  }

  return Response.json({ sent, skipped, blocked });
}
