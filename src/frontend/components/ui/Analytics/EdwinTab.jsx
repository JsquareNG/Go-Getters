import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
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
  LabelList,
  PieChart,
  Pie,
  Legend,
} from "recharts";

// CHANGE THESE IMPORTS TO MATCH YOUR ACTUAL API FILES
import { getAllApplications } from "../../../api/applicationApi";
import { getAllJob } from "../../../api/applicationApi";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

function normalizeStatus(status) {
  if (!status) return "Unknown";

  const value = String(status).trim().toLowerCase();

  if (value === "under review") return "Under Manual Review";
  if (value === "under manual review") return "Under Manual Review";
  if (value === "requires action") return "Requires Action";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  if (value === "withdrawn") return "Withdrawn";
  if (value === "draft") return "Draft";
  if (value === "deleted") return "Deleted";

  return status;
}

function normalizeCountry(country) {
  if (!country) return "Unknown";

  const value = String(country).trim().toLowerCase();

  if (value === "sg" || value === "singapore") return "Singapore";
  if (value === "id" || value === "indonesia") return "Indonesia";

  return country;
}

function normalizeBusinessType(type) {
  if (!type) return "Unknown";
  return String(type).trim();
}

function formatBusinessTypeLabel(value) {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPeriodStart(timeRange) {
  const now = new Date();
  const start = new Date(now);

  if (timeRange === "weekly") {
    start.setDate(now.getDate() - 7);
    return start;
  }

  if (timeRange === "quarterly") {
    start.setMonth(now.getMonth() - 3);
    return start;
  }

  // default monthly
  start.setMonth(now.getMonth() - 1);
  return start;
}

function isWithinRange(dateValue, startDate) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date >= startDate;
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
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

function getRiskBucket(score) {
  const value = Number(score || 0);

  if (value <= 20) return "0-20";
  if (value <= 40) return "21-40";
  if (value <= 60) return "41-60";
  if (value <= 80) return "61-80";
  return "81-100";
}

function getRiskGradeLabel(grade) {
  if (!grade) return "Unknown";

  const value = String(grade).trim().toLowerCase();

  if (value === "low" || value === "simplified cdd") return "Low / Simplified CDD";
  if (value === "medium" || value === "standard cdd") return "Medium / Standard CDD";
  if (value === "high" || value === "enhanced cdd") return "High / Enhanced CDD";

  return grade;
}

const DashboardTab = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applications, setApplications] = useState([]);
  const [reviewJobs, setReviewJobs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [applicationsRes, reviewJobsRes] = await Promise.all([
          getAllApplications(),
          getAllJob(),
        ]);

        const applicationsData =
          applicationsRes?.data?.data ||
          applicationsRes?.data ||
          [];

        const reviewJobsData =
          reviewJobsRes?.data?.data ||
          reviewJobsRes?.data ||
          [];

        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
        setReviewJobs(Array.isArray(reviewJobsData) ? reviewJobsData : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const dashboardData = useMemo(() => {
    const startDate = getPeriodStart(timeRange);

    const filteredApplications = applications.filter((app) =>
      isWithinRange(app.created_at, startDate)
    );

    const filteredReviewJobs = reviewJobs.filter((job) =>
      isWithinRange(job.created_at || job.completed_at, startDate)
    );

    const applicationMap = new Map(
      filteredApplications.map((app) => [app.application_id, app])
    );

    const manualApplicationIds = new Set();

    filteredReviewJobs.forEach((job) => {
      if (job.application_id) {
        manualApplicationIds.add(job.application_id);
      }
    });

    // ==============================
    // TOTAL APPLICATIONS
    // ==============================
    const totalApplications = filteredApplications.length;

    // ==============================
    // STP RATE
    // Approved and never went through manual review
    // ==============================
    const stpApprovedCount = filteredApplications.filter((app) => {
      const status = normalizeStatus(app.current_status);
      return status === "Approved" && !manualApplicationIds.has(app.application_id);
    }).length;

    const stpRate =
      totalApplications === 0 ? 0 : (stpApprovedCount / totalApplications) * 100;

    // ==============================
    // APPLICATIONS BY STATUS
    // ==============================
    const statusCounts = {};

    filteredApplications.forEach((app) => {
      const status = normalizeStatus(app.current_status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const applicationsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // ==============================
    // MANUAL REVIEW LOAD
    // ==============================
    const manualCount = filteredApplications.filter((app) =>
      manualApplicationIds.has(app.application_id)
    ).length;

    const autoCount = totalApplications - manualCount;

    const manualReviewData = [
      { name: "Manual Review", value: manualCount },
      { name: "Auto Processing", value: autoCount },
    ];

    // ==============================
    // APPLICATIONS BY COUNTRY
    // ==============================
    const countryCounts = {};

    filteredApplications.forEach((app) => {
      const country = normalizeCountry(app.business_country);
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    const applicationsByCountry = Object.entries(countryCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // ==============================
    // CONVERSION RATE BY BUSINESS TYPE
    // only final outcomes: Approved / Rejected
    // ==============================
    const conversionGrouped = {};

    filteredApplications.forEach((app) => {
      const type = normalizeBusinessType(app.business_type);
      const status = normalizeStatus(app.current_status);
      const wentManual = manualApplicationIds.has(app.application_id);

      if (!conversionGrouped[type]) {
        conversionGrouped[type] = {
          autoTotal: 0,
          autoApproved: 0,
          manualTotal: 0,
          manualApproved: 0,
        };
      }

      const isFinalOutcome = status === "Approved" || status === "Rejected";
      if (!isFinalOutcome) return;

      if (wentManual) {
        conversionGrouped[type].manualTotal += 1;
        if (status === "Approved") conversionGrouped[type].manualApproved += 1;
      } else {
        conversionGrouped[type].autoTotal += 1;
        if (status === "Approved") conversionGrouped[type].autoApproved += 1;
      }
    });

    const conversionRates = Object.keys(conversionGrouped).map((type) => ({
      business_type: type,
      autoRate:
        conversionGrouped[type].autoTotal === 0
          ? 0
          : (conversionGrouped[type].autoApproved / conversionGrouped[type].autoTotal) * 100,
      manualRate:
        conversionGrouped[type].manualTotal === 0
          ? 0
          : (conversionGrouped[type].manualApproved / conversionGrouped[type].manualTotal) * 100,
    }));

    // ==============================
    // APPLICATIONS BY BUSINESS TYPE
    // ==============================
    const typeCounts = {};

    filteredApplications.forEach((app) => {
      const type = normalizeBusinessType(app.business_type);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const applicationsByBusinessType = Object.entries(typeCounts).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    // ==============================
    // APPLICATION PROCESSING TIME
    // created_at -> completed_at
    // grouped by month
    // ==============================
    const processingByMonth = {};

    filteredReviewJobs.forEach((job) => {
      if (!job.application_id || !job.completed_at) return;

      const app = applicationMap.get(job.application_id);
      if (!app?.created_at) return;

      const created = new Date(app.created_at);
      const completed = new Date(job.completed_at);

      if (Number.isNaN(created.getTime()) || Number.isNaN(completed.getTime())) return;
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

    const processingTime = Object.entries(processingByMonth)
      .map(([monthKey, value]) => ({
        month: getMonthLabel(monthKey),
        sortKey: monthKey,
        value: value.count === 0 ? 0 : value.totalDays / value.count,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // ==============================
    // RISK GRADE DISTRIBUTION
    // ==============================
    const gradeCounts = {};

    filteredReviewJobs.forEach((job) => {
      const grade = getRiskGradeLabel(job.risk_grade);
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });

    const riskGrades = Object.entries(gradeCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // ==============================
    // RISK SCORE DISTRIBUTION
    // ==============================
    const bucketCounts = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };

    filteredReviewJobs.forEach((job) => {
      const bucket = getRiskBucket(job.risk_score);
      bucketCounts[bucket] += 1;
    });

    const riskScoreBuckets = Object.entries(bucketCounts).map(([range, count]) => ({
      range,
      count,
    }));

    // ==============================
    // TOP TRIGGERED RULES
    // ==============================
    const ruleCounts = {};

    filteredReviewJobs.forEach((job) => {
      if (!job.rules_triggered) return;

      let rules = [];

      try {
        rules =
          typeof job.rules_triggered === "string"
            ? JSON.parse(job.rules_triggered)
            : job.rules_triggered;
      } catch (err) {
        console.error("Invalid rules_triggered JSON:", err);
        return;
      }

      if (!Array.isArray(rules)) return;

      rules.forEach((rule) => {
        const name = rule?.description || rule?.name || rule?.rule_name;
        if (!name) return;
        ruleCounts[name] = (ruleCounts[name] || 0) + 1;
      });
    });

    const riskRules = Object.entries(ruleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ==============================
    // RISK SCORE VS APPROVAL
    // only final outcomes
    // ==============================
    const approvalBuckets = {
      "0-20": { approved: 0, rejected: 0 },
      "21-40": { approved: 0, rejected: 0 },
      "41-60": { approved: 0, rejected: 0 },
      "61-80": { approved: 0, rejected: 0 },
      "81-100": { approved: 0, rejected: 0 },
    };

    filteredReviewJobs.forEach((job) => {
      const app = applicationMap.get(job.application_id);
      if (!app) return;

      const status = normalizeStatus(app.current_status);
      if (status !== "Approved" && status !== "Rejected") return;

      const bucket = getRiskBucket(job.risk_score);

      if (status === "Approved") {
        approvalBuckets[bucket].approved += 1;
      } else if (status === "Rejected") {
        approvalBuckets[bucket].rejected += 1;
      }
    });

    const riskApproval = Object.entries(approvalBuckets).map(([range, values]) => {
      const total = values.approved + values.rejected;

      return {
        range,
        approved: values.approved,
        rejected: values.rejected,
        approvalRate: total === 0 ? 0 : (values.approved / total) * 100,
        rejectedRate: total === 0 ? 0 : (values.rejected / total) * 100,
      };
    });

    return {
      totalApplications,
      stpRate,
      applicationsByStatus,
      manualReviewData,
      applicationsByCountry,
      conversionRates,
      applicationsByBusinessType,
      processingTime,
      riskGrades,
      riskScoreBuckets,
      riskRules,
      riskApproval,
    };
  }, [applications, reviewJobs, timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-12">
          <div className="text-center text-muted-foreground">Loading dashboard...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-12">
          <div className="text-center text-red-500">{error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
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

        <Tabs defaultValue="tab1">
          <TabsList className="mb-6">
            <TabsTrigger value="tab1">Overview</TabsTrigger>
            <TabsTrigger value="tab2">Applications</TabsTrigger>
            <TabsTrigger value="tab3">Risk</TabsTrigger>
          </TabsList>

          <TabsContent value="tab1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Applications</CardTitle>
                </CardHeader>
                <CardContent className="text-4xl font-bold text-center">
                  {dashboardData.totalApplications}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>STP Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-4xl font-bold text-center">
                  {dashboardData.stpRate.toFixed(1)}%
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Applications by Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.applicationsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {dashboardData.applicationsByStatus.map((entry, index) => (
                          <Cell
                            key={`status-cell-${index}`}
                            fill={
                              entry.name === "Approved"
                                ? "#22c55e"
                                : entry.name === "Rejected"
                                ? "#ef4444"
                                : entry.name === "Under Manual Review"
                                ? "#f59e0b"
                                : entry.name === "Requires Action"
                                ? "#3b82f6"
                                : "#94a3b8"
                            }
                          />
                        ))}
                        <LabelList dataKey="value" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manual Review Load</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.manualReviewData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {dashboardData.manualReviewData.map((entry, index) => (
                          <Cell
                            key={`manual-cell-${index}`}
                            fill={entry.name === "Manual Review" ? "#f59e0b" : "#22c55e"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tab2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Applications by Country</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.applicationsByCountry}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {dashboardData.applicationsByCountry.map((entry, index) => (
                          <Cell
                            key={`country-cell-${index}`}
                            fill={
                              entry.name === "Singapore"
                                ? "#3b82f6"
                                : entry.name === "Indonesia"
                                ? "#22c55e"
                                : "#94a3b8"
                            }
                          />
                        ))}
                        <LabelList dataKey="value" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate by Business Type</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.conversionRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="business_type"
                        tickFormatter={formatBusinessTypeLabel}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <Bar dataKey="autoRate" name="Auto Approved" fill="#22c55e">
                        <LabelList
                          dataKey="autoRate"
                          formatter={(v) => `${Number(v).toFixed(1)}%`}
                          position="top"
                        />
                      </Bar>
                      <Bar dataKey="manualRate" name="Manual Review" fill="#ef4444">
                        <LabelList
                          dataKey="manualRate"
                          formatter={(v) => `${Number(v).toFixed(1)}%`}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Applications by Business Type</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.applicationsByBusinessType}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${formatBusinessTypeLabel(name)}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {dashboardData.applicationsByBusinessType.map((entry, index) => (
                          <Cell
                            key={`type-cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => [value, formatBusinessTypeLabel(name)]}
                      />

                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => formatBusinessTypeLabel(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Application Processing Time</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.processingTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(1)} days`} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--accent))"
                        strokeWidth={3}
                        dot
                      >
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(v) => `${Number(v).toFixed(1)}`}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tab3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.riskGrades}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {dashboardData.riskGrades.map((entry, index) => (
                          <Cell
                            key={`grade-cell-${index}`}
                            fill={
                              entry.name.includes("Low")
                                ? "#22c55e"
                                : entry.name.includes("Medium")
                                ? "#f59e0b"
                                : "#ef4444"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Score Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.riskScoreBuckets}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count">
                        {dashboardData.riskScoreBuckets.map((entry, index) => (
                          <Cell key={`bucket-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Triggered Risk Rules</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.riskRules}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count">
                        {dashboardData.riskRules.map((entry, index) => (
                          <Cell key={`rule-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Score vs Approval</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.riskApproval}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" stackId="a" fill="#22c55e">
                        <LabelList
                          dataKey="approvalRate"
                          position="top"
                          formatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                      </Bar>
                      <Bar dataKey="rejected" stackId="a" fill="#ef4444">
                        <LabelList
                          dataKey="rejectedRate"
                          position="top"
                          formatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardTab;