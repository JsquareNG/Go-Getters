import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../primitives/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../primitives/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { getAllApplications } from "../../../api/applicationApi";

const outcomeChartConfig = {
  rate: {
    label: "Rate",
    color: "hsl(210, 100%, 50%)",
  },
};

function safeParseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getPayload(app) {
  return safeParseJson(app?.form_data);
}

function normalizeStatus(value) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "draft") return "Draft";
  if (v === "under review") return "Under Review";
  if (v === "under manual review") return "Under Manual Review";
  if (v === "requires action" || v === "action required")
    return "Requires Action";
  if (v === "approved") return "Approved";
  if (v === "auto rejected" || v === "auto-rejected")
    return "Auto Rejected";
  if (v === "rejected" || v === "declined") return "Rejected";
  if (v === "withdrawn") return "Withdrawn";
  if (v === "deleted") return "Deleted";

  return "Unknown";
}

function isWithinDateRange(app, dateRange) {
  if (!dateRange?.from && !dateRange?.to) return true;

  const createdAt = app?.created_at || app?.updated_at;
  if (!createdAt) return false;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;

  if (dateRange?.from && date < dateRange.from) return false;
  if (dateRange?.to && date > dateRange.to) return false;

  return true;
}

function normalizeStageLabel(value) {
  const v = String(value || "").trim().toLowerCase();

  if (
    [
      "step1",
      "step 1",
      "basic information",
      "basic info",
      "applicant information",
    ].includes(v)
  ) {
    return "Basic Information";
  }

  if (
    [
      "step2",
      "step 2",
      "business details",
      "business information",
      "company details",
    ].includes(v)
  ) {
    return "Business Details";
  }

  if (
    [
      "step3",
      "step 3",
      "document upload",
      "documents",
      "supporting documents",
    ].includes(v)
  ) {
    return "Document Upload";
  }

  return String(value)
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferDraftStage(app) {
  const payload = getPayload(app);

  const rawStage =
    payload.last_saved_step ??
    payload.lastSavedStep ??
    payload.currentStep ??
    payload.current_step ??
    payload.draftStep ??
    payload.draft_stage ??
    payload.onboardingStage ??
    payload.onboarding_stage ??
    payload.lastCompletedStep ??
    payload.last_completed_step ??
    payload.step;

  const numericStage = Number(rawStage);

  if (!Number.isNaN(numericStage)) {
    if (numericStage === 1) return "Basic Information";
    if (numericStage === 2) return "Business Details";
    if (numericStage === 3) return "Document Upload";
  }

  return normalizeStageLabel(rawStage);
}

function buildPipelineStages(applications = []) {
  const counts = {
    Draft: 0,
    "Under Manual Review": 0,
    "Requires Action": 0,
    Approved: 0,
    "Auto Rejected": 0,
    Rejected: 0,
    Withdrawn: 0,
    Deleted: 0,
  };

  applications.forEach((app) => {
    const status = normalizeStatus(app.current_status);
    if (counts[status] !== undefined) {
      counts[status] += 1;
    }
  });

  const stageMeta = [
    { stage: "Draft", color: "hsl(217, 91%, 60%)" },
    { stage: "Under Manual Review", color: "hsl(38, 92%, 50%)" },
    { stage: "Requires Action", color: "hsl(48, 96%, 53%)" },
    { stage: "Approved", color: "hsl(160, 84%, 39%)" },
    { stage: "Auto Rejected", color: "hsl(0, 84%, 45%)" },
    { stage: "Rejected", color: "hsl(0, 84%, 60%)" },
    { stage: "Withdrawn", color: "hsl(215, 16%, 47%)" },
    { stage: "Deleted", color: "hsl(240, 5%, 45%)" },
  ];

  return stageMeta.map((item) => ({
    ...item,
    count: counts[item.stage] || 0,
  }));
}

function buildDraftDropoff(applications = []) {
  const draftApps = applications.filter(
    (app) => normalizeStatus(app.current_status) === "Draft",
  );

  const counts = {
    "Basic Information": 0,
    "Business Details": 0,
    "Document Upload": 0,
  };

  draftApps.forEach((app) => {
    const stage = inferDraftStage(app);

    if (counts[stage] !== undefined) {
      counts[stage] += 1;
    }
  });

  const totalDrafts = draftApps.length;

  return Object.entries(counts).map(([stage, count], index) => ({
    stage,
    count,
    percentage:
      totalDrafts > 0 ? Number(((count / totalDrafts) * 100).toFixed(1)) : 0,
    color:
      index === 0
        ? "hsl(215, 16%, 65%)"
        : index === 1
          ? "hsl(210, 100%, 50%)"
          : "hsl(262, 83%, 58%)",
  }));
}

function buildOutcomeMetrics(applications = []) {
  const totalApplications = applications.length;

  const autoApprovedCount = applications.filter(
    (app) =>
      normalizeStatus(app.current_status) === "Approved" &&
      normalizeStatus(app.previous_status) === "Under Review",
  ).length;

  const approvedManualCount = applications.filter(
    (app) =>
      normalizeStatus(app.current_status) === "Approved" &&
      normalizeStatus(app.previous_status) === "Under Manual Review",
  ).length;

  const autoRejectedCount = applications.filter(
    (app) =>
      normalizeStatus(app.current_status) === "Auto Rejected" &&
      normalizeStatus(app.previous_status) === "Under Review",
  ).length;

  const withdrawnCount = applications.filter(
    (app) => normalizeStatus(app.current_status) === "Withdrawn",
  ).length;

  const deletedCount = applications.filter(
    (app) => normalizeStatus(app.current_status) === "Deleted",
  ).length;

  const draftCount = applications.filter(
    (app) => normalizeStatus(app.current_status) === "Draft",
  ).length;

  const toRate = (count) =>
    totalApplications > 0
      ? Number(((count / totalApplications) * 100).toFixed(1))
      : 0;

  return {
    totalApplications,
    autoApprovedCount,
    approvedManualCount,
    autoRejectedCount,
    withdrawnCount,
    deletedCount,
    draftCount,
    autoApprovalRate: toRate(autoApprovedCount),
    approvedManualRate: toRate(approvedManualCount),
    autoRejectionRate: toRate(autoRejectedCount),
    withdrawalRate: toRate(withdrawnCount),
    deletionRate: toRate(deletedCount),
    dropoffRate: toRate(draftCount),
  };
}

function buildOutcomeRateChart(metrics) {
  return [
    {
      label: "Auto Approval Rate",
      shortLabel: "Auto Approved",
      rate: metrics.autoApprovalRate,
      count: metrics.autoApprovedCount,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      label: "Approved (Manual) Rate",
      shortLabel: "Approved Manual",
      rate: metrics.approvedManualRate,
      count: metrics.approvedManualCount,
      fill: "hsl(160, 60%, 55%)",
    },
    {
      label: "Auto Rejection Rate",
      shortLabel: "Auto Rejected",
      rate: metrics.autoRejectionRate,
      count: metrics.autoRejectedCount,
      fill: "hsl(0, 84%, 45%)",
    },
    {
      label: "Withdrawal Rate",
      shortLabel: "Withdrawn",
      rate: metrics.withdrawalRate,
      count: metrics.withdrawnCount,
      fill: "hsl(215, 16%, 47%)",
    },
    {
      label: "Deletion Rate",
      shortLabel: "Deleted",
      rate: metrics.deletionRate,
      count: metrics.deletedCount,
      fill: "hsl(240, 5%, 45%)",
    },
  ];
}

function buildSummaryCards(metrics) {
  return [
    {
      title: "Auto Approval Conversion",
      value: `${metrics.autoApprovalRate}%`,
      subtitle: `${metrics.autoApprovedCount} auto-approved from under review`,
    },
    {
      title: "Approved (Manual) Conversion",
      value: `${metrics.approvedManualRate}%`,
      subtitle: `${metrics.approvedManualCount} approved after manual review`,
    },
    {
      title: "Auto Rejection Rate",
      value: `${metrics.autoRejectionRate}%`,
      subtitle: `${metrics.autoRejectedCount} auto-rejected from under review`,
    },
  ];
}

function buildStatusBreakdown(applications = []) {
  const counts = {};

  applications.forEach((app) => {
    const current = normalizeStatus(app.current_status);
    const previous = normalizeStatus(app.previous_status);

    let finalStatus = current;

    if (current === "Approved" && previous === "Under Review") {
      finalStatus = "Auto Approved";
    } else if (
      current === "Approved" &&
      previous === "Under Manual Review"
    ) {
      finalStatus = "Approved (Manual)";
    }

    counts[finalStatus] = (counts[finalStatus] || 0) + 1;
  });

  const preferredOrder = [
    "Draft",
    "Under Manual Review",
    "Requires Action",
    "Auto Approved",
    "Approved (Manual)",
    "Auto Rejected",
    "Rejected",
    "Withdrawn",
    "Deleted",
    "Unknown",
  ];

  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      count,
    }))
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.status);
      const bIndex = preferredOrder.indexOf(b.status);

      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

function buildStatusSummary(statusBreakdown = []) {
  const total = statusBreakdown.reduce((sum, item) => sum + item.count, 0);

  const getCount = (statuses) =>
    statusBreakdown
      .filter((item) => statuses.includes(item.status))
      .reduce((sum, item) => sum + item.count, 0);

  const items = [
    {
      key: "Draft",
      label: "Draft",
      description: "Applications not yet submitted by customers",
      count: getCount(["Draft"]),
      dotClassName: "bg-blue-500",
      textClassName: "text-blue-500",
      rowClassName: "bg-blue-50 border border-neutral-200/70",
      barClassName: "bg-blue-500",
    },
    {
      key: "Under Manual Review",
      label: "Under Manual Review",
      description: "Awaiting staff review and decision",
      count: getCount(["Under Manual Review"]),
      dotClassName: "bg-amber-500",
      textClassName: "text-amber-600",
      rowClassName: "bg-amber-50 border border-amber-100",
      barClassName: "bg-amber-500",
    },
    {
      key: "Requires Action",
      label: "Requires Action",
      description:
        "Waiting for customer to provide required updates or documents",
      count: getCount(["Requires Action"]),
      dotClassName: "bg-rose-500",
      textClassName: "text-rose-600",
      rowClassName: "bg-rose-50 border border-rose-100",
      barClassName: "bg-rose-500",
    },
    {
      key: "Auto Approved",
      label: "Auto Approved",
      description: "Approved directly from automated review",
      count: getCount(["Auto Approved"]),
      dotClassName: "bg-emerald-700",
      textClassName: "text-emerald-700",
      rowClassName: "bg-emerald-50 border border-emerald-100",
      barClassName: "bg-emerald-700",
    },
    {
      key: "Approved (Manual)",
      label: "Approved (Manual)",
      description: "Approved after manual review",
      count: getCount(["Approved (Manual)"]),
      dotClassName: "bg-emerald-500",
      textClassName: "text-emerald-600",
      rowClassName: "bg-emerald-50 border border-emerald-100",
      barClassName: "bg-emerald-500",
    },
    {
      key: "Auto Rejected",
      label: "Auto Rejected",
      description: "Automatically rejected during automated review",
      count: getCount(["Auto Rejected"]),
      dotClassName: "bg-rose-700",
      textClassName: "text-rose-700",
      rowClassName: "bg-rose-50 border border-rose-100",
      barClassName: "bg-rose-700",
    },
    {
      key: "Rejected",
      label: "Rejected",
      description: "Applications manually rejected",
      count: getCount(["Rejected"]),
      dotClassName: "bg-red-500",
      textClassName: "text-red-600",
      rowClassName: "bg-red-50 border border-red-100",
      barClassName: "bg-red-500",
    },
    {
      key: "Withdrawn",
      label: "Withdrawn",
      description: "Applications withdrawn by customers",
      count: getCount(["Withdrawn"]),
      dotClassName: "bg-purple-500",
      textClassName: "text-purple-600",
      rowClassName: "bg-purple-50 border border-purple-100",
      barClassName: "bg-purple-500",
    },
    {
      key: "Deleted",
      label: "Deleted",
      description: "Applications deleted before completion",
      count: getCount(["Deleted"]),
      dotClassName: "bg-zinc-500",
      textClassName: "text-zinc-600",
      rowClassName: "bg-zinc-100 border border-zinc-200",
      barClassName: "bg-zinc-500",
    },
  ];

  return items.map((item) => ({
    ...item,
    percentage:
      total > 0 ? Number(((item.count / total) * 100).toFixed(0)) : 0,
  }));
}

export function PipelineTab({ dateRange, preset }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true);
        const response = await getAllApplications();
        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        setApplications(data);
      } catch (error) {
        console.error("Failed to load pipeline data:", error);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, []);

  const pipelineDescription = useMemo(() => {
    switch (preset) {
      case "last-7":
        return "Onboarding metrics for the last 7 days";
      case "last-30":
        return "Onboarding metrics for the last 30 days";
      case "last-quarter":
        return "Onboarding metrics for the last quarter";
      case "last-year":
        return "Onboarding metrics for the last year";
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          return `Onboarding metrics from ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`;
        }
        return "Onboarding metrics for selected range";
      default:
        return "Onboarding metrics";
    }
  }, [preset, dateRange]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => isWithinDateRange(app, dateRange));
  }, [applications, dateRange]);

  const metrics = useMemo(
    () => buildOutcomeMetrics(filteredApplications),
    [filteredApplications],
  );

  const summaryCards = useMemo(() => buildSummaryCards(metrics), [metrics]);

  const draftDropoffStages = useMemo(
    () => buildDraftDropoff(filteredApplications),
    [filteredApplications],
  );

  const outcomeRateChart = useMemo(
    () => buildOutcomeRateChart(metrics),
    [metrics],
  );

  const statusBreakdown = useMemo(
    () => buildStatusBreakdown(filteredApplications),
    [filteredApplications],
  );

  const statusSummary = useMemo(
    () => buildStatusSummary(statusBreakdown),
    [statusBreakdown],
  );

  const maxDraftDropoffCount = Math.max(
    1,
    ...draftDropoffStages.map((stage) => stage.count),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{pipelineDescription}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <Card key={item.title}>
            <CardContent className="p-4">
              <div className={cn("rounded-xl p-3", item.bg)}>
                <p className="text-xs font-medium text-muted-foreground">
                  {item.title}
                </p>
                <p
                  className={cn("mt-2 text-2xl font-bold tabular-nums", item.tone)}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div>
              <CardTitle className="text-base font-medium">
                Applications by Status
              </CardTitle>
              <CardDescription className="mt-1">
                Current application counts by onboarding status
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="flex h-full w-full">
              {statusSummary.map((item) => (
                <div
                  key={item.key}
                  className={item.barClassName}
                  style={{ width: `${item.percentage}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {statusSummary.map((item) => (
              <div
                key={item.key}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3",
                  item.rowClassName,
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-3 w-3 rounded-full", item.dotClassName)}
                  />

                  <div>
                    <p className={cn("text-sm font-medium", item.textClassName)}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {item.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.percentage}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Draft Drop-off by Stage
            </CardTitle>
            <CardDescription>
              Where incomplete onboarding applications are currently dropping off
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {draftDropoffStages.map((stage) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {stage.stage}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {stage.percentage}%
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {stage.count}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-400/20">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(stage.count / maxDraftDropoffCount) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              ))}

              {draftDropoffStages.every((item) => item.count === 0) ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No draft applications found.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Outcome & Funnel Rates
            </CardTitle>
            <CardDescription>
              Conversion, withdrawal, deletion, and auto-rejection rates across all applications
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ChartContainer
              config={outcomeChartConfig}
              className="h-[280px] w-full"
            >
              <BarChart
                data={outcomeRateChart}
                margin={{ left: 8, right: 8, top: 8 }}
                barCategoryGap={18}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />

                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickMargin={8}
                />

                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => [
                        `${value}%`,
                        item?.payload?.label,
                      ]}
                    />
                  }
                />

                <Bar dataKey="rate" radius={[6, 6, 0, 0]} name="Rate">
                  {outcomeRateChart.map((item) => (
                    <Cell key={item.label} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {outcomeRateChart.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-slate-200 p-3"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {item.rate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} applications
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">
          Loading pipeline data...
        </div>
      ) : null}
    </div>
  );
}