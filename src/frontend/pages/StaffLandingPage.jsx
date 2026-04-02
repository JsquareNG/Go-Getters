import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Loader2,
  FileSearch,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { getApplicationByReviewer, getReviewJob } from "../api/applicationApi";
import { useSelector } from "react-redux";
import { selectUser } from "../store/authSlice";
import {
  StatusFilter,
  Input,
  ApplicationReviewCard,
  StaffStats,
} from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/primitives/Select";

const riskPriority = {
  "Enhanced Due Diligence (EDD)": 0,
  "Standard Due Diligence (CDD)": 1,
  "Simplified Due Diligence (SDD)": 2,
  "Past Applications": 3,
};

export default function StaffLandingPage() {
  const navigate = useNavigate();

  const user = useSelector(selectUser);
  const employeeId = user?.employee_id ?? user?.employeeId ?? user?.user_id;

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedStatus, setSelectedStatus] = useState("Total Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  const location = useLocation();
  const banner = location.state?.banner;
  const itemStyle =
  "cursor-pointer data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-700 hover:bg-gray-100";

  const handleReview = (id) => {
    navigate(`/staff-landingpage/${id}`);
  };

  const getStatus = (a) => a.current_status ?? a.status ?? "";
  const getRiskGrade = (a) => a.risk_grade ?? a.riskGrade ?? "";

  const getTime = (x) =>
    new Date(x.updated_at ?? x.last_edited ?? x.created_at ?? 0).getTime();

  const getRiskRank = (x) => riskPriority[getRiskGrade(x)] ?? 999;

  const isPendingStatus = (status) =>
    status === "Under Review" || status === "Under Manual Review";

  const isPastStatus = (status) =>
    status === "Approved" || status === "Rejected";

  useEffect(() => {
    const fetchAssignedApps = async () => {
      if (!employeeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await getApplicationByReviewer(employeeId);
        const list = Array.isArray(data) ? data : data ? [data] : [];

        const enrichedApps = await Promise.all(
          list.map(async (app) => {
            const applicationId = app.application_id ?? app.id;

            try {
              const reviewJob = await getReviewJob(applicationId);

              return {
                ...app,
                risk_grade: reviewJob?.risk_grade ?? app?.risk_grade ?? "",
                risk_score: reviewJob?.risk_score ?? app?.risk_score ?? 0,
                review_job_id: reviewJob?.job_id ?? app?.review_job_id ?? null,
              };
            } catch (err) {
              console.error(
                `Failed to fetch review job for application ${applicationId}:`,
                err,
              );

              return {
                ...app,
                risk_grade: app?.risk_grade ?? "",
                risk_score: app?.risk_score ?? 0,
                review_job_id: app?.review_job_id ?? null,
              };
            }
          }),
        );

        setApplications(enrichedApps);
      } catch (e) {
        console.error("Failed to load assigned applications:", e);
        setError("Failed to load assigned applications. Please try again.");
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedApps();
  }, [employeeId]);

  const statusCounts = useMemo(() => {
    const counts = {
      "Total Pending": 0,
      "Enhanced Due Diligence (EDD)": 0,
      "Standard Due Diligence (CDD)": 0,
      "Past Applications": 0,
    };

    applications.forEach((app) => {
      const status = getStatus(app);
      const riskGrade = getRiskGrade(app);

      if (isPendingStatus(status)) {
        counts["Total Pending"] += 1;

        if (riskGrade === "Enhanced Due Diligence (EDD)") {
          counts["Enhanced Due Diligence (EDD)"] += 1;
        }

        if (riskGrade === "Standard Due Diligence (CDD)") {
          counts["Standard Due Diligence (CDD)"] += 1;
        }
      }

      if (isPastStatus(status)) {
        counts["Past Applications"] += 1;
      }
    });

    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        const q = searchQuery.trim().toLowerCase();

        const id = String(app.application_id ?? app.id ?? "");
        const customerName = String(
          app.customer_name ?? app.customerName ?? "",
        );
        const businessName = String(
          app.business_name ?? app.businessName ?? "",
        );
        const riskGrade = getRiskGrade(app);
        const status = getStatus(app);

        const matchesSearch =
          q === "" ||
          id.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          businessName.toLowerCase().includes(q);

        let matchesCapsule = false;

        if (selectedStatus === "Total Pending") {
          matchesCapsule = isPendingStatus(status);
        } else if (selectedStatus === "Enhanced Due Diligence (EDD)") {
          matchesCapsule =
            isPendingStatus(status) && riskGrade === "Enhanced Due Diligence (EDD)";
        } else if (selectedStatus === "Standard Due Diligence (CDD)") {
          matchesCapsule =
            isPendingStatus(status) && riskGrade === "Standard Due Diligence (CDD)";
        } else if (selectedStatus === "Past Applications") {
          matchesCapsule = isPastStatus(status);
        }

        return matchesSearch && matchesCapsule;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return getTime(b) - getTime(a);
        }

        if (sortBy === "date_asc") {
          return getTime(a) - getTime(b);
        }

        if (sortBy === "risk_desc") {
          const riskCompare = getRiskRank(a) - getRiskRank(b);
          if (riskCompare !== 0) return riskCompare;
          return getTime(b) - getTime(a);
        }

        if (sortBy === "risk_asc") {
          const riskCompare = getRiskRank(b) - getRiskRank(a);
          if (riskCompare !== 0) return riskCompare;
          return getTime(b) - getTime(a);
        }

        return 0;
      });
  }, [applications, searchQuery, selectedStatus, sortBy]);

  const stats = useMemo(() => {
    const pendingApps = applications.filter((a) =>
      isPendingStatus(getStatus(a)),
    );

    const totalPending = pendingApps.length;

    const enhancedCDD = pendingApps.filter(
      (a) => getRiskGrade(a) === "Enhanced Due Diligence (EDD)",
    ).length;

    const standardCDD = pendingApps.filter(
      (a) => getRiskGrade(a) === "Standard Due Diligence (CDD)",
    ).length;

    return {
      totalPending,
      enhancedCDD,
      standardCDD,
    };
  }, [applications]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Application Review Queue
          </h1>
          <p className="text-muted-foreground">
            View applications assigned to you for review
          </p>
        </div>

        {banner && (
          <div
            className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-3 ${
              banner.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <p className="text-sm font-medium">{banner.message}</p>
            </div>

            <button
              onClick={() => navigate(location.pathname, { replace: true })}
              className="text-xs font-medium opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-8">
          <StaffStats
            totalPending={stats.totalPending ?? 0}
            enhancedCDD={stats.enhancedCDD ?? 0}
            standardCDD={stats.standardCDD ?? 0}
          />
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <StatusFilter
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              statusCounts={statusCounts}
            />

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by business name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <span className="text-sm text-muted-foreground">Sort by:</span>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-full bg-white text-sm sm:w-[190px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="date_desc" className={itemStyle}>Newest</SelectItem>
                  <SelectItem value="date_asc" className={itemStyle}>Oldest</SelectItem>
                  <SelectItem value="risk_desc" className={itemStyle}>Risk Priority (High)</SelectItem>
                  <SelectItem value="risk_asc" className={itemStyle}>Risk Priority (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredApplications.length} application(s)
        </div>

        <div className="mt-6">
          {filteredApplications.length > 0 ? (
            <div className="grid gap-4">
              {filteredApplications.map((application, index) => (
                <div
                  key={application.application_id ?? application.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ApplicationReviewCard
                    application={application}
                    onReview={() =>
                      handleReview(application.application_id ?? application.id)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium text-foreground">
                No applications found
              </h3>
              <p className="text-muted-foreground">
                {selectedStatus === "Past Applications"
                  ? "No past approved or rejected applications found for this reviewer"
                  : "Try adjusting your filter or search query"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}