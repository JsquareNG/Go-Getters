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
import { Button, Card, CardContent, StatusBadge } from "../primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../features";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { withdrawApplication, deleteApplication } from "@/api/applicationApi";

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

// ✅ robust normalizer for comparisons
const normKey = (v) => {
  if (v == null) return null;
  const s = String(v)
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return s.length ? s : null;
};

// ✅ for displaying in UI
const normDisplay = (v) => (v == null ? "" : String(v).trim());

const ApplicationCard = ({ application }) => {
  const navigate = useNavigate();

  const [status, setStatus] = useState(application.current_status);
  const [prevStatus, setPrevStatus] = useState(
    application.previous_status ?? null
  );

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const appId = application.application_id;
  const companyName = application.business_name || "Untitled Business";
  const country = application.business_country || "N/A";
  const lastUpdated = application.last_edited;

  const sKey = normKey(status);
  const pKey = normKey(prevStatus);
  const sDisplay = normDisplay(status);

  const menuAction = useMemo(() => {
    if (sKey === "draft" && pKey == null) return "delete";
    if (sKey === "draft" && pKey === "requires action") return "withdraw";
    if (sKey === "requires action" && pKey === "under manual review")
      return "withdraw";
    return null;
  }, [sKey, pKey]);

  const showHamburger = menuAction !== null;

  const isUrgent = sKey === "requires action";
  const isActionable = sKey === "draft" || sKey === "requires action";

  useEffect(() => {
    setStatus(application.current_status);
    setPrevStatus(application.previous_status ?? null);
  }, [application.current_status, application.previous_status]);

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

  // ✅ Use this ONLY when you really need to prevent default
  const safeStop = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
  };

  // ✅ Use this for Dropdown trigger (DON'T preventDefault or Radix may not open)
  const stopOnly = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
  };

  const handleWithdraw = async (e) => {
    safeStop(e);
    try {
      setIsWithdrawing(true);
      await withdrawApplication(appId);
      setStatus("Withdrawn");
      setPrevStatus(status);
    } catch (err) {
      console.error("[API] withdrawApplication failed", err?.response?.data || err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDelete = async (e) => {
    safeStop(e);

    const ok = window.confirm("Delete this application? This cannot be undone.");
    if (!ok) return;

    try {
      setIsDeleting(true);
      await deleteApplication(appId);
      setIsHidden(true);
    } catch (err) {
      console.error("[API] deleteApplication failed", err?.response?.data || err);
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
              <StatusBadge status={sDisplay} />

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
                {getActionText(sDisplay)}
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
                      onPointerDown={stopOnly} // ✅ allow Radix to open
                      onClick={stopOnly}       // ✅ prevent card navigation
                      disabled={isWithdrawing || isDeleting}
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="bg-card">
                    {menuAction === "withdraw" && (
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onSelect={handleWithdraw}
                        disabled={isWithdrawing}
                      >
                        <Undo2 className="h-4 w-4" />
                        {isWithdrawing ? "Withdrawing..." : "Withdraw Application"}
                      </DropdownMenuItem>
                    )}

                    {menuAction === "delete" && (
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
};

export { ApplicationCard };