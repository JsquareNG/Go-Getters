// Analytics mock data for SME onboarding dashboard

// Overview KPIs
export const overviewKPIs = {
  totalApplications: 1247,
  totalApplicationsTrend: 12.3,
  approvalRate: 78.4,
  approvalRateTrend: 2.1,
  avgProcessingDays: 8.2,
  avgProcessingDaysTrend: -1.4,
  pendingReview: 43,
  pendingReviewTrend: -5.8,
  requiresAction: 18,
  requiresActionTrend: 3.2,
  conversionRate: 72.1,
  conversionRateTrend: 1.8,
};

// Monthly application trends (last 12 months)
export const monthlyTrends = [
  { month: "Apr", applications: 89, approved: 68, rejected: 12, withdrawn: 9 },
  { month: "May", applications: 95, approved: 72, rejected: 14, withdrawn: 9 },
  { month: "Jun", applications: 102, approved: 78, rejected: 11, withdrawn: 13 },
  { month: "Jul", applications: 110, approved: 85, rejected: 15, withdrawn: 10 },
  { month: "Aug", applications: 98, approved: 74, rejected: 13, withdrawn: 11 },
  { month: "Sep", applications: 115, approved: 90, rejected: 14, withdrawn: 11 },
  { month: "Oct", applications: 108, approved: 84, rejected: 12, withdrawn: 12 },
  { month: "Nov", applications: 120, approved: 96, rejected: 10, withdrawn: 14 },
  { month: "Dec", applications: 88, approved: 65, rejected: 14, withdrawn: 9 },
  { month: "Jan", applications: 125, approved: 98, rejected: 15, withdrawn: 12 },
  { month: "Feb", applications: 130, approved: 102, rejected: 13, withdrawn: 15 },
  { month: "Mar", applications: 67, approved: 55, rejected: 6, withdrawn: 6 },
];

// Pipeline breakdown
export const pipelineStages = [
  { stage: "Not Started", count: 34, avgDays: 0, color: "hsl(var(--status-not-started))" },
  { stage: "In Progress", count: 52, avgDays: 3.2, color: "hsl(var(--status-in-progress))" },
  { stage: "Submitted", count: 28, avgDays: 1.5, color: "hsl(var(--status-submitted))" },
  { stage: "In Review", count: 43, avgDays: 4.8, color: "hsl(var(--status-in-review))" },
  { stage: "Requires Action", count: 18, avgDays: 6.1, color: "hsl(var(--status-requires-action))" },
  { stage: "Approved", count: 72, avgDays: 0, color: "hsl(var(--status-approved))" },
];

// Application types breakdown
export const accountTypeBreakdown = [
  { type: "SME Business Account", count: 735, percentage: 58.9 },
  { type: "Cross-Border Payments", count: 512, percentage: 41.1 },
];

// Compliance & Risk metrics
export const complianceMetrics = [
  { label: "KYC Verification", passRate: 94.2, totalChecks: 1180, flagged: 68 },
  { label: "AML Screening", passRate: 97.8, totalChecks: 1180, flagged: 26 },
  { label: "Document Authenticity", passRate: 91.5, totalChecks: 3540, flagged: 301 },
  { label: "Sanctions Check", passRate: 99.6, totalChecks: 1180, flagged: 5 },
  { label: "PEP Screening", passRate: 98.1, totalChecks: 1180, flagged: 22 },
  { label: "Business Verification", passRate: 88.3, totalChecks: 1180, flagged: 138 },
];

export const riskDistribution = [
  { risk: "Low", count: 845, percentage: 67.8 },
  { risk: "Medium", count: 312, percentage: 25.0 },
  { risk: "High", count: 72, percentage: 5.8 },
  { risk: "Critical", count: 18, percentage: 1.4 },
];

// Document submission stats
export const documentStats = {
  totalUploaded: 4820,
  pendingVerification: 156,
  verified: 4423,
  rejected: 241,
  avgVerificationHours: 12.4,
  mostCommonReject: "Expired document",
};

// Performance metrics
export const teamPerformance = [
  { member: "Sarah Tan", processed: 145, avgTime: "6.2 days", approvalRate: 82.1 },
  { member: "Michael Lim", processed: 132, avgTime: "7.1 days", approvalRate: 79.5 },
  { member: "Rachel Wong", processed: 128, avgTime: "5.8 days", approvalRate: 84.4 },
  { member: "David Lee", processed: 118, avgTime: "8.3 days", approvalRate: 76.3 },
  { member: "Amanda Koh", processed: 112, avgTime: "7.5 days", approvalRate: 80.4 },
];

export const slaMetrics = {
  withinSLA: 89.2,
  avgFirstResponse: "4.2 hrs",
  avgResolution: "8.2 days",
  escalationRate: 7.8,
  resubmissionRate: 23.4,
  firstTimeApproval: 64.8,
};

// Rejection reasons
export const rejectionReasons = [
  { reason: "Incomplete documentation", count: 48, percentage: 34.3 },
  { reason: "Failed KYC/AML check", count: 32, percentage: 22.9 },
  { reason: "Ineligible business type", count: 24, percentage: 17.1 },
  { reason: "Inconsistent information", count: 18, percentage: 12.9 },
  { reason: "High-risk jurisdiction", count: 12, percentage: 8.6 },
  { reason: "Other", count: 6, percentage: 4.3 },
];