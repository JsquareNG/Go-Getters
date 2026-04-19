import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Play,
  X,
  ChevronRight,
  FileText,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/Select";
import {
  getSubmittedApplications,
  runSimulation,
} from "../../../api/simulateTestingApi";
const itemStyle =
  "cursor-pointer data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-700 hover:bg-gray-100";

export default function SimulationTestingSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [riskGradeFilter, setRiskGradeFilter] = useState("All");

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [runningSimulation, setRunningSimulation] = useState(false);

  const [simulationResults, setSimulationResults] = useState([]);
  const [showSimulationResults, setShowSimulationResults] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: "application_id",
    direction: "desc",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getSubmittedApplications();
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load applications");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const uniqueCountries = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.business_country) values.add(row.business_country);
    });
    return ["All", ...Array.from(values).sort()];
  }, [rows]);

  const uniqueBusinessTypes = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.business_type) values.add(row.business_type);
    });
    return ["All", ...Array.from(values).sort()];
  }, [rows]);

  const uniqueRiskGrade = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.risk_grade) values.add(row.risk_grade);
    });
    return ["All", ...Array.from(values).sort()];
  }, [rows]);

  const uniqueStatus = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.current_status) values.add(row.current_status);
    });
    return ["All", ...Array.from(values).sort()];
  }, [rows]);

  const uniqueIndustries = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.business_industry) values.add(row.business_industry);
    });
    return ["All", ...Array.from(values).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.application_id?.toLowerCase().includes(term) ||
        row.form_data?.businessName ?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || row.current_status === statusFilter;

      const matchesCountry =
        countryFilter === "All" || row.business_country === countryFilter;

      const matchesBusinessType =
        businessTypeFilter === "All" ||
        row.business_type === businessTypeFilter;

      const matchesIndustry =
        industryFilter === "All" || row.business_industry === industryFilter;

      const matchesRiskGrade =
        riskGradeFilter === "All" || row.risk_grade === riskGradeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCountry &&
        matchesBusinessType &&
        matchesIndustry &&
        matchesRiskGrade
      );
    });
  }, [
    rows,
    search,
    statusFilter,
    countryFilter,
    businessTypeFilter,
    industryFilter,
    riskGradeFilter,
  ]);

  const sortedRows = useMemo(() => {
    const sortable = [...filteredRows];

    sortable.sort((a, b) => {
      const { key, direction } = sortConfig;

      let aValue = a[key];
      let bValue = b[key];

      if (key === "rules_triggered_count") {
        aValue = Array.isArray(a.rules_triggered) ? a.rules_triggered.length : 0;
        bValue = Array.isArray(b.rules_triggered) ? b.rules_triggered.length : 0;
      }

      if (key === "check_completed_at" || key === "app_last_edited") {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return sortable;
  }, [filteredRows, sortConfig]);

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.includes(row.application_id));

  const simulationSummary = useMemo(() => {
    const total = simulationResults.length;
    const changed = simulationResults.filter((item) => item.changed).length;
    const unchanged = total - changed;
    const failed = simulationResults.filter((item) => !item.success).length;

    return { total, changed, unchanged, failed };
  }, [simulationResults]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredRows.map((r) => r.application_id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
      return;
    }

    const merged = new Set(selectedIds);
    filteredRows.forEach((row) => merged.add(row.application_id));
    setSelectedIds(Array.from(merged));
  };

  const toggleSelectOne = (applicationId) => {
    setSelectedIds((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCountryFilter("All");
    setBusinessTypeFilter("All");
    setIndustryFilter("All");
    setRiskGradeFilter("All");
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleRunSimulation = async () => {
    if (!selectedIds.length) return;

    try {
      setRunningSimulation(true);
      setError("");

      const selectedApplications = rows
        .filter((row) => selectedIds.includes(row.application_id))
        .map((row) => ({
          application_id: row.application_id,
          form_data: row.form_data || {},
        }));

      const startTime = Date.now();

      const response = await runSimulation(selectedApplications);

      const backendResults = Array.isArray(response?.results)
        ? response.results
        : [];

      const mergedResults = backendResults.map((result) => {
        const original = rows.find(
          (row) => row.application_id === result.application_id
        );

        return buildSimulationComparison(original, result);
      });

      // ⏱ ensure minimum 2s loading time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);

      setTimeout(() => {
        setSimulationResults(mergedResults);
        setShowSimulationResults(true);
        setRunningSimulation(false);
      
      }, remaining);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to run simulation");
      setRunningSimulation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Simulation Testing
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Replay previously processed applications against the latest rules
          configuration without affecting live decisions.
        </p>
      </div>

      {runningSimulation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl border border-gray-200">
            
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">
                Running Simulation...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Re-evaluating {selectedIds.length} application(s)
              </p>
            </div>

          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Application ID or business name"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-red-400"
                />

                {search.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={uniqueStatus}
            />

            <FilterSelect
              label="Country"
              value={countryFilter}
              onChange={setCountryFilter}
              options={uniqueCountries}
            />

            <FilterSelect
              label="Business Type"
              value={businessTypeFilter}
              onChange={setBusinessTypeFilter}
              options={uniqueBusinessTypes}
            />

            <FilterSelect
              label="Industry"
              value={industryFilter}
              onChange={setIndustryFilter}
              options={uniqueIndustries}
            />

            <FilterSelect
              label="Risk Grade"
              value={riskGradeFilter}
              onChange={setRiskGradeFilter}
              options={uniqueRiskGrade}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-800">
                {filteredRows.length}
              </span>{" "}
              application(s)
            </p>

            <button
              onClick={clearFilters}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-sm text-gray-500">
              Loading applications...
            </div>
          ) : error ? (
            <div className="p-8 text-sm text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-sm text-gray-500">
              No applications found for the selected filters.
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky top-0 border-b border-gray-200 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <SortableTh
                    label="Application ID"
                    sortKey="application_id"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Business Name"
                    sortKey="business_name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Country"
                    sortKey="business_country"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Type"
                    sortKey="business_type"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Industry"
                    sortKey="business_industry"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Status"
                    sortKey="current_status"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Risk Score"
                    sortKey="risk_score"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Risk Grade"
                    sortKey="risk_grade"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <Th></Th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((row) => {
                  const isChecked = selectedIds.includes(row.application_id);

                  return (
                    <tr
                      key={row.application_id}
                      className="group hover:bg-gray-50"
                    >
                      <td className="border-b border-gray-100 px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(row.application_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-900"
                        onClick={() => setSelectedApp(row)}
                      >
                        {row.application_id}
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm text-gray-700"
                        onClick={() => setSelectedApp(row)}
                      >
                        {row.form_data?.businessName || "-"}
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm text-gray-700"
                        onClick={() => setSelectedApp(row)}
                      >
                        {row.business_country || "-"}
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm text-gray-700"
                        onClick={() => setSelectedApp(row)}
                      >
                        {row.business_type || "-"}
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm text-gray-700"
                        onClick={() => setSelectedApp(row)}
                      >
                        {row.business_industry || "-"}
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm"
                        onClick={() => setSelectedApp(row)}
                      >
                        <StatusBadge status={row.current_status} />
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm text-gray-700"
                        onClick={() => setSelectedApp(row)}
                      >
                        {row.risk_score ?? "-"}
                      </td>

                      <td
                        className="cursor-pointer border-b border-gray-100 px-4 py-3 text-sm"
                        onClick={() => setSelectedApp(row)}
                      >
                        <RiskBadge grade={row.risk_grade} />
                      </td>

                      <td className="border-b border-gray-100 px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedApp(row)}
                          className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-700"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-lg">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {selectedIds.length} application(s) selected
          </p>
          <p className="text-xs text-gray-500">
            Select one or more applications to run simulation using the latest
            active rules configuration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Selection
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={runningSimulation || selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {runningSimulation ? "Running..." : "Run Simulation"}
          </button>
        </div>
      </div>

      <ApplicationDetailDrawer
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
      />

      <SimulationResultsModal
        open={showSimulationResults}
        results={simulationResults}
        summary={simulationSummary}
        onClose={() => setShowSimulationResults(false)}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-10 bg-white text-sm">
          <SelectValue placeholder={label} />
        </SelectTrigger>

        <SelectContent className="bg-white">
          {options.map((option) => (
            <SelectItem key={option} value={option} className={itemStyle}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="sticky top-0 border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

function SortableTh({ label, sortKey, sortConfig, onSort }) {
  const isActive = sortConfig.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <th className="sticky top-0 border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-gray-800"
      >
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    </th>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 border-rose-200",
    "Requires Action": "bg-amber-50 text-amber-700 border-amber-200",
    "Under Manual Review": "bg-yellow-50 text-yellow-700 border-yellow-200",
    Withdrawn: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status || "-"}
    </span>
  );
}

function RiskBadge({ grade }) {
  const styles = {
    "Enhanced CDD": "bg-red-50 text-red-700 border-red-200",
    "Standard CDD": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Simplified CDD": "bg-gray-50 text-gray-700 border-gray-200",
    "Enhanced Due Diligence (EDD)":
      "bg-red-50 text-red-700 border-red-200",
    "Standard Due Diligence (CDD)":
      "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Simplified Due Diligence (SDD)":
      "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
        styles[grade] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {grade || "-"}
    </span>
  );
}

function ApplicationDetailDrawer({ app, onClose }) {
  if (!app) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="absolute right-0 top-16 h-[calc(100%-4rem)] w-full max-w-xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Application Details
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Read-only view of the original submitted application and prior
              review outcome.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <SectionCard
            icon={<FileText className="h-4 w-4" />}
            title="Application Overview"
            rightContent={
              <span>
                Last Edited:{" "}
                <span className="font-medium text-gray-700">
                  {formatDateTime(app.app_last_edited)}
                </span>
              </span>
            }
          >
            <DetailGrid
              items={[
                ["Application ID", app.application_id],
                ["Business Name", app.business_name],
                ["Country", app.business_country],
                ["Business Type", app.business_type],
                ["Industry", app.business_industry],
                ["Current Status", app.current_status],
                ["Reviewer ID", app.reviewer_id],
              ]}
            />
          </SectionCard>

          <SectionCard
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Previous Review Result"
            rightContent={
              <span>
                Review Completed:{" "}
                <span className="font-medium text-gray-700">
                  {formatDateTime(app.check_completed_at)}
                </span>
              </span>
            }
          >
            <DetailGrid
              items={[
                ["Risk Score", app.risk_score ?? "-"],
                ["Risk Grade", app.risk_grade ?? "-"],
              ]}
            />

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Triggered Rules
              </p>

              {Array.isArray(app.rules_triggered) &&
              app.rules_triggered.length > 0 ? (
                <div className="space-y-2">
                  {app.rules_triggered.map((rule, index) => (
                    <div
                      key={rule.rule_id || index}
                      className="rounded-xl border border-red-200 bg-red-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Rule Code:{" "}
                            {rule.code ||
                              rule.rule_name ||
                              `Rule ${index + 1}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {rule.description || "No reason provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No triggered rules found.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SimulationResultsModal({ open, results, summary, onClose }) {
  if (!open) return null;

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      // Changed first
      if (a.changed && !b.changed) return -1;
      if (!a.changed && b.changed) return 1;

      return 0;
    });
  }, [results]);

  const defaultExpanded =
    results.length <= 3
      ? sortedResults.map((item) => item.application_id)
      : [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <SimulationResultsModalContent
        results={sortedResults}
        summary={summary}
        onClose={onClose}
        defaultExpanded={defaultExpanded}
      />
    </div>
  );
}

function SimulationResultsModalContent({
  results,
  summary,
  onClose,
  defaultExpanded,
}) {
  const [expandedIds, setExpandedIds] = useState(defaultExpanded);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setExpandedIds(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 200);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleExpanded = (applicationId) => {
    setExpandedIds((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const expandAll = () => {
    setExpandedIds(results.map((item) => item.application_id));
  };

  const collapseAll = () => {
    setExpandedIds([]);
  };

  return (
    <div className="relative max-h-[85vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Simulation Results
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Compare original review outcomes against the latest simulated
            rules-engine results.
          </p>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="max-h-[calc(85vh-73px)] overflow-y-auto px-6 py-5">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SummaryCard label="Simulated" value={summary?.total ?? 0} />
            <SummaryCard label="Changed" value={summary?.changed ?? 0} />
            <SummaryCard label="Unchanged" value={summary?.unchanged ?? 0} />
          </div>

          {results.length > 3 && (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                {results.length} applications selected. Cards are collapsed by default for easier browsing.
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Collapse All
                </button>
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No simulation results to display.
            </div>
          ) : (
            results.map((item) => (
              <SimulationComparisonCard
                key={item.application_id}
                item={item}
                expanded={expandedIds.includes(item.application_id)}
                onToggle={() => toggleExpanded(item.application_id)}
              />
            ))
          )}
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SimulationComparisonCard({ item, expanded, onToggle }) {
  const badgeClass = item.success
    ? item.changed
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";

  const badgeText = !item.success
    ? "Failed"
    : item.changed
    ? "Changed"
    : "Unchanged";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 text-left hover:bg-gray-50"
      >
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-gray-900">
            {item.application_id || "-"}{" "}
            <span className="font-normal text-gray-500">
              {item.business_name ? `• ${item.business_name}` : ""}
            </span>
          </h4>
          <p className="mt-1 truncate text-sm text-gray-500">
            {item.business_country || "-"} • {item.business_type || "-"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}
          >
            {badgeText}
          </span>

          <ChevronRight
            className={`h-5 w-5 text-gray-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <>
          {!item.success ? (
            <div className="p-5">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {item.error || "Simulation failed."}
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <ChangeSummary comparison={item.comparison} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ComparisonResultCard
                  title="Original Review Result"
                  score={item.original?.risk_score}
                  grade={item.original?.risk_grade}
                  rules={item.original?.rules_triggered}
                />

                <ComparisonResultCard
                  title="Simulation Result"
                  score={item.simulated?.risk_score}
                  grade={item.simulated?.risk_grade}
                  rules={item.simulated?.rules_triggered}
                  highlightScore={item.comparison?.scoreChanged}
                  highlightGrade={item.comparison?.gradeChanged}
                  highlightRuleCount={item.comparison?.ruleCountChanged}
                  changedRuleCodes={item.comparison?.changedRuleCodes || []}
                />
              </div>

              
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ComparisonResultCard({
  title,
  score,
  grade,
  rules = [],
  highlightScore = false,
  highlightGrade = false,
  highlightRuleCount = false,
  changedRuleCodes = [],
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-4 py-3">
        <h5 className="text-sm font-semibold text-gray-900">{title}</h5>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MiniStat
            label="Risk Score"
            value={score ?? "-"}
            highlighted={highlightScore}
          />

          <MiniStat
            label="Risk Grade"
            value={<RiskBadge grade={grade} />}
            isCustom
            highlighted={highlightGrade}
          />

          <MiniStat
            label="Triggered Rules"
            value={Array.isArray(rules) ? rules.length : 0}
            highlighted={highlightRuleCount}
          />

        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Triggered Rules
          </p>

          {Array.isArray(rules) && rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule, index) => {
                const ruleCode = rule?.code || rule?.rule_name || "";
                const isChangedRule = changedRuleCodes.includes(ruleCode);

                return (
                  <div
                    key={rule.rule_id || `${title}-${index}`}
                    className={`rounded-xl border p-3 ${
                      isChangedRule
                        ? "border-amber-200 bg-amber-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {ruleCode || `Rule ${index + 1}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {rule.description || "No reason provided"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No triggered rules found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeSummary({ comparison }) {
  const messages = [];

  if (!comparison.changed) {
    messages.push("No differences detected between original and simulated results.");
  } else {
    if (comparison.gradeChanged) {
      messages.push(
        `Risk grade changed from ${comparison.originalGrade || "-"} to ${comparison.newGrade || "-"}.`
      );
    }

    if (comparison.scoreChanged) {
      messages.push(
        `Risk score changed from ${comparison.originalScore ?? "-"} to ${comparison.newScore ?? "-"}.`
      );
    }

    if (comparison.ruleCountChanged) {
      messages.push(
        `Triggered rules changed from ${comparison.originalRuleCount} to ${comparison.newRuleCount}.`
      );
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        comparison.changed
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Change Summary
      </p>

      <div className="space-y-1">
        {messages.map((message, index) => (
          <p key={index} className="text-sm text-gray-700">
            {message}
          </p>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, rightContent, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        </div>

        {rightContent && <div className="text-xs text-gray-500">{rightContent}</div>}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-gray-100 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="mt-1 break-words text-sm text-gray-900">
            {value || "-"}
          </p>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, isCustom = false, highlighted = false }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlighted
          ? "border-amber-200 bg-amber-50"
          : "border-transparent bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-gray-900">
        {isCustom ? value : value || "-"}
      </div>
    </div>
  );
}

// function buildSimulationComparison(originalRow, simulationResult) {
//   const originalRules = Array.isArray(originalRow?.rules_triggered)
//     ? originalRow.rules_triggered
//     : [];

//   const simulatedRules = Array.isArray(simulationResult?.triggered_rules)
//     ? simulationResult.triggered_rules
//     : [];

//   const originalScore = originalRow?.risk_score ?? null;
//   const newScore = simulationResult?.risk_score ?? null;

//   const originalGrade = normalizeDecisionLabel(originalRow?.risk_grade);
//   const newGrade = normalizeDecisionLabel(simulationResult?.risk_decision);

//   const scoreChanged = String(originalScore ?? "") !== String(newScore ?? "");
//   const gradeChanged = String(originalGrade ?? "") !== String(newGrade ?? "");
//   const ruleCountChanged = originalRules.length !== simulatedRules.length;

//   return {
//     application_id: simulationResult?.application_id || originalRow?.application_id,
//     business_name:
//       simulationResult?.business_name || originalRow?.business_name || "-",
//     business_country:
//       simulationResult?.country ||
//       originalRow?.business_country ||
//       originalRow?.country ||
//       "-",
//     business_type:
//       simulationResult?.business_type || originalRow?.business_type || "-",
//     success: simulationResult?.success !== false,
//     error: simulationResult?.error,

//     original: {
//       risk_score: originalScore,
//       risk_grade: originalGrade,
//       rules_triggered: originalRules,
//       check_completed_at: originalRow?.check_completed_at,
//     },

//     simulated: {
//       risk_score: newScore,
//       risk_grade: newGrade,
//       rules_triggered: simulatedRules,
//     },

//     comparison: {
//       changed: scoreChanged || gradeChanged || ruleCountChanged,
//       scoreChanged,
//       gradeChanged,
//       ruleCountChanged,
//       originalScore,
//       newScore,
//       originalGrade,
//       newGrade,
//       originalRuleCount: originalRules.length,
//       newRuleCount: simulatedRules.length,
//     },

//     changed: scoreChanged || gradeChanged || ruleCountChanged,
//   };
// }

function buildSimulationComparison(originalRow, simulationResult) {
  const originalRules = Array.isArray(originalRow?.rules_triggered)
    ? originalRow.rules_triggered
    : [];

  const simulatedRules = Array.isArray(simulationResult?.triggered_rules)
    ? simulationResult.triggered_rules
    : [];

  const originalScore = originalRow?.risk_score ?? null;
  const newScore = simulationResult?.risk_score ?? null;

  const originalGrade = normalizeDecisionLabel(originalRow?.risk_grade);
  const newGrade = normalizeDecisionLabel(simulationResult?.risk_decision);

  const originalRuleCodes = originalRules.map(
    (rule) => rule?.code || rule?.rule_name || ""
  );
  const newRuleCodes = simulatedRules.map(
    (rule) => rule?.code || rule?.rule_name || ""
  );

  const scoreChanged = String(originalScore ?? "") !== String(newScore ?? "");
  const gradeChanged = String(originalGrade ?? "") !== String(newGrade ?? "");
  const ruleCountChanged = originalRules.length !== simulatedRules.length;

  const changedRuleCodes = newRuleCodes.filter(
    (code) => code && !originalRuleCodes.includes(code)
  );

  return {
    application_id:
      simulationResult?.application_id || originalRow?.application_id,
    business_name:
      simulationResult?.business_name || originalRow?.business_name || "-",
    business_country:
      simulationResult?.country ||
      originalRow?.business_country ||
      originalRow?.country ||
      "-",
    business_type:
      simulationResult?.business_type || originalRow?.business_type || "-",
    success: simulationResult?.success !== false,
    error: simulationResult?.error,

    original: {
      risk_score: originalScore,
      risk_grade: originalGrade,
      rules_triggered: originalRules,
      check_completed_at: originalRow?.check_completed_at,
    },

    simulated: {
      risk_score: newScore,
      risk_grade: newGrade,
      rules_triggered: simulatedRules,
    },

    comparison: {
      changed: scoreChanged || gradeChanged || ruleCountChanged || changedRuleCodes.length > 0,
      scoreChanged,
      gradeChanged,
      ruleCountChanged,
      originalScore,
      newScore,
      originalGrade,
      newGrade,
      originalRuleCount: originalRules.length,
      newRuleCount: simulatedRules.length,
      originalRuleCodes,
      newRuleCodes,
      changedRuleCodes,
    },

    changed: scoreChanged || gradeChanged || ruleCountChanged || changedRuleCodes.length > 0,
  };
}

function normalizeDecisionLabel(value) {
  const mapping = {
    "Simplified Due Diligence (SDD)": "Simplified CDD",
    "Standard Due Diligence (CDD)": "Standard CDD",
    "Enhanced Due Diligence (EDD)": "Enhanced CDD",
  };

  return mapping[value] || value || "-";
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}