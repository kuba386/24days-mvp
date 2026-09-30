import { userFromRequest } from './_lib/auth.js';
import { deletePost, fetchThread, upsertPost } from './_lib/db.js';
import { parseCourse, parseHabit } from './_lib/courses.js';

const FOCUSES = ['product', 'study', 'health'];
const NOTE_MAX = 1000;

const parseDay = (raw: unknown) => {
  const day = Number(raw);
  return Number.isInteger(day) && day >= 1 && day <= 24 ? day : null;
};

export async function GET(req: Request) {
  const user = userFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  const params = new URL(req.url).searchParams;
  const course = parseCourse(params.get('course'));
  const day = parseDay(params.get('day'));
  if (!course || !day) return new Response('bad day', { status: 400 });

  return Response.json(await fetchThread(course, day, user.id));
}

// Поделиться заметкой дня (повторно — обновить свою)
export async function POST(req: Request) {
  const user = userFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  const course = parseCourse(body?.course);
  const day = parseDay(body?.day);
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, NOTE_MAX) : '';
  if (!course || !day || !note) return new Response('bad request', { status: 400 });

  await upsertPost({
    telegram_id: user.id,
    author_name: user.first_name ?? null,
    course,
    day,
    focus: FOCUSES.includes(body.focus) ? body.focus : null,
    habit: course === 'habits' ? parseHabit(body.habit) : null,
    note,
    value: typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : null,
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = userFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  const params = new URL(req.url).searchParams;
  const course = parseCourse(params.get('course'));
  const day = parseDay(params.get('day'));
  if (!course || !day) return new Response('bad day', { status: 400 });

  await deletePost(user.id, course, day);
  return Response.json({ ok: true });
}
