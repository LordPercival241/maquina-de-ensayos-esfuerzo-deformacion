create extension if not exists pgcrypto;

create table public.test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  specimen_id text not null check (char_length(specimen_id) <= 80),
  material text not null check (char_length(material) <= 120),
  gauge_length_mm numeric not null check (gauge_length_mm > 0),
  initial_area_mm2 numeric not null check (initial_area_mm2 > 0),
  calibration_profile_id text not null,
  sample_count integer not null check (sample_count >= 0),
  status text not null check (status in ('completed', 'aborted')),
  csv_path text unique,
  created_at timestamptz not null default now()
);

alter table public.test_runs enable row level security;
create policy "Users can view their own test runs" on public.test_runs for select using (auth.uid() = user_id);
create policy "Users can create their own test runs" on public.test_runs for insert with check (auth.uid() = user_id);
create policy "Users can update their own test runs" on public.test_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('test-data', 'test-data', false) on conflict (id) do nothing;
create policy "Users can upload their own CSV files" on storage.objects for insert to authenticated with check (bucket_id = 'test-data' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can read their own CSV files" on storage.objects for select to authenticated using (bucket_id = 'test-data' and (storage.foldername(name))[1] = auth.uid()::text);
