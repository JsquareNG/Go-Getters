import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../primitives/Card";
import { Badge } from "../primitives/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../primitives/table";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../primitives/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { getAllLivenessDetections } from "../../../api/livenessDetectionApi";

const volumeConfig = {
  verifications: { label: "Verifications", color: "hsl(var(--primary))" },
};

const scoreTrendConfig = {
  livenessScore: { label: "Avg Liveness Score", color: "hsl(var(--primary))" },
};

const riskFlagConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
};

const demographicsConfig = {
  Male: { label: "Male", color: "#2563eb" },
  Female: { label: "Female", color: "#e43592" },
  Unknown: { label: "Unknown", color: "#9ca3af" },
  "<18": { label: "<18", color: "#9ca3af" },
  "18-24": { label: "18-24", color: "#2563eb" },
  "25-34": { label: "25-34", color: "#22c55e" },
  "35-44": { label: "35-44", color: "#f59e0b" },
  "45-64": { label: "45-64", color: "#a855f7" },
  "65+": { label: "65+", color: "#ef4444" },
};

const conversionConfig = {
  totalFinished: { label: "Total finished", color: "#dbe4ff" },
  converted: { label: "Converted", color: "#2563eb" },
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBackendDateTime(value) {
  if (!value) return null;

  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function formatDateTime(value) {
  const date = parseBackendDateTime(value);
  if (!date) return value || "-";

  return date.toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeCountryCode(value) {
  return String(value || "").trim().toUpperCase();
}

function countryNameFromCode(code) {
  if (code === "SGP" || code === "SG") return "Singapore";
  if (code === "IDN" || code === "ID") return "Indonesia";
  return code || "Unknown";
}

function countryFlagFromCode(code) {
  if (code === "SGP" || code === "SG") return "🇸🇬";
  if (code === "IDN" || code === "ID") return "🇮🇩";
  return "🌍";
}

function isApproved(status) {
  return String(status || "").toLowerCase() === "approved";
}

function isFinished(status) {
  const s = String(status || "").toLowerCase();
  return s === "approved" || s === "declined";
}

function isFailed(status) {
  return ["declined", "failed", "rejected"].includes(
    String(status || "").toLowerCase()
  );
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();

  if (s === "approved") {
    return "bg-status-approved/10 text-status-approved border-status-approved/20";
  }

  if (["declined", "failed", "rejected"].includes(s)) {
    return "bg-status-requires-action/10 text-status-requires-action border-status-requires-action/20";
  }

  return "bg-status-in-review/10 text-status-in-review border-status-in-review/20";
}

function isWithinDateRange(row, dateRange) {
  if (!dateRange?.from && !dateRange?.to) return true;

  const date = parseBackendDateTime(row.created_at);
  if (!date) return false;

  if (dateRange?.from && date < dateRange.from) return false;
  if (dateRange?.to && date > dateRange.to) return false;

  return true;
}

function buildDailyVerificationVolume(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const date = parseBackendDateTime(row.created_at);
    if (!date) return;

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        date: date.toLocaleDateString("en-SG", {
          month: "short",
          day: "numeric",
        }),
        verifications: 0,
      });
    }

    map.get(key).verifications += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => new Date(a.key) - new Date(b.key))
    .map(({ key, ...rest }) => rest);
}

function buildDailyAverageLivenessScore(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const date = parseBackendDateTime(row.created_at);
    if (!date) return;

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        date: date.toLocaleDateString("en-SG", {
          month: "short",
          day: "numeric",
        }),
        totalScore: 0,
        count: 0,
      });
    }

    const entry = map.get(key);
    entry.totalScore += safeNumber(row.liveness_score, 0);
    entry.count += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => new Date(a.key) - new Date(b.key))
    .map(({ key, totalScore, count, ...rest }) => ({
      ...rest,
      livenessScore: count > 0 ? Number((totalScore / count).toFixed(2)) : 0,
    }));
}

function buildWorkflowTracking(rows) {
  const total = rows.length;

  const idApproved = rows.filter((r) => isApproved(r.id_verification_status)).length;
  const livenessApproved = rows.filter((r) => isApproved(r.liveness_status)).length;
  const faceMatchApproved = rows.filter((r) => isApproved(r.face_match_status)).length;
  const manualReview = rows.filter((r) => !!r.manual_review_required).length;
  const duplicateHits = rows.filter(
    (r) => !!r.has_duplicate_identity_hit || !!r.has_duplicate_face_hit
  ).length;

  const pct = (count) =>
    total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;

  return [
    { step: "Total", count: total, percentage: 100 },
    { step: "ID Verification Approved", count: idApproved, percentage: pct(idApproved) },
    { step: "Liveness Approved", count: livenessApproved, percentage: pct(livenessApproved) },
    { step: "Face Match Approved", count: faceMatchApproved, percentage: pct(faceMatchApproved) },
    { step: "Manual Review", count: manualReview, percentage: pct(manualReview) },
    { step: "Duplicate Hits", count: duplicateHits, percentage: pct(duplicateHits) },
  ];
}

function buildCountryBreakdown(rows) {
  const counts = {};
  const total = rows.length;

  rows.forEach((row) => {
    const code = normalizeCountryCode(row.issuing_state_code) || "UNKNOWN";
    counts[code] = (counts[code] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([code, applications]) => ({
      code,
      country: countryNameFromCode(code),
      applications,
      percentage:
        total > 0 ? Number(((applications / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.applications - a.applications);
}

function buildVerificationResults(rows) {
  const total = rows.length;

  const makeMetric = (label, key) => {
    const passed = rows.filter((r) => isApproved(r[key])).length;
    const failed = rows.filter((r) => isFailed(r[key])).length;
    const passRate =
      total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 0;

    return {
      label,
      passed,
      failed,
      total,
      passRate,
    };
  };

  return [
    makeMetric("ID Verification", "id_verification_status"),
    makeMetric("Liveness", "liveness_status"),
    makeMetric("Face Match", "face_match_status"),
  ];
}

function buildLivenessDistribution(rows) {
  const buckets = [
    { range: "95-100%", count: 0, test: (score) => score >= 95 },
    { range: "90-94%", count: 0, test: (score) => score >= 90 && score < 95 },
    { range: "80-89%", count: 0, test: (score) => score >= 80 && score < 90 },
    { range: "Below 80%", count: 0, test: (score) => score < 80 },
  ];

  rows.forEach((row) => {
    const score = safeNumber(row.liveness_score, null);
    if (score === null) return;

    const bucket = buckets.find((b) => b.test(score));
    if (bucket) bucket.count += 1;
  });

  const total = rows.length;

  return buckets.map((bucket) => ({
    range: bucket.range,
    count: bucket.count,
    percentage: total > 0 ? Number(((bucket.count / total) * 100).toFixed(1)) : 0,
  }));
}

function formatRiskFlagLabel(flag) {
  return String(flag || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildRiskFlagBreakdown(rows) {
  const counts = {};

  rows.forEach((row) => {
    const flags = Array.isArray(row.risk_flags) ? row.risk_flags : [];
    flags.forEach((flag) => {
      counts[flag] = (counts[flag] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .map(([flag, count]) => ({
      flag,
      label: formatRiskFlagLabel(flag),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildLivenessMetrics(rows) {
  const total = rows.length;

  const avgSimilarityScore =
    total > 0
      ? Number(
          (
            rows.reduce((sum, row) => sum + safeNumber(row.face_match_score, 0), 0) /
            total
          ).toFixed(2)
        )
      : 0;

  const avgLivenessScore =
    total > 0
      ? Number(
          (
            rows.reduce((sum, row) => sum + safeNumber(row.liveness_score, 0), 0) /
            total
          ).toFixed(2)
        )
      : 0;

  const reVerificationRate =
    total > 0
      ? Number(
          (
            (rows.filter((row) => safeNumber(row.provider_session_number, 0) > 1).length /
              total) *
            100
          ).toFixed(1)
        )
      : 0;

  const livenessPassRate =
    total > 0
      ? Number(
          (
            (rows.filter((row) => isApproved(row.liveness_status)).length / total) *
            100
          ).toFixed(1)
        )
      : 0;

  return [
    {
      label: "Avg Similarity Score",
      value: avgSimilarityScore,
      suffix: "",
    },
    {
      label: "Avg Liveness Score",
      value: avgLivenessScore,
      suffix: "%",
    },
    {
      label: "Re-verification Rate",
      value: reVerificationRate,
      suffix: "%",
    },
    {
      label: "Liveness Pass Rate",
      value: livenessPassRate,
      suffix: "%",
    },
  ];
}

function getMediaLinks(images) {
  const media = images || {};

  return [
    { label: "Front", url: media.front_image_url, icon: ImageIcon },
    { label: "Back", url: media.back_image_url, icon: ImageIcon },
    { label: "Portrait", url: media.portrait_image_url, icon: ImageIcon },
    { label: "Front PDF", url: media.full_front_pdf_url, icon: FileText },
    { label: "Back PDF", url: media.full_back_pdf_url, icon: FileText },
    { label: "Liveness Ref", url: media.liveness_reference_image_url, icon: ImageIcon },
    { label: "Face Src", url: media.face_match_source_image_url, icon: ImageIcon },
    { label: "Face Tgt", url: media.face_match_target_image_url, icon: ImageIcon },
    { label: "Video", url: media.liveness_video_url, icon: Video },
  ].filter((item) => !!item.url);
}

function getAgeFromDob(dateOfBirth) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function normalizeGender(gender) {
  const value = String(gender || "").trim().toUpperCase();

  if (value === "M" || value === "MALE") return "Male";
  if (value === "F" || value === "FEMALE") return "Female";
  return "Unknown";
}

function getAgeBucket(age) {
  if (age == null) return "Unknown";
  if (age < 18) return "<18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 64) return "45-64";
  return "65+";
}

function buildGenderDemographics(rows) {
  const counts = {
    Male: 0,
    Female: 0,
    Unknown: 0,
  };

  rows.forEach((row) => {
    const gender = normalizeGender(row.gender);
    counts[gender] += 1;
  });

  return Object.entries(counts).map(([label, count]) => ({
    label,
    count,
    fill: demographicsConfig[label]?.color || "#9ca3af",
  }));
}

function buildAgeDemographics(rows) {
  const orderedBuckets = ["<18", "18-24", "25-34", "35-44", "45-64", "65+", "Unknown"];
  const counts = {
    "<18": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45-64": 0,
    "65+": 0,
    Unknown: 0,
  };

  rows.forEach((row) => {
    const age = getAgeFromDob(row.date_of_birth);
    const bucket = getAgeBucket(age);
    counts[bucket] += 1;
  });

  return orderedBuckets.map((label) => ({
    label,
    count: counts[label],
    fill: demographicsConfig[label]?.color || "#9ca3af",
  }));
}

function buildConversionRateData(rows) {
  const dayMap = new Map();

  rows.forEach((row) => {
    const date = parseBackendDateTime(row.created_at);
    if (!date) return;

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (!dayMap.has(key)) {
      dayMap.set(key, {
        key,
        date: date.toLocaleDateString("en-SG", {
          month: "short",
          day: "numeric",
        }),
        totalFinished: 0,
        converted: 0,
        conversionRate: 0,
      });
    }

    const entry = dayMap.get(key);

    if (isFinished(row.overall_status)) {
      entry.totalFinished += 1;
    }

    if (isApproved(row.overall_status)) {
      entry.converted += 1;
    }
  });

  return Array.from(dayMap.values())
    .sort((a, b) => new Date(a.key) - new Date(b.key))
    .map(({ key, totalFinished, converted, ...rest }) => ({
      ...rest,
      totalFinished,
      converted,
      conversionRate:
        totalFinished > 0
          ? Number(((converted / totalFinished) * 100).toFixed(1))
          : 0,
    }));
}

export function KycDocumentsTab({ dateRange, preset }) {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demographicView, setDemographicView] = useState("gender");

  useEffect(() => {
    const fetchRows = async () => {
      try {
        setLoading(true);

        const response = await getAllLivenessDetections();
        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const validRows = data.filter((row) => row?.application_id);

        console.log("getAllLivenessDetections response", response);
        console.log("normalized liveness rows", validRows);

        setAllRows(validRows);
      } catch (error) {
        console.error("Failed to fetch liveness detections:", error);
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, []);

  const rows = useMemo(() => {
    return allRows.filter((row) => isWithinDateRange(row, dateRange));
  }, [allRows, dateRange]);

  const verificationVolume = useMemo(
    () => ({
      total: rows.length,
      change: 0,
    }),
    [rows]
  );

  const dailyVerifications = useMemo(
    () => buildDailyVerificationVolume(rows),
    [rows]
  );

  const countryBreakdown = useMemo(() => buildCountryBreakdown(rows), [rows]);
  const verificationResults = useMemo(
    () => buildVerificationResults(rows),
    [rows]
  );
  const livenessMetrics = useMemo(() => buildLivenessMetrics(rows), [rows]);
  const livenessDistribution = useMemo(
    () => buildLivenessDistribution(rows),
    [rows]
  );
  const riskFlagRows = useMemo(() => buildRiskFlagBreakdown(rows), [rows]);
  const genderDemographics = useMemo(() => buildGenderDemographics(rows), [rows]);
  const ageDemographics = useMemo(() => buildAgeDemographics(rows), [rows]);
  const conversionRateData = useMemo(() => buildConversionRateData(rows), [rows]);

  const overallConversion = useMemo(() => {
    const finished = rows.filter((row) => isFinished(row.overall_status)).length;
    const converted = rows.filter((row) => isApproved(row.overall_status)).length;

    return {
      finished,
      converted,
      rate: finished > 0 ? Number(((converted / finished) * 100).toFixed(1)) : 0,
    };
  }, [rows]);

  const rangeDescription = useMemo(() => {
    switch (preset) {
      case "last-7":
        return "Real liveness records from the last 7 days";
      case "last-30":
        return "Real liveness records from the last 30 days";
      case "last-quarter":
        return "Real liveness records from the last quarter";
      case "last-year":
        return "Real liveness records from the last year";
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          return `Real liveness records from ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`;
        }
        return "Real liveness records from selected range";
      default:
        return "Real liveness records linked to applications";
    }
  }, [preset, dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Loading KYC and liveness analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-base font-medium">
              Verification Volume
            </CardTitle>
            <CardDescription>{rangeDescription}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {verificationVolume.total}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                Verifications
              </span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={volumeConfig} className="h-[220px] w-full">
            <AreaChart
              data={dailyVerifications}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="verifications"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#volumeFill)"
                dot={{ r: 0 }}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              ID Locations
            </CardTitle>
            <CardDescription>
              {countryBreakdown.length} countries from issuing state code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {countryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No country data available
              </p>
            ) : (
              countryBreakdown.map((c) => (
                <div key={c.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{countryFlagFromCode(c.code)}</span>
                      <span className="font-medium text-foreground">
                        {c.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-muted-foreground">
                        {c.percentage}%
                      </span>
                      <span className="font-semibold text-foreground">
                        {c.applications}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Risk Flag Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of risk flags from liveness detection records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={riskFlagConfig} className="h-[220px] w-full">
              <BarChart
                data={riskFlagRows}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  height={90}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Verification Results
            </CardTitle>
            <CardDescription>
              Pass and fail rates from database statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {verificationResults.map((metric) => {
                const isWarning = metric.passRate < 92;

                return (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {metric.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="tabular-nums text-muted-foreground">
                            {metric.passed}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <XCircle className="h-3 w-3 text-red-500" />
                          <span className="tabular-nums text-muted-foreground">
                            {metric.failed}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            isWarning
                              ? "text-status-in-review"
                              : "text-status-approved"
                          )}
                        >
                          {metric.passRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isWarning ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${metric.passRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Liveness Detection
            </CardTitle>
            <CardDescription>
              Biometric verification scores and outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {livenessMetrics.map((m) => (
                <div
                  key={m.label}
                  className="space-y-1 rounded-lg border bg-slate-300/30 p-3"
                >
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-semibold text-foreground tabular-nums">
                    {m.value}
                    <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                      {m.suffix}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                Liveness Score Distribution
              </p>
              <div className="space-y-2">
                {livenessDistribution.map((d) => (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      {d.range}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs font-medium text-foreground tabular-nums">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium">
                Demographics
              </CardTitle>
              <CardDescription>
                Gender and age distribution from liveness verification records
              </CardDescription>
            </div>

            <div className="inline-flex rounded-full bg-muted p-1">
              <button
                type="button"
                onClick={() => setDemographicView("gender")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  demographicView === "gender"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Gender
              </button>
              <button
                type="button"
                onClick={() => setDemographicView("age")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  demographicView === "age"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Age
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {demographicView === "gender" ? (
              <>
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  {genderDemographics.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>

                <ChartContainer config={demographicsConfig} className="h-[260px] w-full">
                  <BarChart
                    data={genderDemographics}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {genderDemographics.map((entry) => (
                        <Cell key={entry.label} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  {ageDemographics.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>

                <ChartContainer config={demographicsConfig} className="h-[260px] w-full">
                  <BarChart
                    data={ageDemographics}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {ageDemographics.map((entry) => (
                        <Cell key={entry.label} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium">
                Conversion Rate
              </CardTitle>
              <CardDescription>
                Ratio of approved sessions to total finished sessions (approved + declined)
              </CardDescription>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {overallConversion.rate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {overallConversion.converted} / {overallConversion.finished}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: conversionConfig.totalFinished.color }}
                />
                <span className="text-muted-foreground">Total finished</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: conversionConfig.converted.color }}
                />
                <span className="text-muted-foreground">Converted</span>
              </div>
            </div>

            <ChartContainer config={conversionConfig} className="h-[260px] w-full">
              <BarChart
                data={conversionRateData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="totalFinished"
                  fill={conversionConfig.totalFinished.color}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="converted"
                  fill={conversionConfig.converted.color}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default KycDocumentsTab;