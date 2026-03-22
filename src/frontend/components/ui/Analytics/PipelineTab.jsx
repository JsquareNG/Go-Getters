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
  if (v === "pending") return "Pending";
  if (v === "under review") return "Under Review";
  if (v === "under manual review") return "Under Manual Review";
  if (v === "requires action" || v === "action required")
    return "Requires Action";
  if (v === "approved") return "Approved";
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

  if (!v) return "Started";
  if (["start", "started", "landing"].includes(v)) return "Started";

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

  if (
    [
      "step4",
      "step 4",
      "review",
      "review & submit",
      "submit",
      "confirmation",
    ].includes(v)
  ) {
    return "Review & Submit";
  }

  return String(value)
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferDraftStage(app) {
  const payload = getPayload(app);

  const rawStage =
    payload.currentStep ??
    payload.current_step ??
    payload.draftStep ??
    payload.draft_stage ??
    payload.onboardingStage ??
    payload.onboarding_stage ??
    payload.lastCompletedStep ??
    payload.last_completed_step ??
    payload.step;

  if (typeof rawStage === "number") {
    if (rawStage <= 0) return "Started";
    if (rawStage === 1) return "Basic Information";
    if (rawStage === 2) return "Business Details";
    if (rawStage === 3) return "Document Upload";
    return "Review & Submit";
  }

  return normalizeStageLabel(rawStage);
}

function buildPipelineStages(applications = []) {
  const counts = {
    Draft: 0,
    "Under Review": 0,
    "Under Manual Review": 0,
    "Requires Action": 0,
    Approved: 0,
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
  { stage: "Draft", color: "hsl(217, 91%, 60%)" },            // blue-500
  { stage: "Under Manual Review", color: "hsl(38, 92%, 50%)" }, // amber-500
  { stage: "Requires Action", color: "hsl(348, 83%, 47%)" },  // rose-600
  { stage: "Approved", color: "hsl(160, 84%, 39%)" },         // emerald-400 (approx adjusted for charts)
  { stage: "Rejected", color: "hsl(0, 84%, 60%)" },           // red-500
  { stage: "Withdrawn", color: "hsl(262, 83%, 58%)" },        // violet-500
  { stage: "Deleted", color: "hsl(215, 16%, 47%)" },          // slate-500
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
    Started: 0,
    "Basic Information": 0,
    "Business Details": 0,
    "Document Upload": 0,
    "Review & Submit": 0,
  };

  draftApps.forEach((app) => {
    const stage = inferDraftStage(app);
    if (counts[stage] !== undefined) {
      counts[stage] += 1;
    } else {
      counts.Started += 1;
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
          : index === 2
            ? "hsl(262, 83%, 58%)"
            : index === 3
              ? "hsl(38, 92%, 50%)"
              : "hsl(351, 85%, 49%)",
  }));
}

function buildOutcomeMetrics(applications = []) {
  const totalApplications = applications.length;

  const approvedNoManualReview = applications.filter(
    (app) =>
      normalizeStatus(app.current_status) === "Approved" &&
      normalizeStatus(app.previous_status) === "Under Review",
  ).length;

  const approvedAfterManualReview = applications.filter(
    (app) =>
      normalizeStatus(app.current_status) === "Approved" &&
      normalizeStatus(app.previous_status) === "Under Manual Review",
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
    approvedNoManualReview,
    approvedAfterManualReview,
    withdrawnCount,
    deletedCount,
    draftCount,
    approvedNoManualReviewRate: toRate(approvedNoManualReview),
    approvedAfterManualReviewRate: toRate(approvedAfterManualReview),
    withdrawalRate: toRate(withdrawnCount),
    deletionRate: toRate(deletedCount),
    dropoffRate: toRate(draftCount),
  };
}

function buildOutcomeRateChart(metrics) {
  return [
    {
      label: "Approved (No Manual Review)",
      shortLabel: "No Manual",
      rate: metrics.approvedNoManualReviewRate,
      count: metrics.approvedNoManualReview,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      label: "Approved (After Manual Review)",
      shortLabel: "Manual Review",
      rate: metrics.approvedAfterManualReviewRate,
      count: metrics.approvedAfterManualReview,
      fill: "hsl(38, 92%, 50%)",
    },
    {
      label: "Withdrawal Rate",
      shortLabel: "Withdrawn",
      rate: metrics.withdrawalRate,
      count: metrics.withdrawnCount,
      fill: "hsl(285, 60%, 55%)",
    },
    {
      label: "Deletion Rate",
      shortLabel: "Deleted",
      rate: metrics.deletionRate,
      count: metrics.deletedCount,
      fill: "hsl(0, 0%, 55%)",
    },
  ];
}

function buildSummaryCards(metrics) {
  return [
    {
      title: "Auto Approval Conversion",
      value: `${metrics.approvedNoManualReviewRate}%`,
      subtitle: `${metrics.approvedNoManualReview} approved directly`,
      tone: "text-[hsl(142,71%,45%)]",
      bg: "bg-[hsl(142,71%,45%,0.08)]",
    },
    {
      title: "Manual Review Conversion",
      value: `${metrics.approvedAfterManualReviewRate}%`,
      subtitle: `${metrics.approvedAfterManualReview} approved after manual review`,
      tone: "text-[hsl(38,92%,50%)]",
      bg: "bg-[hsl(38,92%,50%,0.08)]",
    },
    {
      title: "Draft Drop-off Rate",
      value: `${metrics.dropoffRate}%`,
      subtitle: `${metrics.draftCount} draft applications`,
      tone: "text-[hsl(262,83%,58%)]",
      bg: "bg-[hsl(262,83%,58%,0.08)]",
    },
    {
      title: "Withdrawal Rate",
      value: `${metrics.withdrawalRate}%`,
      subtitle: `${metrics.withdrawnCount} withdrawn applications`,
      tone: "text-[hsl(285,60%,55%)]",
      bg: "bg-[hsl(285,60%,55%,0.08)]",
    },
    {
      title: "Deleted Applications",
      value: metrics.deletedCount,
      subtitle: `${metrics.deletionRate}% deletion rate`,
      tone: "text-[hsl(0,0%,35%)]",
      bg: "bg-[hsl(0,0%,55%,0.08)]",
    },
  ];
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

  const pipelineStages = useMemo(
    () => buildPipelineStages(filteredApplications),
    [filteredApplications],
  );

  const draftDropoffStages = useMemo(
    () => buildDraftDropoff(filteredApplications),
    [filteredApplications],
  );

  const outcomeRateChart = useMemo(
    () => buildOutcomeRateChart(metrics),
    [metrics],
  );

  const maxPipelineCount = Math.max(
    1,
    ...pipelineStages.map((stage) => stage.count),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Current Pipeline
          </CardTitle>
          <CardDescription>
            Applications grouped by current onboarding status
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {pipelineStages.map((stage) => (
              <div key={stage.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {stage.stage}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {stage.count}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-400/20">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(stage.count / maxPipelineCount) * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
              </div>
            ))}

            {loading ? (
              <p className="text-xs text-muted-foreground">
                Loading pipeline data...
              </p>
            ) : null}
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
              Conversion, withdrawal, and deletion rates across all applications
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
    </div>
  );
}