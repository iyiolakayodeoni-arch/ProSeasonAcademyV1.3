-- ═══════════════════════════════════════════════════════════
-- UPDATE SYSTEM — how the app knows a new version is out
--
-- Run ONCE in Supabase → SQL Editor. Safe to re-run.
--
-- Two config rows drive the whole thing. When you ship a new
-- APK, update these from the Founder Desk or right here:
--
--   update config set value = '1.4.0' where key = 'latest_version';
--   update config set value = 'https://github.com/...' where key = 'latest_apk_url';
--
-- Every installed app checks these on boot. When latest_version
-- is newer than what the device has, it shows an update prompt.
-- Tap it → browser opens → download APK → sideload over the top.
-- No store, no account, no Google, no waiting.
-- ═══════════════════════════════════════════════════════════

insert into config (key, value) values
  ('latest_version', '1.3.0'),
  ('latest_apk_url', ''),
  ('latest_update_note', '')
on conflict (key) do nothing;

do $$
begin
  raise notice 'UPDATE SYSTEM ARMED · current latest is 1.3.0';
  raise notice '  When you ship a new build, run (or use the Founder Desk):';
  raise notice '    update config set value = ''1.4.0'' where key = ''latest_version'';';
  raise notice '    update config set value = ''https://github.com/...'' where key = ''latest_apk_url'';';
end $$;
