// Analytics mock data for SME onboarding dashboard

// ─── Overview KPIs ───────────────────────────────────────────
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

// ─── Applications by Country ────────────────────────────────
export const countryBreakdown = [
  { country: "Singapore", code: "SG", applications: 824, approved: 658, percentage: 66.1 },
  { country: "Indonesia", code: "ID", applications: 423, approved: 319, percentage: 33.9 },
];

// ─── Business Type Breakdown (by country) ───────────────────
export const businessTypeBreakdown = [
  { type: "Sole Proprietorship", count: 312, percentage: 37.9, country: "SG" },
  { type: "Private Limited", count: 285, percentage: 34.6, country: "SG" },
  { type: "Partnership", count: 142, percentage: 17.2, country: "SG" },
  { type: "LLP", count: 85, percentage: 10.3, country: "SG" },
  { type: "PT (Perseroan Terbatas)", count: 198, percentage: 46.8, country: "ID" },
  { type: "CV (Commanditaire Vennootschap)", count: 112, percentage: 26.5, country: "ID" },
  { type: "Firma", count: 68, percentage: 16.1, country: "ID" },
  { type: "UD (Usaha Dagang)", count: 45, percentage: 10.6, country: "ID" },
];

// ─── Industry Breakdown ─────────────────────────────────────
export const industryBreakdown = [
  { industry: "Retail & E-commerce", count: 287, percentage: 23.0 },
  { industry: "Logistics & Transport", count: 198, percentage: 15.9 },
  { industry: "Trading & Commodities", count: 176, percentage: 14.1 },
  { industry: "F&B / Hospitality", count: 154, percentage: 12.3 },
  { industry: "Professional Services", count: 132, percentage: 10.6 },
  { industry: "Manufacturing", count: 108, percentage: 8.7 },
  { industry: "Technology", count: 98, percentage: 7.9 },
  { industry: "Others", count: 94, percentage: 7.5 },
];

// Account types breakdown
export const accountTypeBreakdown = [
  { type: "SME Business Account", count: 735, percentage: 58.9 },
  { type: "Cross-Border Payments", count: 512, percentage: 41.1 },
];

// ─── Onboarding Funnel ──────────────────────────────────────
export const funnelStages = [
  { stage: "Application Started", count: 1247, dropOff: 0, fill: "hsl(210, 100%, 50%)" },
  { stage: "KYC Verification", count: 1089, dropOff: 12.7, fill: "hsl(262, 83%, 58%)" },
  { stage: "Documents Uploaded", count: 942, dropOff: 13.5, fill: "hsl(38, 92%, 50%)" },
  { stage: "Submitted for Review", count: 876, dropOff: 7.0, fill: "hsl(170, 70%, 45%)" },
  { stage: "Approved", count: 735, dropOff: 16.1, fill: "hsl(142, 71%, 45%)" },
];

export const funnelKPIs = {
  autoApprovalRate: 64.8,
  autoApprovalRateTrend: 3.2,
  manualReviewConversionRate: 82.3,
  manualReviewConversionRateTrend: 1.5,
  overallDropOffRate: 41.1,
  overallDropOffRateTrend: -2.4,
  withdrawalRate: 8.7,
  withdrawalRateTrend: -0.9,
  avgCompletionTime: 12.4,
  avgCompletionTimeTrend: -1.8,
};

// Drop-off by stage detail
export const dropOffByStage = [
  { stage: "KYC Verification", droppedCount: 158, reason: "Failed identity verification or abandoned", percentage: 34.3 },
  { stage: "Document Upload", reason: "Incomplete or expired documents", droppedCount: 147, percentage: 31.9 },
  { stage: "Review Stage", reason: "Information mismatch or high-risk flags", droppedCount: 66, percentage: 14.3 },
  { stage: "Final Approval", reason: "Compliance rejection or SME withdrawal", droppedCount: 90, percentage: 19.5 },
];

// ─── Pipeline breakdown ────────────────────────────────────
export const pipelineStages = [
  { stage: "Not Started", count: 34, avgDays: 0, color: "hsl(var(--status-not-started))" },
  { stage: "In Progress", count: 52, avgDays: 3.2, color: "hsl(var(--status-in-progress))" },
  { stage: "Submitted", count: 28, avgDays: 1.5, color: "hsl(var(--status-submitted))" },
  { stage: "In Review", count: 43, avgDays: 4.8, color: "hsl(var(--status-in-review))" },
  { stage: "Requires Action", count: 18, avgDays: 6.1, color: "hsl(var(--status-requires-action))" },
  { stage: "Approved", count: 72, avgDays: 0, color: "hsl(var(--status-approved))" },
];

// ─── Operations & Staff Performance ────────────────────────
export const operationsKPIs = {
  avgProcessingTime: 8.2,
  avgProcessingTimeTrend: -1.4,
  escalationRate: 7.8,
  escalationRateTrend: -0.6,
  manualReviewTime: 4.6,
  manualReviewTimeTrend: -0.8,
  totalEscalations: 97,
  totalEscalationsTrend: -3.2,
  avgReviewTimePerStaff: 5.8,
  avgReviewTimePerStaffTrend: -0.5,
  applicationsPerStaffPerDay: 3.4,
  applicationsPerStaffPerDayTrend: 0.3,
};

export const teamPerformance = [
  { member: "Rachel Wong", processed: 145, avgTime: "5.8 days", approvalRate: 84.4, escalationsHandled: 24, rank: 1 },
  { member: "Sarah Tan", processed: 138, avgTime: "6.2 days", approvalRate: 82.1, escalationsHandled: 18, rank: 2 },
  { member: "Michael Lim", processed: 132, avgTime: "7.1 days", approvalRate: 79.5, escalationsHandled: 22, rank: 3 },
  { member: "David Lee", processed: 118, avgTime: "8.3 days", approvalRate: 76.3, escalationsHandled: 15, rank: 4 },
  { member: "Amanda Koh", processed: 112, avgTime: "7.5 days", approvalRate: 80.4, escalationsHandled: 18, rank: 5 },
];

export const slaMetrics = {
  withinSLA: 89.2,
  avgFirstResponse: "4.2 hrs",
  avgResolution: "8.2 days",
  escalationRate: 7.8,
  resubmissionRate: 23.4,
  firstTimeApproval: 64.8,
};

// ─── KYC & Document Metrics ────────────────────────────────
export const kycMetrics = [
  { label: "Identity Verification", passed: 1082, failed: 98, total: 1180, passRate: 91.7 },
  { label: "Address Verification", passed: 1108, failed: 72, total: 1180, passRate: 93.9 },
  { label: "Business Ownership", passed: 1045, failed: 135, total: 1180, passRate: 88.6 },
  { label: "Sanctions Screening", passed: 1175, failed: 5, total: 1180, passRate: 99.6 },
  { label: "PEP Screening", passed: 1158, failed: 22, total: 1180, passRate: 98.1 },
];

export const ocrMetrics = {
  extractionAccuracy: 94.7,
  extractionAccuracyTrend: 1.2,
  fieldsExtracted: 18420,
  manualCorrections: 976,
  correctionRate: 5.3,
};

export const documentIssues = [
  { document: "ACRA Business Profile", missingCount: 67, manualReviewCount: 42, percentage: 22.1 },
  { document: "Board Resolution", missingCount: 54, manualReviewCount: 38, percentage: 17.8 },
  { document: "Proof of Address", missingCount: 48, manualReviewCount: 31, percentage: 15.8 },
  { document: "Bank Statement (6 months)", missingCount: 43, manualReviewCount: 52, percentage: 14.2 },
  { document: "Director ID / Passport", missingCount: 38, manualReviewCount: 28, percentage: 12.5 },
  { document: "Memorandum of Association", missingCount: 32, manualReviewCount: 22, percentage: 10.5 },
  { document: "Financial Statements", missingCount: 21, manualReviewCount: 35, percentage: 6.9 },
];

export const documentStats = {
  totalUploaded: 4820,
  pendingVerification: 156,
  verified: 4423,
  rejected: 241,
  avgVerificationHours: 12.4,
  mostCommonReject: "Expired document",
};

// ─── KYC Daily Volume ───────────────────────────────────────
export const dailyVerifications = [
  { date: "Mar 1", verifications: 12 },
  { date: "Mar 2", verifications: 8 },
  { date: "Mar 3", verifications: 2 },
  { date: "Mar 4", verifications: 1 },
  { date: "Mar 5", verifications: 0 },
  { date: "Mar 6", verifications: 3 },
  { date: "Mar 7", verifications: 5 },
  { date: "Mar 8", verifications: 9 },
  { date: "Mar 9", verifications: 14 },
  { date: "Mar 10", verifications: 18 },
  { date: "Mar 11", verifications: 22 },
  { date: "Mar 12", verifications: 15 },
  { date: "Mar 13", verifications: 8 },
  { date: "Mar 14", verifications: 11 },
  { date: "Mar 15", verifications: 15 },
  { date: "Mar 16", verifications: 10 },
  { date: "Mar 17", verifications: 7 },
];

export const verificationVolume = {
  total: 180,
  change: 42,
};

// ─── Workflow Tracking ──────────────────────────────────────
export const workflowTracking = [
  { step: "Total", count: 180, percentage: 100 },
  { step: "ID Verification", count: 180, percentage: 100 },
  { step: "Liveness", count: 175, percentage: 97.2 },
  { step: "Face Match", count: 175, percentage: 97.2 },
  { step: "Proof of Address", count: 12, percentage: 6.7 },
];

// ─── Average Verification Time ──────────────────────────────
export const avgVerificationTime = {
  overallAvg: "34.0s",
  breakdown: [
    { label: "Total", value: "34.0s", icon: "total" },
    { label: "ID Check", value: "16.1s", icon: "id" },
    { label: "Liveness", value: "17.2s", icon: "liveness" },
    { label: "Face Match", value: "0.1s", icon: "face" },
    { label: "PoA", value: "0.1s", icon: "poa" },
    { label: "Processing", value: "17.8s", icon: "processing" },
  ],
};

export const dailyAvgVerificationTime = [
  { date: "Mar 1", seconds: 28 },
  { date: "Mar 3", seconds: 22 },
  { date: "Mar 5", seconds: 18 },
  { date: "Mar 7", seconds: 25 },
  { date: "Mar 9", seconds: 30 },
  { date: "Mar 11", seconds: 32 },
  { date: "Mar 13", seconds: 35 },
  { date: "Mar 15", seconds: 38 },
  { date: "Mar 17", seconds: 28 },
];

// ─── Resubmission Insights ─────────────────────────────────
export const resubmissionInsights = [
  { date: "Mar 11", firstPass: 92, second: 5, thirdPlus: 2, abandoned: 1 },
  { date: "Mar 12", firstPass: 0, second: 0, thirdPlus: 0, abandoned: 0 },
  { date: "Mar 13", firstPass: 0, second: 0, thirdPlus: 0, abandoned: 0 },
  { date: "Mar 14", firstPass: 88, second: 8, thirdPlus: 3, abandoned: 1 },
  { date: "Mar 15", firstPass: 95, second: 3, thirdPlus: 1, abandoned: 1 },
  { date: "Mar 16", firstPass: 90, second: 6, thirdPlus: 3, abandoned: 1 },
  { date: "Mar 17", firstPass: 85, second: 10, thirdPlus: 4, abandoned: 1 },
];

// ─── Liveness Detection Metrics ─────────────────────────────
export const livenessMetrics = [
  { label: "Avg Similarity Score", value: 92.4, suffix: "%", description: "Face match confidence between selfie and ID photo" },
  { label: "Avg Liveness Score", value: 96.8, suffix: "%", description: "Confidence that the user is a live person" },
  { label: "Re-verification Rate", value: 8.3, suffix: "%", description: "Users who needed to redo the liveness check" },
  { label: "Liveness Pass Rate", value: 94.2, suffix: "%", description: "Users who passed on first attempt" },
];

export const livenessDistribution = [
  { range: "95-100%", count: 812, percentage: 68.8 },
  { range: "90-94%", count: 198, percentage: 16.8 },
  { range: "80-89%", count: 112, percentage: 9.5 },
  { range: "Below 80%", count: 58, percentage: 4.9 },
];

// ─── Risk & Compliance ──────────────────────────────────────
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

export const topRiskRules = [
  { rule: "High-risk jurisdiction match", triggered: 89, percentage: 24.3, severity: "High" },
  { rule: "Unusual transaction pattern", triggered: 72, percentage: 19.7, severity: "Medium" },
  { rule: "PEP association detected", triggered: 54, percentage: 14.8, severity: "Critical" },
  { rule: "Adverse media mention", triggered: 48, percentage: 13.1, severity: "High" },
  { rule: "Incomplete beneficial ownership", triggered: 42, percentage: 11.5, severity: "Medium" },
  { rule: "Document age > 3 months", triggered: 38, percentage: 10.4, severity: "Low" },
  { rule: "Revenue inconsistency", triggered: 23, percentage: 6.3, severity: "Medium" },
];

// Rejection reasons
export const rejectionReasons = [
  { reason: "Incomplete documentation", count: 48, percentage: 34.3 },
  { reason: "Failed KYC/AML check", count: 32, percentage: 22.9 },
  { reason: "Ineligible business type", count: 24, percentage: 17.1 },
  { reason: "Inconsistent information", count: 18, percentage: 12.9 },
  { reason: "High-risk jurisdiction", count: 12, percentage: 8.6 },
  { reason: "Other", count: 6, percentage: 4.3 },
];