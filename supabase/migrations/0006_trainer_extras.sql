-- =============================================================================
-- FitCoachAI — Trainer extras
--   1. gyms.specializations — list of specialization labels the gym offers.
--      Owners manage this; create-trainer dialog picks from it.
--   2. profiles.availability — trainer working days + time window (JSONB).
--      Shape: { "days": ["Mon","Tue",...], "start": "06:00", "end": "21:00", "note": "..." }
-- Safe to re-run.
-- =============================================================================

alter table gyms
  add column if not exists specializations text[]
  default array[
    'Strength','Powerlifting','Bodybuilding','CrossFit','HIIT','Cardio',
    'Yoga','Power Yoga','Zumba','Aerobics','Pilates','Boxing','Kickboxing',
    'MMA','Calisthenics','Functional Training','Mobility & Stretching',
    'Spinning','Swimming','Aqua Aerobics','Senior Fitness',
    'Pre / Post-natal','Kids Fitness','Nutrition Coach',
    'Physiotherapy / Rehab','General'
  ]::text[];

-- Backfill any rows that were created before the column existed.
update gyms
  set specializations = array[
    'Strength','Powerlifting','Bodybuilding','CrossFit','HIIT','Cardio',
    'Yoga','Power Yoga','Zumba','Aerobics','Pilates','Boxing','Kickboxing',
    'MMA','Calisthenics','Functional Training','Mobility & Stretching',
    'Spinning','Swimming','Aqua Aerobics','Senior Fitness',
    'Pre / Post-natal','Kids Fitness','Nutrition Coach',
    'Physiotherapy / Rehab','General'
  ]::text[]
  where specializations is null or array_length(specializations, 1) is null;

alter table profiles
  add column if not exists availability jsonb default '{}'::jsonb;
