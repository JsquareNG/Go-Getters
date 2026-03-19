import { Card, CardContent, CardHeader, CardTitle } from "../primitives/Card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../primitives/chart";
import { KPICard } from "./KPICard";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  overviewKPIs,
  monthlyTrends,
  accountTypeBreakdown,
} from "@/data/mockAnalytics";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const trendChartConfig = {
  applications: {
    label: "Applications",
    color: "hsl(210, 100%, 50%)",
  },
  approved: {
    label: "Approved",
    color: "hsl(142, 71%, 45%)",
  },
};

const pieChartConfig = {
  "SME Business Account": {
    label: "SME Business Account",
    color: "hsl(351, 85%, 49%)",
  },
  "Cross-Border Payments": {
    label: "Cross-Border Payments",
    color: "hsl(210, 100%, 50%)",
  },
};

const PIE_COLORS = ["hsl(351, 85%, 49%)", "hsl(210, 100%, 50%)"];

export function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
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
          icon={<Clock className="h-5 w-5" />}
          title="Avg Processing"
          value={overviewKPIs.avgProcessingDays}
          suffix="days"
          trend={overviewKPIs.avgProcessingDaysTrend}
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
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Requires Action"
          value={overviewKPIs.requiresAction}
          trend={overviewKPIs.requiresActionTrend}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Application Trends */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Application Trends
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-approved)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-approved)" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gradApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-applications)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-applications)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
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
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Account Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              By Account Type
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={accountTypeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="type"
                  paddingAngle={4}
                >
                  {accountTypeBreakdown.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>

                <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}