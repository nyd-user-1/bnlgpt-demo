interface FeedHeaderProps {
  isConnected: boolean;
}

export function FeedHeader({ isConnected }: FeedHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="relative h-2 w-2">
        {isConnected ? (
          <>
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
            <span className="relative block h-2 w-2 rounded-full bg-green-500" />
          </>
        ) : (
          <span className="block h-2 w-2 rounded-full bg-muted-foreground/50" />
        )}
      </div>
      <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
        Live Feed
      </span>
    </div>
  );
}
