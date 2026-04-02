import {
  Building2,
  ChevronRight,
  AlertCircle,
  Globe,
  Clock,
} from "lucide-react";
import { Button, Card, CardContent, StatusBadge } from "../primitives";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function getActionText(status) {
  switch (status) {
    case "Draft":
      return "Continue";
    case "Under Review":
    case "Under Manual Review":
      return "View Status";
    case "Requires Action":
      return "Take Action";
    case "Approved":
    case "Rejected":
    case "Withdrawn":
    case "Auto Rejected":
      return "View Details";
    default:
      return "View";
  }
}

const normKey = (v) => {
  if (v == null) return null;
  const s = String(v)
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return s.length ? s : null;
};

const normDisplay = (v) => (v == null ? "" : String(v).trim());

const ApplicationCard = ({
  application,
  variant = "default", // "default" | "management"
  onClick,
  detailPath,
}) => {
  const navigate = useNavigate();

  const [status, setStatus] = useState(application.current_status);
  const [prevStatus, setPrevStatus] = useState(
    application.previous_status ?? null
  );

  const appId = application.application_id;
  const companyName = application.business_name || "Untitled Business";
  const country = application.business_country || "N/A";
  const lastUpdated = application.last_edited;
  const riskGrade = application?.risk_grade ?? application?.riskGrade ?? "";

  const sKey = normKey(status);
  const sDisplay = normDisplay(status);

  const isUrgent = variant !== "management" && sKey === "requires action";
  const isActionable =
    variant !== "management" &&
    (sKey === "draft" || sKey === "requires action");

  useEffect(() => {
    setStatus(application.current_status);
    setPrevStatus(application.previous_status ?? null);
  }, [application.current_status, application.previous_status]);

  const handleClick = () => {
    if (onClick) {
      onClick(application);
      return;
    }

    if (detailPath) {
      navigate(`${detailPath}/${appId}`);
      return;
    }

    if (variant === "management") {
      navigate(`/management-landing-page/${appId}`);
      return;
    }

    navigate(`/landingpage/${appId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const safeStop = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
  };

  const buttonText =
    variant === "management" ? "View Details" : getActionText(sDisplay);

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-card-hover",
        isUrgent && "ring-1 ring-rose-500/20"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <Building2 className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {companyName}
                  </h3>

                  {riskGrade && (
                    <span
                      className={cn(
                        "text-xs px-3 py-0.5 rounded-full font-medium whitespace-nowrap flex items-center",
                        riskGrade === "Auto-Rejected" && "border-red-600 bg-red-600 border text-white",
                        riskGrade === "Enhanced Due Diligence (EDD)" && "border-red-600 border text-red-600",
                        riskGrade === "Standard Due Diligence (CDD)" && "border-orange-600 border text-orange-600",
                        riskGrade === "Simplified Due Diligence (SDD)" && "border-emerald-600 border text-emerald-600"
                        )}
                    >
                      {riskGrade}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>{country}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatusBadge status={sDisplay} />

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last edited {formatDate(lastUpdated)}</span>
              </div>

              <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                ID: {appId}
              </div>
            </div>

            {application.reason && variant !== "management" && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2.5 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">{application.reason}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end justify-between h-full self-stretch gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={isActionable ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5",
                  isUrgent && "bg-rose-500 hover:bg-rose-600 text-white"
                )}
                onClick={(e) => {
                  safeStop(e);
                  handleClick();
                }}
              >
                {buttonText}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { ApplicationCard };