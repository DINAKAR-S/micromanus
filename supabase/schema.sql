-- MicroManus schema. Run in Supabase SQL editor.
-- Auth is handled by Supabase (enable GitHub + Google providers in Auth > Providers).

-- 1 credit = 1 agent run. $5 or coupon SID_DRDROID => 5 credits.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits int not null default 0,
  paid boolean not null default false,
  coupon_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,           -- 'user' | 'assistant' | 'tool' | 'status'
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists usage (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_tokens int not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security: users see only their own rows.
alter table profiles enable row level security;
alter table threads  enable row level security;
alter table messages enable row level security;
alter table usage    enable row level security;

create policy "own profile"  on profiles for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own threads"  on threads  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own usage"    on usage    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
