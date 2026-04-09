-- Run this in Supabase SQL Editor to match backend queries.
alter table public.users
add column if not exists password_hash text;
