import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  User,
  Fingerprint,
  ScanFace,
  Download,
  FileText,
  Video,
  History,
} from "lucide-react";
import { Card, CardContent } from "../primitives/Card";
import { Badge } from "../primitives/Badge";
import { Separator } from "../primitives/Separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../primitives/collapsible";
import { Button } from "../primitives/Button";
import { cn } from "@/lib/utils";

function normalizeStatus(status) {
  if (!status) return "Pending";

  const s = String(status).toLowerCase();

  if (["approved", "approve", "completed", "success", "verified", "clear"].includes(s)) {
    return "Approved";
  }

  if (["declined", "rejected", "failed", "fail", "denied"].includes(s)) {
    return "Declined";
  }

  return "Pending";
}

function VerificationStatusIcon({ status }) {
  if (status === "Approved") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (status === "Declined") {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function OverallStatusBadge({ status }) {
  const styles = {
    Approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Declined: "bg-red-500/10 text-red-600 border-red-500/20",
    Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", styles[status])}>
      {status}
    </Badge>
  );
}

function formatRiskFlag(flag) {
  if (!flag) return "-";
  return String(flag)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatScore(score) {
  if (score === null || score === undefined || score === "") return null;

  const numeric = Number(score);
  if (Number.isNaN(numeric)) return score;

  if (numeric <= 1) return `${(numeric * 100).toFixed(1)}%`;
  return `${numeric}%`;
}

function formatGender(gender) {
  if (!gender) return "-";
  if (gender === "M") return "Male";
  if (gender === "F") return "Female";
  return gender;
}

function prettifyMediaKey(key) {
  if (!key) return "-";
  return String(key)
    .replace(/_url$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getMediaType(url = "") {
  const lower = String(url).toLowerCase();

  if (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  ) {
    return "image";
  }

  if (lower.includes(".mp4") || lower.includes(".mov") || lower.includes(".webm")) {
    return "video";
  }

  if (lower.includes(".pdf")) {
    return "pdf";
  }

  return "file";
}

function normalizeScoreToPercent(score) {
  if (score === null || score === undefined || score === "") return null;

  const numeric = Number(score);
  if (Number.isNaN(numeric)) return null;

  return numeric <= 1 ? numeric * 100 : numeric;
}

function KycAttemptDetails({ kyc }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!kyc) return null;

  const overallStatus = normalizeStatus(kyc.overall_status);
  const faceMatchPercent = normalizeScoreToPercent(kyc.face_match_score);
  const hasLowFaceMatchWarning =
    faceMatchPercent !== null && faceMatchPercent >= 60 && faceMatchPercent <= 70;

  const mediaItems = useMemo(() => {
    if (!kyc?.images || typeof kyc.images !== "object") return [];
    return Object.entries(kyc.images)
      .filter(([, url]) => !!url)
      .map(([key, url]) => ({
        key,
        label: prettifyMediaKey(key),
        url,
        type: getMediaType(url),
      }));
  }, [kyc]);

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {kyc.full_name || "Applicant"}
              </p>
              <OverallStatusBadge status={overallStatus} />
              <Badge variant="outline" className="text-[10px]">
                {kyc.created_at
                  ? new Date(kyc.created_at).toLocaleString("en-SG")
                  : "Unknown time"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>ID Verification: {kyc.id_verification_status || "-"}</span>
              <span>Liveness: {formatScore(kyc.liveness_score) || "-"}</span>
              <span>Face Match: {formatScore(kyc.face_match_score) || "-"}</span>
            </div>

            {Array.isArray(kyc.risk_flags) && kyc.risk_flags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kyc.risk_flags.map((flag, index) => (
                  <Badge
                    key={`${flag}-${index}`}
                    variant="outline"
                    className="border-black/20 bg-orange-300/30 text-[10px] font-mono text-foreground"
                  >
                    {formatRiskFlag(flag)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {isOpen ? "Hide details" : "View details"}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Separator className="my-4" />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Identity Information
              </p>
              <div className="space-y-2">
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium">{kyc.full_name || "-"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Document Type</p>
                  <p className="text-sm font-medium">{kyc.document_type || "-"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Document Number</p>
                  <p className="text-sm font-mono font-medium">
                    {kyc.document_number_masked || kyc.document_number || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Personal Details
              </p>
              <div className="space-y-2">
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium">{kyc.date_of_birth || "-"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium">{formatGender(kyc.gender)}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Issuing Country</p>
                  <p className="text-sm font-medium">{kyc.issuing_state_code || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Warnings
              </p>
              <div className="space-y-2">
                {hasLowFaceMatchWarning && (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Face match score is between 60% and 70%. Review carefully.
                    </span>
                  </div>
                )}
                
                {kyc.manual_review_required && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-xs text-foreground">
                      <span className="font-medium">Manual review required.</span> This
                      verification needs manual review.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-0.5 text-xs text-muted-foreground">Address</p>
            <p className="text-sm font-medium">{kyc.formatted_address || "-"}</p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              KYC Media
            </p>

            {mediaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No KYC media files available.</p>
            ) : (
              <div className="space-y-2">
                {mediaItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.type === "video" ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : item.type === "pdf" ? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Download className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.url}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-3 gap-2"
                      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                    >
                      <Download className="h-4 w-4" />
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function KycVerificationCard({ kycRecords = [] }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const records = Array.isArray(kycRecords) ? kycRecords : [];
  const latestKyc = records[0] || null;

  if (!latestKyc) return null;

  const overallStatus = normalizeStatus(latestKyc.overall_status);
  const faceMatchPercent = normalizeScoreToPercent(latestKyc.face_match_score);
  const hasLowFaceMatchWarning =
    faceMatchPercent !== null && faceMatchPercent >= 60 && faceMatchPercent <= 70;

  const verificationChecks = [
    {
      label: "ID Verification",
      status: normalizeStatus(latestKyc.id_verification_status),
      icon: Fingerprint,
    },
    {
      label: "Liveness Check",
      status: normalizeStatus(latestKyc.liveness_status),
      icon: ScanFace,
      score: latestKyc.liveness_score,
    },
    {
      label: "Face Match",
      status: normalizeStatus(latestKyc.face_match_status),
      icon: User,
      score: latestKyc.face_match_score,
    },
  ];

  const isDeclined = overallStatus === "Declined";
  const isApproved = overallStatus === "Approved";

  const borderColor = isDeclined
    ? "border-red-600"
    : isApproved
    ? "border-emerald-500/40"
    : "border-amber-500/40";

  const bgColor = isDeclined
    ? "bg-pink-100"
    : isApproved
    ? "bg-emerald-500/5"
    : "bg-amber-500/5";

  const summaryText = isDeclined
    ? `Latest identity verification for ${latestKyc.full_name || "this applicant"} has failed.`
    : `Latest identity verification for ${latestKyc.full_name || "this applicant"} is ${overallStatus.toLowerCase()}.`;

  return (
    <Card className={cn(borderColor, bgColor)}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <ShieldAlert
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              isDeclined ? "text-destructive" : isApproved ? "text-emerald-600" : "text-amber-500",
            )}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-medium",
                  isDeclined
                    ? "text-destructive"
                    : isApproved
                    ? "text-emerald-700"
                    : "text-foreground",
                )}
              >
                KYC Verification {overallStatus}
              </p>

              <OverallStatusBadge status={overallStatus} />

              <Badge variant="outline" className="text-[10px]">
                {records.length} approved attempt{records.length > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Latest verified:{" "}
                {latestKyc.created_at
                  ? new Date(latestKyc.created_at).toLocaleString("en-SG")
                  : "-"}
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setHistoryOpen((prev) => !prev)}
              >
                <History className="h-4 w-4" />
                {historyOpen ? "Hide KYC history" : `View KYC history (${records.length})`}
                {historyOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {historyOpen && (
              <div className="mt-1 space-y-3">
                <Separator />
                <div className="space-y-3 pt-2">
                  {records.map((record, index) => (
                    <div key={record.id || record.provider_session_id || index}>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          KYC Check {index + 1}
                        </Badge>
                      </div>

                      <KycAttemptDetails kyc={record} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}