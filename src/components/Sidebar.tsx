import { useNavigate, useLocation } from "react-router-dom";
import { List, SquarePen, BookOpen, ChevronDown, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useChatSessions } from "@/hooks/useChatSessions";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const { data: sessions } = useChatSessions();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-background border-r transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-lg font-bold tracking-tight">NSRgpt</span>
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 hover:bg-muted transition-colors"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 space-y-1">
            <button
              onClick={() => {
                navigate("/");
                onToggle();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === "/" ? "bg-muted" : "hover:bg-muted"
              }`}
            >
              <SquarePen className="h-4 w-4" />
              New Chat
            </button>

            <button
              onClick={() => {
                navigate("/references");
                onToggle();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === "/references"
                  ? "bg-muted"
                  : "hover:bg-muted"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              References
            </button>

            {/* Your Chats section */}
            <div className="pt-4">
              <button
                onClick={() => setChatsExpanded(!chatsExpanded)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Your Chats
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    chatsExpanded ? "" : "-rotate-90"
                  }`}
                />
              </button>

              {chatsExpanded && sessions && sessions.length > 0 && (
                <div className="space-y-0.5">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        navigate(`/c/${session.id}`);
                        onToggle();
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors truncate ${
                        location.pathname === `/c/${session.id}`
                          ? "bg-muted font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {chatsExpanded && (!sessions || sessions.length === 0) && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No chats yet
                </p>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
