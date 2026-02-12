import { cn } from "../../lib/utils";

const statuses = [
  "Total Pending",
  "Critical",
  "Awaiting Resubmission",
  "Approved"
];

const statusStyles = {
  "Total Pending": 
    "data-[active=true]:bg-slate-500 data-[active=true]:text-background",
  "Critical":
    "data-[active=true]:bg-blue-500 data-[active=true]:text-background",
  "Awaiting Resubmission":
    "data-[active=true]:bg-violet-500 data-[active=true]:text-background",
  Approved:
    "data-[active=true]:bg-emerald-400 data-[active=true]:text-background"
};

export function StatusFilter({
  selectedStatus,
  onStatusChange,
  statusCounts,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <button
          key={status}
          data-active={selectedStatus === status}
          onClick={() => onStatusChange(status)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            "border bg-background hover:bg-secondary",
            "data-[active=true]:border-transparent",
            statusStyles[status]
          )}
        >
          {status}
          <span
            className={cn(
              "text-xs tabular-nums",
              selectedStatus === status
                ? "opacity-80"
                : "text-muted-foreground"
            )}
          >
            {statusCounts?.[status] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
