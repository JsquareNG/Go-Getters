import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ApplicationCard } from "../components/ui/ApplicationCard";
import { StatusFilter } from "../components/ui/StatusFilter";
import { ApplicationStats } from "../components/ui/ApplicationStats";
import { EmptyState } from "../components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { getApplicationsByUserId } from "../api/applicationApi";

export default function LandingPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoading(true);
        // Getting user info from storage (set during login)
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = userData.user_id || "00000010"; 
        console.log("Heloo")
        const data = await getApplicationsByUserId(userId);
        if (data)
          console.log("CALLED")
        setApplications(Array.isArray(data) ? data : [data]);
      } catch (err) {
        setError("Failed to load applications. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchApps();
  }, []);

  // Filter Logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = selectedStatus === "All" || app.current_status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchesSearch = (app.business_name || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [selectedStatus, searchQuery, applications]);

  // Stats Logic (Dynamic based on API data)
  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => ["Under Manual Review", "Under Review"].includes(a.current_status)).length,
    requiresAction: applications.filter(a => a.current_status === "Requires Action").length,
    approved: applications.filter(a => a.current_status === "Approved").length,
  }), [applications]);

  const statusCounts = useMemo(() => {
    const counts = { All: applications.length, "Draft": 0, "Submitted": 0, "Under Review": 0, "Under Manual Review": 0, "Requires Action": 0, Approved: 0, "Rejected": 0, "Withdrawn": 0 };
    applications.forEach(a => { if(counts[a.current_status] !== undefined) counts[a.current_status]++; });
    return counts;
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
      <main className="container mx-auto px-6 py-12 animate-fade-in">
        
        {/* 1. THE HEADER & NEW APPLICATION BUTTON */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Onboarding Applications
            </h1>
            <p className="text-muted-foreground">
              Manage and track your business account applications
            </p>
          </div>

          <Button
            onClick={() => navigate("/landingpage/newapplication")}
            className="gap-2 shrink-0 bg-red-500 hover:bg-red-600"
          >
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>

        {/* 2. STATS OVERVIEW */}
        <div className="mb-8">
          <ApplicationStats {...stats} />
        </div>

        {/* 3. FILTERS & SEARCH */}
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

        {/* 4. APPLICATIONS LIST */}
        {error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        ) : filteredApplications.length > 0 ? (
          <div className="grid gap-4">
            {filteredApplications.map((app, index) => (
              <div key={app.application_id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <ApplicationCard application={app} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilter={selectedStatus !== "All" || searchQuery !== ""}
            onClearFilter={() => { setSelectedStatus("All"); setSearchQuery(""); }}
          />
        )}
      </main>
    </div>
  );
}