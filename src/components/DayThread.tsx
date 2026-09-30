import { useEffect, useState } from 'react';
import type { Day } from './DayCard';
import type { DayState } from '../hooks/useCloudStorage';
import { FOCUSES, type Focus } from '../focus';
import type { CourseId } from '../courses';
import { fetchThread, initData, sharePost, toggleReaction, unsharePost, type Post } from '../api';

type Props = {
  course: CourseId;
  day: Day;
  focus: Focus;
  habit: string | null;
  state: DayState;
};

const focusTitle = (id: Focus | null) => FOCUSES.find((f) => f.id === id)?.title ?? null;

export function DayThread({ course, day, focus, habit, state }: Props) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetchThread(course, day.day)
      .then((p) => {
        setPosts(p);
        setFailed(false);
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    if (!initData()) return;
    setPosts(null);
    load();
  }, [course, day.day]);

  if (!initData()) return null;

  const mine = posts?.find((p) => p.mine) ?? null;
  const canShare = state.note.trim().length > 0;

  const share = async () => {
    setBusy(true);
    try {
      await sharePost({
        course,
        day: day.day,
        note: state.note.trim(),
        value: state.value,
        focus,
        habit: habit || undefined,
      });
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const unshare = async () => {
    setBusy(true);
    try {
      await unsharePost(course, day.day);
      await load();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const react = async (post: Post) => {
    // Оптимистично: считаем реакцию переключённой, сервер подтвердит
    setPosts((prev) =>
      prev?.map((p) =>
        p.id === post.id
          ? { ...p, reacted: !p.reacted, reactions: p.reactions + (p.reacted ? -1 : 1) }
          : p
      ) ?? prev
    );
    try {
      await toggleReaction(post.id);
    } catch {
      load();
    }
  };

  return (
    <section className="card thread">
      <div className="thread__head">
        <h2 className="card__title">Кто ещё на дне {day.day}</h2>
        {mine ? (
          <button className="link-btn" disabled={busy} onClick={unshare}>
            Убрать мою заметку
          </button>
        ) : (
          <button className="link-btn" disabled={busy || !canShare} onClick={share}>
            Поделиться заметкой
          </button>
        )}
      </div>
      {!mine && !canShare && (
        <p className="thread__hint">Напиши заметку выше, и её можно будет показать другим.</p>
      )}

      {failed && <p className="thread__hint">Не удалось загрузить ленту. Попробуй позже.</p>}
      {posts === null && !failed && <p className="thread__hint">Загружаем…</p>}
      {posts?.length === 0 && (
        <p className="thread__hint">Пока никто не делился на этом дне. Будь первым.</p>
      )}

      <ul className="posts">
        {posts?.map((post) => (
          <li key={post.id} className={`post ${post.mine ? 'post--mine' : ''}`}>
            <div className="post__meta">
              <span className="post__author">{post.mine ? 'Ты' : post.author_name || 'Аноним'}</span>
              {post.focus && <span className="post__focus">{focusTitle(post.focus)}</span>}
              {post.value !== null && day.metric && (
                <span className="post__value">
                  {post.value} {day.metric.unit}
                </span>
              )}
            </div>
            {post.habit && <p className="post__habit">Привычка: {post.habit}</p>}
            <p className="post__note">{post.note}</p>
            <button
              type="button"
              className={`react ${post.reacted ? 'react--on' : ''}`}
              disabled={post.mine}
              onClick={() => react(post)}
              aria-pressed={post.reacted}
            >
              Помогло{post.reactions > 0 ? ` · ${post.reactions}` : ''}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
