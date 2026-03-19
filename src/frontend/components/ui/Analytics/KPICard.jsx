import { Card, CardContent } from "../primitives/Card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function KPICard({ title, value, suffix, trend, trendLabel, icon }) {
  const isPositiveTrend = trend !== undefined && trend > 0;
  const isNegativeTrend = trend !== undefined && trend < 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <span className="text-muted-foreground">{icon}</span>

          {trend !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                isPositiveTrend && "bg-status-approved/10 text-status-approved",
                isNegativeTrend && "bg-status-requires-action/10 text-status-requires-action",
                !isPositiveTrend && !isNegativeTrend && "bg-muted text-muted-foreground"
              )}
            >
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        <p className="text-2xl font-semibold text-foreground">
          {value}
          {suffix && (
            <span className="ml-1 text-base font-normal text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {trendLabel || title}
        </p>
      </CardContent>
    </Card>
  );
}