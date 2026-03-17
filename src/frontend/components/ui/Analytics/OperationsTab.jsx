import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../primitives/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../primitives/table";
import { Badge } from "../primitives/Badge";
import { KPICard } from "./KPICard";
import {
  Clock,
  AlertTriangle,
  Users,
  Zap,
  Target,
  RotateCcw,
} from "lucide-react";
import {
  getAuditMetricsOverview,
  getStaffLeaderboard,
} from "../../../api/auditTrailApi";
import { cn } from "@/lib/utils";

const rankColors = [
  "bg-status-in-review text-foreground",
  "bg-muted text-foreground",
  "bg-status-in-review/40 text-foreground",
];

function formatDurationFromDays(days) {
  const value = Number(days || 0);

  if (value <= 0) return "0 min";

  const totalMinutes = value * 24 * 60;
  const totalHours = value * 24;

  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`;
  }

  if (totalHours < 24) {
    return `${totalHours.toFixed(1)} hrs`;
  }

  return `${value.toFixed(2)} days`;
}

export function OperationsTab({ dateRange, preset }) {
  const [overview, setOverview] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  const filterParams = useMemo(() => {
    return {
      from: dateRange?.from ? dateRange.from.toISOString() : undefined,
      to: dateRange?.to ? dateRange.to.toISOString() : undefined,
    };
  }, [dateRange]);

  const operationsDescription = useMemo(() => {
    switch (preset) {
      case "last-7":
        return "Operational metrics for the last 7 days";
      case "last-30":
        return "Operational metrics for the last 30 days";
      case "last-quarter":
        return "Operational metrics for the last quarter";
      case "last-year":
        return "Operational metrics for the last year";
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          return `Operational metrics from ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`;
        }
        return "Operational metrics for the selected custom range";
      default:
        return "Operational metrics";
    }
  }, [preset, dateRange]);

  useEffect(() => {
    const fetchOperationsData = async () => {
      try {
        setLoading(true);

        const [overviewRes, leaderboardRes] = await Promise.all([
          getAuditMetricsOverview(filterParams),
          getStaffLeaderboard(filterParams),
        ]);

        setOverview(overviewRes || {});
        setTeamPerformance(Array.isArray(leaderboardRes) ? leaderboardRes : []);
      } catch (error) {
        console.error("Failed to fetch operations metrics:", error);
        setOverview({});
        setTeamPerformance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOperationsData();
  }, [filterParams]);

  const operationsKPIs = useMemo(() => {
    return {
      avgProcessingTime: overview?.avgProcessingTimeDays ?? 0,
      escalationRate: overview?.escalationRate ?? 0,
      manualReviewTime: overview?.avgManualReviewTimeDays ?? 0,
      totalEscalations: overview?.totalEscalations ?? 0,
      avgProcessingTimeTrend: 0,
      escalationRateTrend: 0,
      manualReviewTimeTrend: 0,
      totalEscalationsTrend: 0,
      applicationsPerStaffPerDay: 0,
    };
  }, [overview]);

  const slaMetrics = useMemo(() => {
    return {
      withinSLA: 0,
      firstTimeApproval: 0,
      escalationRate: overview?.escalationRate ?? 0,
      resubmissionRate: 0,
      avgFirstResponse: "-",
      avgResolution: "-",
    };
  }, [overview]);

  const efficiencyMetrics = [
    {
      label: "Escalation Rate",
      value: slaMetrics.escalationRate,
      color: "bg-status-in-review",
    },
    {
      label: "Resubmission Rate",
      value: slaMetrics.resubmissionRate,
      color: "bg-status-requires-action",
    },
    {
      label: "SLA Compliance",
      value: slaMetrics.withinSLA,
      color: "bg-status-approved",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Loading operations data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{operationsDescription}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          icon={<Clock className="h-5 w-5" />}
          title="Avg Processing Time"
          value={formatDurationFromDays(operationsKPIs.avgProcessingTime)}
          trend={operationsKPIs.avgProcessingTimeTrend}
          trendLabel="Submission → Decision"
        />
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Escalation Rate"
          value={operationsKPIs.escalationRate}
          suffix="%"
          trend={operationsKPIs.escalationRateTrend}
          trendLabel="of total applications"
        />
        <KPICard
          icon={<Users className="h-5 w-5" />}
          title="Manual Review Time"
          value={formatDurationFromDays(operationsKPIs.manualReviewTime)}
          trend={operationsKPIs.manualReviewTimeTrend}
          trendLabel="Avg per application"
        />
        <KPICard
          icon={<Zap className="h-5 w-5" />}
          title="Total Escalations"
          value={operationsKPIs.totalEscalations}
          trend={operationsKPIs.totalEscalationsTrend}
          trendLabel="Across filtered applications"
        />
        <KPICard
          icon={<Target className="h-5 w-5" />}
          title="SLA Compliance"
          value={slaMetrics.withinSLA}
          suffix="%"
          trendLabel="Not tracked yet"
        />
        <KPICard
          icon={<RotateCcw className="h-5 w-5" />}
          title="First-Time Approval"
          value={slaMetrics.firstTimeApproval}
          suffix="%"
          trendLabel="Not tracked yet"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Efficiency Ratios
            </CardTitle>
            <CardDescription>
              Key operational performance indicators
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {efficiencyMetrics.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {metric.value}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", metric.color)}
                    style={{
                      width: `${Math.max(0, Math.min(metric.value, 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Avg First Response
                </span>
                <span className="font-semibold text-foreground">
                  {slaMetrics.avgFirstResponse}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Resolution</span>
                <span className="font-semibold text-foreground">
                  {slaMetrics.avgResolution}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Apps / Staff / Day
                </span>
                <span className="font-semibold text-foreground">
                  {operationsKPIs.applicationsPerStaffPerDay}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Staff Leaderboard
            </CardTitle>
            <CardDescription>
              Individual reviewer performance ranked by applications processed
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Approval Rate</TableHead>
                  <TableHead className="text-right">Escalations</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {teamPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No staff performance data available
                    </TableCell>
                  </TableRow>
                ) : (
                  teamPerformance.map((member) => (
                    <TableRow key={member.staffId}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border-0 p-0 text-xs font-bold",
                            member.rank <= 3
                              ? rankColors[member.rank - 1]
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {member.rank}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium">
                        {member.staffName || member.staffId}
                      </TableCell>

                      <TableCell className="text-right tabular-nums font-semibold">
                        {member.processed}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatDurationFromDays(member.avgReviewTimeDays)}
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "tabular-nums font-medium",
                            member.approvalRate >= 80
                              ? "text-status-approved"
                              : "text-status-in-review",
                          )}
                        >
                          {member.approvalRate}%
                        </span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {member.escalationsHandled}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OperationsTab;