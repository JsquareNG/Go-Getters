import { useState, useMemo, useEffect } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import {
  Button,
  ApplicationCard,
  ApplicationStats,
  EmptyState,
} from "@/components/ui";
import { useNavigate } from "react-router-dom";
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
        // ✅ CHANGE: Treat 404 (no applications) as empty state, not an error
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

  /**
   * Restriction logic:
   * Block new application if user has any existing application in these statuses
   */
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

    if (status === "Approved")
      return "You already have an approved SME account. You cannot create another application.";
    if (status === "Requires Action")
      return "You already have an SME application that requires action. Please complete it instead of creating a new one.";
    if (status === "Draft")
      return "You already have a draft SME application. Please continue that application instead of creating a new one.";
    return "You already have an SME application in progress. You can only submit one application per user.";
  }, [applications, blocksNewApplication, BLOCKING_STATUSES]);

  // ✅ NEW: hide button once user already has any application
  const showNewApplicationButton = applications.length === 0;

  // Filter Logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        selectedStatus === "All" || app.current_status === selectedStatus;

      const q = searchQuery.toLowerCase();
      const matchesSearch = (app.business_name || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [selectedStatus, searchQuery, applications]);

  // Stats Logic
  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) =>
        ["Under Manual Review", "Under Review"].includes(a.current_status)
      ).length,
      requiresAction: applications.filter((a) => a.current_status === "Requires Action").length,
      approved: applications.filter((a) => a.current_status === "Approved").length,
    }),
    [applications]
  );

  // ✅ new: detect empty state for this user (no apps)
  const hasNoApplications = applications.length === 0 && !error;

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
        {/* HEADER */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Onboarding Applications
            </h1>
            <p className="text-muted-foreground">
              Manage and track your business account applications
            </p>

            {/* Restriction banner */}
            {blocksNewApplication && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{restrictionMessage}</span>
              </div>
            )}
          </div>

          {/* {showNewApplicationButton && (
            <Button
              onClick={handleCreateNew}
              className="gap-2 shrink-0 bg-red-500 hover:bg-red-600"
              title="Create a new application"
            >
              <Plus className="h-4 w-4" />
              New Application
            </Button>
          )} */}
        </div>

        {/* STATS OVERVIEW */}
        <div className="mb-8">
          <ApplicationStats {...stats} />
        </div>

        {/* APPLICATIONS LIST */}
        {/* ✅ CHANGE: If there are no applications, show CTA instead of red error banner */}
        {error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 flex flex-col items-center text-center gap-3">
            <p className="text-lg font-semibold text-foreground">
              You don’t have any applications yet.
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