-- ============================================================
-- site_previews — short-link store for prospect demo sites
-- ============================================================
-- The prospector tool (password-gated) writes a row here and gets
-- back a short token; the static template.html reads it by token.
--
-- Each preview self-expires after 14 days: the edge function refuses
-- to return rows older than that, and the pg_cron job below purges
-- them so the table never grows unbounded.
--
-- Security: RLS is ON with NO policies, so the anon/public PostgREST
-- key can neither read nor write this table. Only the edge function,
-- which uses the service-role key (bypasses RLS), can touch it.
-- ============================================================

create table if not exists public.site_previews (
  token       text primary key,
  data        jsonb       not null,
  created_at  timestamptz not null default now()
);

-- Fast lookups when purging by age.
create index if not exists site_previews_created_at_idx
  on public.site_previews (created_at);

-- Lock the table down: no anon/public access at all.
alter table public.site_previews enable row level security;

-- ── 14-day purge (optional but recommended) ─────────────────
-- Requires the pg_cron extension. If your project doesn't have it
-- enabled, the lazy expiry check in the edge function still makes
-- old links return "expired" — this just keeps the table tidy.
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'purge-expired-site-previews',
--     '0 4 * * *',  -- daily at 04:00 UTC
--     $$ delete from public.site_previews
--          where created_at < now() - interval '14 days' $$
--   );
