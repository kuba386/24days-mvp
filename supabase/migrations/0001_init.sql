-- Таблицы приложения «24 дня» (Telegram Mini App). Доступ только через service role из serverless-функций.

create table public.days24_users (
  telegram_id bigint primary key,
  chat_id bigint not null,
  first_name text,
  course text not null default 'year' check (course in ('year', 'habits', 'gtd', 'money')),
  focus text,
  habit text check (char_length(habit) <= 120),
  current_day integer,
  last_done_at date,
  tz_offset_min integer,
  reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.days24_posts (
  id bigint generated always as identity primary key,
  telegram_id bigint not null,
  author_name text,
  course text not null default 'year' check (course in ('year', 'habits', 'gtd', 'money')),
  day integer not null check (day between 1 and 24),
  focus text,
  habit text check (char_length(habit) <= 120),
  note text not null check (char_length(note) between 1 and 1000),
  value numeric,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (telegram_id, course, day)
);
create index days24_posts_day_idx on public.days24_posts (course, day, created_at desc);

create table public.days24_reactions (
  post_id bigint not null references public.days24_posts (id) on delete cascade,
  telegram_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (post_id, telegram_id)
);

alter table public.days24_users enable row level security;
alter table public.days24_posts enable row level security;
alter table public.days24_reactions enable row level security;

-- Лента дня: посты с числом реакций, отметкой «я уже отреагировал» и «это мой пост»
create or replace function public.days24_thread(p_course text, p_day integer, p_viewer bigint)
returns table (
  id bigint,
  author_name text,
  focus text,
  habit text,
  note text,
  value numeric,
  created_at timestamptz,
  reactions bigint,
  reacted boolean,
  mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.author_name, p.focus, p.habit, p.note, p.value, p.created_at,
         (select count(*) from public.days24_reactions r where r.post_id = p.id) as reactions,
         exists (select 1 from public.days24_reactions r where r.post_id = p.id and r.telegram_id = p_viewer) as reacted,
         p.telegram_id = p_viewer as mine
  from public.days24_posts p
  where p.course = p_course and p.day = p_day and not p.hidden
  order by reactions desc, p.created_at desc
  limit 50;
$$;

revoke execute on function public.days24_thread(text, integer, bigint) from public, anon, authenticated;

-- Очередь «Входящих»: сообщения, отправленные боту. Приложение забирает их в CloudStorage и удаляет отсюда
create table public.days24_inbox (
  id bigint generated always as identity primary key,
  telegram_id bigint not null,
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index days24_inbox_user_idx on public.days24_inbox (telegram_id, id);

alter table public.days24_inbox enable row level security;
