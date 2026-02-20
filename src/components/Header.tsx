import { Atom } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
        <Atom className="h-7 w-7 text-nuclear" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">BNLgpt</h1>
          <p className="text-xs text-muted-foreground">
            Semantic search over NNDC Nuclear Science References
          </p>
        </div>
      </div>
    </header>
  );
}
