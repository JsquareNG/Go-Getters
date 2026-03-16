import { useState } from "react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/primitives/Tabs";
import { OverviewTab } from "../components/ui/Analytics/OverviewTab";
import { PipelineTab } from "../components/ui/Analytics/PipelineTab";
import { ComplianceTab } from "../components/ui/Analytics/ComplianceTab";
import { PerformanceTab } from "../components/ui/Analytics/PerformanceTab";
import { Button } from "../components/ui/primitives/Button";
import { Calendar } from "../components/ui/primitives/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/features/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/primitives/Select";
import {
  BarChart3,
  GitBranch,
  Shield,
  Gauge,
  Download,
  CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportAnalyticsToExcel } from "@/lib/exportExcel";

export default function Analytics() {
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [preset, setPreset] = useState("last-quarter");

  const handlePreset = (value) => {
    setPreset(value);
    const now = new Date();
    let from;

    switch (value) {
      case "last-7":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case "last-30":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case "last-quarter":
        from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "last-year":
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "custom":
        return;
      default:
        from = undefined;
    }

    setDateRange({ from, to: now });
  };

  const dateLabel =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : "Select date range";

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-foreground">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor SME onboarding performance, compliance, and pipeline health
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preset selector */}
            <Select value={preset} onValueChange={handlePreset}>
              <SelectTrigger className="h-9 w-[150px] text-sm">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7">Last 7 days</SelectItem>
                <SelectItem value="last-30">Last 30 days</SelectItem>
                <SelectItem value="last-quarter">Last quarter</SelectItem>
                <SelectItem value="last-year">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom date picker */}
            {preset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 gap-2 text-sm",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {dateLabel}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) =>
                      setDateRange({
                        from: range?.from,
                        to: range?.to,
                      })
                    }
                    numberOfMonths={2}
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Export button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={exportAnalyticsToExcel}
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-auto flex-wrap gap-1 bg-muted p-1">
            <TabsTrigger
              value="overview"
              className="gap-2 data-[state=active]:bg-card"
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="pipeline"
              className="gap-2 data-[state=active]:bg-card"
            >
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>

            <TabsTrigger
              value="compliance"
              className="gap-2 data-[state=active]:bg-card"
            >
              <Shield className="h-4 w-4" />
              Compliance & Risk
            </TabsTrigger>

            <TabsTrigger
              value="performance"
              className="gap-2 data-[state=active]:bg-card"
            >
              <Gauge className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="pipeline">
            <PipelineTab />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceTab />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}