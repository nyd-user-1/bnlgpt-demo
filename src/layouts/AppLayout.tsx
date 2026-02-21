import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { List } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background p-4">
      <Sidebar isOpen={sidebarOpen} />

      {/* App wrapper — rounded border container */}
      <div className="flex flex-1 flex-col min-w-0 rounded-xl border bg-background overflow-hidden">
        {/* Top bar — inside the wrapper */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <List className="h-5 w-5" />
          </button>

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
