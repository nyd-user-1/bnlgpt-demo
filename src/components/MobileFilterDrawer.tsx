import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface MobileFilterDrawerProps {
  children: ReactNode;
  pagination?: ReactNode;
}

export function MobileFilterDrawer({ children, pagination }: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB — sits above sticky pagination bar */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-40 md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform active:scale-95"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {/* Backdrop + Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 inset-x-0 max-h-[80vh] rounded-t-xl border-t bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-medium">Filters</span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2">
                {children}
              </div>
            </div>

            {/* Optional pagination footer */}
            {pagination && (
              <div className="border-t px-4 py-3">
                {pagination}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
