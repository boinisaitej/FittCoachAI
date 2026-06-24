"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  CornerDownLeft,
  ChevronLeft,
  Users as UsersIcon,
  Dumbbell,
  ShieldCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, initials, relativeTime, formatTimeIST, formatDateTimeIST } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/domain";

export type Peer = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  role?: UserRole;
};

export type Thread = {
  id: string;
  title: string | null;
  kind: string;
  participants: Peer[];
  lastBody?: string | null;
  lastAt?: string | null;
};

export type ChatMessage = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  deleted_at?: string | null;
};

export type AiSession = { id: string; title: string; updated_at: string };

const ROLE_BADGE: Record<UserRole, { label: string; cls: string; icon: typeof UsersIcon }> = {
  owner: { label: "Owner", cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300", icon: ShieldCheck },
  trainer: { label: "Trainer", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: Dumbbell },
  client: { label: "Client", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: UsersIcon },
};

const AVATAR_GRADIENT: Record<UserRole, string> = {
  owner: "from-purple-500 to-pink-500",
  trainer: "from-amber-500 to-orange-500",
  client: "from-emerald-500 to-cyan-500",
};

type TabKey = "trainers" | "clients" | "owners" | "ai";

const TAB_META: Record<Exclude<TabKey, "ai">, { label: string; emoji: string; role: UserRole }> = {
  trainers: { label: "Trainers", emoji: "🏋️", role: "trainer" },
  clients: { label: "Clients", emoji: "🙋", role: "client" },
  owners: { label: "Owners", emoji: "🛡️", role: "owner" },
};

function tabsFor(role: UserRole): TabKey[] {
  if (role === "owner") return ["trainers", "clients", "ai"];
  if (role === "trainer") return ["clients", "owners", "ai"];
  return ["trainers", "owners", "ai"];
}

export function ChatShell({
  selfId,
  selfRole,
  threads,
  aiSessions,
  initialThreadId,
  initialAiSessionId,
}: {
  selfId: string;
  selfRole: UserRole;
  threads: Thread[];
  aiSessions: AiSession[];
  initialThreadId?: string | null;
  initialAiSessionId?: string | null;
}) {
  const tabs = tabsFor(selfRole);
  const [tab, setTab] = useState<TabKey>(tabs[0]);
  const [activeThread, setActiveThread] = useState<string | null>(initialThreadId ?? null);
  const [activeAi, setActiveAi] = useState<string | null>(initialAiSessionId ?? null);
  // Local copy of aiSessions so rename / delete / new updates the sidebar
  // without a full page refresh.
  const [sessions, setSessions] = useState<AiSession[]>(aiSessions);
  useEffect(() => setSessions(aiSessions), [aiSessions]);

  // Group threads by the *other* participant's role.
  const grouped = useMemo(() => {
    const buckets: Record<UserRole, Thread[]> = { owner: [], trainer: [], client: [] };
    for (const t of threads) {
      const other = t.participants.find((p) => p.id !== selfId);
      const r = (other?.role ?? "client") as UserRole;
      buckets[r].push(t);
    }
    return buckets;
  }, [threads, selfId]);

  // When the active tab changes, auto-select the first thread in that bucket.
  useEffect(() => {
    if (tab === "ai") return;
    const role = TAB_META[tab].role;
    const list = grouped[role];
    if (!list.find((t) => t.id === activeThread)) {
      setActiveThread(list[0]?.id ?? null);
    }
  }, [tab, grouped, activeThread]);

  const hasActive = tab === "ai" ? !!activeAi : !!activeThread;

  return (
    <Card className="overflow-hidden p-0">
      {/* ── Top tab bar ────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b bg-muted/30 p-3">
        {tabs.map((k) => {
          const isAi = k === "ai";
          const isActive = tab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background shadow"
                  : "bg-card text-foreground hover:bg-muted"
              )}
            >
              <span className="text-base leading-none">
                {isAi ? "💬" : TAB_META[k].emoji}
              </span>
              <span>{isAi ? "Chat with AI" : TAB_META[k].label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Two-pane body ──────────────────────────────────────────── */}
      <div className="grid h-[calc(100vh-16rem)] grid-cols-1 lg:grid-cols-[300px_1fr] 3xl:grid-cols-[340px_1fr]">
        {/* Sidebar */}
        <div
          className={cn(
            "flex flex-col overflow-y-auto border-r bg-card scrollbar-thin",
            hasActive ? "hidden lg:flex" : "flex"
          )}
        >
          {tab === "ai" ? (
            <AiSidebar
              sessions={sessions}
              activeId={activeAi}
              onSelect={setActiveAi}
              onCreate={() => setActiveAi(null)}
              onRename={(id, title) =>
                setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
              }
              onDelete={(id) => {
                setSessions((prev) => prev.filter((s) => s.id !== id));
                if (activeAi === id) setActiveAi(null);
              }}
            />
          ) : (
            <PeopleList
              selfId={selfId}
              threads={grouped[TAB_META[tab].role]}
              activeId={activeThread}
              onSelect={setActiveThread}
              role={TAB_META[tab].role}
              emptyLabel={`No ${TAB_META[tab].label.toLowerCase()} yet.`}
            />
          )}
        </div>

        {/* Main pane */}
        <div
          className={cn(
            "relative flex flex-col overflow-hidden",
            hasActive ? "flex" : "hidden lg:flex"
          )}
        >
          {tab === "ai" ? (
            <AiChat
              sessionId={activeAi}
              onSessionCreated={(id, title) => {
                setActiveAi(id);
                setSessions((prev) =>
                  prev.find((s) => s.id === id)
                    ? prev
                    : [{ id, title, updated_at: new Date().toISOString() }, ...prev]
                );
              }}
              onBack={() => setActiveAi(null)}
            />
          ) : activeThread ? (
            <PeopleChat
              threadId={activeThread}
              selfId={selfId}
              selfRole={selfRole}
              thread={threads.find((t) => t.id === activeThread)!}
              onBack={() => setActiveThread(null)}
            />
          ) : (
            <Empty title={`No ${TAB_META[tab].label.toLowerCase()} yet`} hint="Once they're added to your gym, they appear here automatically." />
          )}
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
function PeopleList({
  selfId,
  threads,
  activeId,
  onSelect,
  role,
  emptyLabel,
}: {
  selfId: string;
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  role: UserRole;
  emptyLabel: string;
}) {
  if (!threads.length) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1 p-2">
      {threads.map((t) => {
        const other = t.participants.find((p) => p.id !== selfId);
        const display = other?.full_name ?? other?.email ?? t.title ?? "Conversation";
        const active = t.id === activeId;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              title={display}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
                active ? "bg-foreground text-background" : "hover:bg-muted"
              )}
            >
              <Avatar className="h-9 w-9">
                {other?.avatar_url ? (
                  <AvatarImage src={other.avatar_url} alt={display} />
                ) : null}
                <AvatarFallback
                  className={cn(
                    "bg-gradient-to-br text-xs text-white",
                    AVATAR_GRADIENT[role]
                  )}
                >
                  <span className="text-base">
                    {role === "trainer" ? "🏋️" : role === "owner" ? "🛡️" : "🙋"}
                  </span>
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm font-semibold">{display}</span>
                  {t.kind === "broadcast" && (
                    <Badge variant="warning" className="h-4 text-[9px]">📣</Badge>
                  )}
                </div>
                <div className={cn("truncate text-xs", active ? "text-background/70" : "text-muted-foreground")}>
                  {t.lastBody ?? "Say hi 👋"}
                </div>
              </div>
              {t.lastAt && (
                <div className={cn("text-[10px]", active ? "text-background/60" : "text-muted-foreground/70")}>
                  {relativeTime(t.lastAt)}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
function AiSidebar({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  sessions: AiSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(s: AiSession) {
    setEditingId(s.id);
    setDraft(s.title);
  }

  async function commitRename(id: string) {
    const title = draft.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/ai/chat/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error("Rename failed", { description: j.error ?? `HTTP ${res.status}` });
      return;
    }
    onRename(id, title);
    setEditingId(null);
    toast.success("Renamed");
  }

  async function remove(id: string) {
    if (!confirm("Delete this AI chat? All messages will be removed.")) return;
    setBusy(true);
    const res = await fetch(`/api/ai/chat/sessions/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error("Delete failed", { description: j.error ?? `HTTP ${res.status}` });
      return;
    }
    onDelete(id);
    toast.success("Chat deleted");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={onCreate} variant="gradient" size="sm" className="w-full">
          <Plus className="h-4 w-4" />
          New AI chat
        </Button>
      </div>
      {sessions.length === 0 ? (
        <p className="px-4 text-xs text-muted-foreground">
          Start a new chat above — your sessions are saved here.
        </p>
      ) : (
        <ul className="space-y-0.5 px-2 pb-2">
          {sessions.map((s) => {
            const active = activeId === s.id;
            const editing = editingId === s.id;
            return (
              <li key={s.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded-xl p-2 transition-colors",
                    active ? "bg-primary/10" : "hover:bg-muted"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !editing && onSelect(s.id)}
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                    aria-label="Open chat"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitRename(s.id);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          className="h-7 text-sm"
                          disabled={busy}
                          maxLength={120}
                        />
                        <button
                          type="button"
                          onClick={() => commitRename(s.id)}
                          disabled={busy}
                          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          aria-label="Save"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                          aria-label="Cancel"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(s.id)}
                        className="block w-full text-left"
                      >
                        <div className="line-clamp-1 text-sm font-medium">{s.title}</div>
                        <div className="text-[10px] text-muted-foreground">{relativeTime(s.updated_at)}</div>
                      </button>
                    )}
                  </div>
                  {!editing && (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Rename"
                        aria-label="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-base font-semibold">{title}</div>
      <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
function PeopleChat({
  threadId,
  selfId,
  selfRole,
  thread,
  onBack,
}: {
  threadId: string;
  selfId: string;
  selfRole: UserRole;
  thread: Thread;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const peers = thread.participants.filter((p) => p.id !== selfId);
  const headerPeer = peers[0];
  const headerRole = (headerPeer?.role ?? "client") as UserRole;
  const headerName = headerPeer?.full_name ?? headerPeer?.email ?? thread.title ?? "Conversation";

  const senderName = (id: string) => {
    if (id === selfId) {
      return selfRole === "owner" ? "Owner" : selfRole === "trainer" ? "You" : "You";
    }
    const p = thread.participants.find((p) => p.id === id);
    return p?.full_name ?? p?.email ?? "Unknown";
  };

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,body,sender_id,created_at,deleted_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMessages(data ?? []);
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
        );
      }
    })();
    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          requestAnimationFrame(() =>
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as ChatMessage).id ? (payload.new as ChatMessage) : m))
          );
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  async function send() {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setInput("");
    setSending(true);
    const supabase = createClient();
    await supabase.from("chat_messages").insert({ thread_id: threadId, sender_id: selfId, body });
    setSending(false);
  }

  async function delOne(id: string) {
    const supabase = createClient();
    await supabase.from("chat_messages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  }

  async function clearAll() {
    if (clearing) return;
    if (!confirm("Soft-delete every message in this conversation? Both sides will see [deleted].")) return;
    setClearing(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .is("deleted_at", null);
    setClearing(false);
    if (error) {
      toast.error("Couldn't clear", { description: error.message });
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.deleted_at ? m : { ...m, deleted_at: new Date().toISOString() }))
    );
    toast.success("Messages cleared");
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-card/60 px-3 py-3 backdrop-blur-sm sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
          {headerPeer?.avatar_url ? <AvatarImage src={headerPeer.avatar_url} alt={headerName} /> : null}
          <AvatarFallback className={cn("bg-gradient-to-br text-xs text-white", AVATAR_GRADIENT[headerRole])}>
            {initials(headerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{headerName}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {headerPeer?.email ?? ROLE_BADGE[headerRole].label}
          </div>
        </div>
        {thread.kind === "broadcast" && <Badge variant="warning">📣 Broadcast</Badge>}
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={clearing || messages.every((m) => m.deleted_at)}
          className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {clearing ? "Clearing..." : "Clear messages"}
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <span>Start the conversation 👋</span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.sender_id === selfId;
            const deleted = !!m.deleted_at;
            const label = mine
              ? selfRole === "owner"
                ? "Owner"
                : selfRole === "trainer"
                  ? "Trainer"
                  : "You"
              : senderName(m.sender_id);
            return (
              <motion.div
                key={m.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div className="px-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80">{label}</span>
                  <span className="mx-1">·</span>
                  <span>{formatDateTimeIST(m.created_at)}</span>
                </div>
                <div
                  className={cn(
                    "group relative max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                    mine
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : "bg-muted text-foreground",
                    deleted && "italic opacity-60"
                  )}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(m.body);
                    toast.success("Copied");
                  }}
                  title={formatDateTimeIST(m.created_at)}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {deleted ? "[deleted]" : m.body}
                    <span
                      className={cn(
                        "ml-2 text-[10px]",
                        mine ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {formatTimeIST(m.created_at)}
                    </span>
                  </div>
                  {!deleted && (
                    <div
                      className={cn(
                        "absolute -top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                        mine ? "left-2" : "right-2"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(m.body);
                          toast.success("Copied");
                        }}
                        className="rounded-full border bg-card p-1 text-muted-foreground shadow-sm hover:text-foreground"
                        title="Copy"
                        aria-label="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => delOne(m.id)}
                          className="rounded-full border bg-card p-1 text-red-500 shadow-sm hover:bg-red-50"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="border-t bg-card/60 p-3 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              placeholder="Type a message..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="h-11 pr-10"
              disabled={sending}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              <CornerDownLeft className="inline h-3 w-3" />
            </span>
          </div>
          <Button
            onClick={send}
            variant="gradient"
            size="icon"
            className="h-11 w-11 rounded-xl"
            disabled={sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
const AI_SUGGESTIONS = [
  { icon: "🥗", text: "Suggest a fat-loss breakfast under 350 kcal" },
  { icon: "💪", text: "Best exercises for lower back pain?" },
  { icon: "💧", text: "How much water should I drink daily?" },
  { icon: "🛌", text: "Tips to improve my sleep quality" },
  { icon: "🍗", text: "How much protein do I need per day?" },
  { icon: "🏃", text: "Quick post-workout meal ideas" },
];

function AiChat({
  sessionId,
  onSessionCreated,
  onBack,
}: {
  sessionId: string | null;
  onSessionCreated: (id: string, title: string) => void;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Internally-owned session id. Lets the FIRST message of a brand-new chat
  // create its session without remounting this component (which used to throw
  // away the in-flight streamed reply). When `sid` is set by send() itself we
  // skip the DB refetch so the streamed messages aren't clobbered.
  const [sid, setSid] = useState<string | null>(sessionId);
  const selfCreatedRef = useRef<string | null>(null);

  // Follow the parent when it switches us to a different session.
  useEffect(() => {
    setSid(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sid) {
      setMessages([]);
      return;
    }
    // We just created this session locally and already hold its messages —
    // don't refetch (the assistant reply may still be streaming in).
    if (selfCreatedRef.current === sid) {
      selfCreatedRef.current = null;
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("role,content")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages(
        ((data ?? []) as { role: "user" | "assistant"; content: string }[]).filter(
          (m) => m.role !== ("system" as never)
        )
      );
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [sid]);

  async function send(text?: string) {
    const body = (text ?? input).trim();
    if (!body || loading) return;
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { role: "user", content: body }, { role: "assistant", content: "" }]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );

    let res: Response;
    try {
      res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, message: body }),
      });
    } catch (e) {
      setLoading(false);
      setMessages((m) => m.slice(0, -1));
      toast.error("Network error", { description: e instanceof Error ? e.message : String(e) });
      return;
    }

    if (!res.ok) {
      setLoading(false);
      setMessages((m) => m.slice(0, -1));
      const j = await res.json().catch(() => ({}));
      toast.error("AI error", { description: j.error ?? `HTTP ${res.status}` });
      return;
    }

    const newSid = res.headers.get("x-session-id");
    const qUsed = res.headers.get("x-quota-used");
    const qLim = res.headers.get("x-quota-limit");
    if (qUsed && qLim) {
      setQuota({ used: parseInt(qUsed, 10), limit: qLim === "unlimited" ? Infinity : parseInt(qLim, 10) });
    }
    if (newSid && !sid) {
      // Adopt the freshly-created session WITHOUT triggering a refetch that
      // would wipe the streaming reply, and surface it in the sidebar.
      selfCreatedRef.current = newSid;
      setSid(newSid);
      onSessionCreated(newSid, body.slice(0, 60));
    }

    const reader = res.body?.getReader();
    if (!reader) {
      setLoading(false);
      return;
    }
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = m.slice();
          const last = next[next.length - 1];
          if (last && last.role === "assistant")
            next[next.length - 1] = { role: "assistant", content: last.content + chunk };
          return next;
        });
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-card/60 px-3 py-3 backdrop-blur-sm sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Back to sessions"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-violet-500/30 sm:h-10 sm:w-10">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">FitCoachAI</span>
            <Badge className="h-4 border-0 bg-violet-500/15 text-[10px] text-violet-700 dark:text-violet-300">
              AI · Gemini
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground">Your personal coach, on call 24/7.</div>
        </div>
        {quota && (
          <Badge variant="outline" className="text-[10px]">
            {quota.used}/{quota.limit === Infinity ? "∞" : quota.limit} today
          </Badge>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-xl shadow-violet-500/40"
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>
            <div className="text-center">
              <div className="text-lg font-semibold">Ask me anything about fitness</div>
              <p className="mt-1 text-sm text-muted-foreground">Pick a starter or type your own question.</p>
            </div>
            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {AI_SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => send(s.text)}
                  className="group flex items-center gap-2 rounded-xl border bg-card p-3 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md"
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="flex-1">{s.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.role === "user";
              return (
                <motion.div
                  key={i}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex items-start gap-2", mine ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow",
                      mine
                        ? "bg-gradient-to-br from-blue-500 to-blue-600"
                        : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                    )}
                  >
                    {mine ? "Me" : <Sparkles className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      "group relative max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                      mine
                        ? "rounded-tr-md bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        : "rounded-tl-md border bg-card"
                    )}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(m.content);
                      toast.success("Copied");
                    }}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1 text-[10px]",
                        mine ? "justify-end text-white/80" : "justify-start text-muted-foreground"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          toast.success("Copied");
                        }}
                        className={cn(
                          "rounded-full p-0.5 transition-colors",
                          mine ? "hover:bg-white/20" : "hover:bg-muted-foreground/15"
                        )}
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {loading && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-md border bg-card px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <Dot delay={0} />
                    <Dot delay={0.15} />
                    <Dot delay={0.3} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t bg-card/60 p-3 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-500" />
            <Input
              value={input}
              placeholder="Ask FitCoachAI anything..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="h-11 border-violet-200/60 pl-9 pr-10 focus-visible:ring-violet-400 dark:border-violet-900/40"
              disabled={loading}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              <CornerDownLeft className="inline h-3 w-3" />
            </span>
          </div>
          <Button
            onClick={() => send()}
            size="icon"
            className="h-11 w-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl"
            disabled={loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

    </>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-violet-500"
      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}
