-- Add context column to femdecode_users for cross-device life-stage sync.
--
-- Run this once in the Supabase SQL editor (https://supabase.com/dashboard/project/fzazuqhmnbqxeqxbdduu/sql).
-- Until this column exists, sbSaveContext() will silently fail (it's wrapped
-- in a try/catch) and context will only persist via localStorage.

alter table femdecode_users
  add column if not exists context jsonb;

-- Optional: quick GIN index if you ever query by context fields
-- create index if not exists femdecode_users_context_gin
--   on femdecode_users using gin (context);
