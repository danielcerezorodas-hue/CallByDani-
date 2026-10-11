-- ============================================================
-- CallByDani · AI receptionist
-- Run ONCE in Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Who answers each business line:
--    'agents'          → human agents only (current behavior, the default)
--    'ai'              → the AI receptionist only (takes a message, never transfers)
--    'ai_then_agents'  → the AI answers first and transfers to an agent when needed
alter table public.phone_lines
  add column if not exists answer_mode text not null default 'agents'
  check (answer_mode in ('agents', 'ai', 'ai_then_agents'));

-- 2) The AI conversation of each call (kept so every turn has the full history)
alter table public.calls add column if not exists ai_transcript jsonb;
