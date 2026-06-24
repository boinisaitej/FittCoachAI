import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadThreads } from "@/lib/chat";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function ClientChatPage({
  searchParams,
}: {
  searchParams: { thread?: string; ai?: string };
}) {
  const user = await requireRole("client");
  const supabase = createClient();
  const threads = await loadThreads(user.id);
  const { data: aiSessions } = await supabase
    .from("ai_chat_sessions")
    .select("id,title,updated_at")
    .eq("client_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold">Chat</h1>
        <p className="text-sm text-muted-foreground">Talk to your trainer, your owner, or the AI coach.</p>
      </div>
      <ChatShell
        selfId={user.id}
        selfRole={user.role}
        threads={threads}
        aiSessions={aiSessions ?? []}
        initialThreadId={searchParams.thread ?? null}
        initialAiSessionId={searchParams.ai ?? null}
      />
    </div>
  );
}
