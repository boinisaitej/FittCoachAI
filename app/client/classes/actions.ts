"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function bookClassAction(classId: string) {
  const user = await requireRole("client");
  const supabase = createClient();
  const admin = createServiceClient();

  // Fetch class + count using service-role so capacity math doesn't trip on RLS.
  const { data: cls } = await admin
    .from("gym_classes")
    .select("id,capacity,status,start_at")
    .eq("id", classId)
    .maybeSingle();
  if (!cls) return { ok: false as const, error: "Class not found" };
  if (cls.status === "cancelled") return { ok: false as const, error: "Class is cancelled" };

  const { data: existing } = await admin
    .from("class_bookings")
    .select("id,status")
    .eq("class_id", classId)
    .eq("client_id", user.id)
    .maybeSingle();
  if (existing && existing.status !== "cancelled") {
    return { ok: false as const, error: "You're already booked." };
  }

  const { data: active } = await admin
    .from("class_bookings")
    .select("id")
    .eq("class_id", classId)
    .in("status", ["confirmed", "attended"]);
  const confirmedCount = (active ?? []).length;
  const status = confirmedCount < cls.capacity ? "confirmed" : "waitlist";

  // Upsert booking
  if (existing) {
    await supabase.from("class_bookings").update({ status }).eq("id", existing.id);
  } else {
    const { error } = await supabase
      .from("class_bookings")
      .insert({ class_id: classId, client_id: user.id, status });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/client/classes");
  revalidatePath("/owner/classes");
  return { ok: true as const, status };
}

export async function cancelBookingAction(classId: string) {
  const user = await requireRole("client");
  const supabase = createClient();
  const admin = createServiceClient();

  await supabase
    .from("class_bookings")
    .update({ status: "cancelled" })
    .eq("class_id", classId)
    .eq("client_id", user.id);

  // Promote the head of the waitlist into a confirmed slot.
  const { data: next } = await admin
    .from("class_bookings")
    .select("id,client_id")
    .eq("class_id", classId)
    .eq("status", "waitlist")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (next) {
    await admin.from("class_bookings").update({ status: "confirmed" }).eq("id", next.id);
    await admin.from("notifications").insert({
      recipient_id: next.client_id,
      kind: "system",
      title: "You moved off the waitlist 🎉",
      body: "A slot opened up — your booking is confirmed.",
      link: "/client/classes",
    });
  }

  revalidatePath("/client/classes");
  revalidatePath("/owner/classes");
  return { ok: true as const };
}
