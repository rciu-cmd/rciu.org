-- migration25: let admins delete event_reminders rows.
--
-- event_reminders has one row per "Send Reminder" click (Admin →
-- Events), and the member Dashboard lists every row it finds — so
-- clicking that button more than once for the same event (e.g. while
-- troubleshooting the Resend email issue) makes the same event show up
-- repeatedly in members' "Reminders" box, with no way to clean it up.
-- schema.sql originally defined no insert/update/delete policy on
-- purpose (only the Edge Function, via the service-role key, was meant
-- to write here) — this adds a delete policy for admins specifically,
-- so stray/duplicate reminder rows can be removed from Admin → Events.

drop policy if exists event_reminders_delete_admin on public.event_reminders;
create policy event_reminders_delete_admin on public.event_reminders
  for delete using (public.is_admin());
