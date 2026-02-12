import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ApplicationCard } from "../components/ui/ApplicationReviewCard";
import { FilterBar } from "../components/ui/FilterBar";
import { mockApplicationsReview } from "../data/mockData";
import { AlertCircle, FileSearch } from "lucide-react";
import { StaffStats } from "../components/ui/StaffStats";

const riskPriority = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const filteredApplications = useMemo(() => {
    return mockApplicationsReview
      .filter((app) => {
        const q = searchQuery.toLowerCase();

        const matchesSearch =
          q === "" ||
          String(app.id).toLowerCase().includes(q) ||
          String(app.customerName).toLowerCase().includes(q) ||
          (app.businessName ? String(app.businessName).toLowerCase().includes(q) : false);

        const matchesRisk = riskFilter === "all" || app.riskLevel === riskFilter;
        const matchesStatus = statusFilter === "all" || app.status === statusFilter;
        const matchesProduct = productFilter === "all" || app.productType === productFilter;

        return matchesSearch && matchesRisk && matchesStatus && matchesProduct;
      })
      .sort((a, b) => (riskPriority[a.riskLevel] ?? 999) - (riskPriority[b.riskLevel] ?? 999));
  }, [searchQuery, riskFilter, statusFilter, productFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setRiskFilter("all");
    setStatusFilter("all");
    setProductFilter("all");
  };

  const handleReview = (id) => {
    navigate(`/staff-landingpage/${id}`);
  };

  const criticalCount = mockApplicationsReview.filter((a) => a.riskLevel === "critical").length;
  const highCount = mockApplicationsReview.filter((a) => a.riskLevel === "high").length;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Application Review Queue
          </h1>
          <p className="text-muted-foreground">
            Review and process high-risk applications requiring manual verification
          </p>
        </div>


        {/* Stats Summary */}
        {/* <div className="mb-8">
          <StaffStats {...stats} />
        </div> */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-card border rounded-lg">
            <p className="text-sm text-muted-foreground">Total Pending</p>
            <p className="text-2xl font-bold text-foreground">{mockApplicationsReview.length}</p>
          </div>
          <div className="p-4 bg-card border rounded-lg border-l-4 border-l-risk-critical">
            <p className="text-sm text-muted-foreground">Critical</p>
            <p className="text-2xl font-bold text-risk-critical">{criticalCount}</p>
          </div>
          <div className="p-4 bg-card border rounded-lg border-l-4 border-l-risk-high">
            <p className="text-sm text-muted-foreground">High Risk</p>
            <p className="text-2xl font-bold text-risk-high">{highCount}</p>
          </div>
          <div className="p-4 bg-card border rounded-lg border-l-4 border-l-status-warning">
            <p className="text-sm text-muted-foreground">Awaiting Resubmission</p>
            <p className="text-2xl font-bold text-status-warning">
              {mockApplicationsReview.filter((a) => a.status === "awaiting_resubmission").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          productFilter={productFilter}
          onProductFilterChange={setProductFilter}
          onClearFilters={clearFilters}
        />

        {/* Applications Grid */}
        <div className="mt-6">
          {filteredApplications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApplications.map((application, index) => (
                <div
                  key={application.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ApplicationCard application={application} onReview={handleReview} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No applications found
              </h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
