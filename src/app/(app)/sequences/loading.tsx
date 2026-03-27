import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-56 bg-muted rounded" />
        <div className="h-9 w-36 bg-muted rounded" />
      </div>

      {/* Sequence cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-3 w-64 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 bg-muted rounded" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
