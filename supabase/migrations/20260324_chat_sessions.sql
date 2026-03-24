create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  status text not null default 'active',
  messages jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_sessions_last_message_at_idx
  on public.chat_sessions (last_message_at desc);

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

alter table public.chat_sessions enable row level security;
