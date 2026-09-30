import { userFromRequest } from './_lib/auth.js';
import { deleteInbox, listInbox } from './_lib/db.js';

// Сообщения, которые пользователь отправил боту, ждут здесь, пока приложение их не заберёт
export async function GET(req: Request) {
  const user = userFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });
  return Response.json(await listInbox(user.id));
}

export async function DELETE(req: Request) {
  const user = userFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  const ids = (new URL(req.url).searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 200);
  if (ids.length === 0) return new Response('bad ids', { status: 400 });

  await deleteInbox(user.id, ids);
  return Response.json({ ok: true });
}
