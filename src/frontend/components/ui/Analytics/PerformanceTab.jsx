import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../primitives/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../primitives/table";

import { KPICard } from "./KPICard";
import { Clock, RotateCcw, Target, Zap } from "lucide-react";
import { teamPerformance, slaMetrics } from "@/data/mockAnalytics";
import { cn } from "@/lib/utils";

export function PerformanceTab() {
  return (
    <div className="space-y-6">
      {/* SLA KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          icon={<Target className="h-5 w-5" />}
          title="Within SLA"
          value={slaMetrics.withinSLA}
          suffix="%"
          trendLabel="Target: 95%"
        />

        <KPICard
          icon={<Zap className="h-5 w-5" />}
          title="First Response"
          value={slaMetrics.avgFirstResponse}
          trendLabel="Average time"
        />

        <KPICard
          icon={<Clock className="h-5 w-5" />}
          title="Avg Resolution"
          value={slaMetrics.avgResolution}
          trendLabel="End to end"
        />

        <KPICard
          icon={<RotateCcw className="h-5 w-5" />}
          title="First-Time Approval"
          value={slaMetrics.firstTimeApproval}
          suffix="%"
          trendLabel="No resubmission needed"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Key Ratios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Key Ratios</CardTitle>
            <CardDescription>
              Operational efficiency indicators
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Escalation Rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Escalation Rate</span>
                <span className="font-semibold text-foreground">
                  {slaMetrics.escalationRate}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${slaMetrics.escalationRate}%` }}
                />
              </div>
            </div>

            {/* Resubmission Rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Resubmission Rate
                </span>
                <span className="font-semibold text-foreground">
                  {slaMetrics.resubmissionRate}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${slaMetrics.resubmissionRate}%` }}
                />
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SLA Compliance</span>
                <span className="font-semibold text-foreground">
                  {slaMetrics.withinSLA}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${slaMetrics.withinSLA}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Team Performance
            </CardTitle>
            <CardDescription>
              Individual reviewer metrics for the current quarter
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">
                    Approval Rate
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {teamPerformance.map((member) => (
                  <TableRow key={member.member}>
                    <TableCell className="font-medium">
                      {member.member}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {member.processed}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {member.avgTime}
                    </TableCell>

                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "tabular-nums font-medium",
                          member.approvalRate >= 80
                            ? "text-status-approved"
                            : "text-status-in-review"
                        )}
                      >
                        {member.approvalRate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}