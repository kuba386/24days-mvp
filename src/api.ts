import type { Focus } from './focus';
import type { CourseId } from './courses';

export type Post = {
  id: number;
  author_name: string | null;
  focus: Focus | null;
  habit: string | null;
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

export function syncProgress(payload: {
  course: CourseId;
  day: number;
  focus: Focus;
  habit: string | null;
  lastDoneAt: string | null;
}) {
  const data = initData();
  if (!data) return;
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, initData: data, tzOffset: new Date().getTimezoneOffset() }),
    keepalive: true,
  }).catch(() => {});
}

export const fetchThread = (course: CourseId, day: number) =>
  request<Post[]>(`/api/thread?course=${course}&day=${day}`);

export const sharePost = (post: {
  course: CourseId;
  day: number;
  note: string;
  value?: number;
  focus: Focus;
  habit?: string;
}) => request<{ ok: true }>('/api/thread', { method: 'POST', body: JSON.stringify(post) });

export const unsharePost = (course: CourseId, day: number) =>
  request<{ ok: true }>(`/api/thread?course=${course}&day=${day}`, { method: 'DELETE' });

export const toggleReaction = (postId: number) =>
  request<{ reacted: boolean }>('/api/react', { method: 'POST', body: JSON.stringify({ postId }) });
