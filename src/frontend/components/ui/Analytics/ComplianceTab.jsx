import { useEffect, useMemo, useState } from "react";
import { Shield, ChevronDown, ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
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
import { Badge } from "../primitives/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../primitives/table";

import { cn } from "@/lib/utils";
import { getAllJob, getAllApplications } from "../../../api/applicationApi";
import { getAllRules } from "../../../api/riskRuleApi";

const ddColors = {
  "Standard CDD": "hsl(var(--status-approved))",
  "Enhanced Due Diligence (EDD)": "hsl(var(--status-in-review))",
  "Simplified CDD": "hsl(var(--status-submitted))",
  "Auto-Rejected": "hsl(var(--destructive))",
};

const ddBgColors = {
  "Standard CDD": "bg-[hsl(var(--status-approved)/0.1)]",
  "Enhanced Due Diligence (EDD)": "bg-[hsl(var(--status-in-review)/0.1)]",
  "Simplified CDD": "bg-[hsl(var(--status-submitted)/0.1)]",
  "Auto-Rejected": "bg-[hsl(var(--destructive)/0.1)]",
};

const ddTextColors = {
  "Standard CDD": "text-[hsl(var(--status-approved))]",
  "Enhanced Due Diligence (EDD)": "text-[hsl(var(--status-in-review))]",
  "Simplified CDD": "text-[hsl(var(--status-submitted))]",
  "Auto-Rejected": "text-[hsl(var(--destructive))]",
};

const ddDescriptions = {
  "Standard CDD": "Low-risk customers with standard checks",
  "Enhanced Due Diligence (EDD)": "High-risk customers requiring deeper review",
  "Simplified CDD": "Very low-risk customers with minimal checks",
  "Auto-Rejected": "Applications automatically rejected during automated review",
};

const categoryBarColorClasses = [
  "bg-[hsl(var(--status-in-progress))]",
  "bg-[hsl(var(--status-submitted))]",
  "bg-[hsl(var(--status-in-review))]",
  "bg-red-500",
  "bg-[hsl(var(--status-approved))]",
  "bg-[hsl(var(--status-requires-action))]",
];

const categoryBadgeColorClasses = [
  "bg-[hsl(var(--status-in-progress)/0.1)] text-[hsl(var(--status-in-progress))] border-[hsl(var(--status-in-progress)/0.2)]",
  "bg-[hsl(var(--status-submitted)/0.1)] text-[hsl(var(--status-submitted))] border-[hsl(var(--status-submitted)/0.2)]",
  "bg-[hsl(var(--status-in-review)/0.1)] text-[hsl(var(--status-in-review))] border-[hsl(var(--status-in-review)/0.2)]",
  "bg-red-500/10 text-red-500 border-red-500/20",
  "bg-[hsl(var(--status-approved)/0.1)] text-[hsl(var(--status-approved))] border-[hsl(var(--status-approved)/0.2)]",
  "bg-[hsl(var(--status-requires-action)/0.1)] text-[hsl(var(--status-requires-action))] border-[hsl(var(--status-requires-action)/0.2)]",
];

const riskScoreBarColors = [
  "hsl(var(--status-submitted))",
  "hsl(var(--status-approved))",
  "hsl(var(--status-in-review))",
  "hsl(var(--status-requires-action))",
  "hsl(var(--destructive))",
];

const riskScoreChartConfig = {
  bucket1: { label: "0-50", color: "hsl(var(--status-submitted))" },
  bucket2: { label: "51-100", color: "hsl(var(--status-approved))" },
  bucket3: { label: "101-150", color: "hsl(var(--status-in-review))" },
  bucket4: { label: "151-200", color: "hsl(var(--status-requires-action))" },
  bucket5: { label: "201+", color: "hsl(var(--destructive))" },
};

const riskScoreVsApprovalChartConfig = {
  approved: { label: "Approved", color: "hsl(var(--status-approved))" },
  rejected: { label: "Rejected", color: "hsl(var(--destructive))" },
};

function normalizeRiskGrade(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "approved") return "Approved";
  if (v === "rejected" || v === "declined") return "Rejected";
  if (v === "under review") return "Under Review";
  if (v === "under manual review") return "Under Manual Review";
  if (v === "requires action" || v === "action required")
    return "Requires Action";
  if (v === "draft") return "Draft";
  if (v === "auto rejected" || v === "auto-rejected") return "Auto Rejected";

  return String(value || "").trim() || "Unknown";
}

function formatCategoryDisplayName(category) {
  const raw = String(category || "").trim();

  if (!raw) return "Uncategorized";

  if (raw === raw.toUpperCase() && raw.length <= 4) {
    return raw;
  }

  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function classifyDueDiligence(reviewJobs, applications) {
  const counts = {
    "Standard CDD": 0,
    "Enhanced Due Diligence (EDD)": 0,
    "Simplified CDD": 0,
    "Auto-Rejected": 0,
  };

  const applicationMap = new Map(
    applications.map((app) => [app.application_id, app]),
  );

  reviewJobs.forEach((job) => {
    if (job.status !== "COMPLETED") return;

    const app = applicationMap.get(job.application_id);
    const currentStatus = normalizeStatus(app?.current_status);
    const previousStatus = normalizeStatus(app?.previous_status);
    const riskGrade = normalizeRiskGrade(job.risk_grade);

    if (currentStatus === "Approved" && previousStatus === "Under Review") {
      counts["Simplified CDD"] += 1;
      return;
    }

    if (currentStatus === "Auto Rejected") {
      counts["Auto-Rejected"] += 1;
      return;
    }

    if (
      riskGrade === "enhanced due diligence (edd)" ||
      riskGrade === "edd"
    ) {
      counts["Enhanced Due Diligence (EDD)"] += 1;
      return;
    }

    if (
      riskGrade === "standard due diligence (cdd)" ||
      riskGrade === "standard cdd" ||
      riskGrade === "cdd"
    ) {
      counts["Standard CDD"] += 1;
      return;
    }

    counts["Standard CDD"] += 1;
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return [
    {
      type: "Standard CDD",
      count: counts["Standard CDD"],
      percentage:
        total > 0
          ? Number(((counts["Standard CDD"] / total) * 100).toFixed(1))
          : 0,
      description: ddDescriptions["Standard CDD"],
    },
    {
      type: "Enhanced Due Diligence (EDD)",
      count: counts["Enhanced Due Diligence (EDD)"],
      percentage:
        total > 0
          ? Number(
              ((counts["Enhanced Due Diligence (EDD)"] / total) * 100).toFixed(1),
            )
          : 0,
      description: ddDescriptions["Enhanced Due Diligence (EDD)"],
    },
    {
      type: "Simplified CDD",
      count: counts["Simplified CDD"],
      percentage:
        total > 0
          ? Number(((counts["Simplified CDD"] / total) * 100).toFixed(1))
          : 0,
      description: ddDescriptions["Simplified CDD"],
    },
    {
      type: "Auto-Rejected",
      count: counts["Auto-Rejected"],
      percentage:
        total > 0
          ? Number(((counts["Auto-Rejected"] / total) * 100).toFixed(1))
          : 0,
      description: ddDescriptions["Auto-Rejected"],
    },
  ];
}

function normalizeRuleCategories(riskRulesPayload) {
  if (!riskRulesPayload?.categories) return [];

  return riskRulesPayload.categories.map((categoryBlock) => ({
    category: String(categoryBlock.category || "UNCATEGORIZED").trim(),
    totalRules: Number(categoryBlock.total_rules || 0),
    activeRules: Number(categoryBlock.active_rules || 0),
    inactiveRules: Number(categoryBlock.inactive_rules || 0),
    rules: (categoryBlock.rules || []).map((rule) => ({
      rule_id: rule.rule_id,
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description,
      status: rule.is_active ? "active" : "inactive",
    })),
  }));
}

function getTopTriggeredRules(reviewJobs, topN = 6) {
  const completedJobs = reviewJobs.filter(
    (job) =>
      job.status === "COMPLETED" &&
      Array.isArray(job.rules_triggered) &&
      job.rules_triggered.length > 0,
  );

  const ruleMap = new Map();
  let totalTriggeredOccurrences = 0;

  completedJobs.forEach((job) => {
    job.rules_triggered.forEach((rule) => {
      const code = String(rule.code || "").trim();
      const description = String(rule.description || "").trim();

      if (!code) return;

      totalTriggeredOccurrences += 1;

      if (!ruleMap.has(code)) {
        ruleMap.set(code, {
          code,
          rule: description || code,
          triggered: 0,
        });
      }

      ruleMap.get(code).triggered += 1;
    });
  });

  return Array.from(ruleMap.values())
    .map((rule) => ({
      ...rule,
      percentage:
        totalTriggeredOccurrences > 0
          ? Number(
              ((rule.triggered / totalTriggeredOccurrences) * 100).toFixed(1),
            )
          : 0,
    }))
    .sort((a, b) => b.triggered - a.triggered)
    .slice(0, topN);
}

function getRiskBucket(score) {
  const value = Number(score);

  if (Number.isNaN(value)) return null;
  if (value <= 50) return "0-50";
  if (value <= 100) return "51-100";
  if (value <= 150) return "101-150";
  if (value <= 200) return "151-200";
  return "201+";
}

function getRiskScoreDistribution(reviewJobs) {
  const buckets = {
    "0-50": 0,
    "51-100": 0,
    "101-150": 0,
    "151-200": 0,
    "201+": 0,
  };

  reviewJobs.forEach((job) => {
    if (job.status !== "COMPLETED") return;

    const bucket = getRiskBucket(job.risk_score);
    if (!bucket) return;

    buckets[bucket] += 1;
  });

  const total = Object.values(buckets).reduce((sum, count) => sum + count, 0);

  return Object.entries(buckets).map(([range, count]) => ({
    range,
    count,
    percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  }));
}

function getRiskScoreVsApproval(reviewJobs, applications) {
  const applicationMap = new Map(
    applications.map((app) => [app.application_id, app]),
  );

  const approvalBuckets = {
    "0-50": { approved: 0, rejected: 0 },
    "51-100": { approved: 0, rejected: 0 },
    "101-150": { approved: 0, rejected: 0 },
    "151-200": { approved: 0, rejected: 0 },
    "201+": { approved: 0, rejected: 0 },
  };

  reviewJobs.forEach((job) => {
    if (job.status !== "COMPLETED") return;

    const bucket = getRiskBucket(job.risk_score);
    if (!bucket) return;

    const app = applicationMap.get(job.application_id);
    if (!app) return;

    const status = normalizeStatus(app.current_status);
    if (status !== "Approved" && status !== "Rejected") return;

    if (status === "Approved") {
      approvalBuckets[bucket].approved += 1;
    } else if (status === "Rejected") {
      approvalBuckets[bucket].rejected += 1;
    }
  });

  return Object.entries(approvalBuckets).map(([range, values]) => {
    const total = values.approved + values.rejected;

    return {
      range,
      approved: values.approved,
      rejected: values.rejected,
      approvalRate:
        total > 0 ? Number(((values.approved / total) * 100).toFixed(1)) : 0,
      rejectedRate:
        total > 0 ? Number(((values.rejected / total) * 100).toFixed(1)) : 0,
    };
  });
}

export function ComplianceTab() {
  const [reviewJobs, setReviewJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [ruleCategories, setRuleCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [reviewJobsData, applicationsData, riskRulesData] =
          await Promise.all([getAllJob(), getAllApplications(), getAllRules()]);

        if (!mounted) return;

        setReviewJobs(
          Array.isArray(reviewJobsData)
            ? reviewJobsData
            : Array.isArray(reviewJobsData?.data)
              ? reviewJobsData.data
              : [],
        );

        setApplications(
          Array.isArray(applicationsData)
            ? applicationsData
            : Array.isArray(applicationsData?.data)
              ? applicationsData.data
              : [],
        );

        setRuleCategories(normalizeRuleCategories(riskRulesData));
      } catch (err) {
        console.error("Failed to load compliance tab data:", err);
        if (!mounted) return;
        setError("Failed to load compliance data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const dueDiligenceBreakdown = useMemo(() => {
    return classifyDueDiligence(reviewJobs, applications);
  }, [reviewJobs, applications]);

  const selectedCategory = useMemo(() => {
    return (
      ruleCategories.find((item) => item.category === expandedCategory) || null
    );
  }, [ruleCategories, expandedCategory]);

  const topTriggeredRules = useMemo(() => {
    return getTopTriggeredRules(reviewJobs, 6);
  }, [reviewJobs]);

  const riskScoreDistribution = useMemo(() => {
    return getRiskScoreDistribution(reviewJobs);
  }, [reviewJobs]);

  const riskScoreVsApproval = useMemo(() => {
    return getRiskScoreVsApproval(reviewJobs, applications);
  }, [reviewJobs, applications]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Shield className="h-4 w-4 text-primary" />
            Rules by Category
          </CardTitle>
          <CardDescription>
            Active and inactive rules grouped by category
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ruleCategories.map((cat, index) => (
              <div
                key={cat.category}
                className="cursor-pointer rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === cat.category ? null : cat.category,
                  )
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "border text-xs font-medium",
                      categoryBadgeColorClasses[
                        index % categoryBadgeColorClasses.length
                      ],
                    )}
                  >
                    {formatCategoryDisplayName(cat.category)}
                  </Badge>

                  {expandedCategory === cat.category ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="tabular-nums text-2xl font-bold text-foreground">
                      {cat.totalRules}
                    </span>
                    <span className="text-xs text-muted-foreground">rules</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-[hsl(var(--status-approved))]">
                      {cat.activeRules} active
                    </span>
                    <span>·</span>
                    <span>{cat.inactiveRules} inactive</span>
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      categoryBarColorClasses[
                        index % categoryBarColorClasses.length
                      ],
                    )}
                    style={{
                      width: `${
                        cat.totalRules > 0
                          ? (cat.activeRules / cat.totalRules) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedCategory ? (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-200/50">
                    <TableHead className="text-xs font-semibold">
                      Rule Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Rule Code
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {selectedCategory.rules.map((rule) => (
                    <TableRow key={rule.rule_id} className="hover:bg-muted/30">
                      <TableCell className="text-sm font-medium text-foreground">
                        {rule.rule_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.rule_code}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border text-[10px] font-medium",
                            rule.status === "active"
                              ? "bg-[hsl(var(--status-approved)/0.1)] text-[hsl(var(--status-approved))] border-[hsl(var(--status-approved)/0.2)]"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {rule.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {selectedCategory.rules.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        No rules found in this category.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {loading ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Loading risk rules...
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Shield className="h-4 w-4 text-primary" />
              Due Diligence Breakdown
            </CardTitle>
            <CardDescription>
              EDD, Standard CDD, Simplified CDD, and Auto-Rejected distribution
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-5 flex h-5 overflow-hidden rounded-full">
              {dueDiligenceBreakdown.map((dd) => (
                <div
                  key={dd.type}
                  className="h-full transition-all"
                  style={{
                    width: `${dd.percentage}%`,
                    backgroundColor: ddColors[dd.type],
                  }}
                />
              ))}
            </div>

            <div className="space-y-3">
              {dueDiligenceBreakdown.map((dd) => (
                <div
                  key={dd.type}
                  className={cn(
                    "flex items-center justify-between rounded-lg p-3",
                    ddBgColors[dd.type],
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: ddColors[dd.type] }}
                    />
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          ddTextColors[dd.type],
                        )}
                      >
                        {dd.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dd.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="tabular-nums text-lg font-bold text-foreground">
                      {dd.count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dd.percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {loading ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Loading review jobs...
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Top Triggered Risk Rules
            </CardTitle>
            <CardDescription>
              Most frequently activated risk detection rules
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {topTriggeredRules.map((rule) => (
                <div
                  key={rule.code}
                  className="flex items-center gap-4 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {rule.rule}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${rule.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="tabular-nums text-sm font-semibold text-foreground">
                      {rule.triggered}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rule.percentage}%
                    </p>
                  </div>
                </div>
              ))}

              {topTriggeredRules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No triggered rule data found.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Risk Score Distribution
            </CardTitle>
            <CardDescription>
              Distribution of completed review jobs by risk score range
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-center">
              <div className="mx-auto w-full max-w-[220px]">
                <ChartContainer
                  config={riskScoreChartConfig}
                  className="h-[220px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={riskScoreDistribution}
                      dataKey="count"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="transparent"
                    >
                      {riskScoreDistribution.map((entry, index) => (
                        <Cell
                          key={entry.range}
                          fill={
                            riskScoreBarColors[index % riskScoreBarColors.length]
                          }
                        />
                      ))}
                    </Pie>

                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => [
                            item?.payload?.range,
                            `: ${value} jobs`,
                          ]}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="space-y-3">
                {riskScoreDistribution.map((bucket, index) => (
                  <div
                    key={bucket.range}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            riskScoreBarColors[
                              index % riskScoreBarColors.length
                            ],
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {bucket.range}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Risk score bucket
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="tabular-nums text-lg font-bold text-foreground">
                        {bucket.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bucket.percentage}%
                      </p>
                    </div>
                  </div>
                ))}

                {riskScoreDistribution.every((bucket) => bucket.count === 0) ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No risk score distribution data found.
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Risk Score vs Approval
            </CardTitle>
            <CardDescription>
              Approved vs rejected outcomes by risk score range
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ChartContainer
              config={riskScoreVsApprovalChartConfig}
              className="h-[320px] w-full"
            >
              <BarChart
                data={riskScoreVsApproval}
                barCategoryGap={18}
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />

                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  tickMargin={8}
                />

                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        name === "approved" ? "Approved: " : "Rejected: ",
                        `${value}`,
                      ]}
                    />
                  }
                />

                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">
                      {value === "approved" ? "Approved" : "Rejected"}
                    </span>
                  )}
                />

                <Bar
                  dataKey="approved"
                  name="approved"
                  fill="var(--color-approved)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />

                <Bar
                  dataKey="rejected"
                  name="rejected"
                  fill="var(--color-rejected)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}