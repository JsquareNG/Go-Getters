import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

function getActionText(status) {
  switch (status) {
    case "Not started":
      return "Start Application";
    case "In Progress":
      return "Continue";
    case "Submitted":
    case "In Review":
      return "View Details";
    case "Requires Action":
      return "Take Action";
    case "Approved":
      return "View Details";
    default:
      return "View";
  }
}

export function ApplicationCard({ application }) {
  const navigate = useNavigate();
  const isActionable = ["Not started", "In Progress", "Requires Action"].includes(
    application.status
  );
  const isUrgent = application.status === "Requires Action";

  const handleClick = () => {
    navigate(`/landingpage/${application.id}`);
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-card-hover",
        isUrgent && "ring-1 ring-status-requires-action/20"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {application.companyName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {application.accountType}
                </p>
              </div>
            </div>

            {/* Status & Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <StatusBadge status={application.status} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {application.lastUpdated}
              </span>
            </div>

            {/* Progress Bar for In Progress */}
            {application.status === "In Progress" &&
              application.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{application.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-status-in-progress transition-all"
                      style={{ width: `${application.progress}%` }}
                    />
                  </div>
                </div>
              )}

            {/* Action Required Alert */}
            {isUrgent && application.actionRequired && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-status-requires-action/5 p-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-status-requires-action mt-0.5" />
                <p className="text-xs text-status-requires-action">
                  {application.actionRequired}
                </p>
              </div>
            )}
          </div>

          {/* Right Action */}
          <div className="flex flex-col items-end justify-between h-full">
            <Button
              variant={isActionable ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1.5",
                isUrgent &&
                  "bg-status-requires-action hover:bg-status-requires-action/90"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {getActionText(application.status)}
              {isActionable ? (
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
}
