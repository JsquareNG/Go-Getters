import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileSearch, AlertCircle, Search } from "lucide-react";
import { getApplicationByReviewer } from "../api/applicationApi";
import { useSelector } from "react-redux";
import { selectUser } from "../store/authSlice";
import { StatusFilter, Input, ApplicationReviewCard, StaffStats} from "@/components/ui";

const riskPriority = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function StaffLandingPage() {
  const navigate = useNavigate();

  // Logged-in staff user
  const user = useSelector(selectUser);

  // make sure this matches your auth payload (employee id)
  const employeeId = user?.employee_id ?? user?.employeeId ?? user?.user_id;

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // StatusFilter capsules
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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

        // ✅ remove finalised applications from staff queue
        const reviewable = list.filter((app) => {
          const status = app.current_status ?? app.status;
          return status !== "Approved" && status !== "Rejected";
        });

        setApplications(reviewable);
      } catch (e) {
        setError("Failed to load assigned applications. Please try again.");
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedApps();
  }, [employeeId]);

  const handleReview = (id) => {
    navigate(`/staff-landingpage/${id}`);
  };

  const getStatus = (a) => a.current_status ?? a.status;
  const getRisk = (a) => a.risk_level ?? a.riskLevel;

  // counts for StatusFilter (only your staff filters)
  const statusCounts = useMemo(() => {
    const counts = {
      All: applications.length,
      "Under Manual Review": 0,
      "Awaiting Resubmission": 0, // maps to "Requires Action"
      Approved: 0,
      Critical: 0, // risk-based
    };

    applications.forEach((a) => {
      const status = getStatus(a);
      const risk = getRisk(a);

      if (status === "Under Manual Review") counts["Under Manual Review"]++;
      if (status === "Requires Action") counts["Awaiting Resubmission"]++;
      if (status === "Approved") counts["Approved"]++;
      if (risk === "critical") counts["Critical"]++;
    });

    return counts;
  }, [applications]);

  // Filter + sort list using selectedStatus + search
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        const q = searchQuery.toLowerCase();

        const id = String(app.application_id ?? app.id ?? "");
        const customerName = String(app.customer_name ?? app.customerName ?? "");
        const businessName = String(app.business_name ?? app.businessName ?? "");
        const status = getStatus(app);
        const risk = getRisk(app);

        const matchesSearch =
          q === "" ||
          id.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q) ||
          businessName.toLowerCase().includes(q);

        let matchesCapsule = true;
        if (selectedStatus === "All") matchesCapsule = true;
        else if (selectedStatus === "Under Manual Review")
          matchesCapsule = status === "Under Manual Review";
        else if (selectedStatus === "Awaiting Resubmission")
          matchesCapsule = status === "Requires Action";
        else if (selectedStatus === "Approved")
          matchesCapsule = status === "Approved";
        else if (selectedStatus === "Critical")
          matchesCapsule = risk === "critical";

        return matchesSearch && matchesCapsule;
      })
      .sort((a, b) => {
        const ra = getRisk(a);
        const rb = getRisk(b);
        return (riskPriority[ra] ?? 999) - (riskPriority[rb] ?? 999);
      });
  }, [applications, searchQuery, selectedStatus]);

  // Stats for StaffStats
  const stats = useMemo(() => {
    const pendingStatuses = ["Under Manual Review", "Under Review"];

    const totalPending = applications.filter((a) =>
      pendingStatuses.includes(getStatus(a))
    ).length;

    const critical = applications.filter(
      (a) => pendingStatuses.includes(getStatus(a)) && getRisk(a) === "critical"
    ).length;

    const awaitingResubmission = applications.filter(
      (a) => getStatus(a) === "Requires Action"
    ).length;

    const approved = applications.filter((a) => getStatus(a) === "Approved").length;

    return { totalPending, critical, awaitingResubmission, approved };
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Application Review Queue
          </h1>
          <p className="text-muted-foreground">
            View applications assigned to you for review
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StaffStats {...stats} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* StatusFilter + Search */}
        <div className="flex flex-col gap-4 mb-6">
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

        {/* Applications Grid */}
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
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
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