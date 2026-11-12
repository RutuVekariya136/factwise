-- CareOps — Supabase PostgreSQL Schema & Row-Level Security (RLS)
-- Run this in your Supabase SQL Editor to provision tables, constraints, and RBAC policies.

create extension if not exists "pgcrypto";

-- ── 1. User Profiles (linked to auth.users) ──────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('nurse', 'doctor', 'admin', 'head_doctor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admin and Head Doctor can view all profiles"
  on public.profiles for select
  using (public.current_user_role() in ('admin', 'head_doctor'));

-- ── 2. Patients ──────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id text primary key,
  name text not null,
  age int not null check (age >= 0 and age <= 130),
  gender text not null check (gender in ('M', 'F', 'O')),
  room_number int unique check (room_number is null or (room_number >= 1 and room_number <= 74)),
  admitted_date date not null default current_date,
  status text not null check (status in ('admitted', 'discharge_approved', 'discharged', 'deceased')),
  discharge_approved_at text,
  discharged_at date,
  deceased_at date,
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

-- Enforce 74-bed capacity at the database level
create or replace function public.enforce_room_capacity()
returns trigger
language plpgsql
as $$
declare
  occupied_count int;
begin
  if new.status in ('admitted', 'discharge_approved') and new.room_number is not null then
    select count(*) into occupied_count
    from public.patients
    where status in ('admitted', 'discharge_approved')
      and room_number is not null
      and id <> new.id;

    if occupied_count >= 74 then
      raise exception 'Facility at maximum capacity (74/74 beds occupied)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_room_capacity on public.patients;
create trigger trg_enforce_room_capacity
  before insert or update on public.patients
  for each row execute function public.enforce_room_capacity();

-- RLS: All authenticated staff can view patients
create policy "Authenticated staff can view patients"
  on public.patients for select
  using (public.current_user_role() in ('nurse', 'doctor', 'admin', 'head_doctor'));

-- RLS: Only Admin can admit new patients
create policy "Only admin can admit patients"
  on public.patients for insert
  with check (public.current_user_role() = 'admin');

-- RLS: Doctor / Head Doctor can confirm discharge readiness or mark deceased;
--      Only Admin can finalize discharge (status = 'discharged')
create policy "Role-scoped patient status updates"
  on public.patients for update
  using (public.current_user_role() in ('doctor', 'head_doctor', 'admin'))
  with check (
    (
      public.current_user_role() = 'admin'
      and status = 'discharged'
      and room_number is null
    )
    or (
      public.current_user_role() in ('doctor', 'head_doctor')
      and status in ('discharge_approved', 'deceased')
    )
  );

-- ── 3. Temperature Logs ──────────────────────────────────────────────────────
create table if not exists public.temperature_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.patients(id) on delete cascade,
  date date not null,
  time text not null,
  temp_c numeric(4,1) not null check (temp_c >= 35.0 and temp_c <= 42.5),
  recorded_by text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (patient_id, date) -- Prevent duplicate temperature readings on the same day
);

alter table public.temperature_logs enable row level security;

create policy "Authenticated staff can view temperatures"
  on public.temperature_logs for select
  using (public.current_user_role() in ('nurse', 'doctor', 'admin', 'head_doctor'));

create policy "Only nurses can record temperatures"
  on public.temperature_logs for insert
  with check (public.current_user_role() = 'nurse');

-- ── 4. Doctor Visits ─────────────────────────────────────────────────────────
create table if not exists public.doctor_visits (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.patients(id) on delete cascade,
  date date not null,
  time text not null,
  doctor_name text not null,
  treatment_note text not null,
  decision text not null check (decision in ('continue_treatment', 'approve_discharge', 'mark_deceased')),
  is_correction boolean not null default false,
  correction_reason text,
  is_urgent_override boolean not null default false,
  urgent_override_reason text,
  created_at timestamptz not null default now()
);

alter table public.doctor_visits enable row level security;

create policy "Authenticated staff can view doctor visits"
  on public.doctor_visits for select
  using (public.current_user_role() in ('nurse', 'doctor', 'admin', 'head_doctor'));

create policy "Only doctors and head doctors can log visits"
  on public.doctor_visits for insert
  with check (
    public.current_user_role() in ('doctor', 'head_doctor')
    and (not is_urgent_override or char_length(trim(coalesce(urgent_override_reason, ''))) >= 10)
    and (not is_correction or char_length(trim(coalesce(correction_reason, ''))) >= 5)
  );

-- ── 5. Activity Events (Audit Log) ───────────────────────────────────────────
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  timestamp text not null,
  actor text not null,
  role text not null check (role in ('nurse', 'doctor', 'admin', 'head_doctor')),
  patient_id text not null,
  patient_name text not null,
  room_number int,
  type text not null check (
    type in (
      'temp_recorded',
      'temp_corrected',
      'doctor_visit',
      'doctor_visit_correction',
      'doctor_visit_urgent_override',
      'discharge_approved',
      'discharged',
      'admitted',
      'mortality'
    )
  ),
  summary text not null,
  is_urgent_override boolean,
  override_reason text,
  created_at timestamptz not null default now()
);

alter table public.activity_events enable row level security;

create policy "Admin and Head Doctor can view activity log"
  on public.activity_events for select
  using (public.current_user_role() in ('admin', 'head_doctor'));

create policy "Authenticated staff can append audit events"
  on public.activity_events for insert
  with check (public.current_user_role() in ('nurse', 'doctor', 'admin', 'head_doctor'));

