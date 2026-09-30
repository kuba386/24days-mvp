import { validateInitData } from './_lib/telegram.js';
import { upsertUser } from './_lib/db.js';
import { parseCourse, parseHabit } from './_lib/courses.js';

const FOCUSES = ['product', 'study', 'health'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Mini App сообщает серверу, на каком дне пользователь, чтобы напоминание было по делу
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.initData !== 'string') {
    return new Response('bad request', { status: 400 });
  }

  const user = validateInitData(body.initData);
  if (!user) return new Response('unauthorized', { status: 401 });

  const course = parseCourse(body.course) ?? 'year';
  const day = Number(body.day);
  const focus = FOCUSES.includes(body.focus) ? (body.focus as string) : null;
  const lastDoneAt = DATE_RE.test(body.lastDoneAt ?? '') ? (body.lastDoneAt as string) : null;
  const tzOffset = Number.isInteger(body.tzOffset) ? (body.tzOffset as number) : null;
  if (!Number.isInteger(day) || day < 1 || day > 25) {
    return new Response('bad day', { status: 400 });
  }

  await upsertUser({
    telegram_id: user.id,
    chat_id: user.id,
    first_name: user.first_name ?? null,
    course,
    focus,
    habit: parseHabit(body.habit),
    current_day: day,
    last_done_at: lastDoneAt,
    tz_offset_min: tzOffset,
  });

  return Response.json({ ok: true });
}
