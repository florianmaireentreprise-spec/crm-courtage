import type { ForecastResult } from "@/lib/objectifs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, CheckCircle2 } from "lucide-react";

type Props = {
  forecast: ForecastResult;
};

export function ForecastBadge({ forecast }: Props) {
  if (forecast.atteint) {
    return (
      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {forecast.message}
      </div>
    );
  }
  if (forecast.weeksRemaining === null) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="h-3.5 w-3.5" />
        {forecast.message}
      </div>
    );
  }
  const isOnTrack = forecast.weeksRemaining <= 26;
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${
        isOnTrack ? "text-blue-600" : "text-orange-500"
      }`}
    >
      <TrendingUp className="h-3.5 w-3.5" />
      {forecast.message}
    </div>
  );
}
