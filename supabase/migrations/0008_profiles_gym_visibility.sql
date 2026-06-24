-- =============================================================================
-- FitCoachAI — Profile visibility for chat / assignments / directory.
-- The original SELECT policy on `profiles` only let owners + trainers read
-- gym-wide rows. Clients could only read themselves — so chat sidebars,
-- assignment dropdowns, and any "who is this?" lookup came back empty.
--
-- New rule: any authenticated user can read other profiles in the SAME gym.
-- Write access stays restricted (owner-only for non-self updates).
-- Safe to re-run.
-- =============================================================================

drop policy if exists profiles_self on profiles;

create policy profiles_self on profiles
  for select using (
    id = auth.uid()
    or (
      gym_id is not null
      and gym_id = current_gym_id()
    )
  );
