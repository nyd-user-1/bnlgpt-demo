import { useState } from "react";
import { Outlet } from "react-router-dom";
import { List, Activity, Info, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ResearchFeed } from "@/components/ResearchFeed";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-background p-0 md:p-4">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      {(sidebarOpen || feedOpen) && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => { setSidebarOpen(false); setFeedOpen(false); }}
        />
      )}

      {/* App wrapper — rounded border container */}
      <div
        className="flex flex-1 flex-col min-w-0 md:rounded-xl md:border bg-background overflow-hidden"
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

      <ResearchFeed isOpen={feedOpen} onClose={() => setFeedOpen(false)} />

      {/* Pinned info button */}
      <button
        onClick={() => setDisclaimerOpen(true)}
        className="fixed bottom-5 left-[30px] z-50 h-8 w-8 rounded-full border border-border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>

      {/* Disclaimer dialog */}
      {disclaimerOpen && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/50 animate-in fade-in duration-150"
            onClick={() => setDisclaimerOpen(false)}
          />
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-xl border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold">Disclaimer</h2>
                <button
                  onClick={() => setDisclaimerOpen(false)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                NSRgpt is an independent project and is not affiliated with, endorsed by, or sponsored by Brookhaven National Laboratory, the National Nuclear Data Center (NNDC), or the U.S. Department of Energy.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                NSR data is publicly available and sourced from nndc.bnl.gov/nsr. This application is provided as-is for research and educational purposes.
              </p>
              <button
                onClick={() => setDisclaimerOpen(false)}
                className="mt-5 w-full rounded-lg bg-foreground text-background py-2 text-sm font-medium hover:bg-foreground/85 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
