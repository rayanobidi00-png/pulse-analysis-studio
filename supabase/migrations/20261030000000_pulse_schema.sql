-- PULSE Analysis Studio: Supabase schema (Postgres). Run with `npm run db:push`.
-- The site only reads `students` and appends to `analysis_requests`; Row Level Security
-- blocks every other write for visitors (the anon key).

create table if not exists public.students (
  id smallint primary key,
  "school" text not null,
  "sex" text not null,
  "age" smallint not null,
  "address" text not null,
  "famsize" text not null,
  "Pstatus" text not null,
  "Medu" smallint not null,
  "Fedu" smallint not null,
  "Mjob" text not null,
  "Fjob" text not null,
  "reason" text not null,
  "guardian" text not null,
  "traveltime" smallint not null,
  "studytime" smallint not null,
  "failures" smallint not null,
  "schoolsup" text not null,
  "famsup" text not null,
  "paid" text not null,
  "activities" text not null,
  "nursery" text not null,
  "higher" text not null,
  "internet" text not null,
  "romantic" text not null,
  "famrel" smallint not null,
  "freetime" smallint not null,
  "goout" smallint not null,
  "Dalc" smallint not null,
  "Walc" smallint not null,
  "health" smallint not null,
  "absences" smallint not null,
  "G1" smallint not null,
  "G2" smallint not null,
  "G3" smallint not null
);

alter table public.students enable row level security;
drop policy if exists "students are public to read" on public.students;
create policy "students are public to read" on public.students for select to anon, authenticated using (true);

-- Every request typed into Ask PULSE (shared, insert-only for visitors).
create table if not exists public.analysis_requests (
  id bigint generated always as identity primary key,
  request text not null check (char_length(request) between 1 and 300),
  intent text not null check (char_length(intent) <= 40),
  created_at timestamptz not null default now()
);

alter table public.analysis_requests enable row level security;
drop policy if exists "anyone can log a request" on public.analysis_requests;
create policy "anyone can log a request" on public.analysis_requests for insert to anon, authenticated with check (true);
drop policy if exists "anyone can read the log" on public.analysis_requests;
create policy "anyone can read the log" on public.analysis_requests for select to anon, authenticated using (true);

-- Summary view computed inside Postgres, used as a cross-check against the browser and R.
create or replace view public.students_summary with (security_invoker = true) as
select count(*)::int                                   as n,
       round(avg("G3")::numeric, 3)                    as mean_g3,
       count(*) filter (where "G3" >= 10)::int         as passed,
       count(*) filter (where "G3" < 10)::int          as failed,
       round(corr("G2", "G3")::numeric, 4)             as r_g2_g3
from public.students;
