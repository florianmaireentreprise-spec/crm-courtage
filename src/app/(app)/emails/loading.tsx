import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-9 w-36 bg-muted rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-muted rounded" />
        ))}
      </div>

      {/* Email list */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 flex items-center gap-4">
              <div className="h-4 w-4 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
              <div className="h-3 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
