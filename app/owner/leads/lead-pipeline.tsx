"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import {
  convertLeadAction,
  createLeadAction,
  deleteLeadAction,
  updateLeadStageAction,
} from "./actions";

export type Stage = "new" | "trial" | "paid" | "lost";
export type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
  stage: Stage;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS: { stage: Stage; label: string; tone: string; emoji: string }[] = [
  { stage: "new", label: "New", emoji: "📥", tone: "bg-blue-500/10 border-blue-300 text-blue-700 dark:text-blue-300" },
  { stage: "trial", label: "Trial", emoji: "🎯", tone: "bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-300" },
  { stage: "paid", label: "Paid", emoji: "✅", tone: "bg-emerald-500/10 border-emerald-300 text-emerald-700 dark:text-emerald-300" },
  { stage: "lost", label: "Lost", emoji: "❌", tone: "bg-rose-500/10 border-rose-300 text-rose-700 dark:text-rose-300" },
];

export function LeadPipeline({ initial }: { initial: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [pending, start] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<Stage | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  function move(id: string, to: Stage) {
    const original = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: to } : l)));
    start(async () => {
      const res = await updateLeadStageAction(id, to);
      if (!res.ok) {
        setLeads(original);
        toast.error("Failed to move", { description: res.error });
      } else {
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this lead?")) return;
    const original = leads;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    start(async () => {
      const res = await deleteLeadAction(id);
      if (!res.ok) {
        setLeads(original);
        toast.error("Failed");
      }
    });
  }

  function convert(id: string) {
    start(async () => {
      const res = await convertLeadAction(id);
      if (!res.ok) return toast.error("Conversion failed", { description: res.error });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: "paid" } : l)));
      setCreds({ email: res.email, password: res.tempPassword ?? "" });
      router.refresh();
    });
  }

  function onDragStart(id: string) {
    setDraggingId(id);
  }
  function onDragOver(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    setHoverStage(stage);
  }
  function onDrop(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    if (draggingId) move(draggingId, stage);
    setDraggingId(null);
    setHoverStage(null);
  }

  return (
    <>
      <NewLeadForm onCreated={(l) => setLeads((prev) => [l, ...prev])} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const inCol = leads.filter((l) => l.stage === col.stage);
          return (
            <Card
              key={col.stage}
              onDragOver={(e) => onDragOver(e, col.stage)}
              onDrop={(e) => onDrop(e, col.stage)}
              className={cn(
                "min-h-[200px] transition-all",
                hoverStage === col.stage && "ring-2 ring-primary shadow-lg"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span>{col.emoji}</span>
                    <span>{col.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {inCol.length}
                    </Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence>
                  {inCol.map((l) => (
                    <motion.div
                      key={l.id}
                      layout
                      draggable
                      onDragStart={() => onDragStart(l.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setHoverStage(null);
                      }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className={cn(
                        "group cursor-grab rounded-lg border bg-card p-2.5 active:cursor-grabbing",
                        draggingId === l.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{l.full_name}</div>
                          {l.email && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Mail className="h-2.5 w-2.5" />
                              <span className="truncate">{l.email}</span>
                            </div>
                          )}
                          {l.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Phone className="h-2.5 w-2.5" />
                              {l.phone}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="rounded-md p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                              aria-label="Menu"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {COLUMNS.filter((c) => c.stage !== l.stage).map((c) => (
                              <DropdownMenuItem key={c.stage} onClick={() => move(l.id, c.stage)}>
                                Move to {c.label}
                              </DropdownMenuItem>
                            ))}
                            {l.stage !== "paid" && (
                              <DropdownMenuItem onClick={() => convert(l.id)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Convert to client
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => remove(l.id)} className="text-rose-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {l.notes && (
                        <div className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">{l.notes}</div>
                      )}
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="capitalize">{l.source}</span>
                        <span>{relativeTime(l.updated_at)}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {inCol.length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                    Drop a card here
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conversion credentials dialog */}
      <Dialog open={!!creds} onOpenChange={(v) => !v && setCreds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center">Converted to client</DialogTitle>
            <DialogDescription className="text-center">
              Share these credentials — they&apos;ll be asked to change the password on first sign-in.
            </DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-3">
              <CredRow label="Email" value={creds.email} />
              <CredRow label="Password" value={creds.password} mono />
            </div>
          )}
          <DialogFooter>
            <Button variant="gradient" className="w-full" onClick={() => setCreds(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewLeadForm({ onCreated }: { onCreated: (l: Lead) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("walkin");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!name.trim()) return toast.error("Name required.");
    start(async () => {
      const res = await createLeadAction({
        full_name: name,
        email: email || undefined,
        phone: phone || undefined,
        source: source || "walkin",
        notes: notes || undefined,
      });
      if (!res.ok) return toast.error("Failed", { description: res.error });
      toast.success("Lead added");
      // Optimistic add — page revalidate will replace it with the canonical row.
      onCreated({
        id: `tmp-${Date.now()}`,
        full_name: name,
        email: email || null,
        phone: phone || null,
        source,
        notes: notes || null,
        stage: "new",
        converted_client_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm">
          <Plus className="h-4 w-4" />
          New lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new lead</DialogTitle>
          <DialogDescription>Walk-in, referral, Instagram DM — log them so they don&apos;t fall through.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="walkin / instagram / referral / google"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} variant="gradient" disabled={pending || !name.trim()}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
        <code className={`flex-1 truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</code>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
