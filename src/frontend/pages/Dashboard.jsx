import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay, subDays, subMonths, subYears } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/primitives/Tabs";
import { OverviewTab } from "../components/ui/Analytics/OverviewTab";
import { PipelineTab } from "../components/ui/Analytics/PipelineTab";
import { KycDocumentsTab } from "../components/ui/Analytics/KycDocumentsTab";
import { OperationsTab } from "../components/ui/Analytics/OperationsTab";
import { ComplianceTab } from "../components/ui/Analytics/ComplianceTab";
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
  Users,
  FileSearch
} from "lucide-react";
import { cn } from "@/lib/utils";

function getPresetDateRange(value) {
  const now = new Date();

  switch (value) {
    case "last-7":
      return {
        from: startOfDay(subDays(now, 6)), // includes today = 7 days total
        to: endOfDay(now),
      };

    case "last-30":
      return {
        from: startOfDay(subDays(now, 29)), // includes today = 30 days total
        to: endOfDay(now),
      };

    case "last-quarter":
      return {
        from: startOfDay(subMonths(now, 3)),
        to: endOfDay(now),
      };

    case "last-year":
      return {
        from: startOfDay(subYears(now, 1)),
        to: endOfDay(now),
      };

    default:
      return {
        from: undefined,
        to: undefined,
      };
  }
}

export default function Analytics() {
  const [preset, setPreset] = useState("last-quarter");
  const [dateRange, setDateRange] = useState(() => getPresetDateRange("last-quarter"));

  useEffect(() => {
    if (preset === "custom") return;
    setDateRange(getPresetDateRange(preset));
  }, [preset]);

  const handlePreset = (value) => {
    setPreset(value);

    if (value === "custom") {
      return;
    }

    setDateRange(getPresetDateRange(value));
  };

  const handleCustomRangeSelect = (range) => {
    setPreset("custom");
    setDateRange({
      from: range?.from ? startOfDay(range.from) : undefined,
      to: range?.to ? endOfDay(range.to) : undefined,
    });
  };

  const dateLabel = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
    }

    if (dateRange.from) {
      return `${format(dateRange.from, "MMM d, yyyy")} – ...`;
    }

    return "Select date range";
  }, [dateRange]);

  const analyticsFilter = useMemo(
    () => ({
      preset,
      from: dateRange.from,
      to: dateRange.to,
    }),
    [preset, dateRange]
  );

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
            <Select value={preset} onValueChange={handlePreset}>
              <SelectTrigger className="h-9 w-[150px] text-sm bg-slate-300">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="bg-slate-300">
                <SelectItem value="last-7">Last 7 days</SelectItem>
                <SelectItem value="last-30">Last 30 days</SelectItem>
                <SelectItem value="last-quarter">Last quarter</SelectItem>
                <SelectItem value="last-year">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

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
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={handleCustomRangeSelect}
                    numberOfMonths={2}
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-auto flex-wrap gap-1 bg-muted p-1">
            <TabsTrigger
              value="overview"
              className="gap-2 data-[state=active]:bg-slate-200"
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="onboardingFunnel"
              className="gap-2 data-[state=active]:bg-slate-200"
            >
              <GitBranch className="h-4 w-4" />
              Onboarding Funnel
            </TabsTrigger>

            <TabsTrigger
              value="operations"
              className="gap-2 data-[state=active]:bg-slate-200"
            >
              <Users className="h-4 w-4" />
              Operations
            </TabsTrigger>

            <TabsTrigger
              value="kyc"
              className="gap-2 data-[state=active]:bg-slate-200"
            >
              <FileSearch className="h-4 w-4" />
              KYC & Documents
            </TabsTrigger>

            <TabsTrigger
              value="compliance"
              className="gap-2 data-[state=active]:bg-slate-200"
            >
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab dateRange={dateRange} preset={preset} />
          </TabsContent>

          <TabsContent value="onboardingFunnel">
            <PipelineTab dateRange={dateRange} preset={preset} />
          </TabsContent>

          <TabsContent value="operations">
            <OperationsTab dateRange={dateRange} preset={preset} />
          </TabsContent>

          <TabsContent value="kyc">
            <KycDocumentsTab dateRange={dateRange} preset={preset} />
          </TabsContent>
          
          <TabsContent value="compliance">
            <ComplianceTab dateRange={dateRange} preset={preset} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}