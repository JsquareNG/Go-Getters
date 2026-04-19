import { useState, useMemo, useEffect } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import {
  Button,
  ApplicationCard,
  EmptyState,
} from "@/components/ui";
import { useNavigate, useLocation } from "react-router-dom";
import { getApplicationsByUserId } from "../api/applicationApi";

import { useSelector } from "react-redux";
import { selectUser } from "../store/authSlice";

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const [pageBanner, setPageBanner] = useState(location.state?.banner || null);

  const bannerStyles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    withdrawn: "border-blue-200 bg-blue-50 text-blue-700",
    deleted: "border-red-200 bg-red-50 text-red-700",
  };

  useEffect(() => {
    const fetchApps = async () => {
      if (!user?.user_id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await getApplicationsByUserId(user.user_id);
        const apps = Array.isArray(data) ? data : data ? [data] : [];
        setApplications(apps);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          setApplications([]);
          setError(null);
        } else {
          setError("Failed to load applications. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApps();
  }, [user?.user_id]);

  useEffect(() => {
    if (location.state?.banner) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  const BLOCKING_STATUSES = useMemo(
    () => ["Draft", "Under Review", "Under Manual Review", "Requires Action", "Approved"],
    []
  );

  const blocksNewApplication = useMemo(() => {
    return applications.some((a) => BLOCKING_STATUSES.includes(a.current_status));
  }, [applications, BLOCKING_STATUSES]);

  const restrictionMessage = useMemo(() => {
    if (!blocksNewApplication) return null;

    const blockingApp = applications.find((a) =>
      BLOCKING_STATUSES.includes(a.current_status)
    );
    const status = blockingApp?.current_status;

    if (status === "Approved") {
      return "Your application for a business account has already been approved.";
    }

    if (status === "Requires Action") {
      return "You already have an SME application that requires action. Please complete it as soon as possible.";
    }

    if (status === "Draft") {
      return "You already have a draft SME application. Please continue and submit that application as soon as possible.";
    }

    return "You already have an SME application in progress. You can only submit one application per user.";
  }, [applications, blocksNewApplication, BLOCKING_STATUSES]);


  const showNewApplicationButton = useMemo(() => {
    if (applications.length === 0) return true;
    return applications.every((a) => a.current_status === "Deleted");
  }, [applications]);


  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        selectedStatus === "All" || app.current_status === selectedStatus;

      const q = searchQuery.trim().toLowerCase();
      const businessName = String(app.business_name ?? "").toLowerCase();

      return matchesStatus && (q === "" || businessName.includes(q));
    });
  }, [applications, selectedStatus, searchQuery]);

  const handleCreateNew = () => {
    if (blocksNewApplication) return;
    navigate("/application/edit/new/0");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12 animate-fade-in">

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Onboarding Application
            </h1>
            <p className="text-muted-foreground">
              Manage and track your business account application
            </p>

            {blocksNewApplication && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{restrictionMessage}</span>
              </div>
            )}
          </div>
        </div>

        {pageBanner && (
          <div
            className={`mb-6 flex items-center rounded-lg border px-4 py-3 animate-fade-in ${
              bannerStyles[pageBanner.type] || bannerStyles.success
            }`}
          >
            <p className="flex-1 text-sm font-medium">
              {pageBanner.message}
            </p>

            <button
              onClick={() => setPageBanner(null)}
              className="ml-auto pl-6 text-xs font-medium opacity-70 hover:underline hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        ) : showNewApplicationButton ? (
          <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
            <p className="text-lg font-semibold text-foreground">
              {applications.length === 0
                ? "You don’t have any applications yet."
                : "All your previous applications were deleted."}
            </p>
            <p className="text-sm text-muted-foreground">
              Create a new application to get started.
            </p>

            <Button
              onClick={handleCreateNew}
              className="gap-2 bg-red-500 hover:bg-red-600"
            >
              <Plus className="h-4 w-4" />
              New Application
            </Button>
          </div>
        ) : filteredApplications.length > 0 ? (
          <div className="grid gap-4">
            {filteredApplications.map((app, index) => (
              <div
                key={app.application_id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ApplicationCard application={app} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilter={selectedStatus !== "All" || searchQuery !== ""}
            onClearFilter={() => {
              setSelectedStatus("All");
              setSearchQuery("");
            }}
          />
        )}
      </main>
    </div>
  );
}