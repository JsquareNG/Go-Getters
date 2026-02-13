import {
  ArrowRight,
  Building2,
  ChevronRight,
  AlertCircle,
  Globe,
  Clock,
  MoreVertical,
  Undo2,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

import { withdrawApplication, deleteApplication } from "../../api/applicationApi";

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
      return "View Details";
    default:
      return "View";
  }
}

export function ApplicationCard({ application }) {
  const navigate = useNavigate();

  // Local state so UI updates instantly
  const [status, setStatus] = useState(application.current_status);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const appId = application.application_id;
  const companyName = application.business_name || "Untitled Business";
  const country = application.business_country || "N/A";
  const lastUpdated = application.last_edited;

  const isActionable = ["Draft", "Requires Action"].includes(status);
  const isUrgent = status === "Requires Action";
  const showHamburger = status === "Draft" || status === "Requires Action";

  // ✅ Debug: see if local status stays in sync when parent props change
  useEffect(() => {
    console.log("[PROP] application.current_status changed:", application.current_status);
  }, [application.current_status]);

  // ✅ Debug: see isHidden toggling
  useEffect(() => {
    console.log("[STATE] isHidden:", isHidden);
  }, [isHidden]);

  const handleClick = () => {
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

  // ✅ safer stop (works for Radix onSelect too)
  const safeStop = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
  };

  // Draft -> Withdraw
  const handleWithdraw = async (e) => {
    console.log("[UI] Withdraw clicked", { appId, status });
    safeStop(e);

    try {
      setIsWithdrawing(true);
      console.log("[API] calling withdrawApplication", appId);

      const res = await withdrawApplication(appId);

      console.log("[API] withdrawApplication success:", res);

      // Update UI
      setStatus("Withdrawn");
    } catch (err) {
      console.error("[API] withdrawApplication failed");
      console.error("status:", err?.response?.status);
      console.error("data:", err?.response?.data);
      console.error("message:", err?.message);
      console.error("full:", err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Requires Action -> Delete
  const handleDelete = async (e) => {
    console.log("[UI] Delete clicked", { appId, status });
    safeStop(e);

    const ok = window.confirm("Delete this application? This cannot be undone.");
    console.log("[UI] confirm result:", ok);
    if (!ok) return;

    try {
      setIsDeleting(true);
      console.log("[API] calling deleteApplication", appId);

      const res = await deleteApplication(appId);

      console.log("[API] deleteApplication success:", res);

      // Hide card
      setIsHidden(true);
    } catch (err) {
      console.error("[API] deleteApplication failed");
      console.error("status:", err?.response?.status);
      console.error("data:", err?.response?.data);
      console.error("message:", err?.message);
      console.error("full:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isHidden) return null;

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

              <div className="min-w-0">
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
              <StatusBadge status={status} />

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last edited {formatDate(lastUpdated)}</span>
              </div>

              <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                ID: {appId}
              </div>
            </div>

            {application.reason && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2.5 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">{application.reason}</p>
              </div>
            )}
          </div>

          {/* Right Action */}
          <div className="flex flex-col items-end justify-between h-full self-stretch gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={isActionable ? "default" : "outline"}
                size="sm"
                disabled={isWithdrawing || isDeleting}
                className={cn(
                  "gap-1.5",
                  isUrgent && "bg-rose-500 hover:bg-rose-600 text-white"
                )}
                onClick={(e) => {
                  safeStop(e);
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

              {showHamburger && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={safeStop}
                      disabled={isWithdrawing || isDeleting}
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="bg-card">
                    {/* ✅ Use onSelect for Radix dropdown items */}
                    {status === "Draft" && (
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onSelect={handleWithdraw}
                        disabled={isWithdrawing}
                      >
                        <Undo2 className="h-4 w-4" />
                        {isWithdrawing ? "Withdrawing..." : "Withdraw Application"}
                      </DropdownMenuItem>
                    )}

                    {status === "Requires Action" && (
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                        onSelect={handleDelete}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeleting ? "Deleting..." : "Delete Application"}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}