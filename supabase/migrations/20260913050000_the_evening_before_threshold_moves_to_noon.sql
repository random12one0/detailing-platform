-- ANDREW'S DECISION, 2026-09-13: a job starting at or before this time gets its
-- reminder the EVENING BEFORE instead of `customer_reminder_lead_minutes` out.
-- The threshold was 10:00, which left a 10:30 job reminded at 08:30 that
-- morning - after most people have left the house, and too late to act on.
--
-- **A DETAILING REMINDER HAS A JOB TO DO BESIDES REMINDING.** The customer has
-- to move the car off the driveway and find an outdoor tap. Two hours is not
-- enough notice to do either, so anything in the MORNING belongs on the
-- evening-before branch. Noon is where "morning" ends.
--
-- Nothing in the app exposes this field - `BookingRules.jsx` offers only the
-- on/off switch - so every 10:00 in the table is the shipped default rather
-- than somebody's choice, and moving those rows is moving a default rather
-- than overwriting a setting. A row a detailer has genuinely changed to some
-- other time is left exactly as it is.

alter table public.business_settings
  alter column evening_before_latest_start set default '12:00';

update public.business_settings
   set evening_before_latest_start = '12:00'
 where evening_before_latest_start = '10:00';
