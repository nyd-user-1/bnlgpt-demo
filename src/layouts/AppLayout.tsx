import { useState } from "react";
import { Outlet } from "react-router-dom";
import { List, Activity } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ResearchFeed } from "@/components/ResearchFeed";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background p-4">
      <Sidebar isOpen={sidebarOpen} />

      {/* App wrapper — rounded border container */}
      <div
        className="flex flex-1 flex-col min-w-0 rounded-xl border bg-background overflow-hidden"
        onClick={() => {}}
      >
        {/* Top bar — inside the wrapper */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <List className="h-5 w-5" />
          </button>

          {/* Search bar portal target — filled by page components */}
          <div id="header-search" className="flex-1 mx-2" />

          <button
            onClick={() => setFeedOpen((o) => !o)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <Activity className="h-5 w-5" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ResearchFeed isOpen={feedOpen} />
    </div>
  );
}
