import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface MobileFilterDrawerProps {
  children: ReactNode;
}

export function MobileFilterDrawer({ children }: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* FAB trigger — mobile only */}
      <DrawerTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-40 md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform active:scale-95"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription className="sr-only">
            Sort and filter controls
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
