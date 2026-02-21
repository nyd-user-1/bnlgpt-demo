import { useNavigate, useLocation } from "react-router-dom";
import { SquarePen, BookOpen, Wrench, ChevronDown, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useChatSessions } from "@/hooks/useChatSessions";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const { data: sessions } = useChatSessions();

  return (
    <aside
      className={`${
        isOpen ? "w-[281px]" : "w-0"
      } flex-shrink-0 transition-all duration-200 ease-in-out overflow-hidden`}
    >
      <div className="w-[281px] h-full flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
          <button
            onClick={() => navigate("/")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === "/" ? "bg-muted" : "hover:bg-muted"
            }`}
          >
            <SquarePen className="h-4 w-4" />
            New Chat
          </button>

          <button
            onClick={() => navigate("/references")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === "/references"
                ? "bg-muted"
                : "hover:bg-muted"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            References
          </button>

          <button
            onClick={() => navigate("/resources")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === "/resources"
                ? "bg-muted"
                : "hover:bg-muted"
            }`}
          >
            <Wrench className="h-4 w-4" />
            Tools & Data
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
                    onClick={() => navigate(`/c/${session.id}`)}
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
  );
}
