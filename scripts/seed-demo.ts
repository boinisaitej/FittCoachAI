/**
 * Seed demo data into a fresh FitCoachAI Supabase project.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Idempotent on email — re-running upserts profiles instead of erroring.
 *
 *   npm run seed
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function ensureUser(email: string, password: string, meta: Record<string, unknown>) {
  // upsert via Admin API — if user exists, update metadata.
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing.users.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { user_metadata: meta });
    return found.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  return data.user!.id;
}

async function main() {
  console.log("Seeding demo gym...");

  const ownerId = await ensureUser("owner@fitcoach.demo", "Owner@123", {
    full_name: "Demo Owner",
    role: "owner",
    gym_name: "Iron Paradise",
  });
  console.log("Owner:", ownerId);

  // Wait a beat so handle_new_user trigger creates the gym
  await new Promise((r) => setTimeout(r, 1500));
  const { data: ownerProfile } = await admin.from("profiles").select("gym_id").eq("id", ownerId).single();
  const gymId = ownerProfile?.gym_id;
  if (!gymId) throw new Error("Owner profile didn't get a gym_id — check handle_new_user trigger");

  const trainerSpecs = [
    { email: "trainer1@fitcoach.demo", name: "Riya Sharma", gender: "female", type: "personal", spec: "Strength + Pre/Post-natal" },
    { email: "trainer2@fitcoach.demo", name: "Arjun Reddy", gender: "male", type: "personal", spec: "Powerlifting + Mobility" },
    { email: "trainer3@fitcoach.demo", name: "Meera Iyer", gender: "female", type: "general", spec: "Zumba + HIIT" },
  ];
  const trainerIds: string[] = [];
  for (const t of trainerSpecs) {
    const id = await ensureUser(t.email, "Trainer@123", {
      full_name: t.name,
      role: "trainer",
      gym_id: gymId,
    });
    await admin
      .from("profiles")
      .update({ gender: t.gender, trainer_type: t.type, specialization: t.spec })
      .eq("id", id);
    trainerIds.push(id);
  }
  console.log(`Trainers: ${trainerIds.length}`);

  const clientSpecs = Array.from({ length: 12 }).map((_, i) => ({
    email: `client${i + 1}@fitcoach.demo`,
    name: `Demo Client ${i + 1}`,
    gender: i % 2 === 0 ? "female" : "male",
    height: 160 + Math.floor(Math.random() * 25),
    weight: 55 + Math.floor(Math.random() * 30),
  }));

  const clientIds: string[] = [];
  for (const c of clientSpecs) {
    const id = await ensureUser(c.email, "Client@123", {
      full_name: c.name,
      role: "client",
      gym_id: gymId,
    });
    await admin
      .from("profiles")
      .update({ gender: c.gender, height_cm: c.height, weight_kg: c.weight })
      .eq("id", id);
    await admin.from("client_preferences").upsert({ client_id: id });
    clientIds.push(id);
  }
  console.log(`Clients: ${clientIds.length}`);

  // Assign trainers (round-robin, respect female-female pairing if possible)
  const { data: trainers } = await admin
    .from("profiles")
    .select("id,gender")
    .in("id", trainerIds);
  for (let i = 0; i < clientIds.length; i++) {
    const cid = clientIds[i];
    const cGender = clientSpecs[i].gender;
    const pool = cGender === "female"
      ? (trainers ?? []).filter((t) => t.gender === "female")
      : trainers ?? [];
    if (pool.length === 0) continue;
    const tid = pool[i % pool.length].id;
    await admin.from("trainer_clients").insert({ trainer_id: tid, client_id: cid });
  }

  // Sample BMI logs
  for (const cid of clientIds) {
    for (let i = 0; i < 5; i++) {
      const days = i * 7;
      const d = new Date(Date.now() - days * 86400000);
      await admin.from("bmi_logs").insert({
        client_id: cid,
        height_cm: 165,
        weight_kg: 70 + Math.random() * 10 - 5,
        logged_at: d.toISOString(),
      });
    }
  }

  // Plans (Basic to half, Pro to half)
  const { data: plans } = await admin.from("plans").select("id,kind").eq("gym_id", gymId);
  const basic = plans?.find((p) => p.kind === "basic");
  const pro = plans?.find((p) => p.kind === "pro");
  for (let i = 0; i < clientIds.length; i++) {
    const cid = clientIds[i];
    const plan = i < 6 ? basic : pro;
    if (!plan) continue;
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    await admin.from("subscriptions").insert({
      client_id: cid,
      plan_id: plan.id,
      end_date: end,
      status: "active",
    });
  }

  console.log("Seed complete!");
  console.log("Login: owner@fitcoach.demo / Owner@123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
