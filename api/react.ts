import { userFromRequest } from './_lib/auth';
import { toggleReaction } from './_lib/db';

export async function POST(req: Request) {
  const user = userFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  const postId = Number(body?.postId);
  if (!Number.isInteger(postId) || postId <= 0) return new Response('bad request', { status: 400 });

  const reacted = await toggleReaction(postId, user.id);
  return Response.json({ reacted });
}
