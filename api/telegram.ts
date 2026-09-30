import { env, appUrl } from './_lib/env.js';
import { escapeHtml, openAppKeyboard, sendMessage } from './_lib/telegram.js';
import { addInbox, setReminders, upsertUser } from './_lib/db.js';

const WELCOME = [
  'Привет! Это <b>24 дня</b>: курсы по книгам, по одному дню за раз.',
  '',
  '• «Продуктивный год» по книге Криса Бейли: время, энергия, внимание и дисциплина',
  '• «Атомные привычки» по книге Джеймса Клира: одна твоя привычка за 24 дня',
  '• «Дела в порядке» по книге Дэвида Аллена: система для всех твоих задач',
  '',
  'Каждое утро я буду напоминать, какой сегодня день и что замерить. ',
  'А любое сообщение без команды я запишу в твои «Входящие» в приложении.',
  'Выключить напоминания: /stop, включить снова: /start.',
].join('\n');

export async function POST(req: Request) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== env('TELEGRAM_WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.text || !msg.from || !msg.chat) return Response.json({ ok: true });

  const command = String(msg.text).trim().split(/[\s@]/)[0];
  const from = msg.from as { id: number; first_name?: string };

  if (command === '/start') {
    await upsertUser({
      telegram_id: from.id,
      chat_id: msg.chat.id,
      first_name: from.first_name ?? null,
      reminders_enabled: true,
    });
    await sendMessage(msg.chat.id, WELCOME, openAppKeyboard(appUrl()));
  } else if (command === '/stop') {
    await setReminders(from.id, false);
    await sendMessage(msg.chat.id, 'Напоминания выключены. Включить снова: /start');
  } else if (!command.startsWith('/')) {
    const text = String(msg.text).trim().slice(0, 300);
    await addInbox(from.id, text);
    await sendMessage(
      msg.chat.id,
      `Записал во «Входящие»: ${escapeHtml(text)}\nРазобрать можно в приложении, в «Мои дела».`,
      openAppKeyboard(appUrl())
    );
  }

  return Response.json({ ok: true });
}
