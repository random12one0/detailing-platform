-- ITEM D, the follow-up the first version needed.
--
-- `job_heartbeats` starts EMPTY, and the screen treats a missing row as
-- stale — deliberately, because "no row" is also what a dropped table looks
-- like. The consequence on the day the table is created is a red line about
-- the nightly accrual, which has simply not come round yet: **an alarm that is
-- true of nothing.** A monitor that cries on the day it is installed is one
-- somebody learns to ignore in the first week.
--
-- So both jobs are seeded at NOW, which is honest about what is actually
-- known: nothing has been observed to fail since the watching started. The
-- reminder sweep overwrites its row within fifteen minutes and the accrual
-- within a day, so a real stoppage still surfaces inside its own window.
insert into public.job_heartbeats (job, ran_at, detail)
values
  ('send-owner-reminders', now(), jsonb_build_object('seeded', true)),
  ('accrue-plan-visits',   now(), jsonb_build_object('seeded', true))
on conflict (job) do nothing;
