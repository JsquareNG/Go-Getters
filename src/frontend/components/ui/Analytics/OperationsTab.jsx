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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../primitives/chart";
import { KPICard } from "./KPICard";
import {
  AlertTriangle,
  Users,
  Zap,
  CheckCircle2,
} from "lucide-react";
import {
  getAuditMetricsOverview,
  getStaffLeaderboard,
} from "../../../api/auditTrailApi";
import {
  getApplicationByReviewer,
  getAllApplications,
  getAllJob,
} from "../../../api/applicationApi";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

const rankColors = [
  "bg-status-in-review text-foreground",
  "bg-muted text-foreground",
  "bg-status-in-review/40 text-foreground",
];

const processingTrendChartConfig = {
  value: { label: "Avg Processing Time", color: "hsl(var(--accent))" },
};

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

function isUnderManualReview(status) {
  return String(status || "").trim().toLowerCase() === "under manual review";
}

function isApproved(status) {
  return String(status || "").trim().toLowerCase() === "approved";
}

function isUnderReview(status) {
  return String(status || "").trim().toLowerCase() === "under review";
}

function isWithinDateRangeFromCreatedAt(app, dateRange) {
  if (!dateRange?.from && !dateRange?.to) return true;

  const createdAt = app?.created_at;
  if (!createdAt) return false;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;

  if (dateRange?.from && date < dateRange.from) return false;
  if (dateRange?.to && date > dateRange.to) return false;

  return true;
}

function getMonthKey(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);

  return d.toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });
}

function buildProcessingTimeByMonth(reviewJobs, applications, dateRange) {
  const filteredApplications = applications.filter((app) =>
    isWithinDateRangeFromCreatedAt(app, dateRange),
  );

  const applicationMap = new Map(
    filteredApplications.map((app) => [app.application_id, app]),
  );

  const processingByMonth = {};

  reviewJobs.forEach((job) => {
    if (!job.application_id || !job.completed_at) return;
    if (String(job.status || "").toUpperCase() !== "COMPLETED") return;

    const app = applicationMap.get(job.application_id);
    if (!app?.created_at) return;

    const created = new Date(app.created_at);
    const completed = new Date(job.completed_at);

    if (Number.isNaN(created.getTime()) || Number.isNaN(completed.getTime())) {
      return;
    }

    if (completed < created) return;

    const diffDays = (completed - created) / (1000 * 60 * 60 * 24);
    const monthKey = getMonthKey(app.created_at);
    if (!monthKey) return;

    if (!processingByMonth[monthKey]) {
      processingByMonth[monthKey] = {
        totalDays: 0,
        count: 0,
      };
    }

    processingByMonth[monthKey].totalDays += diffDays;
    processingByMonth[monthKey].count += 1;
  });

  return Object.entries(processingByMonth)
    .map(([monthKey, value]) => ({
      month: getMonthLabel(monthKey),
      sortKey: monthKey,
      value: value.count === 0 ? 0 : value.totalDays / value.count,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function getRowHighlightClass(index) {
  if (index === 0) return "bg-yellow-500/70";
  if (index === 1) return "bg-slate-200/80";
  if (index === 2) return "bg-amber-200/80";
  return "";
}

export function OperationsTab({ dateRange, preset }) {
  const [overview, setOverview] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stpRate, setStpRate] = useState(0);
  const [processingTime, setProcessingTime] = useState([]);

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

        const [overviewRes, leaderboardRes, applicationsRes, reviewJobsRes] =
          await Promise.all([
            getAuditMetricsOverview(filterParams),
            getStaffLeaderboard(filterParams),
            getAllApplications(),
            getAllJob(),
          ]);

        setOverview(overviewRes || {});

        const allApplications = Array.isArray(applicationsRes)
          ? applicationsRes
          : Array.isArray(applicationsRes?.data)
            ? applicationsRes.data
            : [];

        const allReviewJobs = Array.isArray(reviewJobsRes)
          ? reviewJobsRes
          : Array.isArray(reviewJobsRes?.data)
            ? reviewJobsRes.data
            : [];

        const filteredApplications = allApplications.filter((app) =>
          isWithinDateRangeFromCreatedAt(app, dateRange),
        );

        const stpApplications = filteredApplications.filter(
          (app) =>
            isUnderReview(app.previous_status) &&
            isApproved(app.current_status),
        );

        const nextStpRate =
          filteredApplications.length > 0
            ? (stpApplications.length / filteredApplications.length) * 100
            : 0;

        setStpRate(Number(nextStpRate.toFixed(1)));

        setProcessingTime(
          buildProcessingTimeByMonth(allReviewJobs, allApplications, dateRange),
        );

        const leaderboard = Array.isArray(leaderboardRes) ? leaderboardRes : [];

        const enrichedLeaderboard = await Promise.all(
          leaderboard.map(async (member) => {
            try {
              const reviewerId = member.staffId;
              const apps = await getApplicationByReviewer(reviewerId);

              const reviewerApps = Array.isArray(apps)
                ? apps
                : Array.isArray(apps?.data)
                  ? apps.data
                  : [];

              const assignedApplications = reviewerApps.length;
              const applicationsLeft = reviewerApps.filter((app) =>
                isUnderManualReview(app.current_status),
              ).length;

              return {
                ...member,
                assignedApplications,
                applicationsLeft,
              };
            } catch (error) {
              return {
                ...member,
                assignedApplications: 0,
                applicationsLeft: 0,
              };
            }
          }),
        );

        const sortedLeaderboard = [...enrichedLeaderboard]
          .sort((a, b) => {
            if ((b.processed ?? 0) !== (a.processed ?? 0)) {
              return (b.processed ?? 0) - (a.processed ?? 0);
            }
            return String(a.staffId || "").localeCompare(
              String(b.staffId || ""),
            );
          })
          .map((member, index) => ({
            ...member,
            rank: index + 1,
          }));

        setTeamPerformance(sortedLeaderboard);
      } catch (error) {
        console.error("Failed to fetch operations metrics:", error);
        setOverview({});
        setTeamPerformance([]);
        setStpRate(0);
        setProcessingTime([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOperationsData();
  }, [filterParams, dateRange]);

  const operationsKPIs = useMemo(() => {
    return {
      escalationRate: overview?.escalationRate ?? 0,
      manualReviewTime: overview?.avgManualReviewTimeDays ?? 0,
      totalEscalations: overview?.totalEscalations ?? 0,
      stpRate: stpRate ?? 0,
    };
  }, [overview, stpRate]);

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

      <div className="grid grid-cols-4 gap-4 lg:grid-cols-4 xl:grid-cols-4">
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Escalation Rate"
          value={operationsKPIs.escalationRate}
          suffix="%"
          trendLabel="of total applications"
        />
        <KPICard
          icon={<Users className="h-5 w-5" />}
          title="Manual Review Time"
          value={formatDurationFromDays(operationsKPIs.manualReviewTime)}
          trendLabel="Avg per application"
        />
        <KPICard
          icon={<Zap className="h-5 w-5" />}
          title="Total Escalations"
          value={operationsKPIs.totalEscalations}
          trendLabel="Across filtered applications"
        />
        <KPICard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="STP Rate"
          value={operationsKPIs.stpRate}
          suffix="%"
          trendLabel="Under Review → Approved"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Application Processing Time Trend
          </CardTitle>
          <CardDescription>
            Average time from application creation to review completion
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ChartContainer
            config={processingTrendChartConfig}
            className="h-[300px] w-full"
          >
            <AreaChart data={processingTime}>
              <defs>
                <linearGradient
                  id="gradProcessingTime"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                minTickGap={24}
                tickMargin={8}
              />

              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickFormatter={(value) => `${Number(value).toFixed(1)}`}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [
                      "Avg Time: ",
                      `${Number(value).toFixed(1)} days`,
                    ]}
                  />
                }
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                fill="url(#gradProcessingTime)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              <TableHeader className="bg-slate-300/30">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Approval Rate</TableHead>
                  <TableHead className="text-right">Applications Left</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {teamPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No staff performance data available
                    </TableCell>
                  </TableRow>
                ) : (
                  teamPerformance.map((member, index) => (
                    <TableRow
                      key={member.staffId}
                      className={cn(getRowHighlightClass(index))}
                    >
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
                        {member.assignedApplications ?? 0}
                      </TableCell>

                      <TableCell className="text-right tabular-nums font-semibold">
                        {member.processed ?? 0}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatDurationFromDays(member.avgReviewTimeDays)}
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "tabular-nums font-medium",
                            (member.approvalRate ?? 0) >= 80
                              ? "text-status-approved"
                              : "text-status-in-review",
                          )}
                        >
                          {member.approvalRate ?? 0}%
                        </span>
                      </TableCell>

                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-bold",
                          (member.applicationsLeft ?? 0) > 10
                            ? "text-black"
                            : (member.applicationsLeft ?? 0) > 5
                              ? "text-black"
                              : "text-black",
                        )}
                      >
                        {member.applicationsLeft ?? 0}
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