import { env, appUrl } from './_lib/env.js';
import { escapeHtml, openAppKeyboard, sendMessage } from './_lib/telegram.js';
import { listRemindable, setReminders, type UserRow } from './_lib/db.js';

// Воскресное напоминание об обзоре недели — своё для каждого курса
function buildText(user: UserRow) {
  const head = '<b>Воскресенье — время обзора недели</b>';
  if (user.course === 'habits') {
    const habit = user.habit ? `«${escapeHtml(user.habit)}»` : 'своей привычки';
    return `${head}\nПосмотри цепочку ${habit}: сколько дней из семи? Если были пропуски — сделай привычку проще, а не бросай.`;
  }
  if (user.course === 'gtd') {
    return `${head}\nРазбери «Входящие» до нуля, проверь, что у каждого проекта есть следующий шаг, загляни в «Жду» и календарь на неделю.`;
  }
  return `${head}\nЧто сработало на этой неделе, а что нет? Выбери три главных дела на следующую и поставь их в лучшие часы по энергии.`;
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${env('CRON_SECRET')}`) {
    return new Response('forbidden', { status: 403 });
  }

  let sent = 0;
  let blocked = 0;
  for (const user of await listRemindable()) {
    const status = await sendMessage(user.chat_id, buildText(user), openAppKeyboard(appUrl()));
    if (status === 403) {
      await setReminders(user.telegram_id, false);
      blocked++;
    } else {
      sent++;
    }
  }
  return Response.json({ sent, blocked });
}
