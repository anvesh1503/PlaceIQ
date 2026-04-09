-- Agentic automation for direct DB inserts into companies
-- Run this in Supabase SQL Editor.

begin;

-- Safeguard: avoid duplicate company_matches per company/student pair
create unique index if not exists ux_company_matches_company_student
on public.company_matches (company_id, student_id);

-- Safeguard: avoid duplicate high-match alerts for same company/student/message
create unique index if not exists ux_alerts_high_company_match_unique
on public.alerts (student_id, type, message)
where type = 'high_company_match';

create or replace function public.fn_generate_company_matches_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Generate random match score for every user.
  insert into public.company_matches (company_id, student_id, match_percentage)
  select
    new.id,
    u.id,
    floor(random() * 101)::int
  from public.users u
  on conflict (company_id, student_id) do nothing;

  -- Insert alerts for high matches (>70).
  insert into public.alerts (student_id, type, message)
  select
    cm.student_id,
    'high_company_match',
    'You have a ' || cm.match_percentage || '% match with ' || new.name
  from public.company_matches cm
  where cm.company_id = new.id
    and cm.match_percentage > 70
  on conflict (student_id, type, message) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_after_company_insert_generate_matches on public.companies;

create trigger trg_after_company_insert_generate_matches
after insert on public.companies
for each row
execute function public.fn_generate_company_matches_after_insert();

commit;
