import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  AlertCircle,
  Globe,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

function getActionText(status) {
  switch (status) {
    case "In Progress":
      return "Continue";
    case "Submitted":
    case "Under Review":
      return "View Status";
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

  // Mapping API fields to local variables
  const appId = application.application_id;
  const companyName = application.business_name || "Untitled Business";
  const country = application.business_country || "N/A";
  const status = application.current_status;
  const lastUpdated = application.last_edited;

  const isActionable = ["In Progress", "Requires Action"].includes(status);
  const isUrgent = status === "Requires Action";

  const handleClick = () => {
    navigate(`/landingpage/${appId}`);
  };

  // Date formatter for "2026-02-05T15:50:28..."
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
        isUrgent && "ring-1 ring-rose-500/20"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground truncate">
                  {companyName}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>{country}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Using the API's current_status */}
              <StatusBadge status={status} />
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last edited {formatDate(lastUpdated)}</span>
              </div>
              
              <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                ID: {appId}
              </div>
            </div>

            {/* Display Reason if application was rejected or needs action */}
            {application.reason && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2.5 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {application.reason}
                </p>
              </div>
            )}
          </div>

          {/* Right Action */}
          <div className="flex flex-col items-end justify-between h-full self-stretch">
            <Button
              variant={isActionable ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1.5",
                isUrgent && "bg-rose-500 hover:bg-rose-600 text-white"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {getActionText(status)}
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