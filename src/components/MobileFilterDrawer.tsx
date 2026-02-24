import { type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface MobileFilterDrawerProps {
  children: ReactNode;
}

export function MobileFilterDrawer({ children }: MobileFilterDrawerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
