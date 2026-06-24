"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SPECIALIZATIONS } from "@/lib/specializations";
import { createUserAction } from "./actions";

type CreatedUser = {
  email: string;
  fullName: string;
  role: "trainer" | "client";
  tempPassword: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CreateUserDialog({
  defaultRole,
}: {
  defaultRole: "trainer" | "client" | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultRole);
  const [role, setRole] = useState<"trainer" | "client">(defaultRole ?? "client");
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState<CreatedUser | null>(null);

  const [specialization, setSpecialization] = useState<string>(SPECIALIZATIONS[0].value);

  // Availability (trainer)
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [startTime, setStartTime] = useState<string>("06:00");
  const [endTime, setEndTime] = useState<string>("21:00");
  const [availNote, setAvailNote] = useState<string>("");

  function toggleDay(d: string) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPassword(p + "!9");
    setShowPw(true);
  }

  async function onSubmit(formData: FormData) {
    formData.set("role", role);
    formData.set("specialization", specialization);
    if (role === "trainer") {
      formData.set("availability_days", days.join(","));
      formData.set("availability_start", startTime);
      formData.set("availability_end", endTime);
      formData.set("availability_note", availNote);
    }
    const res = await createUserAction(formData);
    if (res.ok) {
      setCreated({
        email: res.email!,
        fullName: res.fullName!,
        role: res.role!,
        tempPassword: res.tempPassword,
      });
      router.refresh();
    } else {
      toast.error("Could not create user", { description: (res as { error?: string }).error });
    }
  }

  function reset() {
    setCreated(null);
    setPassword("");
    setShowPw(false);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm">
          <Plus className="h-4 w-4" />
          New user
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        {created ? (
          <CredentialsView user={created} onClose={close} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create a new user</DialogTitle>
              <DialogDescription>
                Set a password (or auto-generate). For trainers, pick a specialization from your gym&apos;s list
                and set weekly availability — both are saved to the trainer&apos;s profile.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={role} onValueChange={(v) => setRole(v as "trainer" | "client")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="trainer">Trainer</TabsTrigger>
                <TabsTrigger value="client">Client</TabsTrigger>
              </TabsList>

              <form
                action={(fd) => startTransition(() => onSubmit(fd))}
                className="mt-4 max-h-[68vh] space-y-3 overflow-y-auto pr-1 scrollbar-thin"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full name</Label>
                    <Input id="full_name" name="full_name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender (optional)</Label>
                    <Select name="gender">
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                  <Label htmlFor="password" className="flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    Password
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        name="password"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to auto-generate"
                        minLength={password ? 8 : undefined}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Toggle visibility"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                      <Wand2 className="h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Min 8 characters. User can change it after first sign-in.
                  </p>
                </div>

                <TabsContent value="trainer" className="mt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="specialization-select">Specialization</Label>
                      <Select value={specialization} onValueChange={setSpecialization}>
                        <SelectTrigger id="specialization-select">
                          <SelectValue placeholder="Pick one" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALIZATIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.emoji} {s.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="trainer_type">Type</Label>
                      <Select name="trainer_type" defaultValue="general">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General (group classes)</SelectItem>
                          <SelectItem value="personal">Personal (Pro 1:1)</SelectItem>
                          <SelectItem value="specialized">Specialized</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="space-y-3 rounded-lg border bg-gradient-to-br from-brand-500/5 to-emerald-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Availability
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        {days.length} day{days.length === 1 ? "" : "s"} · {startTime}-{endTime}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d) => {
                        const active = days.includes(d);
                        return (
                          <button
                            type="button"
                            key={d}
                            onClick={() => toggleDay(d)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "bg-card hover:bg-muted"
                            )}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="start" className="text-xs">Start time</Label>
                        <Input
                          id="start"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="end" className="text-xs">End time</Label>
                        <Input
                          id="end"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="availNote" className="text-xs">Notes (optional)</Label>
                      <Input
                        id="availNote"
                        placeholder="e.g. AM sessions only on weekends"
                        value={availNote}
                        onChange={(e) => setAvailNote(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="client" className="mt-0 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="dob">DOB</Label>
                      <Input id="dob" name="dob" type="date" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="height_cm">Height (cm)</Label>
                      <Input id="height_cm" name="height_cm" type="number" step="0.1" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="weight_kg">Weight (kg)</Label>
                      <Input id="weight_kg" name="weight_kg" type="number" step="0.1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan_kind">Assign plan</Label>
                    <Select name="plan_kind" defaultValue="basic">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic — 30 days</SelectItem>
                        <SelectItem value="pro">Pro — 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" disabled={pending}>
                    {pending ? "Creating..." : `Create ${role}`}
                  </Button>
                </DialogFooter>
              </form>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Credentials popup ────────────────────────── */

function CredentialsView({ user, onClose }: { user: CreatedUser; onClose: () => void }) {
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(null);

  function copy(value: string, which: "email" | "password" | "both") {
    navigator.clipboard.writeText(value);
    setCopied(which);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const combined = `Email: ${user.email}\nPassword: ${user.tempPassword}\nSign in: ${origin}/login`;

  return (
    <>
      <DialogHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <DialogTitle className="text-center capitalize">{user.role} created!</DialogTitle>
        <DialogDescription className="text-center">
          Share these with <strong>{user.fullName}</strong>. They&apos;ll change the password on first sign-in.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <CredRow
          label="Email"
          value={user.email}
          onCopy={() => copy(user.email, "email")}
          copied={copied === "email"}
        />
        <CredRow
          label="Password"
          value={user.tempPassword}
          onCopy={() => copy(user.tempPassword, "password")}
          copied={copied === "password"}
          mono
        />
        <Button variant="outline" size="sm" className="w-full" onClick={() => copy(combined, "both")}>
          <Copy className="h-4 w-4" />
          {copied === "both" ? "Copied!" : "Copy email + password + sign-in link"}
        </Button>
        <div className="rounded-lg border bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          ⚠️ This password will <strong>not</strong> be shown again. Copy it now and send via WhatsApp / email.
        </div>
      </div>

      <DialogFooter>
        <Button variant="gradient" className="w-full" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

function CredRow({
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
        <code className={`flex-1 truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</code>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCopy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
