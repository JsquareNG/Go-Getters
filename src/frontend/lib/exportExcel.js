import * as XLSX from "xlsx";
import {
  overviewKPIs,
  monthlyTrends,
  accountTypeBreakdown,
  pipelineStages,
  complianceMetrics,
  riskDistribution,
  documentStats,
  teamPerformance,
  slaMetrics,
  rejectionReasons,
} from "@/data/mockAnalytics";

export function exportAnalyticsToExcel() {
  const wb = XLSX.utils.book_new();

  // Overview KPIs
  const kpiData = [
    ["Metric", "Value", "Trend (%)"],
    ["Total Applications", overviewKPIs.totalApplications, overviewKPIs.totalApplicationsTrend],
    ["Approval Rate (%)", overviewKPIs.approvalRate, overviewKPIs.approvalRateTrend],
    ["Avg Processing Days", overviewKPIs.avgProcessingDays, overviewKPIs.avgProcessingDaysTrend],
    ["Pending Review", overviewKPIs.pendingReview, overviewKPIs.pendingReviewTrend],
    ["Requires Action", overviewKPIs.requiresAction, overviewKPIs.requiresActionTrend],
    ["Conversion Rate (%)", overviewKPIs.conversionRate, overviewKPIs.conversionRateTrend],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(kpiData),
    "Overview KPIs"
  );

  // Monthly Trends
  const trendHeaders = ["Month", "Applications", "Approved", "Rejected", "Withdrawn"];
  const trendRows = monthlyTrends.map((t) => [
    t.month,
    t.applications,
    t.approved,
    t.rejected,
    t.withdrawn,
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]),
    "Monthly Trends"
  );

  // Account Types
  const typeHeaders = ["Account Type", "Count", "Percentage (%)"];
  const typeRows = accountTypeBreakdown.map((a) => [a.type, a.count, a.percentage]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([typeHeaders, ...typeRows]),
    "Account Types"
  );

  // Pipeline
  const pipeHeaders = ["Stage", "Count", "Avg Days"];
  const pipeRows = pipelineStages.map((p) => [p.stage, p.count, p.avgDays]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([pipeHeaders, ...pipeRows]),
    "Pipeline"
  );

  // Compliance
  const compHeaders = ["Check", "Pass Rate (%)", "Total Checks", "Flagged"];
  const compRows = complianceMetrics.map((c) => [
    c.label,
    c.passRate,
    c.totalChecks,
    c.flagged,
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([compHeaders, ...compRows]),
    "Compliance"
  );

  // Risk Distribution
  const riskHeaders = ["Risk Level", "Count", "Percentage (%)"];
  const riskRows = riskDistribution.map((r) => [r.risk, r.count, r.percentage]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([riskHeaders, ...riskRows]),
    "Risk Distribution"
  );

  // Team Performance
  const teamHeaders = ["Reviewer", "Processed", "Avg Time", "Approval Rate (%)"];
  const teamRows = teamPerformance.map((t) => [
    t.member,
    t.processed,
    t.avgTime,
    t.approvalRate,
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([teamHeaders, ...teamRows]),
    "Team Performance"
  );

  // Rejection Reasons
  const rejHeaders = ["Reason", "Count", "Percentage (%)"];
  const rejRows = rejectionReasons.map((r) => [r.reason, r.count, r.percentage]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([rejHeaders, ...rejRows]),
    "Rejection Reasons"
  );

  XLSX.writeFile(wb, `Analytics_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}