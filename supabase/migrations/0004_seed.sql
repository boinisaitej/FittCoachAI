-- =============================================================================
-- FitCoachAI — Seed: default slogans + festivals + sample KB docs
-- Safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Default slogans (gym_id null = visible to every gym)
-- ---------------------------------------------------------------------------
insert into slogans (gym_id, text, source, active) values
  (null, 'Stronger every single rep.', 'default', true),
  (null, 'Sweat now, shine later.', 'default', true),
  (null, 'Discipline beats motivation.', 'default', true),
  (null, 'One workout away from a better mood.', 'default', true),
  (null, 'Your only limit is you.', 'default', true),
  (null, 'Small steps. Big change.', 'default', true),
  (null, 'Train hard, recover harder.', 'default', true),
  (null, 'Champions are made in the gym.', 'default', true),
  (null, 'Eat clean. Train mean.', 'default', true),
  (null, 'Push past comfort.', 'default', true),
  (null, 'Build the body you deserve.', 'default', true),
  (null, 'Progress, not perfection.', 'default', true),
  (null, 'Today''s sweat is tomorrow''s strength.', 'default', true),
  (null, 'Be stronger than your excuses.', 'default', true),
  (null, 'Health is wealth — invest daily.', 'default', true),
  (null, 'Lift heavy. Live happy.', 'default', true),
  (null, 'Hydrate, train, repeat.', 'default', true),
  (null, 'No shortcuts, just sweat.', 'default', true),
  (null, 'Show up for yourself.', 'default', true),
  (null, 'Comfort zone is a beautiful place — nothing grows there.', 'default', true),
  (null, 'Earn it. Every. Single. Day.', 'default', true),
  (null, 'Make your future self proud.', 'default', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Festivals (Indian — forces veg banner on these dates)
-- Add more per region. is_veg_only = true triggers the veg lock.
-- ---------------------------------------------------------------------------
insert into festivals (name, festival_date, country_code, is_veg_only) values
  ('Maha Shivaratri', '2026-02-15', 'IN', true),
  ('Holi',            '2026-03-04', 'IN', true),
  ('Ram Navami',      '2026-03-27', 'IN', true),
  ('Mahavir Jayanti', '2026-03-31', 'IN', true),
  ('Hanuman Jayanti', '2026-04-02', 'IN', true),
  ('Akshaya Tritiya', '2026-05-09', 'IN', true),
  ('Krishna Janmashtami','2026-09-04','IN', true),
  ('Ganesh Chaturthi','2026-09-14', 'IN', true),
  ('Navratri (Day 1)','2026-10-10', 'IN', true),
  ('Dussehra',        '2026-10-19', 'IN', true),
  ('Diwali',          '2026-11-08', 'IN', true),
  ('Karthika Pournami','2026-11-23','IN', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Nutrition KB seed (tiny — extend via /owner/nutrition/import)
-- ---------------------------------------------------------------------------
insert into nutrition_kb_docs (title, content, source) values
  ('Paneer macros', 'Paneer (100g): ~265 kcal, 18g protein, 21g fat, 1.2g carbs. Best post-workout for vegetarians.', 'seed'),
  ('Chicken breast macros', 'Chicken breast cooked (100g): ~165 kcal, 31g protein, 3.6g fat. Lean protein staple.', 'seed'),
  ('Oats benefits', 'Oats are rich in beta-glucan soluble fiber, lower LDL cholesterol, slow-release energy. 40g dry oats ≈ 150 kcal, 5g protein, 27g carbs.', 'seed'),
  ('Hydration baseline', 'Most adults need 30-35 ml of water per kg of body weight. Hot weather and intense training raise the requirement.', 'seed'),
  ('Pre-workout meal', 'Eat 1.5-2 h before training: complex carbs (oats, brown rice) + lean protein. Avoid heavy fats right before.', 'seed'),
  ('Post-workout meal', '20-40g protein + 30-60g carbs within 60 min boosts recovery and muscle protein synthesis.', 'seed'),
  ('Egg whole vs white', 'Whole egg (50g): ~70 kcal, 6g protein. The yolk has choline + healthy fats — keep it unless cholesterol restricted.', 'seed'),
  ('Lentils (dal)', 'Cooked dal (1 cup, 200g): ~230 kcal, 18g protein, 40g carbs, 16g fiber. Pair with rice for a complete protein profile.', 'seed'),
  ('Vegetarian protein ladder', 'Per 100g: Soya chunks 52g > paneer 18g > tofu 8g > rajma cooked 9g > moong dal cooked 9g.', 'seed'),
  ('Cheat day cap', 'Limit cheat day surplus to ~500 kcal above maintenance and avoid back-to-back cheat days for steady progress.', 'seed')
on conflict do nothing;
