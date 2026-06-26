"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveProfileAction } from "./actions";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  gender: "male" | "female" | "other" | null;
  dob: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  language: string;
  role: "owner" | "trainer" | "client";
  gym_id: string | null;
};

export function AccountForm({
  profile,
  gym,
}: {
  profile: Profile;
  gym: { name?: string; address?: string; primary_color?: string } | null;
}) {
  const router = useRouter();
  const [p, setP] = useState(profile);
  const [g, setG] = useState({ name: gym?.name ?? "", address: gym?.address ?? "" });
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await saveProfileAction({
        profile: {
          full_name: p.full_name,
          phone: p.phone,
          gender: p.gender,
          dob: p.dob,
          height_cm: p.height_cm,
          weight_kg: p.weight_kg,
          language: p.language,
        },
        gym: p.role === "owner" ? { name: g.name, address: g.address } : null,
      });
      if (!res.ok) {
        toast.error("Profile save failed", { description: res.error });
        return;
      }
      toast.success("Saved — everyone in your gym will see the update.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {p.role === "owner" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Gym name</Label>
            <Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Gym address</Label>
            <Input value={g.address} onChange={(e) => setG({ ...g, address: e.target.value })} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={p.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={p.gender ?? undefined} onValueChange={(v) => setP({ ...p, gender: v as Profile["gender"] })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {p.role === "client" && (
          <>
            <div className="space-y-1.5">
              <Label>DOB</Label>
              <Input type="date" value={p.dob ?? ""} onChange={(e) => setP({ ...p, dob: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Height (cm)</Label>
              <Input type="number" step="0.1" value={p.height_cm ?? ""} onChange={(e) => setP({ ...p, height_cm: parseFloat(e.target.value || "0") })} />
            </div>
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={p.weight_kg ?? ""} onChange={(e) => setP({ ...p, weight_kg: parseFloat(e.target.value || "0") })} />
            </div>
          </>
        )}
      </div>
      <Button onClick={save} disabled={pending} variant="gradient">
        <Save className="h-4 w-4" />
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </div>
  );
}
