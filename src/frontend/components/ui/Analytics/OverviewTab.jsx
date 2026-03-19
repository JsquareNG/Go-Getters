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
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
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

const statusChartConfig = {
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

function buildMonthlyTrends(applications = []) {
  const monthMap = new Map();

  applications.forEach((app) => {
    const createdAt = getCreatedAt(app);
    if (!createdAt) return;

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return;

    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthLabel = date.toLocaleString("en-US", { month: "short" });
    const status = String(getStatus(app)).toLowerCase();

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthLabel,
        applications: 0,
        approved: 0,
        rejected: 0,
        withdrawn: 0,
        sortDate: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
      });
    }

    const row = monthMap.get(monthKey);
    row.applications += 1;

    if (status === "approved") row.approved += 1;
    if (status === "rejected" || status === "declined") row.rejected += 1;
    if (status === "withdrawn") row.withdrawn += 1;
  });

  return Array.from(monthMap.values())
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(-12)
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

  const monthlyTrends = useMemo(
    () => buildMonthlyTrends(filteredApplications),
    [filteredApplications],
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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
            <AreaChart data={monthlyTrends}>
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
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Applications by Status
          </CardTitle>
          <CardDescription>
            Current application counts by onboarding status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={statusChartConfig} className="h-[300px] w-full">
            <BarChart data={statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Applications">
                {statusBreakdown.map((item) => (
                  <Cell
                    key={item.status}
                    fill={
                      item.status === "Approved"
                        ? "hsl(142, 71%, 45%)"
                        : item.status === "Rejected"
                          ? "hsl(0, 84%, 60%)"
                          : item.status === "Under Manual Review"
                            ? "hsl(38, 92%, 50%)"
                            : item.status === "Requires Action"
                              ? "hsl(210, 100%, 50%)"
                              : item.status === "Withdrawn"
                                ? "hsl(270, 60%, 55%)"
                                : item.status === "Draft"
                                  ? "hsl(215, 16%, 65%)"
                                  : item.status === "Pending"
                                    ? "hsl(200, 80%, 60%)"
                                    : item.status === "Deleted"
                                      ? "hsl(0, 0%, 55%)"
                                      : "hsl(215, 16%, 65%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <ChartContainer config={countryChartConfig} className="h-[260px] w-full">
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
                      fill={COUNTRY_COLORS[index] || `hsl(${index * 60}, 70%, 50%)`}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="country" />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {countryBreakdown.map((c) => (
                <div
                  key={c.code}
                  className="p-3 rounded-lg bg-slate-300/50 space-y-1"
                >
                  <p className="text-sm font-medium text-foreground">{c.country}</p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
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
            <ChartContainer config={industryChartConfig} className="h-[380px] w-full">
              <BarChart data={industryBreakdown} layout="vertical" margin={{ left: 10 }}>
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
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    selectedCountry === filter
                      ? "bg-foreground text-background border-transparent"
                      : "bg-background text-muted-foreground border-border hover:bg-secondary",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredBusinessTypes.map((bt) => (
              <div
                key={`${bt.country}-${bt.type}`}
                className="p-4 rounded-lg border bg-muted/30 space-y-1"
              >
                <p className="text-xs text-muted-foreground font-medium">
                  {bt.country === "Singapore"
                    ? "🇸🇬"
                    : bt.country === "Indonesia"
                      ? "🇮🇩"
                      : "🌍"}{" "}
                  {bt.country}
                </p>
                <p className="text-sm font-medium text-foreground">{bt.type}</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
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
    </div>
  );
}