-- Lead table for whosystem.com. The live table already exists; this file
-- documents it and is safe to re-run.
--
-- The Pages function inserts with the service role key, which bypasses RLS.
-- There is no anon or authenticated policy: the public client cannot read
-- or write this table.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text,
  name text,
  phone text,
  company text,
  message text,
  source text,
  page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Do not leave a wide-open insert policy. Service-role writes do not need one.
drop policy if exists "anon insert leads" on public.leads;
