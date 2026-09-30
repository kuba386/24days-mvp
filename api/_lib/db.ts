import { env } from './env.js';

export type UserRow = {
  telegram_id: number;
  chat_id: number;
  first_name?: string | null;
  course?: string;
  focus?: string | null;
  habit?: string | null;
  current_day?: number | null;
  last_done_at?: string | null;
  tz_offset_min?: number | null;
  reminders_enabled?: boolean;
  updated_at?: string;
};

export type PostRow = {
  id: number;
  author_name: string | null;
  focus: string | null;
  habit: string | null;
  note: string;
  value: number | null;
  created_at: string;
  reactions: number;
  reacted: boolean;
  mine: boolean;
};

function headers() {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

const rest = (path: string) => `${env('SUPABASE_URL')}/rest/v1/${path}`;
const now = () => new Date().toISOString();

async function check(res: Response, what: string) {
  if (!res.ok) throw new Error(`${what} failed: ${res.status} ${await res.text()}`);
}

// Upsert по первичному ключу обновляет только переданные колонки
export async function upsertUser(row: UserRow) {
  const res = await fetch(rest('days24_users'), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...row, updated_at: now() }),
  });
  await check(res, 'upsert user');
}

export async function setReminders(telegramId: number, enabled: boolean) {
  const res = await fetch(rest(`days24_users?telegram_id=eq.${telegramId}`), {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ reminders_enabled: enabled, updated_at: now() }),
  });
  await check(res, 'set reminders');
}

export async function listRemindable(): Promise<UserRow[]> {
  const res = await fetch(rest('days24_users?reminders_enabled=eq.true&select=*'), {
    headers: headers(),
  });
  await check(res, 'list users');
  return res.json();
}

export async function fetchThread(course: string, day: number, viewer: number): Promise<PostRow[]> {
  const res = await fetch(rest('rpc/days24_thread'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_course: course, p_day: day, p_viewer: viewer }),
  });
  await check(res, 'thread');
  return res.json();
}

export async function upsertPost(post: {
  telegram_id: number;
  author_name: string | null;
  course: string;
  day: number;
  focus: string | null;
  habit: string | null;
  note: string;
  value: number | null;
}) {
  const res = await fetch(rest('days24_posts?on_conflict=telegram_id,course,day'), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...post, hidden: false, created_at: now() }),
  });
  await check(res, 'upsert post');
}

export async function deletePost(telegramId: number, course: string, day: number) {
  const res = await fetch(
    rest(`days24_posts?telegram_id=eq.${telegramId}&course=eq.${course}&day=eq.${day}`),
    {
      method: 'DELETE',
      headers: { ...headers(), Prefer: 'return=minimal' },
    }
  );
  await check(res, 'delete post');
}

// Повторная реакция снимает предыдущую: вставка упирается в первичный ключ (409) → удаляем
export async function toggleReaction(postId: number, telegramId: number): Promise<boolean> {
  const res = await fetch(rest('days24_reactions'), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ post_id: postId, telegram_id: telegramId }),
  });
  if (res.ok) return true;
  if (res.status !== 409) await check(res, 'react');

  const del = await fetch(rest(`days24_reactions?post_id=eq.${postId}&telegram_id=eq.${telegramId}`), {
    method: 'DELETE',
    headers: { ...headers(), Prefer: 'return=minimal' },
  });
  await check(del, 'unreact');
  return false;
}

export type InboxRow = { id: number; text: string; created_at: string };

export async function addInbox(telegramId: number, text: string) {
  const res = await fetch(rest('days24_inbox'), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ telegram_id: telegramId, text }),
  });
  await check(res, 'add inbox');
}

export async function listInbox(telegramId: number): Promise<InboxRow[]> {
  const res = await fetch(
    rest(`days24_inbox?telegram_id=eq.${telegramId}&select=id,text,created_at&order=id&limit=200`),
    { headers: headers() }
  );
  await check(res, 'list inbox');
  return res.json();
}

export async function deleteInbox(telegramId: number, ids: number[]) {
  const res = await fetch(
    rest(`days24_inbox?telegram_id=eq.${telegramId}&id=in.(${ids.join(',')})`),
    { method: 'DELETE', headers: { ...headers(), Prefer: 'return=minimal' } }
  );
  await check(res, 'delete inbox');
}
