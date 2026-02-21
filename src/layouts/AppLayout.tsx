import { useState } from "react";
import { Outlet } from "react-router-dom";
import { List } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between px-4 border-b shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <List className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-lg font-semibold tracking-tight">NSRgpt</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
