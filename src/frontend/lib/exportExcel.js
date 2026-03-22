import * as XLSX from "xlsx";
import {
  getAllApplications,
  getAllJob,
  getApplicationByReviewer,
} from "../api/applicationApi";
import { getAllRules } from "../api/riskRuleApi";
import {
  getAuditMetricsOverview,
  getStaffLeaderboard,
} from "../api/auditTrailApi";

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

function getStatus(app) {
  return app?.current_status || "";
}

function getPreviousStatus(app) {
  return app?.previous_status || "";
}

function getCreatedAt(app) {
  return app?.created_at || app?.updated_at || null;
}

function normalizeCountry(value) {
  if (!value) return "Unknown";
  const v = String(value).trim().toLowerCase();

  if (v === "sg" || v === "singapore") return "Singapore";
  if (v === "id" || v === "indonesia") return "Indonesia";

  return String(value).trim();
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

function normalizeRiskGrade(value) {
  return String(value || "").trim().toLowerCase();
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

function formatDurationFromDays(days) {
  const value = Number(days || 0);

  if (value <= 0) return "0 min";

  const totalMinutes = value * 24 * 60;
  const totalHours = value * 24;

  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  if (totalHours < 24) return `${totalHours.toFixed(1)} hrs`;

  return `${value.toFixed(2)} days`;
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

function buildOverviewKPIs(applications = []) {
  const totalApplications = applications.length;

  const approved = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Approved",
  ).length;

  const pendingReview = applications.filter((app) =>
    ["Pending", "Under Review", "Under Manual Review"].includes(
      normalizeStatus(getStatus(app)),
    ),
  ).length;

  const requiresAction = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Requires Action",
  ).length;

  const rejected = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Rejected",
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
    approvalRate,
    pendingReview,
    requiresAction,
    conversionRate,
  };
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
      deleted: 0,
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
    const status = normalizeStatus(getStatus(app));

    if (!dayMap.has(key)) return;

    const row = dayMap.get(key);
    row.applications += 1;

    if (status === "Approved") row.approved += 1;
    if (status === "Rejected") row.rejected += 1;
    if (status === "Withdrawn") row.withdrawn += 1;
    if (status === "Deleted") row.deleted += 1;
  });

  return Array.from(dayMap.values())
    .sort((a, b) => a.sortDate - b.sortDate)
    .map(({ sortDate, ...rest }) => rest);
}

function buildCountryBreakdown(applications = []) {
  const counts = {};
  const approvedCounts = {};
  let total = 0;

  applications.forEach((app) => {
    const payload = getPayload(app);
    const country = normalizeCountry(payload.country);
    const status = normalizeStatus(getStatus(app));

    counts[country] = (counts[country] || 0) + 1;

    if (status === "Approved") {
      approvedCounts[country] = (approvedCounts[country] || 0) + 1;
    }

    total += 1;
  });

  return Object.entries(counts)
    .map(([country, applicationsCount]) => ({
      country,
      applications: applicationsCount,
      approved: approvedCounts[country] || 0,
      percentage:
        total > 0 ? Number(((applicationsCount / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.applications - a.applications);
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

function buildStatusBreakdown(applications = []) {
  const counts = {};

  applications.forEach((app) => {
    const status = normalizeStatus(getStatus(app));
    counts[status] = (counts[status] || 0) + 1;
  });

  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
  }));
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
    const status = normalizeStatus(getStatus(app));
    if (counts[status] !== undefined) {
      counts[status] += 1;
    }
  });

  return Object.entries(counts).map(([stage, count]) => ({
    stage,
    count,
  }));
}

function buildDraftDropoff(applications = []) {
  const draftApps = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Draft",
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

  return Object.entries(counts).map(([stage, count]) => ({
    stage,
    count,
    percentage:
      totalDrafts > 0 ? Number(((count / totalDrafts) * 100).toFixed(1)) : 0,
  }));
}

function buildOutcomeMetrics(applications = []) {
  const totalApplications = applications.length;

  const approvedNoManualReview = applications.filter(
    (app) =>
      normalizeStatus(getStatus(app)) === "Approved" &&
      normalizeStatus(getPreviousStatus(app)) === "Under Review",
  ).length;

  const approvedAfterManualReview = applications.filter(
    (app) =>
      normalizeStatus(getStatus(app)) === "Approved" &&
      normalizeStatus(getPreviousStatus(app)) === "Under Manual Review",
  ).length;

  const withdrawnCount = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Withdrawn",
  ).length;

  const deletedCount = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Deleted",
  ).length;

  const draftCount = applications.filter(
    (app) => normalizeStatus(getStatus(app)) === "Draft",
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

  return d.toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });
}

function buildProcessingTimeByMonth(reviewJobs, applications, dateRange) {
  const filteredApplications = applications.filter((app) =>
    isWithinDateRange(app, dateRange),
  );

  const applicationMap = new Map(
    filteredApplications.map((app) => [app.application_id, app]),
  );

  const processingByMonth = {};

  reviewJobs.forEach((job) => {
    if (!job.application_id || !job.completed_at) return;
    if (String(job.status || "").toUpperCase() !== "COMPLETED") return;

    const app = applicationMap.get(job.application_id);
    if (!app?.created_at) return;

    const created = new Date(app.created_at);
    const completed = new Date(job.completed_at);

    if (Number.isNaN(created.getTime()) || Number.isNaN(completed.getTime())) {
      return;
    }

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

  return Object.entries(processingByMonth)
    .map(([monthKey, value]) => ({
      month: getMonthLabel(monthKey),
      avgDays: value.count === 0 ? 0 : Number((value.totalDays / value.count).toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function classifyDueDiligence(reviewJobs) {
  const counts = {
    "Standard CDD": 0,
    "Enhanced CDD": 0,
    "Simplified CDD": 0,
  };

  reviewJobs.forEach((job) => {
    const riskGrade = normalizeRiskGrade(job.risk_grade);

    if (riskGrade === "enhanced cdd") {
      counts["Enhanced CDD"] += 1;
    } else if (riskGrade === "simplified cdd") {
      counts["Simplified CDD"] += 1;
    } else {
      counts["Standard CDD"] += 1;
    }
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return Object.entries(counts).map(([type, count]) => ({
    type,
    count,
    percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  }));
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
    } else {
      approvalBuckets[bucket].rejected += 1;
    }
  });

  return Object.entries(approvalBuckets).map(([range, values]) => ({
    range,
    approved: values.approved,
    rejected: values.rejected,
    total: values.approved + values.rejected,
    approvalRate:
      values.approved + values.rejected > 0
        ? Number(
            (
              (values.approved / (values.approved + values.rejected)) *
              100
            ).toFixed(1),
          )
        : 0,
    rejectedRate:
      values.approved + values.rejected > 0
        ? Number(
            (
              (values.rejected / (values.approved + values.rejected)) *
              100
            ).toFixed(1),
          )
        : 0,
  }));
}

function getTopTriggeredRules(reviewJobs, topN = 10) {
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

function autoFitColumns(ws, rows) {
  const widths = rows[0].map((_, colIndex) => {
    const maxLen = rows.reduce((max, row) => {
      const value = row[colIndex] == null ? "" : String(row[colIndex]);
      return Math.max(max, value.length);
    }, 10);
    return { wch: Math.min(maxLen + 2, 40) };
  });

  ws["!cols"] = widths;
}

function appendSheet(wb, name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoFitColumns(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export async function exportAnalyticsToExcel({ dateRange } = {}) {
  const wb = XLSX.utils.book_new();

  const filterParams = {
    from: dateRange?.from ? dateRange.from.toISOString() : undefined,
    to: dateRange?.to ? dateRange.to.toISOString() : undefined,
  };

  const [
    applicationsRes,
    reviewJobsRes,
    riskRulesRes,
    auditOverviewRes,
    leaderboardRes,
  ] = await Promise.all([
    getAllApplications(),
    getAllJob(),
    getAllRules(),
    getAuditMetricsOverview(filterParams),
    getStaffLeaderboard(filterParams),
  ]);

  const allApplications = Array.isArray(applicationsRes)
    ? applicationsRes
    : Array.isArray(applicationsRes?.data)
      ? applicationsRes.data
      : [];

  const allReviewJobs = Array.isArray(reviewJobsRes)
    ? reviewJobsRes
    : Array.isArray(reviewJobsRes?.data)
      ? reviewJobsRes.data
      : [];

  const filteredApplications = allApplications.filter((app) =>
    isWithinDateRange(app, dateRange),
  );

  const overviewKPIs = buildOverviewKPIs(filteredApplications);
  const dailyTrends = buildDailyTrends(filteredApplications, dateRange);
  const countryBreakdown = buildCountryBreakdown(filteredApplications);
  const industryBreakdown = buildIndustryBreakdown(filteredApplications);
  const businessTypeBreakdown = buildBusinessTypeBreakdown(filteredApplications);
  const statusBreakdown = buildStatusBreakdown(filteredApplications);

  const pipelineStages = buildPipelineStages(filteredApplications);
  const draftDropoff = buildDraftDropoff(filteredApplications);
  const outcomeMetrics = buildOutcomeMetrics(filteredApplications);

  const operationsOverview = {
    escalationRate: auditOverviewRes?.escalationRate ?? 0,
    avgManualReviewTimeDays: auditOverviewRes?.avgManualReviewTimeDays ?? 0,
    totalEscalations: auditOverviewRes?.totalEscalations ?? 0,
  };

  const processingTimeTrend = buildProcessingTimeByMonth(
    allReviewJobs,
    allApplications,
    dateRange,
  );

  const leaderboard = Array.isArray(leaderboardRes) ? leaderboardRes : [];
  const enrichedLeaderboard = await Promise.all(
    leaderboard.map(async (member) => {
      try {
        const reviewerId = member.staffId;
        const apps = await getApplicationByReviewer(reviewerId);

        const reviewerApps = Array.isArray(apps)
          ? apps
          : Array.isArray(apps?.data)
            ? apps.data
            : [];

        const assignedApplications = reviewerApps.length;
        const applicationsLeft = reviewerApps.filter(
          (app) => normalizeStatus(app.current_status) === "Under Manual Review",
        ).length;

        return {
          ...member,
          assignedApplications,
          applicationsLeft,
        };
      } catch {
        return {
          ...member,
          assignedApplications: 0,
          applicationsLeft: 0,
        };
      }
    }),
  );

  const sortedLeaderboard = [...enrichedLeaderboard]
    .sort((a, b) => {
      if ((b.processed ?? 0) !== (a.processed ?? 0)) {
        return (b.processed ?? 0) - (a.processed ?? 0);
      }
      return String(a.staffId || "").localeCompare(String(b.staffId || ""));
    })
    .map((member, index) => ({
      ...member,
      rank: index + 1,
    }));

  const dueDiligence = classifyDueDiligence(allReviewJobs);
  const riskDistribution = getRiskScoreDistribution(allReviewJobs);
  const riskVsApproval = getRiskScoreVsApproval(allReviewJobs, allApplications);
  const topTriggeredRules = getTopTriggeredRules(allReviewJobs, 10);
  const ruleCategories = normalizeRuleCategories(riskRulesRes);

  appendSheet(wb, "Overview KPIs", [
    ["Metric", "Value"],
    ["Total Applications", overviewKPIs.totalApplications],
    ["Approval Rate (%)", overviewKPIs.approvalRate],
    ["Pending Review", overviewKPIs.pendingReview],
    ["Requires Action", overviewKPIs.requiresAction],
    ["Conversion Rate (%)", overviewKPIs.conversionRate],
  ]);

  appendSheet(wb, "Daily Trends", [
    ["Date", "Label", "Applications", "Approved", "Rejected", "Withdrawn", "Deleted"],
    ...dailyTrends.map((row) => [
      row.date,
      row.day,
      row.applications,
      row.approved,
      row.rejected,
      row.withdrawn,
      row.deleted,
    ]),
  ]);

  appendSheet(wb, "Country Breakdown", [
    ["Country", "Applications", "Approved", "Percentage (%)"],
    ...countryBreakdown.map((row) => [
      row.country,
      row.applications,
      row.approved,
      row.percentage,
    ]),
  ]);

  appendSheet(wb, "Industry Breakdown", [
    ["Industry", "Count", "Percentage (%)"],
    ...industryBreakdown.map((row) => [row.industry, row.count, row.percentage]),
  ]);

  appendSheet(wb, "Business Types", [
    ["Country", "Business Type", "Count", "Percentage Within Country (%)"],
    ...businessTypeBreakdown.map((row) => [
      row.country,
      row.type,
      row.count,
      row.percentage,
    ]),
  ]);

  appendSheet(wb, "Application Status", [
    ["Status", "Count"],
    ...statusBreakdown.map((row) => [row.status, row.count]),
  ]);

  appendSheet(wb, "Pipeline", [
    ["Stage", "Count"],
    ...pipelineStages.map((row) => [row.stage, row.count]),
  ]);

  appendSheet(wb, "Draft Dropoff", [
    ["Draft Stage", "Count", "Percentage (%)"],
    ...draftDropoff.map((row) => [row.stage, row.count, row.percentage]),
  ]);

  appendSheet(wb, "Outcome Rates", [
    ["Metric", "Count", "Rate (%)"],
    ["Approved (No Manual Review)", outcomeMetrics.approvedNoManualReview, outcomeMetrics.approvedNoManualReviewRate],
    ["Approved (After Manual Review)", outcomeMetrics.approvedAfterManualReview, outcomeMetrics.approvedAfterManualReviewRate],
    ["Draft Drop-off", outcomeMetrics.draftCount, outcomeMetrics.dropoffRate],
    ["Withdrawn", outcomeMetrics.withdrawnCount, outcomeMetrics.withdrawalRate],
    ["Deleted", outcomeMetrics.deletedCount, outcomeMetrics.deletionRate],
  ]);

  appendSheet(wb, "Operations Overview", [
    ["Metric", "Value"],
    ["Escalation Rate (%)", operationsOverview.escalationRate],
    ["Average Manual Review Time (days)", operationsOverview.avgManualReviewTimeDays],
    ["Average Manual Review Time (formatted)", formatDurationFromDays(operationsOverview.avgManualReviewTimeDays)],
    ["Total Escalations", operationsOverview.totalEscalations],
  ]);

  appendSheet(wb, "Processing Time Trend", [
    ["Month", "Average Processing Days"],
    ...processingTimeTrend.map((row) => [row.month, row.avgDays]),
  ]);

  appendSheet(wb, "Staff Leaderboard", [
    [
      "Rank",
      "Reviewer ID",
      "Reviewer Name",
      "Assigned Applications",
      "Processed",
      "Average Review Time (days)",
      "Average Review Time (formatted)",
      "Approval Rate (%)",
      "Applications Left",
    ],
    ...sortedLeaderboard.map((row) => [
      row.rank,
      row.staffId || "",
      row.staffName || "",
      row.assignedApplications ?? 0,
      row.processed ?? 0,
      row.avgReviewTimeDays ?? 0,
      formatDurationFromDays(row.avgReviewTimeDays),
      row.approvalRate ?? 0,
      row.applicationsLeft ?? 0,
    ]),
  ]);

  appendSheet(wb, "Due Diligence", [
    ["Due Diligence Type", "Count", "Percentage (%)"],
    ...dueDiligence.map((row) => [row.type, row.count, row.percentage]),
  ]);

  appendSheet(wb, "Risk Distribution", [
    ["Risk Range", "Count", "Percentage (%)"],
    ...riskDistribution.map((row) => [row.range, row.count, row.percentage]),
  ]);

  appendSheet(wb, "Risk vs Approval", [
    ["Risk Range", "Approved", "Rejected", "Total", "Approval Rate (%)", "Rejected Rate (%)"],
    ...riskVsApproval.map((row) => [
      row.range,
      row.approved,
      row.rejected,
      row.total,
      row.approvalRate,
      row.rejectedRate,
    ]),
  ]);

  appendSheet(wb, "Top Triggered Rules", [
    ["Rule Code", "Rule", "Triggered Count", "Percentage (%)"],
    ...topTriggeredRules.map((row) => [
      row.code,
      row.rule,
      row.triggered,
      row.percentage,
    ]),
  ]);

  const rulesByCategoryRows = [["Category", "Total Rules", "Active Rules", "Inactive Rules"]];
  ruleCategories.forEach((category) => {
    rulesByCategoryRows.push([
      category.category,
      category.totalRules,
      category.activeRules,
      category.inactiveRules,
    ]);

    category.rules.forEach((rule) => {
      rulesByCategoryRows.push([
        `  - ${rule.rule_name}`,
        rule.rule_code,
        rule.status,
        rule.description || "",
      ]);
    });
  });

  appendSheet(wb, "Rules by Category", rulesByCategoryRows);

  const fileDate = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Analytics_Report_${fileDate}.xlsx`);
}