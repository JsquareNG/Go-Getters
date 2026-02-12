import {
  ArrowRight,
  Building2,
  ChevronRight,
  AlertCircle,
  Globe,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  StatusBadge,
} from "../primitives";
import { RiskBadge } from "./RiskBadge";
import {
  Clock,
  AlertTriangle,
  User,
  Building2,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, differenceInHours, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function getActionText(status) {
  switch (status) {
    case "Under Manual Review":
    case "Under Review":
      return "Review";
    case "Requires Action":
      return "Follow Up";
    case "Approved":
    case "Rejected":
      return "View";
    default:
      return "Open";
  }
}

// Reviewer-focused card (similar format to ApplicationCard)
const ApplicationReviewCard = ({ application, onReview }) => {
  // Map fields (supports snake_case + fallback)
  const appId = application.application_id ?? application.id;
  const companyName = application.business_name ?? application.businessName ?? "Untitled Business";
  const country = application.business_country ?? application.businessCountry ?? "N/A";
  const status = application.current_status ?? application.status ?? "N/A";
  const lastUpdated = application.last_edited ?? application.lastEdited ?? null;

  const risk = application.risk_level ?? application.riskLevel; // e.g. critical/high/medium/low
  const isCritical = risk === "critical";
  const isUrgent = status === "Requires Action";

  const handleClick = () => {
    // If parent supplies onReview, use it (your StaffLandingPage does)
    if (typeof onReview === "function") onReview(appId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-card-hover",
        isUrgent && "ring-1 ring-rose-500/20",
        isCritical && "border-l-4 border-l-rose-500"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors",
                isCritical && "bg-rose-50"
              )}>
                {isCritical ? (
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-medium text-foreground truncate">
                  {companyName}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span className="truncate">{country}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatusBadge status={status} />

              {/* Reviewer-only: Risk tag */}
              {risk && (
                <div
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded border",
                    isCritical
                      ? "text-rose-600 border-rose-200 bg-rose-50"
                      : "text-muted-foreground border-muted bg-muted/40"
                  )}
                >
                  Risk: {String(risk).toUpperCase()}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last edited {formatDate(lastUpdated)}</span>
              </div>

              <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                ID: {appId}
              </div>
            </div>

            {/* Show reason if exists */}
            {application.reason && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2.5 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">{application.reason}</p>
              </div>
            )}
          </div>

          {/* Right Action */}
          <div className="flex flex-col items-end justify-between h-full self-stretch">
            <Button
              variant={isUrgent || isCritical ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1.5",
                (isUrgent || isCritical) && "bg-rose-500 hover:bg-rose-600 text-white"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {getActionText(status)}
              {(isUrgent || isCritical) ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { ApplicationReviewCard };
