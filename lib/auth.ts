import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { redirect } from "next/navigation";
import { cache } from "react";

export type SessionUser = {
  id: string;
  email: string | null;
  role: UserRole;
  gym_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  active: boolean;
};

/**
 * Per-user profile cache (30s TTL). Reduces repeated profile lookups across
 * the middleware and Server Component layers within a single navigation.
 * The React.cache wrapper also dedupes within one request.
 */
const _profileCache = new Map<string, { at: number; profile: SessionUser | null }>();
const PROFILE_TTL_MS = 5 * 60_000; // 5 min — invalidated explicitly on role/active changes

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cached = _profileCache.get(user.id);
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) return cached.profile;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,role,gym_id,full_name,avatar_url,must_change_password,active")
    .eq("id", user.id)
    .maybeSingle();

  const sessionUser = profile ? (profile as SessionUser) : null;
  _profileCache.set(user.id, { at: Date.now(), profile: sessionUser });
  return sessionUser;
});

export function invalidateUserCache(userId: string) {
  _profileCache.delete(userId);
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(role: UserRole | UserRole[]): Promise<SessionUser> {
  const u = await requireUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(u.role)) redirect(`/${u.role}`);
  return u;
}

/**
 * Owner-only: create a new auth user with metadata that the handle_new_user
 * trigger uses to set role + gym_id. Requires service-role client.
 */
export async function adminCreateUser(args: {
  email: string;
  full_name: string;
  role: UserRole;
  gym_id: string;
  password?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  metadata?: Record<string, unknown>;
}) {
  const admin = createServiceClient();
  const password = args.password ?? generateTempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: args.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: args.full_name,
      role: args.role,
      gym_id: args.gym_id,
      ...(args.metadata ?? {}),
    },
  });
  if (error) throw error;
  if (data.user) {
    await admin
      .from("profiles")
      .update({
        phone: args.phone,
        gender: args.gender,
        must_change_password: true,
      })
      .eq("id", data.user.id);
  }
  return { user: data.user, tempPassword: password };
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p + "!9";
}
