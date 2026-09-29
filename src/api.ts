import type { Focus } from './focus';

export type Post = {
  id: number;
  author_name: string | null;
  focus: Focus | null;
  note: string;
  value: number | null;
  created_at: string;
  reactions: number;
  reacted: boolean;
  mine: boolean;
};

// Вне Telegram initData пустой — API недоступно, компоненты сообщества не показываются
export const initData = () => window.Telegram?.WebApp?.initData || null;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const data = initData();
  if (!data) throw new Error('outside telegram');
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `tma ${data}`, ...init.headers },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export function syncProgress(payload: { day: number; focus: Focus; lastDoneAt: string | null }) {
  const data = initData();
  if (!data) return;
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, initData: data, tzOffset: new Date().getTimezoneOffset() }),
    keepalive: true,
  }).catch(() => {});
}

export const fetchThread = (day: number) => request<Post[]>(`/api/thread?day=${day}`);

export const sharePost = (post: { day: number; note: string; value?: number; focus: Focus }) =>
  request<{ ok: true }>('/api/thread', { method: 'POST', body: JSON.stringify(post) });

export const unsharePost = (day: number) =>
  request<{ ok: true }>(`/api/thread?day=${day}`, { method: 'DELETE' });

export const toggleReaction = (postId: number) =>
  request<{ reacted: boolean }>('/api/react', { method: 'POST', body: JSON.stringify({ postId }) });
