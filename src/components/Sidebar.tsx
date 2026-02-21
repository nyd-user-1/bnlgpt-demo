import { useNavigate, useLocation } from "react-router-dom";
import { List, SquarePen, BookOpen } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <span className="text-lg font-bold tracking-tight">NSRgpt</span>
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 hover:bg-muted transition-colors"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <button
              onClick={() => {
                navigate("/");
                onToggle();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === "/" || location.pathname.startsWith("/c/")
                  ? "bg-muted"
                  : "hover:bg-muted"
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
          </nav>
        </div>
      </aside>
    </>
  );
}
