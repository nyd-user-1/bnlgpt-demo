import { useNavigate, useLocation } from "react-router-dom";
import {
  SquarePen,
  Atom,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useChatSessions } from "@/hooks/useChatSessions";
import { UserMenu } from "@/components/UserMenu";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Chat session item with hover menu                                  */
/* ------------------------------------------------------------------ */

interface ChatSessionItemProps {
  id: string;
  title: string;
  isActive: boolean;
  onNavigate: () => void;
  onRefresh: () => void;
}

function ChatSessionItem({
  id,
  title,
  isActive,
  onNavigate,
  onRefresh,
}: ChatSessionItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Focus input when renaming
  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === title) {
      setIsRenaming(false);
      setRenameValue(title);
      return;
    }
    await supabase
      .from("chat_sessions")
      .update({ title: trimmed })
      .eq("id", id);
    setIsRenaming(false);
    onRefresh();
  };

  const handleDelete = async () => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    onRefresh();
    if (isActive) navigate("/");
  };

  if (isRenaming) {
    return (
      <div className="px-3 py-1.5">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setIsRenaming(false);
              setRenameValue(title);
            }
          }}
          onBlur={handleRename}
          className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>
    );
  }

  return (
    <div className="group relative" ref={menuRef}>
      <button
        onClick={onNavigate}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 pr-10 text-sm transition-colors ${
          isActive
            ? "bg-muted font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="truncate">{title.replace(/^Tell me about\s*/i, "").replace(/^["'\u201C\u201D]+/, "")}</span>
      </button>

      {/* Hover ... button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center transition-opacity ${
          menuOpen
            ? "opacity-100 bg-muted"
            : "opacity-0 group-hover:opacity-100 hover:bg-muted"
        }`}
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Context menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[160px] rounded-lg border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-100 py-1">
          <button
            onClick={() => {
              setMenuOpen(false);
              setIsRenaming(true);
              setRenameValue(title);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              handleDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const { data: sessions, refresh } = useChatSessions();

  return (
    <aside
      className={`${
        isOpen ? "w-[281px]" : "w-0"
      } flex-shrink-0 transition-all duration-200 ease-in-out z-50 ${isOpen ? "overflow-visible" : "overflow-hidden"}`}
    >
      <div className="w-[281px] h-full flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
          <h1 className="px-3 pt-1 pb-3 text-lg font-bold tracking-tight">
            Nuclear Science References
          </h1>
          <button
            onClick={() => navigate("/references")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === "/references"
                ? "bg-muted"
                : "hover:bg-muted"
            }`}
          >
            <Atom className="h-4 w-4" />
            References
          </button>

          <button
            onClick={() => navigate("/")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === "/" ? "bg-muted" : "hover:bg-muted"
            }`}
          >
            <SquarePen className="h-4 w-4" />
            New Chat
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
                  <ChatSessionItem
                    key={session.id}
                    id={session.id}
                    title={session.title}
                    isActive={location.pathname === `/c/${session.id}`}
                    onNavigate={() => navigate(`/c/${session.id}`)}
                    onRefresh={refresh}
                  />
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

        {/* User menu at bottom */}
        <div className="px-3 py-2">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
