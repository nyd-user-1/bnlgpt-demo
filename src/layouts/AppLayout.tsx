import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { List } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar — matches NYSgpt: no border, hover states */}
        <div className="flex items-center justify-between px-4 py-3 bg-background flex-shrink-0">
          {/* Left: hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <List className="h-5 w-5" />
          </button>

          {/* Right: NSRgpt with hover */}
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center h-10 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-xl"
          >
            NSRgpt
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
