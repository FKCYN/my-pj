-- fkcyn v1: run once in Supabase SQL Editor. No changes to existing unrelated tables.
begin;
create table if not exists public.fkcyn_devices (
  id text primary key,
  label text not null,
  source text not null check (source in ('real', 'test')),
  created_at timestamptz not null default now(),
  unique (id, source)
);
create table if not exists public.fkcyn_readings (
  device_id text not null,
  event_id text not null,
  sensor_type text not null check (sensor_type = 'rain'),
  source text not null check (source in ('real', 'test')),
  wet boolean not null,
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  primary key (device_id, event_id),
  foreign key (device_id, source) references public.fkcyn_devices(id, source)
);
create index if not exists fkcyn_readings_source_time on public.fkcyn_readings(source, observed_at, device_id, event_id);
alter table public.fkcyn_devices enable row level security;
alter table public.fkcyn_readings enable row level security;
-- No browser Data API policies: all reads and writes go through authenticated Vercel routes.
revoke all on public.fkcyn_devices, public.fkcyn_readings from anon, authenticated;
grant all on public.fkcyn_devices, public.fkcyn_readings to service_role;
insert into public.fkcyn_devices (id, label, source) values
  ('room-01', 'เซ็นเซอร์ฝนที่ห้อง', 'real'),
  ('test-01', 'Postman · อุปกรณ์ทดสอบ', 'test')
on conflict (id) do nothing;
commit;
