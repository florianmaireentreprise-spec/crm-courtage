export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-muted rounded" />

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-[280px] flex-1 space-y-3">
            <div className="h-8 bg-muted rounded" />
            {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
              <div key={j} className="h-28 bg-muted rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
