import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "../../lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function KPICard({
  title,
  value,
  suffix,
  prefix,
  change,
  changeLabel,
  icon,
  trend = "neutral",
  trendPositive = true,
}) {
  const showChange = change !== undefined;
  const isPositive = trendPositive
    ? trend === "up" || (trend === "down" && change && change < 0)
    : trend === "down";

  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline gap-1">
          {prefix && (
            <span className="text-2xl font-bold text-foreground">{prefix}</span>
          )}
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {suffix && (
            <span className="text-lg text-muted-foreground">{suffix}</span>
          )}
        </div>

        {showChange && (
          <div
            className={cn(
              "flex items-center gap-1 mt-2 text-sm",
              isPositive ? "text-status-success" : "text-status-error"
            )}
          >
            {trend === "up" && <TrendingUp className="h-4 w-4" />}
            {trend === "down" && <TrendingDown className="h-4 w-4" />}
            {trend === "neutral" && <Minus className="h-4 w-4" />}
            <span className="font-medium">{Math.abs(change)}%</span>
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
