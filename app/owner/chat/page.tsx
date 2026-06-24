import { requireRole } from "@/lib/auth";
import { loadThreads } from "@/lib/chat";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function OwnerChatPage({
  searchParams,
}: {
  searchParams: { thread?: string };
}) {
  const user = await requireRole("owner");
  const threads = await loadThreads(user.id);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Talk to your trainers or any client. Click a notification to jump straight to that thread.
        </p>
      </div>
      <ChatShell
        selfId={user.id}
        selfRole={user.role}
        threads={threads}
        aiSessions={[]}
        initialThreadId={searchParams.thread ?? null}
      />
    </div>
  );
}
