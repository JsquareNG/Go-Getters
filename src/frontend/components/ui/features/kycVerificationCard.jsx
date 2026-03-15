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
  Image as ImageIcon,
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
    Declined: "bg-destructive/10 text-destructive border-destructive/20",
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

export function KycVerificationCard({ kyc }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!kyc) return null;

  const overallStatus = normalizeStatus(kyc.overall_status);

  const verificationChecks = [
    {
      label: "ID Verification",
      status: normalizeStatus(kyc.id_verification_status),
      icon: Fingerprint,
    },
    {
      label: "Liveness Check",
      status: normalizeStatus(kyc.liveness_status),
      icon: ScanFace,
      score: kyc.liveness_score,
    },
    {
      label: "Face Match",
      status: normalizeStatus(kyc.face_match_status),
      icon: User,
      score: kyc.face_match_score,
    },
  ];

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

  const isDeclined = overallStatus === "Declined";
  const isApproved = overallStatus === "Approved";

  const borderColor = isDeclined
    ? "border-destructive/40"
    : isApproved
    ? "border-emerald-500/40"
    : "border-amber-500/40";

  const bgColor = isDeclined
    ? "bg-destructive/5"
    : isApproved
    ? "bg-emerald-500/5"
    : "bg-amber-500/5";

  const summaryText = isDeclined
    ? `Identity verification for ${kyc.full_name || "this applicant"} has failed. ${
        Array.isArray(kyc.risk_flags) ? kyc.risk_flags.length : 0
      } risk flag(s) detected.`
    : `Identity verification for ${kyc.full_name || "this applicant"} is ${overallStatus.toLowerCase()}.`;

  return (
    <Card className={cn(borderColor, bgColor)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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

                {kyc.manual_review_required && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600"
                  >
                    Manual Review Required
                  </Badge>
                )}
              </div>

              <p className="mb-2 text-sm text-foreground">{summaryText}</p>

              <div className="mb-2 flex flex-wrap gap-3">
                {verificationChecks.map((check) => (
                  <div key={check.label} className="flex items-center gap-1.5">
                    <VerificationStatusIcon status={check.status} />
                    <span className="text-xs text-muted-foreground">{check.label}</span>
                    {check.score !== undefined && check.score !== null && (
                      <span
                        className={cn(
                          "text-xs font-mono",
                          check.status === "Approved"
                            ? "text-emerald-600"
                            : check.status === "Declined"
                            ? "text-destructive"
                            : "text-amber-600",
                        )}
                      >
                        ({formatScore(check.score)})
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {Array.isArray(kyc.risk_flags) && kyc.risk_flags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {kyc.risk_flags.map((flag, index) => (
                    <Badge
                      key={`${flag}-${index}`}
                      variant="outline"
                      className="border-destructive/30 bg-destructive/5 text-[10px] font-mono text-destructive"
                    >
                      {formatRiskFlag(flag)}
                    </Badge>
                  ))}
                </div>
              )}

              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                {isOpen ? "Hide details" : "View full details"}
                {isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </CollapsibleTrigger>
            </div>
          </div>
        </CardContent>

        <CollapsibleContent>
          <div className="px-6 pb-5">
            <Separator className="mb-4" />

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
                  {kyc.has_duplicate_identity_hit && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Duplicate identity detected</span>
                    </div>
                  )}

                  {kyc.has_duplicate_face_hit && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Duplicate face detected</span>
                    </div>
                  )}

                  {kyc.manual_review_required && (
                    <div className="mt-1 flex items-start gap-2 rounded-md bg-amber-500/10 p-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-xs text-foreground">
                        <span className="font-medium">Manual review required.</span> This
                        verification needs manual review.
                      </p>
                    </div>
                  )}

                  {!kyc.has_duplicate_identity_hit &&
                    !kyc.has_duplicate_face_hit &&
                    !kyc.manual_review_required && (
                      <p className="text-sm text-muted-foreground">No warnings found.</p>
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
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {mediaItems
                      .filter((item) => item.type === "image")
                      .map((item) => (
                        <div
                          key={item.key}
                          className="overflow-hidden rounded-lg border border-border bg-background"
                        >
                          <div className="aspect-[4/3] bg-muted">
                            <img
                              src={item.url}
                              alt={item.label}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="space-y-2 p-3">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <p className="truncate text-sm font-medium text-foreground">
                                {item.label}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                            >
                              <Download className="h-4 w-4" />
                              Open Image
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-2">
                    {mediaItems
                      .filter((item) => item.type !== "image")
                      .map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
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
                </>
              )}
            </div>

            <p className="mt-4 text-right text-[10px] text-muted-foreground">
              Verified:{" "}
              {kyc.created_at
                ? new Date(kyc.created_at).toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}