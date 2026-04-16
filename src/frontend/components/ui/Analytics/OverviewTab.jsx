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
import { FileText, TrendingUp, Users } from "lucide-react";
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

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const COUNTRY_NAME_TO_CODE = {
  singapore: "SG",
  indonesia: "ID",
  malaysia: "MY",
  thailand: "TH",
  philippines: "PH",
  vietnam: "VN",
  china: "CN",
  "hong kong": "HK",
  india: "IN",
  japan: "JP",
  korea: "KR",
  "south korea": "KR",
  "north korea": "KP",
  taiwan: "TW",
  australia: "AU",
  "new zealand": "NZ",
  "united states": "US",
  usa: "US",
  america: "US",
  canada: "CA",
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  ireland: "IE",
  germany: "DE",
  france: "FR",
  italy: "IT",
  spain: "ES",
  portugal: "PT",
  netherlands: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  poland: "PL",
  turkey: "TR",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  qatar: "QA",
  kuwait: "KW",
  bahrain: "BH",
  oman: "OM",
  egypt: "EG",
  "south africa": "ZA",
  nigeria: "NG",
  kenya: "KE",
  brazil: "BR",
  mexico: "MX",
  argentina: "AR",
  chile: "CL",
  pakistan: "PK",
  bangladesh: "BD",
  "sri lanka": "LK",
  myanmar: "MM",
  cambodia: "KH",
  laos: "LA",
  brunei: "BN",
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
  return safeParseJson(app.form_data);
}

function getStatus(app) {
  return app.current_status || "";
}

function getCreatedAt(app) {
  return app.created_at || app.updated_at || null;
}

function normalizeCountry(value) {
  if (!value) {
    return {
      label: "Unknown",
      code: null,
    };
  }

  const raw = String(value).trim();

  if (!raw) {
    return {
      label: "Unknown",
      code: null,
    };
  }

  const upper = raw.toUpperCase();

  if (/^[A-Z]{2}$/.test(upper)) {
    const displayName = regionNames.of(upper);

    return {
      label: displayName || raw,
      code: upper,
    };
  }

  const normalizedKey = raw.toLowerCase().replace(/[().,]/g, "").trim();
  const aliasCode = COUNTRY_NAME_TO_CODE[normalizedKey];

  if (aliasCode) {
    return {
      label: regionNames.of(aliasCode) || raw,
      code: aliasCode,
    };
  }

  return {
    label: raw,
    code: null,
  };
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌍";

  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function normalizeStatus(value) {
  if (!value) return "Unknown";

  const v = String(value).trim().toLowerCase();

  if (v === "draft") return "Draft";
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

function buildIndustryBreakdown(
  applications = [],
  selectedCountry = "Singapore",
) {
  const counts = {};
  let total = 0;

  applications.forEach((app) => {
    const payload = getPayload(app);
    const appCountry = normalizeCountry(
      payload.businessCountry || payload.country,
    ).label;

    if (appCountry !== selectedCountry) return;

    let industry = "";

    if (selectedCountry === "Singapore") {
      industry = String(payload.businessIndustry || "").trim();
    } else if (selectedCountry === "Indonesia") {
      const activities = Array.isArray(payload.businessActivities)
        ? payload.businessActivities
        : [];

      const primaryActivity = activities.find(
        (activity) =>
          String(activity?.activityType || "").trim().toLowerCase() ===
          "primary",
      );

      industry = String(primaryActivity?.businessActivity || "").trim();
    }

    if (!industry) return;

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
    const countryInfo = normalizeCountry(payload.country);
    const countryKey = countryInfo.label;
    const status = String(getStatus(app)).toLowerCase();

    if (!counts[countryKey]) {
      counts[countryKey] = {
        code: countryInfo.code || countryInfo.label,
        country: countryInfo.label,
        countryCode: countryInfo.code,
        applications: 0,
      };
    }

    counts[countryKey].applications += 1;

    if (status === "approved") {
      approvedCounts[countryKey] = (approvedCounts[countryKey] || 0) + 1;
    }

    total += 1;
  });

  return Object.values(counts)
    .map((item) => ({
      ...item,
      approved: approvedCounts[item.country] || 0,
      percentage:
        total > 0 ? Number(((item.applications / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.applications - a.applications);
}

function buildBusinessTypeBreakdown(applications = []) {
  const countryTotals = {};
  const grouped = {};

  applications.forEach((app) => {
    const payload = getPayload(app);
    const countryInfo = normalizeCountry(payload.country);
    const country = countryInfo.label;
    const countryCode = countryInfo.code;
    const type = formatBusinessType(payload.businessType);

    countryTotals[country] = (countryTotals[country] || 0) + 1;

    const key = `${country}__${type}`;

    if (!grouped[key]) {
      grouped[key] = {
        country,
        countryCode,
        type,
        count: 0,
      };
    }

    grouped[key].count += 1;
  });

  return Object.values(grouped)
    .map((item) => {
      const totalForCountry = countryTotals[item.country] || 0;

      return {
        ...item,
        percentage:
          totalForCountry > 0
            ? Number(((item.count / totalForCountry) * 100).toFixed(1))
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

  const pendingReview = applications.filter(
    (app) => String(getStatus(app)).toLowerCase() === "under manual review",
  ).length;

  const rejected = applications.filter((app) =>
    ["rejected", "declined"].includes(String(getStatus(app)).toLowerCase()),
  ).length;

  const conversionRate =
    totalApplications > 0
      ? Number((((approved + rejected) / totalApplications) * 100).toFixed(1))
      : 0;

  return {
    totalApplications,
    pendingReview,
    conversionRate,
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
      dotClassName: "bg-orange-500",
      textClassName: "text-orange-600",
      rowClassName: "bg-orange-50 border border-orange-100",
      barClassName: "bg-orange-500",
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

export function OverviewTab({ dateRange, preset }) {
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedIndustryCountry, setSelectedIndustryCountry] =
    useState("Singapore");
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
    () =>
      buildIndustryBreakdown(filteredApplications, selectedIndustryCountry),
    [filteredApplications, selectedIndustryCountry],
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

  const countryFilters = useMemo(() => {
    const countries = Array.from(
      new Set(businessTypeBreakdown.map((item) => item.country)),
    ).sort((a, b) => a.localeCompare(b));

    return ["All", ...countries];
  }, [businessTypeBreakdown]);

  const filteredBusinessTypes =
    selectedCountry === "All"
      ? businessTypeBreakdown
      : businessTypeBreakdown.filter((b) => b.country === selectedCountry);

  const countryChartConfig = useMemo(() => {
    return countryBreakdown.reduce((acc, item, index) => {
      acc[item.country] = {
        label: item.country,
        color:
          COUNTRY_COLORS[index] || `hsl(${(index * 57) % 360}, 70%, 50%)`,
      };
      return acc;
    }, {});
  }, [countryBreakdown]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-3">
        <KPICard
          icon={<FileText className="h-5 w-5" />}
          title="Total Applications"
          value={overviewKPIs.totalApplications.toLocaleString()}
          trendLabel="Total Number of Applications"
        />
        <KPICard
          icon={<Users className="h-5 w-5" />}
          title="Pending Review"
          value={overviewKPIs.pendingReview}
          trendLabel="No. of Applications Pending Review"
        />
        <KPICard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Conversion Rate"
          value={overviewKPIs.conversionRate}
          suffix="%"
          trendLabel="Conversion Rate"
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

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base font-medium">
                Business Type Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of entity types by incorporation country
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-1.5 lg:max-w-[55%] lg:justify-end">
              {countryFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedCountry(filter)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selectedCountry === filter
                      ? "border-transparent bg-neutral-950 text-white"
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
          {filteredBusinessTypes.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No business type records found for the selected country.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filteredBusinessTypes.map((bt) => (
                <div
                  key={`${bt.country}-${bt.type}`}
                  className="space-y-1 rounded-lg border bg-slate-200/30 p-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {getFlagEmoji(bt.countryCode)} {bt.country}
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
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                        COUNTRY_COLORS[index] ||
                        `hsl(${(index * 57) % 360}, 70%, 50%)`
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
                    {getFlagEmoji(c.countryCode)} {c.country}
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

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Industry Breakdown
                </CardTitle>
                <CardDescription>
                  Applications segmented by primary business activity
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-1.5 lg:max-w-[55%] lg:justify-end">
                {["Singapore", "Indonesia"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedIndustryCountry(filter)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selectedIndustryCountry === filter
                        ? "border-transparent bg-neutral-950 text-white"
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
            {industryBreakdown.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No industry records found for {selectedIndustryCountry}.
              </div>
            ) : (
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
                    width={220}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    name="Applications"
                  >
                    {industryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(210, ${90 - i * 8}%, ${45 + i * 4}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}