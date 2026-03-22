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
import { KPICard } from "./KPICard";
import {
  FileText,
  CheckCircle2,
  TrendingUp,
  Users,
  ChartNoAxesColumn,
} from "lucide-react";
import { getAllApplications } from "../../../api/applicationApi";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const trendChartConfig = {
  applications: { label: "Applications", color: "hsl(210, 100%, 50%)" },
  approved: { label: "Approved", color: "hsl(142, 71%, 45%)" },
  rejected: { label: "Rejected", color: "hsl(0, 84%, 60%)" },
};

const industryChartConfig = {
  count: { label: "Applications", color: "hsl(210, 100%, 50%)" },
};

const COUNTRY_COLORS = ["hsl(351, 85%, 49%)", "hsl(210, 100%, 50%)"];

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
  return safeParseJson(app.form_data);
}

function getStatus(app) {
  return app.current_status || "";
}

function getCreatedAt(app) {
  return app.created_at || app.updated_at || null;
}

function normalizeCountry(value) {
  if (!value) return "Unknown";
  const v = String(value).trim().toLowerCase();

  if (v === "sg" || v === "singapore") return "Singapore";
  if (v === "id" || v === "indonesia") return "Indonesia";

  return String(value).trim();
}

function normalizeStatus(value) {
  if (!value) return "Unknown";

  const v = String(value).trim().toLowerCase();

  if (v === "draft") return "Draft";
  if (v === "pending") return "Pending";
  if (v === "under review" || v === "under manual review")
    return "Under Manual Review";
  if (v === "requires action" || v === "action required")
    return "Requires Action";
  if (v === "approved") return "Approved";
  if (v === "rejected" || v === "declined") return "Rejected";
  if (v === "withdrawn") return "Withdrawn";
  if (v === "deleted") return "Deleted";

  return String(value).trim();
}

function formatBusinessType(value) {
  if (!value) return "Unknown";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isWithinDateRange(app, dateRange) {
  if (!dateRange?.from && !dateRange?.to) return true;

  const createdAt = getCreatedAt(app);
  if (!createdAt) return false;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;

  if (dateRange?.from && date < dateRange.from) return false;
  if (dateRange?.to && date > dateRange.to) return false;

  return true;
}

function buildIndustryBreakdown(applications = []) {
  const counts = {};
  let total = 0;

  applications.forEach((app) => {
    const payload = getPayload(app);
    const industry =
      String(payload.businessIndustry || "Unknown").trim() || "Unknown";

    counts[industry] = (counts[industry] || 0) + 1;
    total += 1;
  });

  return Object.entries(counts)
    .map(([industry, count]) => ({
      industry,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildCountryBreakdown(applications = []) {
  const counts = {};
  const approvedCounts = {};
  let total = 0;

  applications.forEach((app) => {
    const payload = getPayload(app);
    const country = normalizeCountry(payload.country);
    const status = String(getStatus(app)).toLowerCase();

    counts[country] = (counts[country] || 0) + 1;

    if (status === "approved") {
      approvedCounts[country] = (approvedCounts[country] || 0) + 1;
    }

    total += 1;
  });

  return Object.entries(counts)
    .map(([country, applicationsCount]) => ({
      code: country,
      country,
      applications: applicationsCount,
      approved: approvedCounts[country] || 0,
      percentage:
        total > 0 ? Number(((applicationsCount / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.applications - a.applications);
}

function buildBusinessTypeBreakdown(applications = []) {
  const countryTotals = {};
  const grouped = {};

  applications.forEach((app) => {
    const payload = getPayload(app);
    const country = normalizeCountry(payload.country);
    const type = formatBusinessType(payload.businessType);

    countryTotals[country] = (countryTotals[country] || 0) + 1;

    const key = `${country}__${type}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([key, count]) => {
      const [country, type] = key.split("__");
      const totalForCountry = countryTotals[country] || 0;

      return {
        country,
        type,
        count,
        percentage:
          totalForCountry > 0
            ? Number(((count / totalForCountry) * 100).toFixed(1))
            : 0,
      };
    })
    .sort((a, b) => {
      if (a.country === b.country) return b.count - a.count;
      return a.country.localeCompare(b.country);
    });
}

function buildDailyTrends(applications = [], dateRange) {
  const dayMap = new Map();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate;
  let endDate;

  if (dateRange?.from || dateRange?.to) {
    startDate = dateRange?.from ? new Date(dateRange.from) : new Date(today);
    endDate = dateRange?.to ? new Date(dateRange.to) : new Date(today);
  } else {
    endDate = new Date(today);
    startDate = new Date(today);
    startDate.setDate(endDate.getDate() - 29);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const key = cursor.toISOString().split("T")[0];

    dayMap.set(key, {
      date: key,
      day: cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      applications: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
      sortDate: cursor.getTime(),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  applications.forEach((app) => {
    const createdAt = getCreatedAt(app);
    if (!createdAt) return;

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return;

    date.setHours(0, 0, 0, 0);

    if (date < startDate || date > endDate) return;

    const key = date.toISOString().split("T")[0];
    const status = String(getStatus(app)).toLowerCase();

    if (!dayMap.has(key)) return;

    const row = dayMap.get(key);
    row.applications += 1;

    if (status === "approved") row.approved += 1;
    if (status === "rejected" || status === "declined") row.rejected += 1;
    if (status === "withdrawn") row.withdrawn += 1;
  });

  return Array.from(dayMap.values())
    .sort((a, b) => a.sortDate - b.sortDate)
    .map(({ sortDate, ...rest }) => rest);
}

function buildOverviewKPIs(applications = []) {
  const totalApplications = applications.length;

  const approved = applications.filter(
    (app) => String(getStatus(app)).toLowerCase() === "approved",
  ).length;

  const pendingReview = applications.filter((app) =>
    ["pending", "under review", "under manual review"].includes(
      String(getStatus(app)).toLowerCase(),
    ),
  ).length;

  const requiresAction = applications.filter((app) =>
    ["requires action", "action required"].includes(
      String(getStatus(app)).toLowerCase(),
    ),
  ).length;

  const rejected = applications.filter((app) =>
    ["rejected", "declined"].includes(String(getStatus(app)).toLowerCase()),
  ).length;

  const approvalRate =
    totalApplications > 0
      ? Number(((approved / totalApplications) * 100).toFixed(1))
      : 0;

  const conversionRate =
    totalApplications > 0
      ? Number((((approved + rejected) / totalApplications) * 100).toFixed(1))
      : 0;

  return {
    totalApplications,
    totalApplicationsTrend: 0,
    approvalRate,
    approvalRateTrend: 0,
    avgProcessingDays: 0,
    avgProcessingDaysTrend: 0,
    pendingReview,
    pendingReviewTrend: 0,
    requiresAction,
    requiresActionTrend: 0,
    conversionRate,
    conversionRateTrend: 0,
  };
}

function buildStatusBreakdown(applications = []) {
  const counts = {};

  applications.forEach((app) => {
    const status = normalizeStatus(app.current_status);
    counts[status] = (counts[status] || 0) + 1;
  });

  const preferredOrder = [
    "Draft",
    "Pending",
    "Under Manual Review",
    "Requires Action",
    "Approved",
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

      const safeA = aIndex === -1 ? 999 : aIndex;
      const safeB = bIndex === -1 ? 999 : bIndex;

      return safeA - safeB;
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
      dotClassName: "bg-neutral-500",
      textClassName: "text-neutral-600",
      rowClassName: "bg-neutral-50 border border-neutral-200/70",
      barClassName: "bg-neutral-500",
    },
    {
      key: "Under Manual Review",
      label: "Under Manual Review",
      description: "Awaiting staff review and decision",
      count: getCount(["Pending", "Under Manual Review", "Requires Action"]),
      dotClassName: "bg-amber-500",
      textClassName: "text-amber-600",
      rowClassName: "bg-amber-50 border border-amber-100",
      barClassName: "bg-amber-500",
    },
    {
      key: "Approved",
      label: "Approved",
      description: "Successfully onboarded accounts",
      count: getCount(["Approved"]),
      dotClassName: "bg-emerald-600",
      textClassName: "text-emerald-600",
      rowClassName: "bg-emerald-50 border border-emerald-100",
      barClassName: "bg-emerald-600",
    },
    {
      key: "Rejected",
      label: "Rejected",
      description: "Applications that did not meet requirements",
      count: getCount(["Rejected"]),
      dotClassName: "bg-red-500",
      textClassName: "text-red-600",
      rowClassName: "bg-red-50 border border-red-100",
      barClassName: "bg-red-500",
    },
  ];

  return items.map((item) => ({
    ...item,
    percentage:
      total > 0 ? Number(((item.count / total) * 100).toFixed(0)) : 0,
  }));
}

export function OverviewTab({ dateRange, preset }) {
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await getAllApplications();
        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        console.log("applications response", data);
        console.log("first row", data[0]);
        console.log("first form_data", data[0]?.form_data);

        setApplications(data);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
        setApplications([]);
      }
    };

    fetchApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => isWithinDateRange(app, dateRange));
  }, [applications, dateRange]);

  const trendDescription = useMemo(() => {
    switch (preset) {
      case "last-7":
        return "Applications, approvals, and rejections for the last 7 days";
      case "last-30":
        return "Applications, approvals, and rejections for the last 30 days";
      case "last-quarter":
        return "Applications, approvals, and rejections for the last quarter";
      case "last-year":
        return "Applications, approvals, and rejections for the last year";
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          return `Applications, approvals, and rejections from ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`;
        }
        return "Applications, approvals, and rejections for the selected custom range";
      default:
        return "Applications, approvals, and rejections over time";
    }
  }, [preset, dateRange]);

  const overviewKPIs = useMemo(
    () => buildOverviewKPIs(filteredApplications),
    [filteredApplications],
  );

  const dailyTrends = useMemo(
    () => buildDailyTrends(filteredApplications, dateRange),
    [filteredApplications, dateRange],
  );

  const countryBreakdown = useMemo(
    () => buildCountryBreakdown(filteredApplications),
    [filteredApplications],
  );

  const industryBreakdown = useMemo(
    () => buildIndustryBreakdown(filteredApplications),
    [filteredApplications],
  );

  const businessTypeBreakdown = useMemo(
    () => buildBusinessTypeBreakdown(filteredApplications),
    [filteredApplications],
  );

  const statusBreakdown = useMemo(
    () => buildStatusBreakdown(filteredApplications),
    [filteredApplications],
  );

  const statusSummary = useMemo(
    () => buildStatusSummary(statusBreakdown),
    [statusBreakdown],
  );

  const filteredBusinessTypes =
    selectedCountry === "All"
      ? businessTypeBreakdown
      : businessTypeBreakdown.filter((b) => b.country === selectedCountry);

  const countryChartConfig = {
    Singapore: { label: "Singapore", color: COUNTRY_COLORS[0] },
    Indonesia: { label: "Indonesia", color: COUNTRY_COLORS[1] },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <KPICard
          icon={<FileText className="h-5 w-5" />}
          title="Total Applications"
          value={overviewKPIs.totalApplications.toLocaleString()}
          trend={overviewKPIs.totalApplicationsTrend}
          trendLabel="vs last quarter"
        />
        <KPICard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Approval Rate"
          value={overviewKPIs.approvalRate}
          suffix="%"
          trend={overviewKPIs.approvalRateTrend}
          trendLabel="vs last quarter"
        />
        <KPICard
          icon={<Users className="h-5 w-5" />}
          title="Pending Review"
          value={overviewKPIs.pendingReview}
          trend={overviewKPIs.pendingReviewTrend}
          trendLabel="vs last week"
        />
        <KPICard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Conversion Rate"
          value={overviewKPIs.conversionRate}
          suffix="%"
          trend={overviewKPIs.conversionRateTrend}
          trendLabel="vs last quarter"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Application Volume Trend
          </CardTitle>
          <CardDescription>{trendDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={trendChartConfig}
            className="h-[300px] w-full"
          >
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-approved)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-approved)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="gradApplications"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                minTickGap={24}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="var(--color-applications)"
                fill="url(#gradApplications)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="approved"
                stroke="var(--color-approved)"
                fill="url(#gradApproved)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="rejected"
                stroke="var(--color-rejected)"
                fill="transparent"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-muted p-2 text-muted-foreground">
                <ChartNoAxesColumn className="h-5 w-5" />
              </div>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Applications by Country
            </CardTitle>
            <CardDescription>
              Geographic distribution of SME onboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={countryChartConfig}
              className="h-[260px] w-full"
            >
              <PieChart>
                <Pie
                  data={countryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="applications"
                  nameKey="country"
                  paddingAngle={4}
                >
                  {countryBreakdown.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        COUNTRY_COLORS[index] || `hsl(${index * 60}, 70%, 50%)`
                      }
                    />
                  ))}
                </Pie>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="country" />}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {countryBreakdown.map((c) => (
                <div
                  key={c.code}
                  className="space-y-1 rounded-lg bg-slate-300/50 p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {c.country}
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {c.applications}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.approved} approved (
                    {c.applications > 0
                      ? ((c.approved / c.applications) * 100).toFixed(1)
                      : "0.0"}
                    %)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Business Type Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of entity types by incorporation country
                </CardDescription>
              </div>
              <div className="flex gap-1.5">
                {["All", "Singapore", "Indonesia"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedCountry(filter)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selectedCountry === filter
                        ? "border-transparent bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filteredBusinessTypes.map((bt) => (
                <div
                  key={`${bt.country}-${bt.type}`}
                  className="space-y-1 rounded-lg border bg-muted/30 p-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {bt.country === "Singapore"
                      ? "🇸🇬"
                      : bt.country === "Indonesia"
                        ? "🇮🇩"
                        : "🌍"}{" "}
                    {bt.country}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {bt.type}
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {bt.count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bt.percentage}% of {bt.country} total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Industry Breakdown
            </CardTitle>
            <CardDescription>
              Applications segmented by business industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={industryChartConfig}
              className="h-[380px] w-full"
            >
              <BarChart
                data={industryBreakdown}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  dataKey="industry"
                  type="category"
                  width={140}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Applications">
                  {industryBreakdown.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`hsl(210, ${90 - i * 8}%, ${45 + i * 4}%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}