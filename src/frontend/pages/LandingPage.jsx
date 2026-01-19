import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ApplicationCard } from "../components/ui/ApplicationCard";
import { StatusFilter } from "../components/ui/StatusFilter";
import { ApplicationStats } from "../components/ui/ApplicationStats";
import { EmptyState } from "../components/ui/EmptyState";
import { mockApplications } from "../data/mockApplications";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter applications
  const filteredApplications = useMemo(() => {
    return mockApplications.filter((app) => {
      const matchesStatus = selectedStatus === "All" || app.status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        app.companyName.toLowerCase().includes(q) ||
        app.accountType.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [selectedStatus, searchQuery]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = {
      All: mockApplications.length,
      "Not started": 0,
      "In Progress": 0,
      Submitted: 0,
      "In Review": 0,
      "Requires Action": 0,
      Approved: 0,
    };

    mockApplications.forEach((app) => {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
    });

    return counts;
  }, []);

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: mockApplications.length,
      pending: mockApplications.filter((a) =>
        ["Submitted", "In Review"].includes(a.status)
      ).length,
      requiresAction: mockApplications.filter((a) => a.status === "Requires Action")
        .length,
      approved: mockApplications.filter((a) => a.status === "Approved").length,
    }),
    []
  );

  const hasActiveFilter = selectedStatus !== "All" || searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto px-6 py-12 animate-fade-in">
        {/* Page Header */}
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
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <ApplicationStats {...stats} />
        </div>

        {/* Filters Section */}
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
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length > 0 ? (
          <div className="grid gap-4">
            {filteredApplications.map((application, index) => (
              <div
                key={application.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ApplicationCard application={application} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilter={hasActiveFilter}
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
