import { useState } from "react";
import { KPICard } from "../components/ui/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { mockKPIData } from "../data/mockData";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Clock,
  Zap,
  FileWarning,
  TrendingDown,
  AlertTriangle,
  Target,
} from "lucide-react";

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const {
    averageOnboardingDuration,
    stpRate,
    documentErrorRate,
    dropOffRate,
    falsePositiveRate,
  } = mockKPIData;

  // Chart data
  const onboardingTrendData = averageOnboardingDuration.trend.map((value, index) => ({
    name: `Week ${index + 1}`,
    value,
  }));

  const stpByProductData = stpRate.byProduct;
  const funnelData = dropOffRate.funnel;

  const falsePositiveTrendData = falsePositiveRate.trend.map((value, index) => ({
    name: `Week ${index + 1}`,
    value,
  }));

  const improvementPercentage = Math.round(
    ((averageOnboardingDuration.previous - averageOnboardingDuration.current) /
      averageOnboardingDuration.previous) *
      100
  );

  const errorReduction = documentErrorRate.previous - documentErrorRate.current;

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor onboarding performance and operational efficiency
            </p>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="quarterly">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            title="Avg. Onboarding Time"
            value={averageOnboardingDuration.current}
            suffix="days"
            change={improvementPercentage}
            changeLabel="vs previous"
            trend="down"
            trendPositive={true}
            icon={<Clock className="h-5 w-5" />}
          />
          <KPICard
            title="STP Rate"
            value={stpRate.current}
            suffix="%"
            change={8}
            changeLabel="improvement"
            trend="up"
            trendPositive={true}
            icon={<Zap className="h-5 w-5" />}
          />
          <KPICard
            title="Doc Error Rate"
            value={documentErrorRate.current}
            suffix="%"
            change={errorReduction}
            changeLabel="reduction"
            trend="down"
            trendPositive={true}
            icon={<FileWarning className="h-5 w-5" />}
          />
          <KPICard
            title="Drop-Off Rate"
            value={dropOffRate.current}
            suffix="%"
            change={12}
            changeLabel="reduction"
            trend="down"
            trendPositive={true}
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <KPICard
            title="False Positive Rate"
            value={falsePositiveRate.current}
            suffix="%"
            change={14}
            changeLabel="reduction"
            trend="down"
            trendPositive={true}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Onboarding Duration Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Onboarding Duration Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={onboardingTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--accent))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--accent))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-4 bg-status-success/10 border border-status-success/20 rounded-lg">
                <p className="text-sm text-status-success font-medium">
                  ↓ {improvementPercentage}% improvement from{" "}
                  {averageOnboardingDuration.previous} days to{" "}
                  {averageOnboardingDuration.current} days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* STP Rate by Product */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                STP Rate by Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stpByProductData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" domain={[0, 100]} className="text-xs" />
                    <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`${value}%`, "STP Rate"]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {stpByProductData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.value >= 70
                              ? "hsl(var(--status-success))"
                              : entry.value >= 50
                              ? "hsl(var(--status-warning))"
                              : "hsl(var(--status-error))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-status-success" /> ≥70%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-status-warning" /> 50-69%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-status-error" /> &lt;50%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Drop-off Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                Application Drop-off Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((stage) => {
                  const widthPercentage = (stage.count / funnelData[0].count) * 100;
                  return (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-muted-foreground">
                          {stage.count} ({widthPercentage.toFixed(0)}%)
                          {stage.dropOff > 0 && (
                            <span className="text-status-error ml-2">
                              -{stage.dropOff}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-8 bg-secondary rounded-md overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${widthPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Biggest drop-off:</span>{" "}
                  Document Upload stage (-15%)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* False Positive Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent" />
                False Positive Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={falsePositiveTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" domain={[0, 50]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`${value}%`, "False Positive Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--status-warning))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--status-warning))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-4 bg-status-success/10 border border-status-success/20 rounded-lg">
                <p className="text-sm text-status-success font-medium">
                  Rule efficiency improved: False positives reduced from 38% to 24%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Before/After Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison: Before vs After Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Onboarding Duration</p>
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground line-through">
                      {averageOnboardingDuration.previous}d
                    </p>
                    <p className="text-xs text-muted-foreground">Before</p>
                  </div>
                  <span className="text-status-success text-xl">→</span>
                  <div>
                    <p className="text-2xl font-bold text-status-success">
                      {averageOnboardingDuration.current}d
                    </p>
                    <p className="text-xs text-status-success">After</p>
                  </div>
                </div>
              </div>

              <div className="text-center p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Document Error Rate</p>
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground line-through">
                      {documentErrorRate.previous}%
                    </p>
                    <p className="text-xs text-muted-foreground">Before</p>
                  </div>
                  <span className="text-status-success text-xl">→</span>
                  <div>
                    <p className="text-2xl font-bold text-status-success">
                      {documentErrorRate.current}%
                    </p>
                    <p className="text-xs text-status-success">After</p>
                  </div>
                </div>
              </div>

              <div className="text-center p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">STP Rate</p>
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground line-through">
                      64%
                    </p>
                    <p className="text-xs text-muted-foreground">Before</p>
                  </div>
                  <span className="text-status-success text-xl">→</span>
                  <div>
                    <p className="text-2xl font-bold text-status-success">
                      {stpRate.current}%
                    </p>
                    <p className="text-xs text-status-success">After</p>
                  </div>
                </div>
              </div>

              <div className="text-center p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">False Positive Rate</p>
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground line-through">
                      38%
                    </p>
                    <p className="text-xs text-muted-foreground">Before</p>
                  </div>
                  <span className="text-status-success text-xl">→</span>
                  <div>
                    <p className="text-2xl font-bold text-status-success">
                      {falsePositiveRate.current}%
                    </p>
                    <p className="text-xs text-status-success">After</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
