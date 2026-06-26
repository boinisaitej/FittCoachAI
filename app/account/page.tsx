import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, Phone, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireUser } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import { AccountForm } from "./account-form";
import { PreferencesForm } from "./preferences-form";

export default async function AccountPage() {
  const user = await requireUser();
  if (!user.role) redirect("/login");
  const supabase = createClient();
  const admin = createServiceClient();

  const [{ data: profile }, { data: prefs }, { data: gym }] = await Promise.all([
    (admin as any)
      .from("profiles")
      .select("id,full_name,email,phone,gender,dob,height_cm,weight_kg,language,role,gym_id")
      .eq("id", user.id)
      .maybeSingle(),
    user.role === "client"
      ? (supabase as any).from("client_preferences").select("*").eq("client_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user.gym_id
      ? (supabase as any).from("gyms").select("name,address,primary_color").eq("id", user.gym_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  /* Client extra: assigned trainer (so the client can see who their coach is) */
  let assignedTrainer: { full_name: string | null; email: string | null; phone: string | null; specialization: string | null } | null = null;
  if (user.role === "client") {
    const { data: assign } = await (admin as any)
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", user.id)
      .is("ended_at", null)
      .maybeSingle();
    if (assign?.trainer_id) {
      const { data: t } = await (admin as any)
        .from("profiles")
        .select("full_name,email,phone,specialization")
        .eq("id", assign.trainer_id)
        .maybeSingle();
      assignedTrainer = t ?? null;
    }
  }

  if (!profile) {
    return (
      <div className="container max-w-2xl py-10">
        <Card>
          <CardContent className="p-6 text-sm">
            <p className="font-semibold">Profile row missing.</p>
            <p className="mt-1 text-muted-foreground">
              The <code>handle_new_user</code> trigger didn&apos;t create your profile. Re-apply{" "}
              <code>supabase/migrations/0003_functions.sql</code> and sign up again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileTyped = {
    id: String(profile.id),
    full_name: (profile.full_name as string | null) ?? null,
    email: (profile.email as string | null) ?? null,
    phone: (profile.phone as string | null) ?? null,
    gender: (profile.gender as "male" | "female" | "other" | null) ?? null,
    dob: (profile.dob as string | null) ?? null,
    height_cm: (profile.height_cm as number | null) ?? null,
    weight_kg: (profile.weight_kg as number | null) ?? null,
    language: (profile.language as string) ?? "en",
    role: profile.role as "owner" | "trainer" | "client",
    gym_id: (profile.gym_id as string | null) ?? null,
  };

  const gymTyped = gym
    ? {
        name: (gym.name as string | undefined) ?? "",
        address: (gym.address as string | undefined) ?? "",
        primary_color: gym.primary_color as string | undefined,
      }
    : null;

  return (
    <div className="container max-w-3xl space-y-6 py-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold">My account</h1>
        <p className="text-sm text-muted-foreground">Update your profile, preferences, and password.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profile</CardTitle>
            <Badge className="capitalize">{user.role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <AccountForm profile={profileTyped} gym={gymTyped} />
        </CardContent>
      </Card>

      {user.role === "client" && assignedTrainer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4 text-amber-500" />
              Your assigned trainer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                {initials(assignedTrainer.full_name ?? assignedTrainer.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{assignedTrainer.full_name ?? "—"}</div>
              {assignedTrainer.specialization && (
                <div className="text-xs text-muted-foreground">{assignedTrainer.specialization}</div>
              )}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {assignedTrainer.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {assignedTrainer.email}
                  </span>
                )}
                {assignedTrainer.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {assignedTrainer.phone}
                  </span>
                )}
              </div>
            </div>
            <Button asChild size="sm" variant="gradient">
              <Link href="/client/chat">Message</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {user.role === "client" && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <PreferencesForm initial={prefs as never} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/account/change-password">Change password</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
