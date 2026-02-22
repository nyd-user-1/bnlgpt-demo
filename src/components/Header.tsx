import { List } from "lucide-react";

export function Header() {
  return (
    <header className="w-full border-b bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        <List className="h-5 w-5 text-muted-foreground" />
        <span className="text-lg font-semibold tracking-tight">NSRgpt</span>
      </div>
    </header>
  );
}
