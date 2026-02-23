interface FeedHeaderProps {
  isConnected: boolean;
}

export function FeedHeader({ isConnected }: FeedHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="relative h-2.5 w-2.5">
        {isConnected ? (
          <>
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            <span className="relative block h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.6)]" />
          </>
        ) : (
          <span className="block h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
        )}
      </div>
      <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
        Live Feed
      </span>
    </div>
  );
}
