import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../primitives/Card";
import { Badge } from "../primitives/Badge";
import { Shield, AlertTriangle, CheckCircle2, FileSearch } from "lucide-react";
import { KPICard } from "./KPICard";
import { complianceMetrics, riskDistribution, documentStats } from "@/data/mockAnalytics";
import { cn } from "@/lib/utils";

const riskColors = {
  Low: "bg-green-500",
  Medium: "bg-orange-500",
  High: "bg-red-500",
  Critical: "bg-red-800",
};

const riskBadgeVariants = {
  Low: "bg-green-500/10 text-status-approved border-status-approved/20",
  Medium: "bg-orange-500/10 text-status-in-review border-status-in-review/20",
  High: "bg-red-500/10 text-status-requires-action border-status-requires-action/20",
  Critical: "bg-red-800/10 text-primary border-primary/20",
};

export function ComplianceTab() {
  return (
    <div className="space-y-6">
      {/* Document Stats KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          icon={<FileSearch className="h-5 w-5" />}
          title="Documents Uploaded"
          value={documentStats.totalUploaded.toLocaleString()}
          trendLabel="All time"
        />
        <KPICard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Verified"
          value={documentStats.verified.toLocaleString()}
          trendLabel={`${(
            (documentStats.verified / documentStats.totalUploaded) *
            100
          ).toFixed(1)}% of total`}
        />
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Pending Verification"
          value={documentStats.pendingVerification}
          trendLabel="Awaiting review"
        />
        <KPICard
          icon={<Shield className="h-5 w-5" />}
          title="Avg Verification Time"
          value={documentStats.avgVerificationHours}
          suffix="hrs"
          trendLabel="Per document"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compliance Check Pass Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Compliance Check Pass Rates
            </CardTitle>
            <CardDescription>
              Automated and manual verification outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complianceMetrics.map((metric) => {
                const isWarning = metric.passRate < 90;

                return (
                  <div key={metric.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {metric.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {metric.flagged} flagged
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            isWarning
                              ? "text-status-requires-action"
                              : "text-status-approved"
                          )}
                        >
                          {metric.passRate}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isWarning
                            ? "bg-red-500"
                            : "bg-green-500"
                        )}
                        style={{ width: `${metric.passRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Risk Distribution
            </CardTitle>
            <CardDescription>
              Application risk classification breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Visual bar */}
              <div className="flex h-4 overflow-hidden rounded-full">
                {riskDistribution.map((r) => (
                  <div
                    key={r.risk}
                    className={cn("h-full", riskColors[r.risk])}
                    style={{ width: `${r.percentage}%` }}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-4">
                {riskDistribution.map((r) => (
                  <div
                    key={r.risk}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border text-xs font-medium",
                          riskBadgeVariants[r.risk]
                        )}
                      >
                        {r.risk}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <p className="tabular-nums text-sm font-semibold text-foreground">
                        {r.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}