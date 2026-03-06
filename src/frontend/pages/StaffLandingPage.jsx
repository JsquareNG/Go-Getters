import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileSearch, AlertCircle, Search } from "lucide-react";
import { getApplicationByReviewer, getReviewJob } from "../api/applicationApi";
import { useSelector } from "react-redux";
import { selectUser } from "../store/authSlice";
import {
  StatusFilter,
  Input,
  ApplicationReviewCard,
  StaffStats,
} from "@/components/ui";

const riskPriority = {
  "Enhanced Due Diligence (EDD)": 0,
  "Standard EDD": 1,
  "Simplified EDD": 2,
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

  const handleReview = (id) => {
    navigate(`/staff-landingpage/${id}`);
  };

  const getStatus = (a) => a.current_status ?? a.status;
  const getRiskGrade = (a) => a.risk_grade ?? a.riskGrade ?? "";

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

        const reviewable = list.filter((app) => {
          const status = getStatus(app);
          return status === "Under Review" || status === "Under Manual Review";
        });

        const enrichedApps = await Promise.all(
          reviewable.map(async (app) => {
            const applicationId = app.application_id ?? app.id;

            try {
              const reviewJob = await getReviewJob(applicationId);

              return {
                ...app,
                risk_grade: reviewJob?.risk_grade ?? "",
                risk_score: reviewJob?.risk_score ?? 0,
                review_job_id: reviewJob?.job_id ?? null,
              };
            } catch (err) {
              console.error(
                `Failed to fetch review job for application ${applicationId}:`,
                err
              );

              return {
                ...app,
                risk_grade: "",
                risk_score: 0,
                review_job_id: null,
              };
            }
          })
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
      "Total Pending": applications.length,
      "Enhanced EDD": 0,
      "Standard EDD": 0,
    };

    applications.forEach((a) => {
      const riskGrade = getRiskGrade(a);

      if (riskGrade === "Enhanced Due Diligence (EDD)") {
        counts["Enhanced EDD"] += 1;
      }

      if (riskGrade === "Standard EDD") {
        counts["Standard EDD"] += 1;
      }
    });

    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        const q = searchQuery.toLowerCase();

        const id = String(app.application_id ?? app.id ?? "");
        const customerName = String(app.customer_name ?? app.customerName ?? "");
        const businessName = String(app.business_name ?? app.businessName ?? "");
        const riskGrade = getRiskGrade(app);

        const matchesSearch =
          q === "" ||
          id.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          businessName.toLowerCase().includes(q);

        let matchesCapsule = true;

        if (selectedStatus === "Total Pending") {
          matchesCapsule = true;
        } else if (selectedStatus === "Enhanced EDD") {
          matchesCapsule = riskGrade === "Enhanced Due Diligence (EDD)";
        } else if (selectedStatus === "Standard EDD") {
          matchesCapsule = riskGrade === "Standard EDD";
        }

        return matchesSearch && matchesCapsule;
      })
      .sort((a, b) => {
        const ra = getRiskGrade(a);
        const rb = getRiskGrade(b);
        return (riskPriority[ra] ?? 999) - (riskPriority[rb] ?? 999);
      });
  }, [applications, searchQuery, selectedStatus]);

  const stats = useMemo(() => {
    const totalPending = applications.length;

    const enhancedEDD = applications.filter(
      (a) => getRiskGrade(a) === "Enhanced Due Diligence (EDD)"
    ).length;

    const standardEDD = applications.filter(
      (a) => getRiskGrade(a) === "Standard EDD"
    ).length;

    return {
      totalPending,
      enhancedEDD,
      standardEDD,
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

        <div className="mb-8">
          <StaffStats
            totalPending={stats.totalPending ?? 0}
            enhancedEDD={stats.enhancedEDD ?? 0}
            standardEDD={stats.standardEDD ?? 0}
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

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by business name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
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
                Try adjusting your filter or search query
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}