import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  FileSearch,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { getAllApplications, getReviewJob } from "../api/applicationApi";
import {
  Input,
  ApplicationCard,
} from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/primitives/Select";

export default function ManagementLandingPage() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const STATUS_OPTIONS = [
    "All",
    "Approved",
    "Auto Rejected",
    "Deleted",
    "Rejected",
    "Requires Action",
    "Under Manual Review",
    "Under Review",
    "Withdrawn",
  ];

  const RISK_PRIORITY = {
    "auto rejected": 0,
    "enhanced due diligence (edd)": 1,
    "standard due diligence (cdd)": 2,
    "simplified due diligence (sdd)": 3,
  };

  const getStatus = (a) => a.current_status ?? a.status ?? "";
  const itemStyle =
  "cursor-pointer data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-700 hover:bg-gray-100";

  const getRiskGrade = (a) => {
    const rawRiskGrade = a.risk_grade ?? a.riskGrade ?? "";
    const status = String(getStatus(a)).trim().toLowerCase();

    if (status === "auto rejected") {
      return "Auto Rejected";
    }

    return rawRiskGrade;
  };

  const getRiskRank = (a) => {
    const riskGrade = String(getRiskGrade(a)).trim().toLowerCase();
    return RISK_PRIORITY[riskGrade] ?? 999;
  };

  useEffect(() => {
    const fetchAllApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getAllApplications();
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
        console.error("Failed to load all applications:", e);
        setError("Failed to load applications. Please try again.");
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllApplications();
  }, []);

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
        const status = String(getStatus(app));
        const previousStatus = app.previous_status ?? null;

        if (
          status.trim().toLowerCase() === "draft" &&
          previousStatus == null
        ) {
          return false;
        }

        const matchesStatus =
          selectedStatus === "All" ||
          status.toLowerCase() === selectedStatus.toLowerCase();

        const matchesSearch =
          q === "" ||
          id.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          businessName.toLowerCase().includes(q) ||
          status.toLowerCase().includes(q);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const getTime = (x) =>
          new Date(
            x.updated_at ?? x.last_edited ?? x.created_at ?? 0,
          ).getTime();

        const statusA = String(getStatus(a)).toLowerCase();
        const statusB = String(getStatus(b)).toLowerCase();

        if (sortBy === "date_desc") {
          return getTime(b) - getTime(a);
        }

        if (sortBy === "date_asc") {
          return getTime(a) - getTime(b);
        }

        if (sortBy === "status_asc") {
          return statusA.localeCompare(statusB);
        }

        if (sortBy === "status_desc") {
          return statusB.localeCompare(statusA);
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
            All Applications
          </h1>
          <p className="text-muted-foreground">
            View all submitted applications across the platform
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID, business or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10"
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 w-[200px] text-sm flex items-center justify-between">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status} className={itemStyle}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">Sort by:</span>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-[200px] text-sm flex items-center justify-between">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="date_desc" className={itemStyle}>Newest</SelectItem>
                <SelectItem value="date_asc" className={itemStyle}>Oldest</SelectItem>
                <SelectItem value="status_asc" className={itemStyle}>Status (A-Z)</SelectItem>
                <SelectItem value="status_desc" className={itemStyle}>Status (Z-A)</SelectItem>
                <SelectItem value="risk_desc" className={itemStyle}>Risk Priority (High)</SelectItem>
                <SelectItem value="risk_asc" className={itemStyle}>Risk Priority (Low)</SelectItem>
              </SelectContent>
            </Select>
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
                  <ApplicationCard
                    application={application}
                    variant="management"
                    onReview={() =>
                      navigate(
                        `/management-landing-page/${
                          application.application_id ?? application.id
                        }`,
                      )
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
                Try adjusting your search query or filters
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}